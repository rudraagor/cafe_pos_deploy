import {
  formatMoney,
  isPromotionActiveNow,
  type PromotionInput,
} from "@/lib/pos/pricing";

export type PromotionCatalogItem = {
  id: string;
  name: string;
  discountLabel: string;
  summary: string;
  scheduleLabel: string | null;
  ruleLabel: string;
  stackable: boolean;
  isActiveNow: boolean;
};

type NameLookup = Record<string, string>;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatDiscount(type: PromotionInput["discountType"], value: number) {
  return type === "percent" ? `${value}% off` : `${formatMoney(value)} off`;
}

function formatTimeLabel(value: string) {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  if (minutes === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatPromotionSchedule(promo: PromotionInput) {
  const parts: string[] = [];
  const days = promo.daysOfWeek ?? [];

  if (days.length > 0 && days.length < 7) {
    parts.push(days.map((day) => DAY_LABELS[day] ?? String(day)).join(", "));
  }

  if (promo.startTime && promo.endTime) {
    parts.push(
      `${formatTimeLabel(promo.startTime)} – ${formatTimeLabel(promo.endTime)}`,
    );
  } else if (promo.startTime) {
    parts.push(`From ${formatTimeLabel(promo.startTime)}`);
  } else if (promo.endTime) {
    parts.push(`Until ${formatTimeLabel(promo.endTime)}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function joinNames(ids: string[] | undefined, lookup: NameLookup) {
  if (!ids?.length) return "";
  return ids
    .map((id) => lookup[id])
    .filter(Boolean)
    .join(" + ");
}

function getRuleType(promo: PromotionInput) {
  return (
    promo.ruleType ??
    (promo.scope === "product" ? "product_quantity" : "order_threshold")
  );
}

function formatRuleLabel(promo: PromotionInput) {
  const ruleType = getRuleType(promo);
  if (ruleType === "order_threshold") return "Spend more, save more";
  if (ruleType === "product_quantity") return "Quantity deal";
  if (ruleType === "combo") return "Combo offer";
  return "Daily special";
}

export function formatPromotionSummary(
  promo: PromotionInput,
  productNames: NameLookup,
  categoryNames: NameLookup,
) {
  const ruleType = getRuleType(promo);
  const config = promo.ruleConfig ?? {};

  if (ruleType === "order_threshold") {
    const minimum = promo.minOrderAmount ?? 0;
    return minimum > 0
      ? `Valid on orders of ${formatMoney(minimum)} or more.`
      : "Valid on qualifying orders.";
  }

  if (ruleType === "product_quantity") {
    const productName =
      (promo.productId && productNames[promo.productId]) || "selected item";
    const quantity = promo.minQuantity ?? 2;
    return `Buy ${quantity}+ ${productName} in one order.`;
  }

  if (ruleType === "combo") {
    const required = joinNames(config.requiredProductIds, productNames);
    const reward = joinNames(config.rewardProductIds, productNames);
    const requiredQuantity = config.requiredQuantity ?? 1;
    const rewardQuantity = config.rewardQuantity ?? 1;

    if (required) {
      const base = `Order ${requiredQuantity > 1 ? `${requiredQuantity}× ` : ""}${required}.`;
      if (reward && promo.discountType === "percent" && promo.value >= 100) {
        return `${base} Get ${rewardQuantity > 1 ? `${rewardQuantity}× ` : ""}${reward} free.`;
      }
      if (reward) {
        return `${base} Includes savings on ${reward}.`;
      }
      return `${base} Combo discount applies automatically.`;
    }

    return "Order the combo items together to unlock the deal.";
  }

  const dailyProducts = joinNames(config.dailyProductIds, productNames);
  const dailyCategories = (config.dailyCategoryIds ?? [])
    .map((id) => categoryNames[id])
    .filter(Boolean)
    .join(", ");

  if (dailyProducts) {
    return `Applies to ${dailyProducts}.`;
  }
  if (dailyCategories) {
    return `Applies to ${dailyCategories} items.`;
  }
  return "Applies to selected menu items.";
}

export function buildPromotionCatalog(
  promotions: PromotionInput[],
  productNames: NameLookup,
  categoryNames: NameLookup,
  now = new Date(),
): PromotionCatalogItem[] {
  return promotions
    .map((promo) => ({
      id: promo.id,
      name: promo.name,
      discountLabel: formatDiscount(promo.discountType, promo.value),
      summary: formatPromotionSummary(promo, productNames, categoryNames),
      scheduleLabel: formatPromotionSchedule(promo),
      ruleLabel: formatRuleLabel(promo),
      stackable: promo.stackable ?? true,
      isActiveNow: isPromotionActiveNow(promo, now),
    }))
    .sort((left, right) => {
      if (left.isActiveNow !== right.isActiveNow) {
        return left.isActiveNow ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
}

export function buildNameLookups(
  products: Array<{ id: string; name: string; categoryId?: string | null }>,
  categories: Array<{ id: string; name: string }>,
) {
  return {
    productNames: Object.fromEntries(products.map((product) => [product.id, product.name])),
    categoryNames: Object.fromEntries(
      categories.map((category) => [category.id, category.name]),
    ),
  };
}
