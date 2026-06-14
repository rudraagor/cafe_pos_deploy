import { randomUUID } from "node:crypto";
import {
  computeOrder,
  type CouponInput,
  type PricingLineInput,
  type PromotionInput,
} from "@/lib/pos/pricing";

export type SeedProduct = {
  id: string;
  name: string;
  price: string;
  taxRate: string;
  isKitchenItem: boolean;
};

export type SeedContext = {
  products: SeedProduct[];
  productWeights?: Map<string, number>;
  tableIds: string[];
  employeeIds: string[];
  customerIds: string[];
  coupons: CouponInput[];
  promotions: PromotionInput[];
  rng: () => number;
  orderVolumeMultiplier?: number;
};

export type GeneratedPayment = {
  id: string;
  orderId: string;
  method: "cash" | "card" | "upi";
  amount: string;
  changeDue: string | null;
  reference: string | null;
  createdAt: Date;
};

export type GeneratedOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  nameSnapshot: string;
  unitPrice: string;
  quantity: number;
  taxRateSnapshot: string;
  lineDiscount: string;
  lineTotal: string;
  isKitchenItem: boolean;
  itemCompleted: boolean;
  modifiers: string[];
  note: string | null;
  createdAt: Date;
};

export type GeneratedOrder = {
  id: string;
  orderNumber: string;
  sessionId: string;
  tableId: string | null;
  fulfillmentType: "dine_in" | "takeaway";
  customerId: string | null;
  employeeId: string;
  couponId: string | null;
  status: "paid";
  kdsStage: "completed";
  subtotal: string;
  tax: string;
  discountTotal: string;
  total: string;
  sentToKitchenAt: Date;
  createdAt: Date;
  updatedAt: Date;
  items: GeneratedOrderItem[];
  payment: GeneratedPayment;
};

export type GeneratedSession = {
  id: string;
  openedBy: string;
  openedAt: Date;
  closedAt: Date;
  openingFloat: string;
  closingAmount: string;
  status: "closed";
  orders: GeneratedOrder[];
};

const PAYMENT_WEIGHTS: Array<{ method: GeneratedPayment["method"]; weight: number }> =
  [
    { method: "upi", weight: 40 },
    { method: "cash", weight: 35 },
    { method: "card", weight: 25 },
  ];

const HOUR_WEIGHTS: Array<{ hour: number; weight: number }> = [
  { hour: 8, weight: 2 },
  { hour: 9, weight: 4 },
  { hour: 10, weight: 6 },
  { hour: 11, weight: 10 },
  { hour: 12, weight: 16 },
  { hour: 13, weight: 18 },
  { hour: 14, weight: 12 },
  { hour: 15, weight: 5 },
  { hour: 16, weight: 4 },
  { hour: 17, weight: 6 },
  { hour: 18, weight: 12 },
  { hour: 19, weight: 16 },
  { hour: 20, weight: 14 },
  { hour: 21, weight: 10 },
];

export function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends { weight: number }>(
  items: T[],
  rng: () => number,
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function pickOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

function randomInt(min: number, max: number, rng: () => number) {
  return min + Math.floor(rng() * (max - min + 1));
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatOrderNumber(day: Date, counter: number) {
  const datePart = [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, "0"),
    String(day.getDate()).padStart(2, "0"),
  ].join("");
  return `ORD-${datePart}-${String(counter).padStart(4, "0")}`;
}

export function sessionsForDay(day: Date) {
  const weekday = day.getDay();
  if (weekday === 5 || weekday === 6) return 2;
  return 1;
}

export function ordersForDay(
  day: Date,
  dayIndex: number,
  rng: () => number,
  volumeMultiplier = 1,
) {
  const weekday = day.getDay();
  const weekendBoost = weekday === 5 || weekday === 6 ? 1.25 : 1;
  const trendBoost = 1 + dayIndex * 0.003;
  const seasonal =
    1 +
    Math.sin((dayIndex / 30) * Math.PI * 2) * 0.08 +
    Math.sin((dayIndex / 90) * Math.PI * 2) * 0.05;
  const base = randomInt(18, 28, rng);
  return Math.round(base * weekendBoost * trendBoost * seasonal * volumeMultiplier);
}

function randomOrderTime(day: Date, rng: () => number) {
  const bucket = pickWeighted(HOUR_WEIGHTS, rng);
  const minute = randomInt(0, 59, rng);
  const time = startOfDay(day);
  time.setHours(bucket.hour, minute, randomInt(0, 59, rng), 0);
  return time;
}

function pickWeightedProduct(products: SeedProduct[], ctx: SeedContext): SeedProduct {
  if (!ctx.productWeights || ctx.productWeights.size === 0) {
    return pickOne(products, ctx.rng);
  }

  const weighted = products.map((product) => ({
    product,
    weight: ctx.productWeights!.get(product.id) ?? 1,
  }));
  return pickWeighted(weighted, ctx.rng).product;
}

function buildLineItems(products: SeedProduct[], ctx: SeedContext): PricingLineInput[] {
  const lineCount = randomInt(1, 4, ctx.rng);
  const chosen = new Set<string>();
  const lines: PricingLineInput[] = [];

  while (lines.length < lineCount) {
    const product = pickWeightedProduct(products, ctx);
    if (chosen.has(product.id) && ctx.rng() > 0.35) continue;
    chosen.add(product.id);
    lines.push({
      productId: product.id,
      name: product.name,
      unitPrice: Number(product.price),
      taxRate: Number(product.taxRate),
      qty: randomInt(1, 2, ctx.rng),
      isKitchenItem: product.isKitchenItem,
    });
  }

  return lines;
}

function buildPayment(
  orderId: string,
  total: number,
  paidAt: Date,
  rng: () => number,
): GeneratedPayment {
  const method = pickWeighted(PAYMENT_WEIGHTS, rng).method;
  let changeDue: string | null = null;
  if (method === "cash") {
    const tender = Math.ceil(total / 50) * 50;
    const change = Math.max(0, tender - total);
    changeDue = change > 0 ? change.toFixed(2) : null;
  }

  return {
    id: randomUUID(),
    orderId,
    method,
    amount: total.toFixed(2),
    changeDue,
    reference:
      method === "upi"
        ? `UPI${paidAt.getTime().toString().slice(-8)}`
        : method === "card"
          ? `TXN${paidAt.getTime().toString().slice(-6)}`
          : null,
    createdAt: paidAt,
  };
}

function buildOrder(
  ctx: SeedContext,
  session: { id: string; employeeId: string },
  day: Date,
  orderNumber: string,
  rng: () => number,
): GeneratedOrder {
  const id = randomUUID();
  const paidAt = randomOrderTime(day, rng);
  const sentToKitchenAt = addMinutes(paidAt, -randomInt(5, 15, rng));
  const createdAt = addMinutes(sentToKitchenAt, -randomInt(1, 4, rng));
  const fulfillmentType = rng() < 0.75 ? "dine_in" : "takeaway";
  const useCoupon =
    ctx.coupons.length > 0 && rng() < (ctx.orderVolumeMultiplier ? 0.14 : 0.1);
  const coupon = useCoupon ? pickOne(ctx.coupons, rng) : null;
  const lines = buildLineItems(ctx.products, ctx);
  const computed = computeOrder(lines, {
    promotions: ctx.promotions,
    coupon,
  });

  const items: GeneratedOrderItem[] = computed.lines.map((line) => ({
    id: randomUUID(),
    orderId: id,
    productId: line.productId,
    nameSnapshot: line.name,
    unitPrice: line.unitPrice.toFixed(2),
    quantity: line.qty,
    taxRateSnapshot: line.taxRate.toFixed(2),
    lineDiscount: line.lineDiscount.toFixed(2),
    lineTotal: line.lineTotal.toFixed(2),
    isKitchenItem: line.isKitchenItem,
    itemCompleted: true,
    modifiers: line.modifiers ?? [],
    note: line.note ?? null,
    createdAt: sentToKitchenAt,
  }));

  return {
    id,
    orderNumber,
    sessionId: session.id,
    tableId:
      fulfillmentType === "dine_in" && ctx.tableIds.length > 0
        ? pickOne(ctx.tableIds, rng)
        : null,
    fulfillmentType,
    customerId:
      ctx.customerIds.length > 0 && rng() < 0.4
        ? pickOne(ctx.customerIds, rng)
        : null,
    employeeId: session.employeeId,
    couponId: computed.appliedCoupon?.id ?? null,
    status: "paid",
    kdsStage: "completed",
    subtotal: computed.subtotal.toFixed(2),
    tax: computed.tax.toFixed(2),
    discountTotal: computed.discountTotal.toFixed(2),
    total: computed.total.toFixed(2),
    sentToKitchenAt,
    createdAt,
    updatedAt: paidAt,
    items,
    payment: buildPayment(id, computed.total, paidAt, rng),
  };
}

function buildSession(
  ctx: SeedContext,
  day: Date,
  sessionIndex: number,
  orderCounterStart: number,
  orderCount: number,
  rng: () => number,
): { session: GeneratedSession; nextOrderCounter: number } {
  const id = randomUUID();
  const employeeId = pickOne(ctx.employeeIds, rng);
  const openHour = sessionIndex === 0 ? randomInt(7, 9, rng) : randomInt(14, 16, rng);
  const openedAt = startOfDay(day);
  openedAt.setHours(openHour, randomInt(0, 45, rng), 0, 0);

  const orders: GeneratedOrder[] = [];
  let orderCounter = orderCounterStart;

  for (let i = 0; i < orderCount; i += 1) {
    orderCounter += 1;
    orders.push(
      buildOrder(
        ctx,
        { id, employeeId },
        day,
        formatOrderNumber(day, orderCounter),
        rng,
      ),
    );
  }

  orders.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

  const closedAt =
    orders.length > 0
      ? addMinutes(orders[orders.length - 1]!.updatedAt, randomInt(10, 35, rng))
      : addMinutes(openedAt, randomInt(480, 540, rng));

  const closingAmount = orders
    .reduce((sum, order) => sum + Number(order.total), 0)
    .toFixed(2);

  return {
    session: {
      id,
      openedBy: employeeId,
      openedAt,
      closedAt,
      openingFloat: randomInt(1500, 4000, rng).toFixed(2),
      closingAmount,
      status: "closed",
      orders,
    },
    nextOrderCounter: orderCounter,
  };
}

export function generateDemoHistory(ctx: SeedContext, days = 90) {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const sessions: GeneratedSession[] = [];
  let totalOrders = 0;

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + dayIndex);

    const sessionCount = sessionsForDay(day);
    const dailyOrders = ordersForDay(
      day,
      dayIndex,
      ctx.rng,
      ctx.orderVolumeMultiplier ?? 1,
    );
    const perSession = Math.max(1, Math.floor(dailyOrders / sessionCount));
    const remainder = dailyOrders - perSession * sessionCount;

    let orderCounter = 0;
    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
      const extra = sessionIndex < remainder ? 1 : 0;
      const result = buildSession(
        ctx,
        day,
        sessionIndex,
        orderCounter,
        perSession + extra,
        ctx.rng,
      );
      orderCounter = result.nextOrderCounter;
      sessions.push(result.session);
      totalOrders += result.session.orders.length;
    }
  }

  return { sessions, totalOrders, totalSessions: sessions.length, days };
}
