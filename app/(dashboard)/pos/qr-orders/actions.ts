"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import {
  publishKdsChanged,
  publishReportsChanged,
} from "@/lib/realtime/publish";
import { checkRateLimit } from "@/lib/security/rate-limit";

function revalidateQrOrderViews(orderId: string) {
  revalidatePath("/pos");
  revalidatePath("/pos/orders");
  revalidatePath("/pos/tables");
  revalidatePath(`/pos/orders/${orderId}`);
  revalidatePath("/kds");
}

export async function approveQrOrder(orderId: string): Promise<ActionResult> {
  const user = await requireUser();
  const limit = checkRateLimit({
    scope: "pos:qr_order_approval",
    identifier: user.id,
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) return { ok: false, error: "QR approvals are rate limited." };

  const [updated] = await db
    .update(orders)
    .set({
      status: "draft",
      employeeId: user.id,
      sentToKitchenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "unapproved")))
    .returning({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
    });

  if (!updated) return { ok: false, error: "Pending QR order not found." };

  revalidateQrOrderViews(orderId);
  publishKdsChanged({ orderId });
  publishReportsChanged({ orderId });
  await writeAuditLog({
    actorId: user.id,
    action: "qr_order.approved",
    entityType: "order",
    entityId: orderId,
    metadata: {
      orderNumber: updated.orderNumber,
      total: Number(updated.total),
    },
  });

  return { ok: true, message: "QR order approved and sent to KDS." };
}

export async function rejectQrOrder(orderId: string): Promise<ActionResult> {
  const user = await requireUser();
  const limit = checkRateLimit({
    scope: "pos:qr_order_reject",
    identifier: user.id,
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) return { ok: false, error: "QR rejections are rate limited." };

  const [updated] = await db
    .update(orders)
    .set({
      status: "cancelled",
      employeeId: user.id,
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "unapproved")))
    .returning({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
    });

  if (!updated) return { ok: false, error: "Pending QR order not found." };

  revalidateQrOrderViews(orderId);
  await writeAuditLog({
    actorId: user.id,
    action: "qr_order.rejected",
    entityType: "order",
    entityId: orderId,
    metadata: {
      orderNumber: updated.orderNumber,
      total: Number(updated.total),
    },
  });

  return { ok: true, message: "QR order rejected." };
}
