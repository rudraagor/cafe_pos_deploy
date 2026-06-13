"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  customers,
  orders,
  orderItems,
  paymentMethods,
  payments,
  posSessions,
} from "@/lib/db/schema";
import { sendReceiptEmail } from "@/lib/email/send-receipt";
import { computeOrder } from "@/lib/pos/pricing";
import {
  findCouponByCode,
  generateOrderNumber,
  getActivePromotions,
  getProductsByIds,
} from "@/lib/pos/queries";
import {
  getLastClosedSession,
  getOpenSessionForUser,
  getSessionClosingAmount,
} from "@/lib/pos/session";
import { getAppUrl } from "@/lib/receipt-brand";
import { publishKdsChanged, publishReportsChanged } from "@/lib/realtime/publish";
import {
  modifiersAllowNote,
  normalizeModifiers,
} from "@/lib/pos/modifiers";
import { customerSchema } from "@/lib/validations/customers";
import { sendToKitchenSchema } from "@/lib/validations/order";
import { paymentSchema } from "@/lib/validations/payment";

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
    openedAt: Date;
    closedAt: Date;
  };
};

export async function closeSession(): Promise<CloseSessionResult> {
  const user = await requireUser();
  const session = await getOpenSessionForUser(user.id);
  if (!session) {
    return { ok: false, error: "No open session found." };
  }

  const closingAmount = await getSessionClosingAmount(session.id);
  const sessionOrders = await db.query.orders.findMany({
    where: eq(orders.sessionId, session.id),
  });

  const closedAt = new Date();
  await db
    .update(posSessions)
    .set({
      status: "closed",
      closedAt,
      closingAmount: closingAmount.toFixed(2),
    })
    .where(eq(posSessions.id, session.id));

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
      openedAt: session.openedAt,
      closedAt,
    },
  };
}

export async function validateCoupon(
  code: string,
): Promise<
  | { ok: true; coupon: { id: string; code: string; discountType: string; value: number } }
  | { ok: false; error: string }
> {
  await requireUser();

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

  const { fulfillmentType, tableId, orderId, items, couponCode, customerId } =
    parsed.data;

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
      modifiers: normalizeModifiers(item.modifiers),
      note: item.note?.trim() || undefined,
      supportedModifiers: normalizeModifiers(product.supportedModifiers),
    };
  });
  const hasMissingProduct = pricingItems.some((item) => item === null);
  if (hasMissingProduct) {
    return { ok: false, error: "One of the selected products no longer exists." };
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
    };
  }

  const computed = computeOrder(validPricingItems, { promotions, coupon });

  const orderValues = {
    sessionId: session.id,
    tableId: fulfillmentType === "dine_in" ? tableId : null,
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
        if (fulfillmentType === "dine_in" && tableId) {
          const conflictingOrder = await tx.query.orders.findFirst({
            where: and(
              eq(orders.sessionId, session.id),
              eq(orders.tableId, tableId),
              eq(orders.fulfillmentType, "dine_in"),
              ne(orders.status, "cancelled"),
              orderId ? ne(orders.id, orderId) : sql`true`,
              sql`not (${orders.status} = 'paid' and ${orders.kdsStage} = 'completed')`,
            ),
          });
          if (conflictingOrder) {
            throw new Error("TABLE_OCCUPIED");
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
            .update(orders)
            .set({
              ...orderValues,
              kdsStage: existing.kdsStage,
            })
            .where(eq(orders.id, orderId));
          await tx.insert(orderItems).values(itemValues(orderId));
          return orderId;
        }

        const orderNumber = await generateOrderNumber(tx);
        const [created] = await tx
          .insert(orders)
          .values({ ...orderValues, kdsStage: "to_cook", orderNumber })
          .returning({ id: orders.id });
        await tx.insert(orderItems).values(itemValues(created.id));
        return created.id;
      });
      break;
    } catch (error) {
      lastCreateError = error;
      if (error instanceof Error && error.message === "TABLE_OCCUPIED") {
        return {
          ok: false,
          error: "This table already has an active order.",
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
        error: "This table already has an active order.",
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
  await requireUser();

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
  await requireUser();

  const parsed = paymentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Invalid payment details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { orderId, method, tendered, reference } = parsed.data;
  const methodConfig = await db.query.paymentMethods.findFirst({
    where: and(eq(paymentMethods.type, method), eq(paymentMethods.enabled, true)),
  });
  if (!methodConfig) {
    return { ok: false, error: "This payment method is not enabled." };
  }
  if (method === "upi" && !methodConfig.upiId?.trim()) {
    return { ok: false, error: "UPI is enabled but no UPI ID is configured." };
  }

  const paymentResult = await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.status, "draft")),
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
    if (method === "cash" && (tendered == null || tendered < total)) {
      return {
        ok: false as const,
        error: "Tendered cash must cover the order total.",
        fieldErrors: {
          tendered: ["Tendered cash must cover the order total."],
        },
      };
    }

    const changeDue = method === "cash" ? (tendered ?? 0) - total : null;
    const paymentReference =
      method === "cash"
        ? tendered == null
          ? null
          : `Tendered ${tendered.toFixed(2)}`
        : reference || (method === "upi" ? methodConfig.upiId : null);

    await tx.insert(payments).values({
      orderId: order.id,
      method,
      amount: total.toFixed(2),
      changeDue: changeDue == null ? null : changeDue.toFixed(2),
      reference: paymentReference,
    });

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

  const receiptUrl = `${getAppUrl()}/receipt/${paymentResult.orderId}`;
  const email = await sendReceiptEmail(paymentResult.orderId);
  const emailSkipped = email.ok && email.skipped === true;
  const emailSent = email.ok && !emailSkipped;
  const emailMessage =
    emailSkipped
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

export async function resendReceipt(
  orderId: string,
): Promise<ActionResult & { emailSent?: boolean }> {
  await requireUser();

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

  const [created] = await db
    .insert(customers)
    .values(parsed.data)
    .returning({
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
