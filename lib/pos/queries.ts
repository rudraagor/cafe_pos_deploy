import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  coupons,
  customers,
  floors,
  orders,
  orderItems,
  products,
  promotions,
  tables,
} from "@/lib/db/schema";
import type { PromotionInput } from "./pricing";

export async function getActiveProducts() {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      taxRate: products.taxRate,
      isKitchenItem: products.isKitchenItem,
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

export async function getOccupiedTableIds(sessionId: string) {
  const activeOrders = await db
    .select({ tableId: orders.tableId })
    .from(orders)
    .where(
      and(
        eq(orders.sessionId, sessionId),
        ne(orders.status, "paid"),
        ne(orders.status, "cancelled"),
        sql`${orders.tableId} is not null`,
      ),
    );

  return new Set(
    activeOrders.map((o) => o.tableId).filter((id): id is string => !!id),
  );
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
    },
  });
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

export async function generateOrderNumber(sessionId: string) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ORD-${datePart}-`;

  const existing = await db.query.orders.findMany({
    where: and(
      eq(orders.sessionId, sessionId),
      sql`${orders.orderNumber} like ${prefix + "%"}`,
    ),
  });

  const next = existing.length + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
