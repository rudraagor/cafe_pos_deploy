"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  customers,
  orderTables,
  orders,
  orderItems,
  paymentMethods,
  payments,
  posSessions,
  reservations,
} from "@/lib/db/schema";
import { sendReceiptEmail } from "@/lib/email/send-receipt";
import { computeOrder } from "@/lib/pos/pricing";
import {
  expireStaleReservations,
  findActiveOrderTableConflict,
  findReservationTableConflict,
} from "@/lib/pos/reservations";
import {
  findCouponByCode,
  generateOrderNumber,
  getActivePromotions,
  getCustomerUsualProduct,
  getProductsByIds,
} from "@/lib/pos/queries";
import {
  getLastClosedSession,
  getOpenSessionForUser,
  getSessionClosingAmount,
  getSessionExpectedCash,
} from "@/lib/pos/session";
import { getAppUrl } from "@/lib/receipt-brand";
import {
  publishKdsChanged,
  publishReportsChanged,
} from "@/lib/realtime/publish";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { modifiersAllowNote, normalizeModifiers } from "@/lib/pos/modifiers";
import { customerSchema } from "@/lib/validations/customers";
import { sendToKitchenSchema } from "@/lib/validations/order";
import { paymentSchema, splitPaymentSchema } from "@/lib/validations/payment";

export type SessionInfo = {
  openSession: Awaited<ReturnType<typeof getOpenSessionForUser>>;
  lastClosed: Awaited<ReturnType<typeof getLastClosedSession>>;
};

export async function getSessionInfo(): Promise<SessionInfo> {
  const user = await requireUser();
  const [openSession, lastClosed] = await Promise.all([
    getOpenSessionForUser(user.id),
    getLastClosedSession(user.id),
  ]);
  return { openSession, lastClosed };
}

export async function openSession(
  openingFloat = 0,
): Promise<ActionResult & { sessionId?: string }> {
  const user = await requireUser();

  const existing = await getOpenSessionForUser(user.id);
  if (existing) {
    return { ok: false, error: "A session is already open." };
  }

  const [session] = await db
    .insert(posSessions)
    .values({
      openedBy: user.id,
      openingFloat: openingFloat.toFixed(2),
      status: "open",
    })
    .returning({ id: posSessions.id });

  revalidatePath("/pos");
  revalidatePath("/pos/orders");
  revalidatePath("/pos/tables");

  return { ok: true, message: "Session opened.", sessionId: session.id };
}

export type CloseSessionResult = ActionResult & {
  summary?: {
    totalOrders: number;
    closingAmount: number;
    expectedCash: number;
    countedCash: number;
    cashVariance: number;
    openedAt: Date;
    closedAt: Date;
  };
};

export async function closeSession(
  payload?: unknown,
): Promise<CloseSessionResult> {
  const user = await requireUser();
  const session = await getOpenSessionForUser(user.id);
  if (!session) {
    return { ok: false, error: "No open session found." };
  }

  const countedCash =
    typeof payload === "object" && payload !== null && "countedCash" in payload
      ? Number((payload as { countedCash?: unknown }).countedCash)
      : NaN;
  if (!Number.isFinite(countedCash) || countedCash < 0) {
    return { ok: false, error: "Enter the physical cash counted in drawer." };
  }

  const [closingAmount, expectedCash, sessionOrders] = await Promise.all([
    getSessionClosingAmount(session.id),
    getSessionExpectedCash(session.id),
    db.query.orders.findMany({
      where: eq(orders.sessionId, session.id),
    }),
  ]);
  const cashVariance = countedCash - expectedCash;

  const closedAt = new Date();
  await db
    .update(posSessions)
    .set({
      status: "closed",
      closedAt,
      closingAmount: closingAmount.toFixed(2),
      expectedCash: expectedCash.toFixed(2),
      countedCash: countedCash.toFixed(2),
      cashVariance: cashVariance.toFixed(2),
    })
    .where(eq(posSessions.id, session.id));
  await writeAuditLog({
    actorId: user.id,
    action: "pos_session.closed",
    entityType: "pos_session",
    entityId: session.id,
    metadata: {
      closingAmount,
      expectedCash,
      countedCash,
      cashVariance,
      totalOrders: sessionOrders.length,
    },
  });

  revalidatePath("/pos");
  revalidatePath("/pos/orders");
  revalidatePath("/pos/tables");
  revalidatePath("/admin/reports");
  publishReportsChanged({ sessionId: session.id });

  return {
    ok: true,
    message: "Session closed.",
    summary: {
      totalOrders: sessionOrders.length,
      closingAmount,
      expectedCash,
      countedCash,
      cashVariance,
      openedAt: session.openedAt,
      closedAt,
    },
  };
}

export async function validateCoupon(code: string): Promise<
  | {
      ok: true;
      coupon: {
        id: string;
        code: string;
        discountType: string;
        value: number;
        stackable: boolean;
      };
    }
  | { ok: false; error: string }
> {
  const user = await requireUser();
  const limit = checkRateLimit({
    scope: "pos:coupon_validate",
    identifier: user.id,
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) {
    return { ok: false, error: "Coupon checks are rate limited." };
  }

  const coupon = await findCouponByCode(code);
  if (!coupon) {
    return { ok: false, error: "Invalid or inactive coupon code." };
  }

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      value: Number(coupon.value),
      stackable: coupon.stackable,
    },
  };
}

export async function sendToKitchen(
  payload: unknown,
): Promise<ActionResult & { orderId?: string }> {
  const user = await requireUser();
  const session = await getOpenSessionForUser(user.id);
  if (!session) {
    return { ok: false, error: "Open a POS session first." };
  }

  const parsed = sendToKitchenSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Invalid order data.",
    };
  }

  const {
    fulfillmentType,
    tableId,
    tableIds,
    reservationId,
    orderId,
    items,
    couponCode,
    customerId,
  } = parsed.data;
  const selectedTableIds =
    fulfillmentType === "dine_in"
      ? Array.from(
          new Set(tableIds?.length ? tableIds : tableId ? [tableId] : []),
        )
      : [];
  const primaryTableId = selectedTableIds[0] ?? null;

  const productIds = items.map((i) => i.productId);
  const dbProducts = await getProductsByIds(productIds);
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  const pricingItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return null;
    }
    return {
      productId: item.productId,
      name: product.name,
      unitPrice: Number(product.price),
      taxRate: Number(product.taxRate),
      qty: item.qty,
      isKitchenItem: product.isKitchenItem,
      categoryId: product.categoryId,
      modifiers: normalizeModifiers(item.modifiers),
      note: item.note?.trim() || undefined,
      supportedModifiers: normalizeModifiers(product.supportedModifiers),
    };
  });
  const hasMissingProduct = pricingItems.some((item) => item === null);
  if (hasMissingProduct) {
    return {
      ok: false,
      error: "One of the selected products no longer exists.",
    };
  }
  const validPricingItems = pricingItems.filter(
    (item): item is NonNullable<(typeof pricingItems)[number]> => item !== null,
  );
  for (const item of validPricingItems) {
    const supported = new Set(item.supportedModifiers);
    const unsupportedModifier = item.modifiers.find(
      (modifier) => !supported.has(modifier),
    );
    if (unsupportedModifier) {
      return {
        ok: false,
        error: "One of the selected prep options is not supported.",
      };
    }
    if (item.note && !modifiersAllowNote(item.supportedModifiers)) {
      return {
        ok: false,
        error: "This product does not support prep notes.",
      };
    }
  }

  const promotions = await getActivePromotions();
  let coupon = null;
  if (couponCode) {
    const row = await findCouponByCode(couponCode);
    if (!row) {
      return { ok: false, error: "Invalid or inactive coupon code." };
    }
    coupon = {
      id: row.id,
      code: row.code,
      discountType: row.discountType as "percent" | "fixed",
      value: Number(row.value),
      stackable: row.stackable,
    };
  }

  const computed = computeOrder(validPricingItems, { promotions, coupon });

  const orderValues = {
    sessionId: session.id,
    tableId: fulfillmentType === "dine_in" ? primaryTableId : null,
    fulfillmentType,
    customerId: customerId ?? null,
    employeeId: user.id,
    couponId: coupon?.id ?? null,
    status: "draft" as const,
    subtotal: computed.subtotal.toFixed(2),
    tax: computed.tax.toFixed(2),
    discountTotal: computed.discountTotal.toFixed(2),
    total: computed.total.toFixed(2),
    sentToKitchenAt: new Date(),
    updatedAt: new Date(),
  };

  const itemValues = (savedOrderId: string) =>
    computed.lines.map((line) => ({
      orderId: savedOrderId,
      productId: line.productId,
      nameSnapshot: line.name,
      unitPrice: line.unitPrice.toFixed(2),
      quantity: line.qty,
      taxRateSnapshot: line.taxRate.toFixed(2),
      lineDiscount: line.lineDiscount.toFixed(2),
      lineTotal: line.lineTotal.toFixed(2),
      isKitchenItem: line.isKitchenItem,
      modifiers: normalizeModifiers(line.modifiers),
      note: line.note?.trim() || null,
    }));

  let savedOrderId: string | null = null;
  let lastCreateError: unknown = null;
  const attempts = orderId ? 1 : 3;

  try {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        savedOrderId = await db.transaction(async (tx) => {
          let effectiveCustomerId = customerId ?? null;
          if (reservationId && !effectiveCustomerId) {
            const reservation = await tx.query.reservations.findFirst({
              where: eq(reservations.id, reservationId),
            });
            if (reservation) {
              const existingCustomer = await tx.query.customers.findFirst({
                where: eq(customers.email, reservation.customerEmail),
              });
              if (existingCustomer) {
                effectiveCustomerId = existingCustomer.id;
              } else {
                const [createdCustomer] = await tx
                  .insert(customers)
                  .values({
                    name: reservation.customerName,
                    email: reservation.customerEmail,
                    phone: reservation.customerPhone,
                  })
                  .returning({ id: customers.id });
                effectiveCustomerId = createdCustomer.id;
              }
            }
          }

          await expireStaleReservations(tx);

          if (fulfillmentType === "dine_in" && selectedTableIds.length > 0) {
            const conflictingOrder = await findActiveOrderTableConflict({
              tableIds: selectedTableIds,
              sessionId: session.id,
              excludeOrderId: orderId,
              client: tx,
            });
            if (conflictingOrder) {
              throw new Error("TABLE_OCCUPIED");
            }
            const conflictingReservation = await findReservationTableConflict({
              tableIds: selectedTableIds,
              startAt: new Date(),
              durationMinutes: 1,
              excludeReservationId: reservationId,
              client: tx,
            });
            if (conflictingReservation) {
              throw new Error("TABLE_RESERVED");
            }
          }

          if (orderId) {
            const existing = await tx.query.orders.findFirst({
              where: and(eq(orders.id, orderId), eq(orders.status, "draft")),
            });
            if (!existing) {
              return null;
            }

            await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
            await tx
              .delete(orderTables)
              .where(eq(orderTables.orderId, orderId));
            await tx
              .update(orders)
              .set({
                ...orderValues,
                customerId: effectiveCustomerId,
                kdsStage: existing.kdsStage,
              })
              .where(eq(orders.id, orderId));
            await tx.insert(orderItems).values(itemValues(orderId));
            if (fulfillmentType === "dine_in" && selectedTableIds.length > 0) {
              await tx.insert(orderTables).values(
                selectedTableIds.map((linkedTableId, index) => ({
                  orderId,
                  tableId: linkedTableId,
                  isPrimary: index === 0,
                })),
              );
            }
            if (reservationId) {
              await tx
                .update(reservations)
                .set({ status: "seated", linkedOrderId: orderId })
                .where(eq(reservations.id, reservationId));
            }
            return orderId;
          }

          const orderNumber = await generateOrderNumber(tx);
          const [created] = await tx
            .insert(orders)
            .values({
              ...orderValues,
              customerId: effectiveCustomerId,
              kdsStage: "to_cook",
              orderNumber,
            })
            .returning({ id: orders.id });
          await tx.insert(orderItems).values(itemValues(created.id));
          if (fulfillmentType === "dine_in" && selectedTableIds.length > 0) {
            await tx.insert(orderTables).values(
              selectedTableIds.map((linkedTableId, index) => ({
                orderId: created.id,
                tableId: linkedTableId,
                isPrimary: index === 0,
              })),
            );
          }
          if (reservationId) {
            await tx
              .update(reservations)
              .set({ status: "seated", linkedOrderId: created.id })
              .where(eq(reservations.id, reservationId));
          }
          return created.id;
        });
        break;
      } catch (error) {
        lastCreateError = error;
        if (error instanceof Error && error.message === "TABLE_OCCUPIED") {
          return {
            ok: false,
            error: "One of these tables already has an active order.",
          };
        }
        if (error instanceof Error && error.message === "TABLE_RESERVED") {
          return {
            ok: false,
            error: "One of these tables is reserved right now.",
          };
        }
        if (orderId || !isUniqueViolation(error)) {
          return {
            ok: false,
            error: actionErrorMessage(
              error,
              "Could not save the order. Please try again.",
            ),
          };
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === "TABLE_OCCUPIED") {
      return {
        ok: false,
        error: "One of these tables already has an active order.",
      };
    }
    if (error instanceof Error && error.message === "TABLE_RESERVED") {
      return {
        ok: false,
        error: "One of these tables is reserved right now.",
      };
    }
    return {
      ok: false,
      error: actionErrorMessage(
        error,
        "Could not save the order. Please try again.",
      ),
    };
  }

  if (!savedOrderId) {
    if (lastCreateError && !orderId) {
      return {
        ok: false,
        error: actionErrorMessage(
          lastCreateError,
          "Could not generate a unique order number. Please try again.",
        ),
      };
    }
    return { ok: false, error: "Draft order not found." };
  }

  revalidatePath("/pos");
  revalidatePath("/pos/orders");
  revalidatePath("/pos/tables");
  revalidatePath("/kds");
  publishKdsChanged({ orderId: savedOrderId });
  if (coupon) {
    await writeAuditLog({
      actorId: user.id,
      action: "discount.applied",
      entityType: "order",
      entityId: savedOrderId,
      metadata: {
        couponCode: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value,
      },
    });
  }

  return {
    ok: true,
    message: "Order sent to kitchen.",
    orderId: savedOrderId,
  };
}

function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && current.code === "23505") return true;
    if ("cause" in current) {
      current = current.cause;
    } else {
      break;
    }
  }
  return false;
}

function actionErrorMessage(error: unknown, fallback: string) {
  if (isUniqueViolation(error)) {
    return "Could not generate a unique order number. Please try again.";
  }
  if (error instanceof Error && error.message.startsWith("Failed query:")) {
    return fallback;
  }
  return fallback;
}

export async function deleteDraftOrder(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.status, "draft")),
  });
  if (!order) {
    return { ok: false, error: "Draft order not found." };
  }

  await db.delete(orders).where(eq(orders.id, id));

  revalidatePath("/pos");
  revalidatePath("/pos/orders");
  revalidatePath("/pos/tables");
  revalidatePath("/kds");
  publishKdsChanged({ orderId: id });
  await writeAuditLog({
    actorId: user.id,
    action: "order.draft_deleted",
    entityType: "order",
    entityId: id,
    metadata: {
      orderNumber: order.orderNumber,
      total: Number(order.total),
    },
  });

  return { ok: true, message: "Order deleted." };
}

export type TakePaymentResult = ActionResult<
  keyof import("@/lib/validations/payment").PaymentInput
> & {
  orderId?: string;
  receiptUrl?: string;
  emailSent?: boolean;
  emailMessage?: string;
};

export async function takePayment(
  payload: unknown,
): Promise<TakePaymentResult> {
  const user = await requireUser();

  const parsed = paymentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Invalid payment details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { orderId, method, tendered, reference } = parsed.data;
  return recordSplitPayment(user.id, {
    orderId,
    payments: [
      {
        method,
        amount: 0,
        tendered,
        reference,
      },
    ],
  });
}

export async function takeSplitPayment(
  payload: unknown,
): Promise<TakePaymentResult> {
  const user = await requireUser();

  const parsed = splitPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Invalid payment details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return recordSplitPayment(user.id, parsed.data);
}

async function recordSplitPayment(
  actorId: string,
  payload: {
    orderId: string;
    payments: {
      method: "cash" | "card" | "upi";
      amount: number;
      tendered?: number;
      reference?: string;
    }[];
  },
): Promise<TakePaymentResult> {
  const methodConfigs = await db.query.paymentMethods.findMany({
    where: eq(paymentMethods.enabled, true),
  });
  const methodConfigByType = new Map(
    methodConfigs.map((config) => [config.type, config]),
  );
  for (const payment of payload.payments) {
    const methodConfig = methodConfigByType.get(payment.method);
    if (!methodConfig) {
      return {
        ok: false,
        error: `${payment.method.toUpperCase()} is not enabled.`,
      };
    }
    if (payment.method === "upi" && !methodConfig.upiId?.trim()) {
      return {
        ok: false,
        error: "UPI is enabled but no UPI ID is configured.",
      };
    }
  }

  const paymentResult = await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: and(eq(orders.id, payload.orderId), eq(orders.status, "draft")),
      with: { customer: true, items: true },
    });
    if (!order) {
      return { ok: false as const, error: "Draft order not found." };
    }

    const kitchenItems = order.items.filter((item) => item.isKitchenItem);
    const hasKitchenItems = kitchenItems.length > 0;
    const kitchenReady =
      !hasKitchenItems ||
      (order.kdsStage === "completed" &&
        kitchenItems.every((item) => item.itemCompleted));
    if (!kitchenReady) {
      return {
        ok: false as const,
        error: "Food must be marked ready in KDS before payment.",
      };
    }

    const total = Number(order.total);
    const effectivePayments = payload.payments.map((payment) => ({
      ...payment,
      amount: payment.amount > 0 ? payment.amount : total,
    }));
    const paidTotal = roundMoney(
      effectivePayments.reduce((sum, payment) => sum + payment.amount, 0),
    );
    if (Math.abs(paidTotal - total) > 0.009) {
      return {
        ok: false as const,
        error: "Split payments must add up to the order total.",
      };
    }

    for (const payment of effectivePayments) {
      if (
        payment.method === "cash" &&
        (payment.tendered == null || payment.tendered < payment.amount)
      ) {
        return {
          ok: false as const,
          error: "Tendered cash must cover the cash payment amount.",
          fieldErrors: {
            tendered: ["Tendered cash must cover the cash payment amount."],
          },
        };
      }
    }

    await tx.insert(payments).values(
      effectivePayments.map((payment) => {
        const methodConfig = methodConfigByType.get(payment.method);
        const changeDue =
          payment.method === "cash"
            ? (payment.tendered ?? 0) - payment.amount
            : null;
        const paymentReference =
          payment.method === "cash"
            ? payment.tendered == null
              ? null
              : `Tendered ${payment.tendered.toFixed(2)}`
            : payment.reference ||
              (payment.method === "upi" ? methodConfig?.upiId : null);

        return {
          orderId: order.id,
          method: payment.method,
          amount: payment.amount.toFixed(2),
          changeDue: changeDue == null ? null : changeDue.toFixed(2),
          reference: paymentReference,
        };
      }),
    );

    await tx
      .update(orders)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "draft")));

    return {
      ok: true as const,
      orderId: order.id,
      customerEmail: order.customer?.email ?? null,
      payments: effectivePayments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
      })),
    };
  });

  if (!paymentResult.ok) {
    return paymentResult;
  }

  revalidatePath("/pos");
  revalidatePath("/pos/orders");
  revalidatePath("/pos/tables");
  revalidatePath(`/pos/orders/${paymentResult.orderId}`);
  revalidatePath(`/receipt/${paymentResult.orderId}`);
  revalidatePath("/kds");
  publishKdsChanged({ orderId: paymentResult.orderId });
  publishReportsChanged({ orderId: paymentResult.orderId });
  await writeAuditLog({
    actorId,
    action: "order.payment_recorded",
    entityType: "order",
    entityId: paymentResult.orderId,
    metadata: {
      payments: paymentResult.payments,
    },
  });

  const receiptUrl = `${getAppUrl()}/receipt/${paymentResult.orderId}`;
  const email = await sendReceiptEmail(paymentResult.orderId);
  const emailSkipped = email.ok && email.skipped === true;
  const emailSent = email.ok && !emailSkipped;
  const emailMessage = emailSkipped
    ? email.reason
    : email.ok
      ? "Receipt emailed."
      : email.error;

  return {
    ok: true,
    message: "Payment recorded.",
    orderId: paymentResult.orderId,
    receiptUrl,
    emailSent,
    emailMessage,
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function resendReceipt(
  orderId: string,
): Promise<ActionResult & { emailSent?: boolean }> {
  const user = await requireUser();
  const limit = checkRateLimit({
    scope: "pos:receipt_resend",
    identifier: `${user.id}:${orderId}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.ok) return { ok: false, error: "Receipt resend is rate limited." };

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.status, "paid")),
    with: { customer: true },
  });
  if (!order) {
    return { ok: false, error: "Paid order not found." };
  }
  if (!order.customer?.email) {
    return { ok: false, error: "This order has no customer email." };
  }

  const email = await sendReceiptEmail(orderId);
  if (!email.ok) {
    return { ok: false, error: email.error };
  }
  if (email.skipped === true) {
    return { ok: false, error: email.reason };
  }

  return { ok: true, message: "Receipt resent.", emailSent: true };
}

export type CustomerActionResult = ActionResult<
  keyof import("@/lib/validations/customers").CustomerInput
> & {
  customer?: { id: string; name: string; email: string | null };
};

export async function createCustomer(
  formData: FormData,
): Promise<CustomerActionResult> {
  await requireUser();

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [created] = await db.insert(customers).values(parsed.data).returning({
    id: customers.id,
    name: customers.name,
    email: customers.email,
  });

  revalidatePath("/pos/customers");
  revalidatePath("/pos");

  return {
    ok: true,
    message: "Customer created.",
    customer: created,
  };
}

export async function updateCustomer(
  id: string,
  formData: FormData,
): Promise<CustomerActionResult> {
  await requireUser();

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [updated] = await db
    .update(customers)
    .set(parsed.data)
    .where(eq(customers.id, id))
    .returning({ id: customers.id });

  if (!updated) return { ok: false, error: "Customer not found." };

  revalidatePath("/pos/customers");
  return { ok: true, message: "Customer updated." };
}

export async function fetchCustomerUsual(customerId: string) {
  await requireUser();
  if (!customerId) {
    return { ok: false as const, error: "Select a customer first." };
  }

  const usual = await getCustomerUsualProduct(customerId);
  if (!usual) {
    return {
      ok: false as const,
      error: "No past orders found for this customer yet.",
    };
  }
  if (usual.isOutOfStock) {
    return {
      ok: false as const,
      error: `${usual.name} is out of stock right now.`,
    };
  }

  return { ok: true as const, usual };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  await requireUser();

  const [deleted] = await db
    .delete(customers)
    .where(eq(customers.id, id))
    .returning({ id: customers.id });

  if (!deleted) return { ok: false, error: "Customer not found." };

  revalidatePath("/pos/customers");
  return { ok: true, message: "Customer deleted." };
}
