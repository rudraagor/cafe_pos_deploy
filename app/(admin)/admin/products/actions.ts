"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { categoryPalette, categorySchema } from "@/lib/validations/categories";
import { type ProductInput, productSchema } from "@/lib/validations/products";

type ProductField = keyof ProductInput;
export type ProductActionResult = ActionResult<ProductField>;

export type InlineCategoryResult =
  | { ok: true; category: { id: string; name: string; color: string } }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<"name" | "color", string[]>>;
    };

function parseProduct(formData: FormData): ProductActionResult | ProductInput {
  const rawCategoryId = String(formData.get("categoryId") ?? "").trim();
  const rawDescription = String(formData.get("description") ?? "").trim();
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    categoryId: rawCategoryId || null,
    price: formData.get("price"),
    unitOfMeasure: formData.get("unitOfMeasure"),
    taxRate: formData.get("taxRate"),
    description: rawDescription || null,
    isKitchenItem: formData.get("isKitchenItem") === "true",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  return parsed.data;
}

function productValues(input: ProductInput) {
  return {
    name: input.name,
    categoryId: input.categoryId,
    price: input.price.toFixed(2),
    unitOfMeasure: input.unitOfMeasure,
    taxRate: input.taxRate.toFixed(2),
    description: input.description,
    isKitchenItem: input.isKitchenItem,
  };
}

async function findProductByName(name: string, excludeId?: string) {
  const normalized = name.toLowerCase();

  return db.query.products.findFirst({
    where: excludeId
      ? sql`${products.id} <> ${excludeId} and lower(${products.name}) = ${normalized}`
      : sql`lower(${products.name}) = ${normalized}`,
  });
}

export async function createProduct(
  formData: FormData,
): Promise<ProductActionResult> {
  await requireRole("admin");

  const parsed = parseProduct(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findProductByName(parsed.name);
  if (existing) {
    return {
      ok: false,
      error: "A product with this name already exists.",
      fieldErrors: { name: ["A product with this name already exists."] },
    };
  }

  await db.insert(products).values(productValues(parsed));
  revalidatePath("/admin/products");

  return { ok: true, message: "Product created." };
}

export async function updateProduct(
  id: string,
  formData: FormData,
): Promise<ProductActionResult> {
  await requireRole("admin");

  const parsed = parseProduct(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findProductByName(parsed.name, id);
  if (existing) {
    return {
      ok: false,
      error: "A product with this name already exists.",
      fieldErrors: { name: ["A product with this name already exists."] },
    };
  }

  const [updated] = await db
    .update(products)
    .set(productValues(parsed))
    .where(eq(products.id, id))
    .returning({ id: products.id });

  if (!updated) {
    return { ok: false, error: "Product not found." };
  }

  revalidatePath("/admin/products");

  return { ok: true, message: "Product updated." };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireRole("admin");

  const [deleted] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id });

  if (!deleted) {
    return { ok: false, error: "Product not found." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/coupons");

  return { ok: true, message: "Product deleted." };
}

export async function createInlineCategory(
  name: string,
): Promise<InlineCategoryResult> {
  await requireRole("admin");

  const parsed = categorySchema.safeParse({
    name,
    color: categoryPalette[0],
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Category name is invalid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await db.query.categories.findFirst({
    where: sql`lower(${categories.name}) = ${parsed.data.name.toLowerCase()}`,
  });

  if (existing) {
    return {
      ok: true,
      category: {
        id: existing.id,
        name: existing.name,
        color: existing.color,
      },
    };
  }

  const [created] = await db.insert(categories).values(parsed.data).returning({
    id: categories.id,
    name: categories.name,
    color: categories.color,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");

  return { ok: true, category: created };
}
