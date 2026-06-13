export type DiscountType = "percent" | "fixed";

export type PricingLineInput = {
  cartLineId?: string;
  productId: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  qty: number;
  isKitchenItem: boolean;
  categoryId?: string | null;
  categoryColor?: string;
  modifiers?: string[];
  note?: string;
};

export type PromotionInput = {
  id: string;
  name: string;
  scope: "product" | "order";
  productId: string | null;
  minQuantity: number | null;
  minOrderAmount: number | null;
  discountType: DiscountType;
  value: number;
  stackable?: boolean;
  ruleType?: "order_threshold" | "product_quantity" | "combo" | "daily_item";
  ruleConfig?: {
    requiredProductIds?: string[];
    dailyProductIds?: string[];
    dailyCategoryIds?: string[];
    requiredQuantity?: number;
    rewardProductIds?: string[];
    rewardProductId?: string | null;
    rewardQuantity?: number;
  };
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
};

export type CouponInput = {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
  stackable?: boolean;
};

export type ComputedLine = PricingLineInput & {
  lineGross: number;
  lineDiscount: number;
  lineTaxable: number;
  lineTax: number;
  lineTotal: number;
};

export type OrderDiscountLine = {
  id: string;
  label: string;
  amount: number;
  type: "promotion" | "coupon";
};

export type ComputedOrder = {
  lines: ComputedLine[];
  subtotal: number;
  tax: number;
  discountTotal: number;
  total: number;
  orderDiscounts: OrderDiscountLine[];
  appliedCoupon: CouponInput | null;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function applyDiscount(
  amount: number,
  discountType: DiscountType,
  value: number,
) {
  if (amount <= 0) return 0;
  const raw =
    discountType === "percent" ? amount * (value / 100) : Math.min(value, amount);
  return roundMoney(raw);
}

function minutesFromTime(value: string | null | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function promotionIsInWindow(promo: PromotionInput, now: Date) {
  const days = promo.daysOfWeek ?? [];
  if (days.length > 0 && !days.includes(now.getDay())) return false;

  const start = minutesFromTime(promo.startTime);
  const end = minutesFromTime(promo.endTime);
  if (start == null && end == null) return true;

  const current = now.getHours() * 60 + now.getMinutes();
  if (start != null && end != null) {
    return start <= end
      ? current >= start && current <= end
      : current >= start || current <= end;
  }
  if (start != null) return current >= start;
  return end == null || current <= end;
}

function getRuleType(promo: PromotionInput) {
  return (
    promo.ruleType ??
    (promo.scope === "product" ? "product_quantity" : "order_threshold")
  );
}

function applyLineDiscount(
  line: ComputedLine,
  discountType: DiscountType,
  value: number,
  baseAmount = line.lineGross,
) {
  const remaining = Math.max(0, line.lineGross - line.lineDiscount);
  const amount = Math.min(
    remaining,
    applyDiscount(Math.min(baseAmount, remaining), discountType, value),
  );
  line.lineDiscount = roundMoney(line.lineDiscount + amount);
  return amount;
}

function lineByProduct(lines: ComputedLine[], productId: string | null | undefined) {
  if (!productId) return null;
  return lines.find((line) => line.productId === productId) ?? null;
}

function comboEligible(lines: ComputedLine[], promo: PromotionInput) {
  const requiredProductIds = promo.ruleConfig?.requiredProductIds ?? [];
  const requiredQuantity = promo.ruleConfig?.requiredQuantity ?? 1;
  return (
    requiredProductIds.length > 0 &&
    requiredProductIds.every((productId) => {
      const line = lineByProduct(lines, productId);
      return line && line.qty >= requiredQuantity;
    })
  );
}

export function computeOrder(
  items: PricingLineInput[],
  options: {
    promotions?: PromotionInput[];
    coupon?: CouponInput | null;
  } = {},
): ComputedOrder {
  const now = new Date();
  const coupon = options.coupon ?? null;
  const promotions =
    coupon?.stackable === false
      ? []
      : (options.promotions ?? []).filter((promo) =>
          promotionIsInWindow(promo, now),
        );

  const lines: ComputedLine[] = items.map((item) => ({
    ...item,
    lineGross: roundMoney(item.unitPrice * item.qty),
    lineDiscount: 0,
    lineTaxable: 0,
    lineTax: 0,
    lineTotal: 0,
  }));

  const orderDiscounts: OrderDiscountLine[] = [];
  let exclusivePromotionApplied = false;

  for (const promo of promotions) {
    if (exclusivePromotionApplied) break;
    const ruleType = getRuleType(promo);
    let appliedAmount = 0;

    if (ruleType === "product_quantity") {
      const line = lineByProduct(lines, promo.productId);
      if (line && promo.minQuantity != null && line.qty >= promo.minQuantity) {
        appliedAmount = applyLineDiscount(line, promo.discountType, promo.value);
      }
    }

    if (ruleType === "daily_item") {
      const dailyProductIds = promo.ruleConfig?.dailyProductIds ?? [];
      const dailyCategoryIds = promo.ruleConfig?.dailyCategoryIds ?? [];
      for (const line of lines) {
        if (
          dailyProductIds.includes(line.productId) ||
          (line.categoryId && dailyCategoryIds.includes(line.categoryId))
        ) {
          appliedAmount = roundMoney(
            appliedAmount +
              applyLineDiscount(line, promo.discountType, promo.value),
          );
        }
      }
    }

    if (ruleType === "combo" && comboEligible(lines, promo)) {
      const rewardProductIds =
        promo.ruleConfig?.rewardProductIds?.length
          ? promo.ruleConfig.rewardProductIds
          : promo.ruleConfig?.rewardProductId
            ? [promo.ruleConfig.rewardProductId]
            : [];

      if (rewardProductIds.length > 0) {
        for (const rewardProductId of rewardProductIds) {
          const rewardLine = lineByProduct(lines, rewardProductId);
          if (!rewardLine) continue;

          const rewardQty = Math.min(
            promo.ruleConfig?.rewardQuantity ?? 1,
            rewardLine.qty,
          );
          appliedAmount = roundMoney(
            appliedAmount +
              applyLineDiscount(
                rewardLine,
                promo.discountType,
                promo.value,
                rewardLine.unitPrice * rewardQty,
              ),
          );
        }
      } else {
        const requiredQuantity = promo.ruleConfig?.requiredQuantity ?? 1;
        const requiredProductIds = promo.ruleConfig?.requiredProductIds ?? [];
        const comboBase = requiredProductIds.reduce((sum, productId) => {
          const line = lineByProduct(lines, productId);
          return sum + (line ? line.unitPrice * requiredQuantity : 0);
        }, 0);
        appliedAmount = applyDiscount(comboBase, promo.discountType, promo.value);
        if (appliedAmount > 0) {
          orderDiscounts.push({
            id: promo.id,
            label: promo.name,
            amount: appliedAmount,
            type: "promotion",
          });
        }
      }
    }

    if (appliedAmount > 0 && promo.stackable === false) {
      exclusivePromotionApplied = true;
    }
  }

  for (const line of lines) {
    const lineGross = roundMoney(line.unitPrice * line.qty);
    const lineDiscount = roundMoney(Math.min(line.lineDiscount, lineGross));
    const lineTaxable = roundMoney(lineGross - lineDiscount);
    const lineTax = roundMoney(lineTaxable * (line.taxRate / 100));
    const lineTotal = roundMoney(lineTaxable + lineTax);

    line.lineGross = lineGross;
    line.lineDiscount = lineDiscount;
    line.lineTaxable = lineTaxable;
    line.lineTax = lineTax;
    line.lineTotal = lineTotal;
  }

  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineGross, 0),
  );
  const lineDiscountTotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineDiscount, 0),
  );
  const netAfterLineDiscounts = roundMoney(subtotal - lineDiscountTotal);

  let orderDiscountTotal = roundMoney(
    orderDiscounts.reduce((sum, discount) => sum + discount.amount, 0),
  );

  for (const promo of promotions) {
    if (exclusivePromotionApplied) break;
    if (getRuleType(promo) !== "order_threshold") continue;
    const minAmount = promo.minOrderAmount ?? 0;
    if (netAfterLineDiscounts >= minAmount) {
      const amount = applyDiscount(
        netAfterLineDiscounts - orderDiscountTotal,
        promo.discountType,
        promo.value,
      );
      if (amount > 0) {
        orderDiscounts.push({
          id: promo.id,
          label: promo.name,
          amount,
          type: "promotion",
        });
        orderDiscountTotal = roundMoney(orderDiscountTotal + amount);
        if (promo.stackable === false) {
          exclusivePromotionApplied = true;
          break;
        }
      }
    }
  }

  let appliedCoupon: CouponInput | null = null;
  if (coupon && !exclusivePromotionApplied) {
    const base = roundMoney(netAfterLineDiscounts - orderDiscountTotal);
    const amount = applyDiscount(
      base,
      coupon.discountType,
      coupon.value,
    );
    if (amount > 0) {
      orderDiscounts.push({
        id: coupon.id,
        label: `Coupon ${coupon.code}`,
        amount,
        type: "coupon",
      });
      orderDiscountTotal = roundMoney(orderDiscountTotal + amount);
      appliedCoupon = coupon;
    }
  }

  const tax = roundMoney(lines.reduce((sum, line) => sum + line.lineTax, 0));
  const discountTotal = roundMoney(lineDiscountTotal + orderDiscountTotal);
  const total = roundMoney(subtotal - discountTotal + tax);

  return {
    lines,
    subtotal,
    tax,
    discountTotal,
    total,
    orderDiscounts,
    appliedCoupon,
  };
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}
