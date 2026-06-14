"use server";

import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { coupons, customers } from "@/lib/db/schema";
import { sendCouponOfferEmail } from "@/lib/email/send-coupon-offer";
import {
  getCustomerOrderHistory,
  getCustomerProfile,
  searchCustomersForMarketing,
} from "@/lib/reports/customers";
import {
  parseReportFilters,
  type ReportSearchParams,
} from "@/lib/reports/range";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function fetchCustomerProfile(
  customerId: string,
  params: ReportSearchParams,
) {
  try {
    await requireRole("admin");
    const filters = parseReportFilters(params);
    const [profile, history] = await Promise.all([
      getCustomerProfile(customerId, filters),
      getCustomerOrderHistory(customerId, filters, 8),
    ]);
    if (!profile) return { ok: false as const, error: "Customer not found." };
    return { ok: true as const, profile, history };
  } catch {
    return {
      ok: false as const,
      error: "Could not load customer profile.",
    };
  }
}

export async function searchMarketingCustomers(
  query: string,
  params: ReportSearchParams,
) {
  try {
    await requireRole("admin");
    const filters = parseReportFilters(params);
    const rows = await searchCustomersForMarketing(query, filters, 50);
    return { ok: true as const, rows };
  } catch {
    return {
      ok: false as const,
      error: "Could not search customers.",
      rows: [],
    };
  }
}

export async function listActiveCoupons() {
  await requireRole("admin");
  const rows = await db.query.coupons.findMany({
    where: eq(coupons.active, true),
    orderBy: (coupon, { asc }) => [asc(coupon.code)],
  });
  return rows.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    value: Number(coupon.value),
  }));
}

export async function sendCouponOffer(input: {
  customerId: string;
  couponId: string;
  message?: string;
}): Promise<ActionResult> {
  const user = await requireRole("admin");
  const userLimit = checkRateLimit({
    scope: "marketing:send_coupon:user",
    identifier: user.id,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  const customerLimit = checkRateLimit({
    scope: "marketing:send_coupon:customer",
    identifier: input.customerId,
    limit: 3,
    windowMs: 10 * 60 * 1000,
  });
  if (!userLimit.ok || !customerLimit.ok) {
    return { ok: false, error: "Coupon emails are rate limited." };
  }

  const [customer, coupon] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, input.customerId) }),
    db.query.coupons.findFirst({ where: eq(coupons.id, input.couponId) }),
  ]);

  if (!customer) return { ok: false, error: "Customer not found." };
  if (!coupon || !coupon.active) {
    return { ok: false, error: "Coupon not found or inactive." };
  }
  if (!customer.email) {
    return { ok: false, error: "Customer has no email on file." };
  }

  const result = await sendCouponOfferEmail({
    customerName: customer.name,
    customerEmail: customer.email,
    couponCode: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.value),
    personalMessage: input.message,
  });

  if (!result.ok) return { ok: false, error: result.error };
  if (result.skipped) return { ok: false, error: result.reason };
  return { ok: true };
}
