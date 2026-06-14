import type * as schema from "@/lib/db/schema";

type ProductRow = { id: string; name: string; categoryId: string | null };
type CategoryMap = Record<string, string>;

export type PromotionSeedRow = typeof schema.promotions.$inferInsert;

type PromotionTemplate = {
  name: string;
  ruleType: "order_threshold" | "product_quantity" | "combo" | "daily_item";
  discountType: "percent" | "fixed";
  value: string;
  stackable: boolean;
  productName?: string;
  minQuantity?: number;
  minOrderAmount?: string;
  requiredProductNames?: string[];
  rewardProductNames?: string[];
  dailyProductNames?: string[];
  dailyCategoryNames?: string[];
  requiredQuantity?: number;
  rewardQuantity?: number;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
};

export const PROMOTION_TEMPLATES: PromotionTemplate[] = [
  {
    name: "Morning Rush",
    ruleType: "order_threshold",
    minOrderAmount: "250.00",
    discountType: "percent",
    value: "10.00",
    stackable: true,
    startTime: "07:00",
    endTime: "10:30",
  },
  {
    name: "Lunch Hour Special",
    ruleType: "order_threshold",
    minOrderAmount: "400.00",
    discountType: "fixed",
    value: "50.00",
    stackable: true,
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "12:00",
    endTime: "15:00",
  },
  {
    name: "Weekend Feast",
    ruleType: "order_threshold",
    minOrderAmount: "700.00",
    discountType: "fixed",
    value: "100.00",
    stackable: true,
    daysOfWeek: [0, 6],
  },
  {
    name: "Big Ticket Order",
    ruleType: "order_threshold",
    minOrderAmount: "1200.00",
    discountType: "fixed",
    value: "180.00",
    stackable: false,
  },
  {
    name: "Chai Lover",
    ruleType: "product_quantity",
    productName: "Masala Chai",
    minQuantity: 2,
    discountType: "percent",
    value: "15.00",
    stackable: true,
  },
  {
    name: "Triple Espresso Deal",
    ruleType: "product_quantity",
    productName: "Espresso",
    minQuantity: 3,
    discountType: "percent",
    value: "20.00",
    stackable: true,
  },
  {
    name: "Latte Pair",
    ruleType: "product_quantity",
    productName: "Latte",
    minQuantity: 2,
    discountType: "percent",
    value: "18.00",
    stackable: true,
  },
  {
    name: "Coffee & Croissant Combo",
    ruleType: "combo",
    requiredProductNames: ["Espresso", "Croissant"],
    requiredQuantity: 1,
    discountType: "percent",
    value: "25.00",
    stackable: true,
  },
  {
    name: "Sandwich & Iced Coffee Combo",
    ruleType: "combo",
    requiredProductNames: ["Veg Grilled Sandwich", "Iced Coffee"],
    requiredQuantity: 1,
    discountType: "percent",
    value: "30.00",
    stackable: true,
  },
  {
    name: "Sweet Finish Combo",
    ruleType: "combo",
    requiredProductNames: ["Cappuccino", "Chocolate Brownie"],
    rewardProductNames: ["Chocolate Brownie"],
    rewardQuantity: 1,
    discountType: "percent",
    value: "100.00",
    stackable: false,
  },
  {
    name: "Pastry of the Day",
    ruleType: "daily_item",
    dailyCategoryNames: ["Pastries"],
    discountType: "percent",
    value: "20.00",
    stackable: true,
  },
  {
    name: "Iced Afternoon",
    ruleType: "daily_item",
    dailyCategoryNames: ["Cold Drinks"],
    discountType: "percent",
    value: "12.00",
    stackable: true,
    startTime: "14:00",
    endTime: "18:00",
  },
  {
    name: "Tea Time Tuesday",
    ruleType: "daily_item",
    dailyCategoryNames: ["Tea"],
    discountType: "percent",
    value: "15.00",
    stackable: true,
    daysOfWeek: [2],
  },
  {
    name: "Dessert Delight",
    ruleType: "daily_item",
    dailyProductNames: ["Cheesecake Slice", "Tiramisu"],
    discountType: "percent",
    value: "18.00",
    stackable: true,
  },
  {
    name: "Happy Hour Coffee",
    ruleType: "daily_item",
    dailyCategoryNames: ["Coffee"],
    discountType: "percent",
    value: "15.00",
    stackable: true,
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "15:00",
    endTime: "18:00",
  },
];

function resolveProductId(
  name: string | undefined,
  productByName: Record<string, string>,
  products: ProductRow[],
  categoryByName: CategoryMap,
  fallbackCategory?: string,
) {
  if (name && productByName[name]) return productByName[name];
  if (fallbackCategory) {
    const categoryId = categoryByName[fallbackCategory];
    if (categoryId) {
      const match = products.find((product) => product.categoryId === categoryId);
      if (match) return match.id;
    }
  }
  return null;
}

function resolveProductIds(
  names: string[] | undefined,
  productByName: Record<string, string>,
) {
  if (!names?.length) return [];
  return names
    .map((name) => productByName[name])
    .filter((id): id is string => Boolean(id));
}

function resolveCategoryIds(
  names: string[] | undefined,
  categoryByName: CategoryMap,
) {
  if (!names?.length) return [];
  return names
    .map((name) => categoryByName[name])
    .filter((id): id is string => Boolean(id));
}

export function buildPromotionSeedRows(
  products: ProductRow[],
  categoryByName: CategoryMap,
): PromotionSeedRow[] {
  const productByName = Object.fromEntries(products.map((p) => [p.name, p.id]));
  const rows: PromotionSeedRow[] = [];

  for (const template of PROMOTION_TEMPLATES) {
    const ruleConfig = {
      requiredProductIds: resolveProductIds(
        template.requiredProductNames,
        productByName,
      ),
      rewardProductIds: resolveProductIds(
        template.rewardProductNames,
        productByName,
      ),
      dailyProductIds: resolveProductIds(
        template.dailyProductNames,
        productByName,
      ),
      dailyCategoryIds: resolveCategoryIds(
        template.dailyCategoryNames,
        categoryByName,
      ),
      requiredQuantity: template.requiredQuantity ?? 1,
      rewardQuantity: template.rewardQuantity ?? 1,
    };

    let productId: string | null = null;
    if (template.ruleType === "product_quantity") {
      productId = resolveProductId(
        template.productName,
        productByName,
        products,
        categoryByName,
        template.productName === "Masala Chai"
          ? "Tea"
          : template.productName === "Espresso" || template.productName === "Latte"
            ? "Coffee"
            : undefined,
      );
      if (!productId || !template.minQuantity) continue;
    }

    if (template.ruleType === "combo") {
      if (ruleConfig.requiredProductIds.length === 0) continue;
      if (
        template.rewardProductNames?.length &&
        ruleConfig.rewardProductIds.length === 0
      ) {
        continue;
      }
    }

    if (template.ruleType === "daily_item") {
      if (
        ruleConfig.dailyProductIds.length === 0 &&
        ruleConfig.dailyCategoryIds.length === 0
      ) {
        continue;
      }
    }

    if (template.ruleType === "order_threshold" && !template.minOrderAmount) {
      continue;
    }

    const scope: "order" | "product" =
      template.ruleType === "order_threshold" ? "order" : "product";

    rows.push({
      name: template.name,
      scope,
      productId,
      minQuantity:
        template.ruleType === "product_quantity"
          ? (template.minQuantity ?? null)
          : null,
      minOrderAmount:
        template.ruleType === "order_threshold"
          ? template.minOrderAmount!
          : null,
      discountType: template.discountType,
      value: template.value,
      stackable: template.stackable,
      ruleType: template.ruleType,
      ruleConfig,
      daysOfWeek: template.daysOfWeek ?? [],
      startTime: template.startTime ?? null,
      endTime: template.endTime ?? null,
      active: true,
    });
  }

  return rows;
}

export function mapPromotionRowForPricing(
  promotion: {
    id: string;
    name: string;
    scope: "product" | "order";
    productId: string | null;
    minQuantity: number | null;
    minOrderAmount: string | null;
    discountType: "percent" | "fixed";
    value: string;
    stackable: boolean;
    ruleType: PromotionTemplate["ruleType"];
    ruleConfig: unknown;
    daysOfWeek: unknown;
    startTime: string | null;
    endTime: string | null;
  },
) {
  const config =
    promotion.ruleConfig && typeof promotion.ruleConfig === "object"
      ? (promotion.ruleConfig as Record<string, unknown>)
      : {};

  return {
    id: promotion.id,
    name: promotion.name,
    scope: promotion.scope,
    productId: promotion.productId,
    minQuantity: promotion.minQuantity,
    minOrderAmount: promotion.minOrderAmount
      ? Number(promotion.minOrderAmount)
      : null,
    discountType: promotion.discountType,
    value: Number(promotion.value),
    stackable: promotion.stackable,
    ruleType: promotion.ruleType,
    ruleConfig: {
      requiredProductIds: Array.isArray(config.requiredProductIds)
        ? config.requiredProductIds.map(String)
        : [],
      dailyProductIds: Array.isArray(config.dailyProductIds)
        ? config.dailyProductIds.map(String)
        : [],
      dailyCategoryIds: Array.isArray(config.dailyCategoryIds)
        ? config.dailyCategoryIds.map(String)
        : [],
      requiredQuantity: Number(config.requiredQuantity ?? 1),
      rewardProductIds: Array.isArray(config.rewardProductIds)
        ? config.rewardProductIds.map(String)
        : [],
      rewardQuantity: Number(config.rewardQuantity ?? 1),
    },
    daysOfWeek: Array.isArray(promotion.daysOfWeek)
      ? promotion.daysOfWeek.map(Number)
      : [],
    startTime: promotion.startTime,
    endTime: promotion.endTime,
  };
}
