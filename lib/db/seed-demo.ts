import { loadLocalEnv } from "@/lib/db/load-env";
import { createPgPool } from "@/lib/db/connection";

loadLocalEnv();

import bcrypt from "bcryptjs";
import { and, count, eq, like, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import {
  DEMO_CUSTOMER_EMAIL_DOMAIN,
  DEMO_CUSTOMERS,
  DEMO_EMPLOYEE_PASSWORD,
  DEMO_EMPLOYEES,
  EXTRA_CATEGORIES,
  EXTRA_FLOORS,
  EXTRA_PRODUCTS,
  EXTRA_TABLES,
} from "./seed-demo/fixtures";
import {
  createRng,
  generateDemoHistory,
  type GeneratedOrder,
  type GeneratedSession,
  type SeedContext,
} from "./seed-demo/generators";

const BATCH_SIZE = 100;
const force = process.argv.includes("--force");

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

async function hasExistingDemoData(db: ReturnType<typeof drizzle>) {
  const today = startOfToday();
  const [row] = await db
    .select({ value: count() })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.status, "paid"),
        lt(schema.orders.updatedAt, today),
      ),
    );
  return Number(row?.value ?? 0) > 10;
}

async function wipeDemoTransactions(db: ReturnType<typeof drizzle>) {
  console.log("Removing existing demo transactions...");
  await db.delete(schema.payments);
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.posSessions);
  await db
    .delete(schema.customers)
    .where(like(schema.customers.email, `%${DEMO_CUSTOMER_EMAIL_DOMAIN}`));
}

async function ensureBaseSeed(db: ReturnType<typeof drizzle>) {
  const [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .limit(1);
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .limit(1);

  if (!product || !user) {
    throw new Error(
      "Base catalog/users missing. Run `npm run db:seed` before `npm run db:seed:demo`.",
    );
  }
}

async function seedFixtures(db: ReturnType<typeof drizzle>) {
  const passwordHash = await bcrypt.hash(DEMO_EMPLOYEE_PASSWORD, 10);
  await db
    .insert(schema.users)
    .values(
      DEMO_EMPLOYEES.map((employee) => ({
        name: employee.name,
        email: employee.email,
        passwordHash,
        role: "employee" as const,
      })),
    )
    .onConflictDoNothing({ target: schema.users.email });

  const [existingDemoCustomer] = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(like(schema.customers.email, `%${DEMO_CUSTOMER_EMAIL_DOMAIN}`))
    .limit(1);

  if (!existingDemoCustomer) {
    await db.insert(schema.customers).values(
      DEMO_CUSTOMERS.map((customer) => ({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      })),
    );
  }

  const categories = await db.select().from(schema.categories);
  const categoryByName = Object.fromEntries(
    categories.map((category) => [category.name, category.id]),
  );

  for (const category of EXTRA_CATEGORIES) {
    if (categoryByName[category.name]) continue;
    const [inserted] = await db
      .insert(schema.categories)
      .values(category)
      .returning();
    categoryByName[inserted.name] = inserted.id;
  }

  const existingProducts = await db.select().from(schema.products);
  const productNames = new Set(existingProducts.map((product) => product.name));

  const productsToInsert = EXTRA_PRODUCTS.filter(
    (product) => !productNames.has(product.name),
  ).map((product) => ({
    name: product.name,
    categoryId: categoryByName[product.category] ?? null,
    price: product.price,
    taxRate: product.taxRate,
    unitOfMeasure: "piece" as const,
    isKitchenItem: product.isKitchenItem,
  }));

  if (productsToInsert.length > 0) {
    await db.insert(schema.products).values(productsToInsert);
  }

  const floors = await db.select().from(schema.floors);
  const floorByName = Object.fromEntries(floors.map((floor) => [floor.name, floor.id]));

  for (const floor of EXTRA_FLOORS) {
    if (floorByName[floor.name]) continue;
    const [inserted] = await db.insert(schema.floors).values(floor).returning();
    floorByName[inserted.name] = inserted.id;
  }

  const existingTables = await db.select().from(schema.tables);
  const tableKeys = new Set(
    existingTables.map((table) => `${table.floorId}:${table.number}`),
  );

  const tablesToInsert = EXTRA_TABLES.filter((table) => {
    const floorId = floorByName[table.floor];
    return floorId && !tableKeys.has(`${floorId}:${table.number}`);
  }).map((table) => ({
    floorId: floorByName[table.floor]!,
    number: table.number,
    seats: table.seats,
  }));

  if (tablesToInsert.length > 0) {
    await db.insert(schema.tables).values(tablesToInsert);
  }
}

async function loadSeedContext(db: ReturnType<typeof drizzle>): Promise<SeedContext> {
  const products = await db.select().from(schema.products);
  const tables = await db.select().from(schema.tables);
  const employees = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, "employee"));
  const customers = await db
    .select()
    .from(schema.customers)
    .where(like(schema.customers.email, `%${DEMO_CUSTOMER_EMAIL_DOMAIN}`));
  const [couponRow] = await db
    .select()
    .from(schema.coupons)
    .where(eq(schema.coupons.code, "WELCOME10"))
    .limit(1);
  const promotionRows = await db
    .select()
    .from(schema.promotions)
    .where(eq(schema.promotions.active, true));

  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      taxRate: product.taxRate,
      isKitchenItem: product.isKitchenItem,
    })),
    tableIds: tables.map((table) => table.id),
    employeeIds: employees.map((employee) => employee.id),
    customerIds: customers.map((customer) => customer.id),
    coupon: couponRow
      ? {
          id: couponRow.id,
          code: couponRow.code,
          discountType: couponRow.discountType,
          value: Number(couponRow.value),
        }
      : null,
    promotions: promotionRows.map((promotion) => ({
      id: promotion.id,
      name: promotion.name,
      scope: promotion.scope,
      productId: promotion.productId,
      minQuantity: promotion.minQuantity,
      minOrderAmount: promotion.minOrderAmount
        ? Number(promotion.minOrderAmount)
        : null,
      discountType: promotion.discountType,
      value: Number(promotion.value),
    })),
    rng: createRng(20260613),
  };
}

async function insertGeneratedHistory(
  db: ReturnType<typeof drizzle>,
  sessions: GeneratedSession[],
) {
  const allOrders = sessions.flatMap((session) => session.orders);
  const allItems = allOrders.flatMap((order) => order.items);
  const allPayments = allOrders.map((order) => order.payment);

  for (let index = 0; index < sessions.length; index += 1) {
    const session = sessions[index]!;
    await db.insert(schema.posSessions).values({
      id: session.id,
      openedBy: session.openedBy,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingFloat: session.openingFloat,
      closingAmount: session.closingAmount,
      status: session.status,
    });

    if ((index + 1) % 25 === 0 || index + 1 === sessions.length) {
      console.log(`  Sessions ${index + 1}/${sessions.length}`);
    }
  }

  for (let offset = 0; offset < allOrders.length; offset += BATCH_SIZE) {
    const chunk = allOrders.slice(offset, offset + BATCH_SIZE);
    await db.insert(schema.orders).values(
      chunk.map((order: GeneratedOrder) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        sessionId: order.sessionId,
        tableId: order.tableId,
        fulfillmentType: order.fulfillmentType,
        customerId: order.customerId,
        employeeId: order.employeeId,
        couponId: order.couponId,
        status: order.status,
        kdsStage: order.kdsStage,
        subtotal: order.subtotal,
        tax: order.tax,
        discountTotal: order.discountTotal,
        total: order.total,
        sentToKitchenAt: order.sentToKitchenAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    );

    const itemChunk = chunk.flatMap((order) => order.items);
    await db.insert(schema.orderItems).values(
      itemChunk.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        nameSnapshot: item.nameSnapshot,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        taxRateSnapshot: item.taxRateSnapshot,
        lineDiscount: item.lineDiscount,
        lineTotal: item.lineTotal,
        isKitchenItem: item.isKitchenItem,
        itemCompleted: item.itemCompleted,
        modifiers: item.modifiers,
        note: item.note,
        createdAt: item.createdAt,
      })),
    );

    await db.insert(schema.payments).values(
      chunk.map((order) => ({
        id: order.payment.id,
        orderId: order.payment.orderId,
        method: order.payment.method,
        amount: order.payment.amount,
        changeDue: order.payment.changeDue,
        reference: order.payment.reference,
        createdAt: order.payment.createdAt,
      })),
    );

    console.log(
      `  Orders ${Math.min(offset + chunk.length, allOrders.length)}/${allOrders.length}`,
    );
  }

  return {
    orderCount: allOrders.length,
    itemCount: allItems.length,
    paymentCount: allPayments.length,
  };
}

function printCheatSheet() {
  console.log("\nDemo cheat sheet");
  console.log("----------------");
  console.log("Admin     -> admin@cafe.test / admin1234");
  console.log("Cashiers  -> cashier@cafe.test, priya@cafe.test, rahul@cafe.test,");
  console.log("             ananya@cafe.test, vikram@cafe.test / cashier1234");
  console.log("\nSuggested report filters:");
  console.log("  - This month vs Last 7 days");
  console.log("  - Employee filter: Priya Sharma or Sam Cashier");
  console.log("  - Session drill-down under Admin -> Reports -> Sessions");
  console.log("\nSample AI questions:");
  console.log("  - Which payment method drove the most revenue this month?");
  console.log("  - What are the top 3 products in the last 7 days?");
  console.log("  - How do weekday lunch sales compare to evenings?");
}

async function main() {
  const pool = createPgPool();
  const db = drizzle(pool, { schema });

  console.log("Demo seed starting...");
  await ensureBaseSeed(db);

  if (!force && (await hasExistingDemoData(db))) {
    console.log(
      "Demo history already present. Re-run with --force to wipe and regenerate.",
    );
    await pool.end();
    return;
  }

  if (force) {
    await wipeDemoTransactions(db);
  }

  console.log("Seeding demo fixtures...");
  await seedFixtures(db);

  const ctx = await loadSeedContext(db);
  if (ctx.employeeIds.length === 0 || ctx.products.length === 0) {
    throw new Error("Demo seed context is incomplete after fixture insert.");
  }

  console.log("Generating 90 days of sessions and orders...");
  const generated = generateDemoHistory(ctx, 90);

  console.log(
    `Inserting ${generated.totalSessions} sessions and ${generated.totalOrders} paid orders...`,
  );
  const inserted = await insertGeneratedHistory(db, generated.sessions);

  console.log("\nDemo seed complete.");
  console.log(`  Sessions : ${generated.totalSessions}`);
  console.log(`  Orders   : ${inserted.orderCount}`);
  console.log(`  Items    : ${inserted.itemCount}`);
  console.log(`  Payments : ${inserted.paymentCount}`);
  printCheatSheet();

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
