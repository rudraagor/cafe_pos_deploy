"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  customers,
  orders,
  orderItems,
  posSessions,
} from "@/lib/db/schema";
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
import { customerSchema } from "@/lib/validations/customers";
import { sendToKitchenSchema } from "@/lib/validations/order";

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

  const { tableId, orderId, items, couponCode, customerId } = parsed.data;

  const productIds = items.map((i) => i.productId);
  const dbProducts = await getProductsByIds(productIds);
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  const pricingItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} not found.`);
    }
    return {
      productId: item.productId,
      name: product.name,
      unitPrice: Number(product.price),
      taxRate: Number(product.taxRate),
      qty: item.qty,
      isKitchenItem: product.isKitchenItem,
    };
  });

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

  const computed = computeOrder(pricingItems, { promotions, coupon });

  const orderValues = {
    sessionId: session.id,
    tableId,
    customerId: customerId ?? null,
    employeeId: user.id,
    couponId: coupon?.id ?? null,
    status: "draft" as const,
    kdsStage: "to_cook" as const,
    subtotal: computed.subtotal.toFixed(2),
    tax: computed.tax.toFixed(2),
    discountTotal: computed.discountTotal.toFixed(2),
    total: computed.total.toFixed(2),
    sentToKitchenAt: new Date(),
    updatedAt: new Date(),
  };

  let savedOrderId: string;

  if (orderId) {
    const existing = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.status, "draft")),
    });
    if (!existing) {
      return { ok: false, error: "Draft order not found." };
    }

    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.update(orders).set(orderValues).where(eq(orders.id, orderId));
    savedOrderId = orderId;
  } else {
    const orderNumber = await generateOrderNumber(session.id);
    const [created] = await db
      .insert(orders)
      .values({ ...orderValues, orderNumber })
      .returning({ id: orders.id });
    savedOrderId = created.id;
  }

  await db.insert(orderItems).values(
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
    })),
  );

  revalidatePath("/pos");
  revalidatePath("/pos/orders");
  revalidatePath("/pos/tables");

  return {
    ok: true,
    message: "Order sent to kitchen.",
    orderId: savedOrderId,
  };
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

  return { ok: true, message: "Order deleted." };
}

export type CustomerActionResult = ActionResult<
  keyof import("@/lib/validations/customers").CustomerInput
>;

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

  await db.insert(customers).values(parsed.data);
  revalidatePath("/pos/customers");

  return { ok: true, message: "Customer created." };
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
