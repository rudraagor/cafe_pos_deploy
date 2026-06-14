import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "@/lib/db";
import {
  categories,
  coupons,
  floors,
  orders,
  orderItems,
  paymentMethods,
  products,
  promotions,
  reservations,
  tables,
} from "@/lib/db/schema";
import type * as schema from "@/lib/db/schema";
import { expireStaleReservations } from "@/lib/pos/reservations";
import { formatMergedTableLabel } from "@/lib/pos/table-labels";
import type { PromotionInput } from "./pricing";

type DbClient = NodePgDatabase<typeof schema>;

export type TableOccupancy =
  | {
      kind: "order";
      orderId: string;
      orderNumber: string;
      status: string;
      kdsStage: string;
      label: string;
      tableIds: string[];
      primaryTableId: string;
    }
  | {
      kind: "reservation";
      reservationId: string;
      customerName: string;
      status: string;
      label: string;
      tableIds: string[];
      primaryTableId: string;
      startAt: string;
      durationMinutes: number;
    };

export type UpcomingTableReservation = {
  reservationId: string;
  customerName: string;
  startAt: string;
  durationMinutes: number;
};

export async function getActiveProducts() {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      taxRate: products.taxRate,
      isKitchenItem: products.isKitchenItem,
      isOutOfStock: products.isOutOfStock,
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
    stackable: row.stackable,
    ruleType: row.ruleType,
    ruleConfig: normalizePromotionConfig(row.ruleConfig),
    daysOfWeek: Array.isArray(row.daysOfWeek) ? row.daysOfWeek.map(Number) : [],
    startTime: row.startTime,
    endTime: row.endTime,
  }));
}

function normalizePromotionConfig(
  value: unknown,
): PromotionInput["ruleConfig"] {
  if (!value || typeof value !== "object") return {};
  const config = value as Record<string, unknown>;
  return {
    requiredProductIds: Array.isArray(config.requiredProductIds)
      ? config.requiredProductIds.map(String)
      : [],
    dailyProductIds: Array.isArray(config.dailyProductIds)
      ? config.dailyProductIds.map(String)
      : [],
    dailyCategoryIds: Array.isArray(config.dailyCategoryIds)
      ? config.dailyCategoryIds.map(String)
      : [],
    requiredQuantity:
      typeof config.requiredQuantity === "number"
        ? config.requiredQuantity
        : Number(config.requiredQuantity ?? 1),
    rewardProductIds: Array.isArray(config.rewardProductIds)
      ? config.rewardProductIds.map(String)
      : config.rewardProductId
        ? [String(config.rewardProductId)]
        : [],
    rewardQuantity:
      typeof config.rewardQuantity === "number"
        ? config.rewardQuantity
        : Number(config.rewardQuantity ?? 1),
  };
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
  await expireStaleReservations();

  const activeOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.sessionId, sessionId),
      eq(orders.fulfillmentType, "dine_in"),
      ne(orders.status, "cancelled"),
      ne(orders.status, "unapproved"),
      sql`not (${orders.status} = 'paid' and ${orders.kdsStage} = 'completed')`,
    ),
    with: {
      table: { with: { floor: true } },
      orderTables: { with: { table: { with: { floor: true } } } },
    },
  });

  const map = new Map<string, TableOccupancy>();

  for (const order of activeOrders) {
    const linkedTables =
      order.orderTables.length > 0
        ? order.orderTables
            .slice()
            .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
            .map((row) => row.table)
            .filter((table): table is NonNullable<typeof table> =>
              Boolean(table),
            )
        : order.table
          ? [order.table]
          : [];
    const primaryTableId =
      order.orderTables.find((row) => row.isPrimary)?.tableId ??
      order.tableId ??
      linkedTables[0]?.id;
    if (!primaryTableId || linkedTables.length === 0) continue;
    const occupancy: TableOccupancy = {
      kind: "order",
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      kdsStage: order.kdsStage,
      label: formatMergedTableLabel(linkedTables),
      tableIds: linkedTables.map((table) => table.id),
      primaryTableId,
    };
    for (const table of linkedTables) map.set(table.id, occupancy);
  }

  const activeReservations = await db.query.reservations.findMany({
    where: and(
      eq(reservations.status, "booked"),
      sql`${reservations.startAt} <= now()`,
      sql`${reservations.startAt} + (${reservations.durationMinutes} * interval '1 minute') > now()`,
    ),
    with: {
      reservationTables: { with: { table: { with: { floor: true } } } },
    },
  });

  for (const reservation of activeReservations) {
    const linkedTables = reservation.reservationTables
      .slice()
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map((row) => row.table)
      .filter((table): table is NonNullable<typeof table> => Boolean(table));
    const primaryTableId =
      reservation.reservationTables.find((row) => row.isPrimary)?.tableId ??
      linkedTables[0]?.id;
    if (!primaryTableId || linkedTables.length === 0) continue;
    const occupancy: TableOccupancy = {
      kind: "reservation",
      reservationId: reservation.id,
      customerName: reservation.customerName,
      status: reservation.status,
      label: `${formatMergedTableLabel(linkedTables)} reserved`,
      tableIds: linkedTables.map((table) => table.id),
      primaryTableId,
      startAt: reservation.startAt.toISOString(),
      durationMinutes: reservation.durationMinutes,
    };
    for (const table of linkedTables) {
      if (!map.has(table.id)) map.set(table.id, occupancy);
    }
  }

  return map;
}

export async function getUpcomingTableReservations(horizonMinutes = 120) {
  await expireStaleReservations();

  const now = new Date();
  const horizonEnd = new Date(now.getTime() + horizonMinutes * 60 * 1000);
  const upcoming = await db.query.reservations.findMany({
    where: and(
      eq(reservations.status, "booked"),
      isNull(reservations.linkedOrderId),
      sql`${reservations.startAt} > ${now}`,
      sql`${reservations.startAt} <= ${horizonEnd}`,
    ),
    with: {
      reservationTables: true,
    },
    orderBy: (reservation, { asc }) => [asc(reservation.startAt)],
  });

  const map = new Map<string, UpcomingTableReservation>();
  for (const reservation of upcoming) {
    const warning: UpcomingTableReservation = {
      reservationId: reservation.id,
      customerName: reservation.customerName,
      startAt: reservation.startAt.toISOString(),
      durationMinutes: reservation.durationMinutes,
    };
    for (const row of reservation.reservationTables) {
      if (!map.has(row.tableId)) map.set(row.tableId, warning);
    }
  }

  return map;
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

export async function getReservationForCart(reservationId: string) {
  await expireStaleReservations();
  return db.query.reservations.findFirst({
    where: eq(reservations.id, reservationId),
    with: {
      reservationTables: { with: { table: { with: { floor: true } } } },
    },
  });
}

export async function getPosTableMap() {
  const rows = await db
    .select({
      id: tables.id,
      number: tables.number,
      floorName: floors.name,
    })
    .from(tables)
    .innerJoin(floors, eq(tables.floorId, floors.id));

  return Object.fromEntries(
    rows.map((row) => [
      row.id,
      { number: row.number, floorName: row.floorName },
    ]),
  );
}

export async function getSessionOrders(sessionId: string) {
  return db.query.orders.findMany({
    where: eq(orders.sessionId, sessionId),
    with: {
      customer: true,
      table: true,
      orderTables: { with: { table: { with: { floor: true } } } },
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
      orderTables: { with: { table: { with: { floor: true } } } },
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
      orderTables: { with: { table: { with: { floor: true } } } },
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
      ne(orders.status, "unapproved"),
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
      orderTables: { with: { table: { with: { floor: true } } } },
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

export type CustomerUsualProduct = {
  productId: string;
  name: string;
  price: string;
  taxRate: string;
  isKitchenItem: boolean;
  isOutOfStock: boolean;
  categoryId: string | null;
  categoryColor: string | null;
  timesOrdered: number;
};

/** Most frequently ordered active product for a customer (paid orders, all time). */
export async function getCustomerUsualProduct(customerId: string) {
  const [row] = await db
    .select({
      productId: orderItems.productId,
      timesOrdered: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.customerId, customerId),
        eq(orders.status, "paid"),
        sql`${orderItems.productId} is not null`,
      ),
    )
    .groupBy(orderItems.productId)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(1);

  if (!row?.productId) return null;

  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      taxRate: products.taxRate,
      isKitchenItem: products.isKitchenItem,
      isOutOfStock: products.isOutOfStock,
      categoryId: products.categoryId,
      categoryColor: categories.color,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.id, row.productId), isNull(products.archivedAt)))
    .limit(1);

  if (!product) return null;

  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    taxRate: product.taxRate,
    isKitchenItem: product.isKitchenItem,
    isOutOfStock: product.isOutOfStock,
    categoryId: product.categoryId,
    categoryColor: product.categoryColor,
    timesOrdered: row.timesOrdered,
  } satisfies CustomerUsualProduct;
}

/** Next order number for today. Globally unique (not per-session). */
export async function generateOrderNumber(tx: DbClient = db) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ORD-${datePart}-`;
  const suffixStart = prefix.length + 1;

  const [row] = await tx
    .select({
      maxSuffix: sql<
        number | null
      >`max(nullif(substring(${orders.orderNumber} from ${sql.raw(String(suffixStart))}), '')::int)`,
    })
    .from(orders)
    .where(sql`${orders.orderNumber} like ${prefix + "%"}`);

  const next = (row?.maxSuffix ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
