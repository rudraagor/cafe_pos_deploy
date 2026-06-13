"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import {
  type CategoryInput,
  categorySchema,
} from "@/lib/validations/categories";

type CategoryField = keyof CategoryInput;
export type CategoryActionResult = ActionResult<CategoryField>;

function parseCategory(
  formData: FormData,
): CategoryActionResult | CategoryInput {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
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

async function findCategoryByName(name: string, excludeId?: string) {
  const normalized = name.toLowerCase();

  return db.query.categories.findFirst({
    where: excludeId
      ? sql`${categories.id} <> ${excludeId} and lower(${categories.name}) = ${normalized}`
      : sql`lower(${categories.name}) = ${normalized}`,
  });
}

async function findCategoryByColor(color: string, excludeId?: string) {
  const normalized = color.toLowerCase();

  return db.query.categories.findFirst({
    where: excludeId
      ? sql`${categories.id} <> ${excludeId} and lower(${categories.color}) = ${normalized}`
      : sql`lower(${categories.color}) = ${normalized}`,
  });
}

export async function createCategory(
  formData: FormData,
): Promise<CategoryActionResult> {
  await requireRole("admin");

  const parsed = parseCategory(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findCategoryByName(parsed.name);
  if (existing) {
    return {
      ok: false,
      error: "A category with this name already exists.",
      fieldErrors: { name: ["A category with this name already exists."] },
    };
  }
  const existingColor = await findCategoryByColor(parsed.color);
  if (existingColor) {
    return {
      ok: false,
      error: "This category color is already in use.",
      fieldErrors: { color: ["Choose a unique category color."] },
    };
  }

  await db.insert(categories).values(parsed);
  revalidatePath("/admin/categories");

  return { ok: true, message: "Category created." };
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<CategoryActionResult> {
  await requireRole("admin");

  const parsed = parseCategory(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findCategoryByName(parsed.name, id);
  if (existing) {
    return {
      ok: false,
      error: "A category with this name already exists.",
      fieldErrors: { name: ["A category with this name already exists."] },
    };
  }
  const existingColor = await findCategoryByColor(parsed.color, id);
  if (existingColor) {
    return {
      ok: false,
      error: "This category color is already in use.",
      fieldErrors: { color: ["Choose a unique category color."] },
    };
  }

  const [updated] = await db
    .update(categories)
    .set(parsed)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });

  if (!updated) {
    return { ok: false, error: "Category not found." };
  }

  revalidatePath("/admin/categories");

  return { ok: true, message: "Category updated." };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireRole("admin");

  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });

  if (!deleted) {
    return { ok: false, error: "Category not found." };
  }

  revalidatePath("/admin/categories");

  return { ok: true, message: "Category deleted." };
}
