import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "@/lib/db";
import {
  categories,
  coupons,
  orders,
  orderItems,
  paymentMethods,
  products,
  promotions,
  tables,
} from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import type { PromotionInput } from "./pricing";

type DbClient = NodePgDatabase<typeof schema>;

export async function getActiveProducts() {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      taxRate: products.taxRate,
      isKitchenItem: products.isKitchenItem,
      supportedModifiers: products.supportedModifiers,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(isNull(products.archivedAt))
    .orderBy(products.name);
}

export async function getActiveCategories() {
  return db.query.categories.findMany({
    orderBy: (c, { asc }) => [asc(c.name)],
  });
}

export async function getActivePromotions(): Promise<PromotionInput[]> {
  const rows = await db.query.promotions.findMany({
    where: eq(promotions.active, true),
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    scope: row.scope,
    productId: row.productId,
    minQuantity: row.minQuantity,
    minOrderAmount: row.minOrderAmount ? Number(row.minOrderAmount) : null,
    discountType: row.discountType,
    value: Number(row.value),
  }));
}

export async function getFloorsWithTables() {
  const allFloors = await db.query.floors.findMany({
    with: {
      tables: {
        where: eq(tables.active, true),
        orderBy: (t, { asc }) => [asc(t.number)],
      },
    },
    orderBy: (f, { asc }) => [asc(f.name)],
  });
  return allFloors;
}

export async function getActiveTableOccupancies(sessionId: string) {
  const activeOrders = await db
    .select({
      tableId: orders.tableId,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      kdsStage: orders.kdsStage,
    })
    .from(orders)
    .where(
      and(
        eq(orders.sessionId, sessionId),
        eq(orders.fulfillmentType, "dine_in"),
        ne(orders.status, "cancelled"),
        sql`${orders.tableId} is not null`,
        sql`not (${orders.status} = 'paid' and ${orders.kdsStage} = 'completed')`,
      ),
    );

  return new Map(
    activeOrders.filter((order) => order.tableId).map((order) => [
      order.tableId!,
      {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        status: order.status,
        kdsStage: order.kdsStage,
      },
    ]),
  );
}

export async function getOccupiedTableIds(sessionId: string) {
  return new Set((await getActiveTableOccupancies(sessionId)).keys());
}

export async function getTableById(tableId: string) {
  return db.query.tables.findFirst({
    where: eq(tables.id, tableId),
    with: { floor: true },
  });
}

export async function getSessionOrders(sessionId: string) {
  return db.query.orders.findMany({
    where: eq(orders.sessionId, sessionId),
    with: {
      customer: true,
      table: true,
    },
    orderBy: [desc(orders.createdAt)],
  });
}

export async function getOrderDetail(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: true,
      table: { with: { floor: true } },
      items: true,
      coupon: true,
      payments: true,
    },
  });
}

export async function getEnabledPaymentMethods() {
  return db.query.paymentMethods.findMany({
    where: eq(paymentMethods.enabled, true),
    orderBy: (method, { asc }) => [asc(method.type)],
  });
}

export async function getPayableOrder(orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.status, "draft")),
    with: {
      customer: true,
      table: { with: { floor: true } },
      items: true,
      payments: true,
    },
  });
}

export async function getOrderForReceipt(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: true,
      employee: true,
      table: { with: { floor: true } },
      items: true,
      coupon: true,
      payments: {
        orderBy: (payment, { asc }) => [asc(payment.createdAt)],
      },
    },
  });
}

export async function getKitchenTickets() {
  const rows = await db.query.orders.findMany({
    where: and(
      ne(orders.status, "cancelled"),
      sql`(
        ${orders.kdsStage} in ('to_cook', 'preparing')
        or (
          ${orders.kdsStage} = 'completed'
          and ${orders.updatedAt} >= now() - interval '10 minutes'
        )
      )`,
    ),
    with: {
      table: { with: { floor: true } },
      items: {
        where: eq(orderItems.isKitchenItem, true),
        with: {
          product: {
            with: {
              category: true,
            },
          },
        },
        orderBy: (item, { asc }) => [asc(item.createdAt)],
      },
    },
    orderBy: [asc(orders.sentToKitchenAt), asc(orders.createdAt)],
  });

  return rows.filter((order) => order.items.length > 0);
}

export async function getCustomers() {
  return db.query.customers.findMany({
    orderBy: (c, { asc }) => [asc(c.name)],
  });
}

export async function findCouponByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  return db.query.coupons.findFirst({
    where: and(
      eq(coupons.active, true),
      sql`upper(${coupons.code}) = ${normalized}`,
    ),
  });
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.query.products.findMany({
    where: inArray(products.id, ids),
  });
}

/** Next order number for today. Globally unique (not per-session). */
export async function generateOrderNumber(tx: DbClient = db) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ORD-${datePart}-`;
  const suffixStart = prefix.length + 1;

  const [row] = await tx
    .select({
      maxSuffix: sql<number | null>`max(nullif(substring(${orders.orderNumber} from ${sql.raw(String(suffixStart))}), '')::int)`,
    })
    .from(orders)
    .where(sql`${orders.orderNumber} like ${prefix + "%"}`);

  const next = (row?.maxSuffix ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
