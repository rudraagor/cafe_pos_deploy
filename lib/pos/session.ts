import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, posSessions } from "@/lib/db/schema";

export async function getOpenSessionForUser(userId: string) {
  return db.query.posSessions.findFirst({
    where: and(
      eq(posSessions.openedBy, userId),
      eq(posSessions.status, "open"),
    ),
    orderBy: [desc(posSessions.openedAt)],
  });
}

export async function getLatestOpenSession() {
  return db.query.posSessions.findFirst({
    where: eq(posSessions.status, "open"),
    orderBy: [desc(posSessions.openedAt)],
  });
}

export async function getLastClosedSession(userId: string) {
  return db.query.posSessions.findFirst({
    where: and(
      eq(posSessions.openedBy, userId),
      eq(posSessions.status, "closed"),
    ),
    orderBy: [desc(posSessions.closedAt)],
  });
}

export async function getSessionClosingAmount(sessionId: string) {
  const sessionOrders = await db.query.orders.findMany({
    where: and(eq(orders.sessionId, sessionId), eq(orders.status, "paid")),
  });

  return sessionOrders.reduce((sum, order) => sum + Number(order.total), 0);
}

export async function getSessionExpectedCash(sessionId: string) {
  const session = await db.query.posSessions.findFirst({
    where: eq(posSessions.id, sessionId),
  });
  const sessionOrders = await db.query.orders.findMany({
    where: and(eq(orders.sessionId, sessionId), eq(orders.status, "paid")),
    with: {
      payments: true,
    },
  });

  const cashSales = sessionOrders.reduce((sum, order) => {
    return (
      sum +
      order.payments
        .filter((payment) => payment.method === "cash")
        .reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0)
    );
  }, 0);

  return Number(session?.openingFloat ?? 0) + cashSales;
}
