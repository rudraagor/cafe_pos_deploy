"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reservationTables, reservations, floors, tables } from "@/lib/db/schema";
import { sendReservationConfirmation } from "@/lib/email/send-reservation-confirmation";
import { formatMergedTableLabel } from "@/lib/pos/table-labels";
import {
  expireStaleReservations,
  findActiveOrderTableConflict,
  findReservationTableConflict,
  getTableLabelsByIds,
} from "@/lib/pos/reservations";
import {
  type FloorInput,
  type ReservationInput,
  type TableInput,
  floorSchema,
  reservationSchema,
  tableSchema,
} from "@/lib/validations/booking";

export type FloorActionResult = ActionResult<keyof FloorInput>;
export type TableActionResult = ActionResult<keyof TableInput>;
export type ReservationActionResult = ActionResult<keyof ReservationInput>;

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

function parseReservation(
  formData: FormData,
): ReservationActionResult | ReservationInput {
  const parsed = reservationSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    partySize: formData.get("partySize"),
    startAt: formData.get("startAt"),
    durationMinutes: formData.get("durationMinutes"),
    tableIds: formData.getAll("tableIds"),
    notes: formData.get("notes"),
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

async function validateReservationTables(
  input: ReservationInput,
  excludeReservationId?: string,
) {
  await expireStaleReservations();

  const orderConflict = await findActiveOrderTableConflict({
    tableIds: input.tableIds,
  });
  if (orderConflict) {
    return {
      ok: false as const,
      error: "One of these tables already has an active order.",
      fieldErrors: { tableIds: ["One selected table is occupied."] },
    };
  }

  const reservationConflict = await findReservationTableConflict({
    tableIds: input.tableIds,
    startAt: input.startAt,
    durationMinutes: input.durationMinutes,
    excludeReservationId,
  });
  if (reservationConflict) {
    return {
      ok: false as const,
      error: "One of these tables already has a reservation in that time slot.",
      fieldErrors: { tableIds: ["One selected table is already reserved."] },
    };
  }

  return { ok: true as const };
}

export async function createReservation(
  formData: FormData,
): Promise<ReservationActionResult> {
  const user = await requireUser();
  const parsed = parseReservation(formData);
  if ("ok" in parsed) return parsed;

  const availability = await validateReservationTables(parsed);
  if (!availability.ok) return availability;

  const [created] = await db
    .insert(reservations)
    .values({
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      customerPhone: parsed.customerPhone || null,
      partySize: parsed.partySize,
      startAt: parsed.startAt,
      durationMinutes: parsed.durationMinutes,
      notes: parsed.notes || null,
      createdBy: user.id,
    })
    .returning({ id: reservations.id });

  await db.insert(reservationTables).values(
    parsed.tableIds.map((tableId, index) => ({
      reservationId: created.id,
      tableId,
      isPrimary: index === 0,
    })),
  );

  const tableLabels = await getTableLabelsByIds(parsed.tableIds);
  await sendReservationConfirmation({
    customerName: parsed.customerName,
    customerEmail: parsed.customerEmail,
    startAt: parsed.startAt,
    durationMinutes: parsed.durationMinutes,
    tableLabels: formatMergedTableLabel(tableLabels),
    partySize: parsed.partySize,
  });

  revalidatePath("/admin/booking");
  revalidatePath("/pos");
  revalidatePath("/pos/tables");

  return { ok: true, message: "Reservation created." };
}

export async function updateReservation(
  id: string,
  formData: FormData,
): Promise<ReservationActionResult> {
  await requireUser();
  const parsed = parseReservation(formData);
  if ("ok" in parsed) return parsed;

  const existing = await db.query.reservations.findFirst({
    where: eq(reservations.id, id),
  });
  if (!existing || existing.status !== "booked") {
    return { ok: false, error: "Only booked reservations can be edited." };
  }

  const availability = await validateReservationTables(parsed, id);
  if (!availability.ok) return availability;

  await db.transaction(async (tx) => {
    await tx
      .update(reservations)
      .set({
        customerName: parsed.customerName,
        customerEmail: parsed.customerEmail,
        customerPhone: parsed.customerPhone || null,
        partySize: parsed.partySize,
        startAt: parsed.startAt,
        durationMinutes: parsed.durationMinutes,
        notes: parsed.notes || null,
      })
      .where(eq(reservations.id, id));
    await tx
      .delete(reservationTables)
      .where(eq(reservationTables.reservationId, id));
    await tx.insert(reservationTables).values(
      parsed.tableIds.map((tableId, index) => ({
        reservationId: id,
        tableId,
        isPrimary: index === 0,
      })),
    );
  });

  revalidatePath("/admin/booking");
  revalidatePath("/pos");
  revalidatePath("/pos/tables");

  return { ok: true, message: "Reservation updated." };
}

export async function cancelReservation(id: string): Promise<ActionResult> {
  await requireUser();
  const [updated] = await db
    .update(reservations)
    .set({ status: "cancelled" })
    .where(eq(reservations.id, id))
    .returning({ id: reservations.id });
  if (!updated) return { ok: false, error: "Reservation not found." };

  revalidatePath("/admin/booking");
  revalidatePath("/pos");
  revalidatePath("/pos/tables");

  return { ok: true, message: "Reservation cancelled." };
}

export async function seatReservation(id: string): Promise<
  ActionResult & {
    href?: string;
  }
> {
  await requireUser();
  await expireStaleReservations();
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, id),
    with: { reservationTables: true },
  });
  if (!reservation || reservation.status !== "booked") {
    return { ok: false, error: "Reservation is not available for seating." };
  }

  const primary =
    reservation.reservationTables.find((row) => row.isPrimary) ??
    reservation.reservationTables[0];
  if (!primary) return { ok: false, error: "Reservation has no table." };
  const tableIds = reservation.reservationTables.map((row) => row.tableId);
  return {
    ok: true,
    href: `/pos?table=${primary.tableId}&tables=${tableIds.join(",")}&reservation=${reservation.id}`,
  };
}
