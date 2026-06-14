import { loadLocalEnv } from "@/lib/db/load-env";
import { createPgPool } from "@/lib/db/connection";

loadLocalEnv();

import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { seedPromotionsIfMissing, replaceLegacySinglePromotion } from "./seed-demo/seed-promotions";

async function main() {
  const pool = createPgPool();
  const db = drizzle(pool, { schema });

  console.log("Seeding database...");

  // --- Users -------------------------------------------------------------
  const adminHash = await bcrypt.hash("admin1234", 10);
  const cashierHash = await bcrypt.hash("cashier1234", 10);

  await db
    .insert(schema.users)
    .values([
      {
        name: "Cafe Admin",
        email: "admin@cafe.test",
        passwordHash: adminHash,
        role: "admin",
      },
      {
        name: "Sam Cashier",
        email: "cashier@cafe.test",
        passwordHash: cashierHash,
        role: "employee",
      },
    ])
    .onConflictDoNothing({ target: schema.users.email });

  // --- Payment methods ---------------------------------------------------
  await db
    .insert(schema.paymentMethods)
    .values([
      { type: "cash", enabled: true },
      { type: "card", enabled: true },
      { type: "upi", enabled: true, upiId: "cafe@ybl" },
    ])
    .onConflictDoNothing({ target: schema.paymentMethods.type });

  // --- Catalog (only if empty) ------------------------------------------
  const existingProducts = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .limit(1);

  if (existingProducts.length === 0) {
    const insertedCategories = await db
      .insert(schema.categories)
      .values([
        { name: "Coffee", color: "#7c4a2d" },
        { name: "Tea", color: "#2f855a" },
        { name: "Pastries", color: "#d69e2e" },
        { name: "Cold Drinks", color: "#3182ce" },
      ])
      .returning();

    const byName = Object.fromEntries(
      insertedCategories.map((c) => [c.name, c.id]),
    );

    await db.insert(schema.products).values([
      {
        name: "Espresso",
        categoryId: byName["Coffee"],
        price: "120.00",
        taxRate: "5.00",
        unitOfMeasure: "piece",
        description: "Single shot of espresso.",
        isKitchenItem: true,
      },
      {
        name: "Cappuccino",
        categoryId: byName["Coffee"],
        price: "180.00",
        taxRate: "5.00",
        unitOfMeasure: "piece",
        description: "Espresso with steamed milk foam.",
        isKitchenItem: true,
      },
      {
        name: "Masala Chai",
        categoryId: byName["Tea"],
        price: "90.00",
        taxRate: "5.00",
        unitOfMeasure: "piece",
        description: "Spiced Indian milk tea.",
        isKitchenItem: true,
      },
      {
        name: "Croissant",
        categoryId: byName["Pastries"],
        price: "150.00",
        taxRate: "12.00",
        unitOfMeasure: "piece",
        description: "Buttery flaky pastry.",
        isKitchenItem: true,
      },
      {
        name: "Iced Lemon Tea",
        categoryId: byName["Cold Drinks"],
        price: "140.00",
        taxRate: "12.00",
        unitOfMeasure: "piece",
        description: "Chilled lemon iced tea.",
        isKitchenItem: false,
      },
    ]);

    // --- Floors + tables -------------------------------------------------
    const [groundFloor] = await db
      .insert(schema.floors)
      .values({ name: "Ground Floor" })
      .returning();

    await db.insert(schema.tables).values([
      { floorId: groundFloor.id, number: 1, seats: 2 },
      { floorId: groundFloor.id, number: 2, seats: 4 },
      { floorId: groundFloor.id, number: 3, seats: 4 },
      { floorId: groundFloor.id, number: 4, seats: 6 },
    ]);

    // --- Sample discounts ------------------------------------------------
    await db.insert(schema.coupons).values({
      code: "WELCOME10",
      discountType: "percent",
      value: "10.00",
    });

    await replaceLegacySinglePromotion(db);
    const promotionCount = await seedPromotionsIfMissing(db);
    if (promotionCount > 0) {
      console.log(`  Promotions: seeded ${promotionCount}`);
    }
  } else {
    console.log("Catalog already seeded, skipping products/floors/coupons.");
    await replaceLegacySinglePromotion(db);
    const promotionCount = await seedPromotionsIfMissing(db);
    if (promotionCount > 0) {
      console.log(`  Promotions: added ${promotionCount} new promotion(s)`);
    }
  }

  console.log("Seed complete.");
  console.log("  Admin    -> admin@cafe.test / admin1234");
  console.log("  Employee -> cashier@cafe.test / cashier1234");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
