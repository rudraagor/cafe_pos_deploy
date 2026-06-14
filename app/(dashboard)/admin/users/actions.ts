"use server";

import bcrypt from "bcryptjs";
import { and, count, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  type PasswordInput,
  type UserCreateInput,
  type UserUpdateInput,
  passwordSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validations/users";

export type UserCreateActionResult = ActionResult<keyof UserCreateInput>;
export type UserUpdateActionResult = ActionResult<keyof UserUpdateInput>;
export type PasswordActionResult = ActionResult<keyof PasswordInput>;

function parseCreateUser(
  formData: FormData,
): UserCreateActionResult | UserCreateInput {
  const parsed = userCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
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

function parseUpdateUser(
  formData: FormData,
): UserUpdateActionResult | UserUpdateInput {
  const parsed = userUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
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

function parsePassword(
  formData: FormData,
): PasswordActionResult | PasswordInput {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
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

async function findUserByEmail(email: string, excludeId?: string) {
  return db.query.users.findFirst({
    where: excludeId
      ? sql`${users.id} <> ${excludeId} and lower(${users.email}) = ${email.toLowerCase()}`
      : sql`lower(${users.email}) = ${email.toLowerCase()}`,
  });
}

async function activeAdminCount() {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.archivedAt)));
  return row?.value ?? 0;
}

async function assertCanRemoveAdminPower(targetId: string) {
  const target = await db.query.users.findFirst({
    where: eq(users.id, targetId),
  });

  if (!target) return { ok: false as const, error: "User not found." };
  if (target.role !== "admin" || target.archivedAt) {
    return { ok: true as const, target };
  }

  if ((await activeAdminCount()) <= 1) {
    return {
      ok: false as const,
      error: "Keep at least one active admin account.",
    };
  }

  return { ok: true as const, target };
}

export async function createUserAccount(
  formData: FormData,
): Promise<UserCreateActionResult> {
  const actor = await requireRole("admin");

  const parsed = parseCreateUser(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findUserByEmail(parsed.email);
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      fieldErrors: { email: ["An account with this email already exists."] },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);
  const [created] = await db
    .insert(users)
    .values({
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      passwordHash,
    })
    .returning({ id: users.id });
  await writeAuditLog({
    actorId: actor.id,
    action: "user.created",
    entityType: "user",
    entityId: created.id,
    metadata: { role: parsed.role },
  });

  revalidatePath("/admin/users");

  return { ok: true, message: "User created." };
}

export async function updateUserAccount(
  id: string,
  formData: FormData,
): Promise<UserUpdateActionResult> {
  const actor = await requireRole("admin");

  const parsed = parseUpdateUser(formData);
  if ("ok" in parsed) return parsed;

  const existingEmail = await findUserByEmail(parsed.email, id);
  if (existingEmail) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      fieldErrors: { email: ["An account with this email already exists."] },
    };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!target) return { ok: false, error: "User not found." };

  if (
    target.role === "admin" &&
    parsed.role !== "admin" &&
    !target.archivedAt
  ) {
    const guard = await assertCanRemoveAdminPower(id);
    if (!guard.ok) return guard;
  }

  await db
    .update(users)
    .set({ name: parsed.name, email: parsed.email, role: parsed.role })
    .where(eq(users.id, id));
  await writeAuditLog({
    actorId: actor.id,
    action: "user.updated",
    entityType: "user",
    entityId: id,
    metadata: { role: parsed.role },
  });

  revalidatePath("/admin/users");

  return { ok: true, message: "User updated." };
}

export async function changeUserPassword(
  id: string,
  formData: FormData,
): Promise<PasswordActionResult> {
  const actor = await requireRole("admin");

  const parsed = parsePassword(formData);
  if ("ok" in parsed) return parsed;

  const passwordHash = await bcrypt.hash(parsed.password, 10);
  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!updated) return { ok: false, error: "User not found." };
  await writeAuditLog({
    actorId: actor.id,
    action: "user.password_changed",
    entityType: "user",
    entityId: id,
  });

  revalidatePath("/admin/users");

  return { ok: true, message: "Password changed." };
}

export async function archiveUser(id: string): Promise<ActionResult> {
  const currentUser = await requireRole("admin");

  if (currentUser.id === id) {
    return { ok: false, error: "You cannot archive your own account." };
  }

  const guard = await assertCanRemoveAdminPower(id);
  if (!guard.ok) return guard;

  await db
    .update(users)
    .set({ archivedAt: new Date() })
    .where(eq(users.id, id));
  await writeAuditLog({
    actorId: currentUser.id,
    action: "user.archived",
    entityType: "user",
    entityId: id,
  });

  revalidatePath("/admin/users");

  return { ok: true, message: "User archived." };
}

export async function restoreUser(id: string): Promise<ActionResult> {
  const actor = await requireRole("admin");

  const [updated] = await db
    .update(users)
    .set({ archivedAt: null })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!updated) return { ok: false, error: "User not found." };
  await writeAuditLog({
    actorId: actor.id,
    action: "user.restored",
    entityType: "user",
    entityId: id,
  });

  revalidatePath("/admin/users");

  return { ok: true, message: "User restored." };
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const currentUser = await requireRole("admin");

  if (currentUser.id === id) {
    return { ok: false, error: "You cannot delete your own account." };
  }

  const guard = await assertCanRemoveAdminPower(id);
  if (!guard.ok) return guard;

  try {
    const [deleted] = await db
      .delete(users)
      .where(and(eq(users.id, id), ne(users.id, currentUser.id)))
      .returning({ id: users.id });

    if (!deleted) return { ok: false, error: "User not found." };
    await writeAuditLog({
      actorId: currentUser.id,
      action: "user.deleted",
      entityType: "user",
      entityId: id,
    });
  } catch {
    return {
      ok: false,
      error:
        "This user is linked to historical records. Archive the account instead.",
    };
  }

  revalidatePath("/admin/users");

  return { ok: true, message: "User deleted." };
}
