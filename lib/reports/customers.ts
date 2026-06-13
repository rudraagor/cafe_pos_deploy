import { and, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  orderItems,
  orders,
  posSessions,
} from "@/lib/db/schema";
import { formatMergedTableLabel } from "@/lib/pos/table-labels";
import type { ReportFilters, ReportRange } from "./range";

function paidOrdersWhere(filters: ReportRange | ReportFilters) {
  const conditions = [
    eq(orders.status, "paid"),
    gte(orders.updatedAt, filters.start),
    lt(orders.updatedAt, filters.end),
  ];
  if ("employeeIds" in filters && filters.employeeIds.length > 0) {
    conditions.push(inArray(orders.employeeId, filters.employeeIds));
  }
  if ("sessionIds" in filters && filters.sessionIds.length > 0) {
    conditions.push(inArray(orders.sessionId, filters.sessionIds));
  }
  if ("productIds" in filters && filters.productIds.length > 0) {
    conditions.push(sql`exists (
      select 1 from order_items report_product_filter
      where report_product_filter.order_id = orders.id
        and report_product_filter.product_id in (${sql.join(
          filters.productIds.map((id) => sql`${id}`),
          sql`, `,
        )})
    )`);
  }
  return and(...conditions);
}

function serializeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export async function getCustomerProfile(
  customerId: string,
  filters: ReportRange | ReportFilters,
) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });
  if (!customer) return null;

  const [stats] = await db
    .select({
      orderCount: sql<number>`count(${orders.id})::int`,
      totalSpend: sql<string>`coalesce(sum(${orders.total}), 0)`,
      lastOrderAt: sql<Date | null>`max(${orders.updatedAt})`,
    })
    .from(orders)
    .where(and(paidOrdersWhere(filters), eq(orders.customerId, customerId)));

  const [favorite] = await db
    .select({
      product: orderItems.nameSnapshot,
      quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(paidOrdersWhere(filters), eq(orders.customerId, customerId)))
    .groupBy(orderItems.nameSnapshot)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(1);

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    createdAt: serializeDate(customer.createdAt),
    orderCount: Number(stats?.orderCount ?? 0),
    totalSpend: Number(stats?.totalSpend ?? 0),
    lastOrderAt: serializeDate(stats?.lastOrderAt),
    favoriteProduct: favorite?.product ?? null,
  };
}

export async function getCustomerOrderHistory(
  customerId: string,
  filters: ReportRange | ReportFilters,
  limit = 10,
) {
  const rows = await db.query.orders.findMany({
    where: and(paidOrdersWhere(filters), eq(orders.customerId, customerId)),
    with: { employee: true, table: true },
    orderBy: [desc(orders.updatedAt)],
    limit,
  });

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    paidAt: serializeDate(row.updatedAt),
    employee: row.employee?.name ?? "Unknown",
    tableNumber: row.table?.number ?? null,
    total: Number(row.total),
  }));
}

export async function searchCustomersForMarketing(
  query: string,
  filters: ReportRange | ReportFilters,
  limit = 50,
) {
  const trimmed = query.trim();

  const baseQuery = db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      orderCount: sql<number>`count(${orders.id})::int`,
      totalSpend: sql<string>`coalesce(sum(${orders.total}), 0)`,
      lastOrderAt: sql<Date | null>`max(${orders.updatedAt})`,
    })
    .from(customers)
    .leftJoin(
      orders,
      and(paidOrdersWhere(filters), eq(orders.customerId, customers.id)),
    )
    .groupBy(customers.id);

  const rows = trimmed
    ? await baseQuery
        .where(
          or(
            ilike(customers.name, `%${trimmed}%`),
            ilike(customers.email, `%${trimmed}%`),
            ilike(customers.phone, `%${trimmed}%`),
          ),
        )
        .orderBy(desc(sql`coalesce(sum(${orders.total}), 0)`))
        .limit(limit)
    : await baseQuery
        .orderBy(desc(sql`coalesce(sum(${orders.total}), 0)`))
        .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    orderCount: Number(row.orderCount),
    totalSpend: Number(row.totalSpend),
    lastOrderAt: serializeDate(row.lastOrderAt),
  }));
}

export async function getAdminLiveFloor() {
  const openSession = await db.query.posSessions.findFirst({
    where: eq(posSessions.status, "open"),
    orderBy: [desc(posSessions.openedAt)],
  });
  if (!openSession) {
    return { sessionOpen: false as const, floors: [] as LiveFloorEntry[] };
  }

  const activeOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.sessionId, openSession.id),
      eq(orders.fulfillmentType, "dine_in"),
      sql`${orders.status} <> 'cancelled'`,
      sql`not (${orders.status} = 'paid' and ${orders.kdsStage} = 'completed')`,
    ),
    with: {
      customer: true,
      table: { with: { floor: true } },
      orderTables: { with: { table: { with: { floor: true } } } },
    },
    orderBy: [desc(orders.createdAt)],
  });

  return {
    sessionOpen: true as const,
    sessionId: openSession.id,
    floors: activeOrders.map((row) => {
      const linkedTables =
        row.orderTables.length > 0
          ? row.orderTables
              .slice()
              .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
              .map((link) => link.table)
          : row.table
            ? [row.table]
            : [];
      const primary = linkedTables[0];
      return {
        orderId: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        kdsStage: row.kdsStage,
        total: Number(row.total),
        tableNumber: primary?.number ?? 0,
        floorName: primary?.floor?.name ?? "Floor",
        tableLabel: linkedTables.length
          ? formatMergedTableLabel(linkedTables)
          : "—",
        customerId: row.customerId,
        customerName: row.customer?.name ?? "Walk-in",
      };
    }),
  };
}

export type LiveFloorEntry = {
  orderId: string;
  orderNumber: string;
  status: string;
  kdsStage: string;
  total: number;
  tableNumber: number;
  floorName: string;
  tableLabel: string;
  customerId: string | null;
  customerName: string;
};
