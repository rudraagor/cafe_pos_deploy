"use server";

import { and, eq, isNull } from "drizzle-orm";
import type { ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  orderItems,
  orders,
  payments,
  posSessions,
  products,
} from "@/lib/db/schema";
import { computeOrder } from "@/lib/pos/pricing";
import { generateOrderNumber, getActivePromotions } from "@/lib/pos/queries";
import { getOpenSessionForUser } from "@/lib/pos/session";
import {
  publishKdsChanged,
  publishReportsChanged,
} from "@/lib/realtime/publish";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function simulateLunchRushBurst(
  count = 3,
): Promise<ActionResult & { created?: number; paid?: number; kds?: number }> {
  const actor = await requireRole("admin");
  const limit = checkRateLimit({
    scope: "demo:lunch_rush",
    identifier: actor.id,
    limit: 12,
    windowMs: 60 * 1000,
  });
  if (!limit.ok)
    return { ok: false, error: "Lunch rush demo is rate limited." };

  const safeCount = Math.min(Math.max(Math.floor(count), 1), 10);
  const catalog = await db.query.products.findMany({
    where: and(isNull(products.archivedAt), eq(products.isOutOfStock, false)),
    limit: 80,
  });
  if (catalog.length === 0) {
    return { ok: false, error: "Add active products before simulating rush." };
  }

  const session = await ensureDemoSession(actor.id);
  const promotions = await getActivePromotions();
  let paid = 0;
  let kds = 0;

  for (let i = 0; i < safeCount; i += 1) {
    const picked = pickProducts(catalog);
    const pricingItems = picked.map((product) => ({
      productId: product.id,
      name: product.name,
      unitPrice: Number(product.price),
      taxRate: Number(product.taxRate),
      qty: 1 + Math.floor(Math.random() * 3),
      isKitchenItem: product.isKitchenItem,
      categoryId: product.categoryId,
      modifiers: [],
      supportedModifiers: Array.isArray(product.supportedModifiers)
        ? product.supportedModifiers.map(String)
        : [],
    }));
    const computed = computeOrder(pricingItems, { promotions });
    const shouldPay = Math.random() > 0.35;

    const createdOrderId = await db.transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx);
      const [created] = await tx
        .insert(orders)
        .values({
          orderNumber,
          sessionId: session.id,
          fulfillmentType: "takeaway",
          employeeId: actor.id,
          status: shouldPay ? "paid" : "draft",
          kdsStage: "to_cook",
          subtotal: computed.subtotal.toFixed(2),
          tax: computed.tax.toFixed(2),
          discountTotal: computed.discountTotal.toFixed(2),
          total: computed.total.toFixed(2),
          sentToKitchenAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        computed.lines.map((line) => ({
          orderId: created.id,
          productId: line.productId,
          nameSnapshot: line.name,
          unitPrice: line.unitPrice.toFixed(2),
          quantity: line.qty,
          taxRateSnapshot: line.taxRate.toFixed(2),
          lineDiscount: line.lineDiscount.toFixed(2),
          lineTotal: line.lineTotal.toFixed(2),
          isKitchenItem: line.isKitchenItem,
          modifiers: [],
        })),
      );

      if (shouldPay) {
        await tx.insert(payments).values({
          orderId: created.id,
          method: Math.random() > 0.5 ? "upi" : "card",
          amount: computed.total.toFixed(2),
          reference: "Lunch rush simulator",
        });
      }

      return created.id;
    });

    if (shouldPay) {
      paid += 1;
      publishReportsChanged({ orderId: createdOrderId });
    } else {
      kds += 1;
      publishKdsChanged({ orderId: createdOrderId });
    }
  }

  await writeAuditLog({
    actorId: actor.id,
    action: "demo.lunch_rush_burst",
    entityType: "pos_session",
    entityId: session.id,
    metadata: { created: safeCount, paid, kds },
  });

  return {
    ok: true,
    message: `Created ${safeCount} lunch rush orders.`,
    created: safeCount,
    paid,
    kds,
  };
}

async function ensureDemoSession(userId: string) {
  const existing = await getOpenSessionForUser(userId);
  if (existing) return existing;

  const [session] = await db
    .insert(posSessions)
    .values({
      openedBy: userId,
      openingFloat: "0.00",
      status: "open",
    })
    .returning();
  return session;
}

function pickProducts<T>(items: T[]) {
  const count = Math.min(items.length, 1 + Math.floor(Math.random() * 3));
  const picked: T[] = [];
  while (picked.length < count) {
    const item = items[Math.floor(Math.random() * items.length)];
    if (!picked.includes(item)) picked.push(item);
  }
  return picked;
}
