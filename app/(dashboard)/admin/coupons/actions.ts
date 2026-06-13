"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { coupons, promotions } from "@/lib/db/schema";
import {
  type CouponInput,
  type PromotionInput,
  couponSchema,
  promotionSchema,
} from "@/lib/validations/discounts";

export type CouponActionResult = ActionResult<keyof CouponInput>;
export type PromotionActionResult = ActionResult<keyof PromotionInput>;

function blankToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function formDataStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function formDataNumbers(formData: FormData, key: string) {
  return formDataStrings(formData, key).map(Number);
}

function parseCoupon(formData: FormData): CouponActionResult | CouponInput {
  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    value: formData.get("value"),
    stackable: formData.get("stackable") === "true",
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

function parsePromotion(
  formData: FormData,
): PromotionActionResult | PromotionInput {
  const parsed = promotionSchema.safeParse({
    name: formData.get("name"),
    scope: formData.get("scope"),
    ruleType: formData.get("ruleType"),
    productId: blankToNull(formData.get("productId")),
    minQuantity: blankToNull(formData.get("minQuantity")),
    minOrderAmount: blankToNull(formData.get("minOrderAmount")),
    requiredProductIds: formDataStrings(formData, "requiredProductIds"),
    dailyProductIds: formDataStrings(formData, "dailyProductIds"),
    dailyCategoryIds: formDataStrings(formData, "dailyCategoryIds"),
    requiredQuantity: formData.get("requiredQuantity") ?? "1",
    rewardProductIds: formDataStrings(formData, "rewardProductIds"),
    rewardQuantity: formData.get("rewardQuantity") ?? "1",
    daysOfWeek: formDataNumbers(formData, "daysOfWeek"),
    startTime: blankToNull(formData.get("startTime")),
    endTime: blankToNull(formData.get("endTime")),
    discountType: formData.get("discountType"),
    value: formData.get("value"),
    stackable: formData.get("stackable") === "true",
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

async function findCouponByCode(code: string, excludeId?: string) {
  const normalized = code.toLowerCase();
  return db.query.coupons.findFirst({
    where: excludeId
      ? sql`${coupons.id} <> ${excludeId} and lower(${coupons.code}) = ${normalized}`
      : sql`lower(${coupons.code}) = ${normalized}`,
  });
}

async function findPromotionByName(name: string, excludeId?: string) {
  const normalized = name.toLowerCase();
  return db.query.promotions.findFirst({
    where: excludeId
      ? sql`${promotions.id} <> ${excludeId} and lower(${promotions.name}) = ${normalized}`
      : sql`lower(${promotions.name}) = ${normalized}`,
  });
}

function couponValues(input: CouponInput) {
  return {
    code: input.code,
    discountType: input.discountType,
    value: input.value.toFixed(2),
    stackable: input.stackable,
    active: input.active,
  };
}

function promotionValues(input: PromotionInput) {
  const scope: "order" | "product" =
    input.ruleType === "order_threshold" ? "order" : "product";
  const ruleConfig = {
    requiredProductIds: input.requiredProductIds,
    dailyProductIds: input.dailyProductIds,
    dailyCategoryIds: input.dailyCategoryIds,
    requiredQuantity: input.requiredQuantity,
    rewardProductIds: input.rewardProductIds,
    rewardQuantity: input.rewardQuantity,
  };

  return {
    name: input.name,
    scope,
    productId: input.ruleType === "product_quantity" ? input.productId : null,
    minQuantity:
      input.ruleType === "product_quantity" ? input.minQuantity : null,
    minOrderAmount:
      input.ruleType === "order_threshold"
        ? (input.minOrderAmount?.toFixed(2) ?? null)
        : null,
    discountType: input.discountType,
    value: input.value.toFixed(2),
    stackable: input.stackable,
    ruleType: input.ruleType,
    ruleConfig,
    daysOfWeek: input.daysOfWeek,
    startTime: input.startTime || null,
    endTime: input.endTime || null,
    active: input.active,
  };
}

export async function createCoupon(
  formData: FormData,
): Promise<CouponActionResult> {
  await requireRole("admin");

  const parsed = parseCoupon(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findCouponByCode(parsed.code);
  if (existing) {
    return {
      ok: false,
      error: "A coupon with this code already exists.",
      fieldErrors: { code: ["A coupon with this code already exists."] },
    };
  }

  await db.insert(coupons).values(couponValues(parsed));
  revalidatePath("/admin/coupons");

  return { ok: true, message: "Coupon created." };
}

export async function updateCoupon(
  id: string,
  formData: FormData,
): Promise<CouponActionResult> {
  await requireRole("admin");

  const parsed = parseCoupon(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findCouponByCode(parsed.code, id);
  if (existing) {
    return {
      ok: false,
      error: "A coupon with this code already exists.",
      fieldErrors: { code: ["A coupon with this code already exists."] },
    };
  }

  const [updated] = await db
    .update(coupons)
    .set(couponValues(parsed))
    .where(eq(coupons.id, id))
    .returning({ id: coupons.id });

  if (!updated) return { ok: false, error: "Coupon not found." };

  revalidatePath("/admin/coupons");

  return { ok: true, message: "Coupon updated." };
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  await requireRole("admin");

  const [deleted] = await db
    .delete(coupons)
    .where(eq(coupons.id, id))
    .returning({ id: coupons.id });

  if (!deleted) return { ok: false, error: "Coupon not found." };

  revalidatePath("/admin/coupons");

  return { ok: true, message: "Coupon deleted." };
}

export async function createPromotion(
  formData: FormData,
): Promise<PromotionActionResult> {
  await requireRole("admin");

  const parsed = parsePromotion(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findPromotionByName(parsed.name);
  if (existing) {
    return {
      ok: false,
      error: "A promotion with this name already exists.",
      fieldErrors: { name: ["A promotion with this name already exists."] },
    };
  }

  await db.insert(promotions).values(promotionValues(parsed));
  revalidatePath("/admin/coupons");

  return { ok: true, message: "Promotion created." };
}

export async function updatePromotion(
  id: string,
  formData: FormData,
): Promise<PromotionActionResult> {
  await requireRole("admin");

  const parsed = parsePromotion(formData);
  if ("ok" in parsed) return parsed;

  const existing = await findPromotionByName(parsed.name, id);
  if (existing) {
    return {
      ok: false,
      error: "A promotion with this name already exists.",
      fieldErrors: { name: ["A promotion with this name already exists."] },
    };
  }

  const [updated] = await db
    .update(promotions)
    .set(promotionValues(parsed))
    .where(eq(promotions.id, id))
    .returning({ id: promotions.id });

  if (!updated) return { ok: false, error: "Promotion not found." };

  revalidatePath("/admin/coupons");

  return { ok: true, message: "Promotion updated." };
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  await requireRole("admin");

  const [deleted] = await db
    .delete(promotions)
    .where(eq(promotions.id, id))
    .returning({ id: promotions.id });

  if (!deleted) return { ok: false, error: "Promotion not found." };

  revalidatePath("/admin/coupons");

  return { ok: true, message: "Promotion deleted." };
}
