import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "@/lib/db";
import {
  orderTables,
  orders,
  reservationTables,
  reservations,
  tables,
} from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";

type DbClient = NodePgDatabase<typeof schema>;

export const RESERVATION_GRACE_MINUTES = 30;

export function reservationEnd(startAt: Date, durationMinutes: number) {
  return new Date(startAt.getTime() + durationMinutes * 60000);
}

export async function expireStaleReservations(client: DbClient = db) {
  await client
    .update(reservations)
    .set({ status: "expired" })
    .where(
      and(
        eq(reservations.status, "booked"),
        isNull(reservations.linkedOrderId),
        sql`${reservations.startAt} + interval '${sql.raw(
          String(RESERVATION_GRACE_MINUTES),
        )} minutes' < now()`,
      ),
    );
}

export async function findReservationTableConflict(input: {
  tableIds: string[];
  startAt: Date;
  durationMinutes: number;
  excludeReservationId?: string;
  client?: DbClient;
}) {
  const client = input.client ?? db;
  if (input.tableIds.length === 0) return null;
  const endAt = reservationEnd(input.startAt, input.durationMinutes);

  const [conflict] = await client
    .select({
      reservationId: reservations.id,
      customerName: reservations.customerName,
    })
    .from(reservations)
    .innerJoin(
      reservationTables,
      eq(reservationTables.reservationId, reservations.id),
    )
    .where(
      and(
        inArray(reservationTables.tableId, input.tableIds),
        eq(reservations.status, "booked"),
        input.excludeReservationId
          ? ne(reservations.id, input.excludeReservationId)
          : sql`true`,
        sql`${reservations.startAt} < ${endAt}`,
        sql`${reservations.startAt} + (${reservations.durationMinutes} * interval '1 minute') > ${input.startAt}`,
      ),
    )
    .limit(1);

  return conflict ?? null;
}

export async function findActiveOrderTableConflict(input: {
  tableIds: string[];
  sessionId?: string;
  excludeOrderId?: string;
  client?: DbClient;
}) {
  const client = input.client ?? db;
  if (input.tableIds.length === 0) return null;

  const [joinConflict] = await client
    .select({ orderId: orders.id, orderNumber: orders.orderNumber })
    .from(orderTables)
    .innerJoin(orders, eq(orderTables.orderId, orders.id))
    .where(
      and(
        inArray(orderTables.tableId, input.tableIds),
        input.sessionId ? eq(orders.sessionId, input.sessionId) : sql`true`,
        eq(orders.fulfillmentType, "dine_in"),
        ne(orders.status, "cancelled"),
        input.excludeOrderId ? ne(orders.id, input.excludeOrderId) : sql`true`,
        sql`not (${orders.status} = 'paid' and ${orders.kdsStage} = 'completed')`,
      ),
    )
    .limit(1);

  if (joinConflict) return joinConflict;

  const [legacyConflict] = await client
    .select({ orderId: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(
      and(
        inArray(orders.tableId, input.tableIds),
        input.sessionId ? eq(orders.sessionId, input.sessionId) : sql`true`,
        eq(orders.fulfillmentType, "dine_in"),
        ne(orders.status, "cancelled"),
        input.excludeOrderId ? ne(orders.id, input.excludeOrderId) : sql`true`,
        sql`not (${orders.status} = 'paid' and ${orders.kdsStage} = 'completed')`,
      ),
    )
    .limit(1);

  return legacyConflict ?? null;
}

export async function getTableLabelsByIds(tableIds: string[], client: DbClient = db) {
  if (tableIds.length === 0) return [];
  return client.query.tables.findMany({
    where: inArray(tables.id, tableIds),
    with: { floor: true },
    orderBy: (table, { asc }) => [asc(table.number)],
  });
}
