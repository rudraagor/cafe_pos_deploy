import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/db/schema";
import { buildPromotionSeedRows } from "@/lib/db/seed-demo/promotion-fixtures";

type Db = NodePgDatabase<typeof schema>;

export async function seedPromotionsIfMissing(db: Db) {
  const products = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      categoryId: schema.products.categoryId,
    })
    .from(schema.products)
    .where(sql`${schema.products.archivedAt} is null`);

  if (products.length === 0) return 0;

  const categories = await db.select().from(schema.categories);
  const categoryByName = Object.fromEntries(
    categories.map((category) => [category.name, category.id]),
  );

  const existing = await db
    .select({ name: schema.promotions.name })
    .from(schema.promotions);
  const existingNames = new Set(
    existing.map((row) => row.name.trim().toLowerCase()),
  );

  const rows = buildPromotionSeedRows(products, categoryByName).filter(
    (row) => !existingNames.has(row.name.trim().toLowerCase()),
  );

  if (rows.length === 0) return 0;

  await db.insert(schema.promotions).values(rows);
  return rows.length;
}

export async function replaceLegacySinglePromotion(db: Db) {
  await db
    .delete(schema.promotions)
    .where(eq(schema.promotions.name, "Bulk Coffee Deal"));
}
