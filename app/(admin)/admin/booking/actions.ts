"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { floors, tables } from "@/lib/db/schema";
import {
  type FloorInput,
  type TableInput,
  floorSchema,
  tableSchema,
} from "@/lib/validations/booking";

export type FloorActionResult = ActionResult<keyof FloorInput>;
export type TableActionResult = ActionResult<keyof TableInput>;

function parseFloor(formData: FormData): FloorActionResult | FloorInput {
  const parsed = floorSchema.safeParse({
    name: formData.get("name"),
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

function parseTable(formData: FormData): TableActionResult | TableInput {
  const parsed = tableSchema.safeParse({
    floorId: formData.get("floorId"),
    number: formData.get("number"),
    seats: formData.get("seats"),
    active: formData.get("active") === "true",
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

async function findFloorByName(name: string, excludeId?: string) {
  const normalized = name.toLowerCase();
  return db.query.floors.findFirst({
    where: excludeId
      ? sql`${floors.id} <> ${excludeId} and lower(${floors.name}) = ${normalized}`
      : sql`lower(${floors.name}) = ${normalized}`,
  });
}

async function findTableByNumber(
  floorId: string,
  number: number,
  excludeId?: string,
) {
  return db.query.tables.findFirst({
    where: excludeId
      ? sql`${tables.id} <> ${excludeId} and ${tables.floorId} = ${floorId} and ${tables.number} = ${number}`
      : and(eq(tables.floorId, floorId), eq(tables.number, number)),
  });
}

export async function createFloor(
  formData: FormData,
): Promise<FloorActionResult> {
  await requireRole("admin");

  const parsed = parseFloor(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findFloorByName(parsed.name);
  if (existing) {
    return {
      ok: false,
      error: "A floor with this name already exists.",
      fieldErrors: { name: ["A floor with this name already exists."] },
    };
  }

  await db.insert(floors).values(parsed);
  revalidatePath("/admin/booking");

  return { ok: true, message: "Floor created." };
}

export async function updateFloor(
  id: string,
  formData: FormData,
): Promise<FloorActionResult> {
  await requireRole("admin");

  const parsed = parseFloor(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findFloorByName(parsed.name, id);
  if (existing) {
    return {
      ok: false,
      error: "A floor with this name already exists.",
      fieldErrors: { name: ["A floor with this name already exists."] },
    };
  }

  const [updated] = await db
    .update(floors)
    .set(parsed)
    .where(eq(floors.id, id))
    .returning({ id: floors.id });

  if (!updated) {
    return { ok: false, error: "Floor not found." };
  }

  revalidatePath("/admin/booking");

  return { ok: true, message: "Floor updated." };
}

export async function deleteFloor(id: string): Promise<ActionResult> {
  await requireRole("admin");

  const [deleted] = await db
    .delete(floors)
    .where(eq(floors.id, id))
    .returning({ id: floors.id });

  if (!deleted) {
    return { ok: false, error: "Floor not found." };
  }

  revalidatePath("/admin/booking");

  return { ok: true, message: "Floor deleted." };
}

export async function createTable(
  formData: FormData,
): Promise<TableActionResult> {
  await requireRole("admin");

  const parsed = parseTable(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findTableByNumber(parsed.floorId, parsed.number);
  if (existing) {
    return {
      ok: false,
      error: "This table number already exists on the selected floor.",
      fieldErrors: {
        number: ["This table number already exists on the selected floor."],
      },
    };
  }

  await db.insert(tables).values(parsed);
  revalidatePath("/admin/booking");

  return { ok: true, message: "Table created." };
}

export async function updateTable(
  id: string,
  formData: FormData,
): Promise<TableActionResult> {
  await requireRole("admin");

  const parsed = parseTable(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findTableByNumber(parsed.floorId, parsed.number, id);
  if (existing) {
    return {
      ok: false,
      error: "This table number already exists on the selected floor.",
      fieldErrors: {
        number: ["This table number already exists on the selected floor."],
      },
    };
  }

  const [updated] = await db
    .update(tables)
    .set(parsed)
    .where(eq(tables.id, id))
    .returning({ id: tables.id });

  if (!updated) {
    return { ok: false, error: "Table not found." };
  }

  revalidatePath("/admin/booking");

  return { ok: true, message: "Table updated." };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  await requireRole("admin");

  const [deleted] = await db
    .delete(tables)
    .where(eq(tables.id, id))
    .returning({ id: tables.id });

  if (!deleted) {
    return { ok: false, error: "Table not found." };
  }

  revalidatePath("/admin/booking");

  return { ok: true, message: "Table deleted." };
}
