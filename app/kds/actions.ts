"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ActionResult } from "@/lib/action-result";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { KDS_UNLOCK_COOKIE } from "@/lib/kds/access";
import { publishKdsChanged } from "@/lib/realtime/publish";
import {
  checkRateLimit,
  clientIpFromServerAction,
} from "@/lib/security/rate-limit";

function configuredPin() {
  return process.env.KDS_PIN?.trim() || "2468";
}

function revalidateKds(orderId?: string) {
  revalidatePath("/kds");
  revalidatePath("/pos/orders");
  if (orderId) revalidatePath(`/pos/orders/${orderId}`);
}

async function requireKdsUnlock() {
  const cookieStore = await cookies();
  if (cookieStore.get(KDS_UNLOCK_COOKIE)?.value !== "true") {
    return { ok: false as const, error: "Unlock the kitchen display first." };
  }

  const ip = await clientIpFromServerAction();
  const limit = checkRateLimit({
    scope: "kds:mutation",
    identifier: ip,
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) {
    return { ok: false as const, error: "Kitchen actions are rate limited." };
  }

  return { ok: true as const };
}

export async function unlockKds(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await clientIpFromServerAction();
  const limit = checkRateLimit({
    scope: "kds:unlock",
    identifier: ip,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.ok) return { ok: false, error: "Too many PIN attempts." };

  const pin = String(formData.get("pin") ?? "").trim();
  if (pin !== configuredPin()) {
    return { ok: false, error: "Incorrect kitchen PIN." };
  }

  const cookieStore = await cookies();
  cookieStore.set(KDS_UNLOCK_COOKIE, "true", {
    httpOnly: true,
    sameSite: "lax",
    path: "/kds",
    maxAge: 60 * 60 * 12,
  });

  revalidatePath("/kds");
  return { ok: true, message: "Kitchen display unlocked." };
}

export async function advanceTicket(orderId: string): Promise<ActionResult> {
  const access = await requireKdsUnlock();
  if (!access.ok) return access;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), ne(orders.status, "cancelled")),
  });
  if (!order) return { ok: false, error: "Kitchen ticket not found." };

  const nextStage =
    order.kdsStage === "to_cook"
      ? "preparing"
      : order.kdsStage === "preparing"
        ? "completed"
        : "completed";

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ kdsStage: nextStage, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    if (nextStage === "completed") {
      await tx
        .update(orderItems)
        .set({ itemCompleted: true })
        .where(
          and(
            eq(orderItems.orderId, orderId),
            eq(orderItems.isKitchenItem, true),
          ),
        );
    }
  });

  publishKdsChanged({ orderId });
  revalidateKds(orderId);
  return { ok: true, message: "Ticket updated." };
}

export async function recallTicket(orderId: string): Promise<ActionResult> {
  const access = await requireKdsUnlock();
  if (!access.ok) return access;

  const [updated] = await db
    .update(orders)
    .set({ kdsStage: "preparing", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.kdsStage, "completed")))
    .returning({ id: orders.id });

  if (!updated) return { ok: false, error: "Completed ticket not found." };

  publishKdsChanged({ orderId });
  revalidateKds(orderId);
  return { ok: true, message: "Ticket recalled." };
}

export async function toggleItemCompleted(
  orderItemId: string,
): Promise<ActionResult> {
  const access = await requireKdsUnlock();
  if (!access.ok) return access;

  const item = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, orderItemId),
    with: { order: true },
  });
  if (!item || !item.isKitchenItem || item.order.status === "cancelled") {
    return { ok: false, error: "Kitchen item not found." };
  }

  const nextCompleted = !item.itemCompleted;
  const orderId = item.orderId;

  await db.transaction(async (tx) => {
    await tx
      .update(orderItems)
      .set({ itemCompleted: nextCompleted })
      .where(eq(orderItems.id, orderItemId));

    const kitchenItems = await tx.query.orderItems.findMany({
      where: and(
        eq(orderItems.orderId, orderId),
        eq(orderItems.isKitchenItem, true),
      ),
    });

    const allCompleted =
      kitchenItems.length > 0 &&
      kitchenItems.every((row) =>
        row.id === orderItemId ? nextCompleted : row.itemCompleted,
      );

    const nextStage = allCompleted
      ? "completed"
      : item.order.kdsStage === "completed"
        ? "preparing"
        : item.order.kdsStage === "to_cook" && nextCompleted
          ? "preparing"
          : item.order.kdsStage;

    await tx
      .update(orders)
      .set({ kdsStage: nextStage, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  });

  publishKdsChanged({ orderId });
  revalidateKds(orderId);
  return { ok: true, message: "Item updated." };
}
