import { PageHeader } from "@/components/admin/page-header";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DiscountsManagement,
  type CouponRow,
  type PromotionRow,
} from "./discounts-management";
import type { PromotionProductOption } from "./promotion-form-dialog";

export default async function CouponsPage() {
  await requireRole("admin");

  const [coupons, promotions, products, categories] = await Promise.all([
    db.query.coupons.findMany({
      orderBy: (coupon, { asc }) => [asc(coupon.code)],
    }),
    db.query.promotions.findMany({
      orderBy: (promotion, { asc }) => [asc(promotion.name)],
    }),
    db.query.products.findMany({
      columns: {
        id: true,
        name: true,
      },
      orderBy: (product, { asc }) => [asc(product.name)],
    }),
    db.query.categories.findMany({
      columns: {
        id: true,
        name: true,
      },
      orderBy: (category, { asc }) => [asc(category.name)],
    }),
  ]);

  const productOptions: PromotionProductOption[] = products;
  const productNames = new Map(
    products.map((product) => [product.id, product.name]),
  );
  function promotionConfig(value: unknown) {
    if (!value || typeof value !== "object") {
      return {
        requiredProductIds: [],
        dailyProductIds: [],
        dailyCategoryIds: [],
        requiredQuantity: "1",
        rewardProductIds: [],
        rewardQuantity: "1",
      };
    }
    const config = value as Record<string, unknown>;
    return {
      requiredProductIds: Array.isArray(config.requiredProductIds)
        ? config.requiredProductIds.map(String)
        : [],
      dailyProductIds: Array.isArray(config.dailyProductIds)
        ? config.dailyProductIds.map(String)
        : [],
      dailyCategoryIds: Array.isArray(config.dailyCategoryIds)
        ? config.dailyCategoryIds.map(String)
        : [],
      requiredQuantity: String(config.requiredQuantity ?? "1"),
      rewardProductIds: Array.isArray(config.rewardProductIds)
        ? config.rewardProductIds.map(String)
        : config.rewardProductId
          ? [String(config.rewardProductId)]
          : [],
      rewardQuantity: String(config.rewardQuantity ?? "1"),
    };
  }
  const couponRows: CouponRow[] = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    stackable: coupon.stackable,
    active: coupon.active,
  }));
  const promotionRows: PromotionRow[] = promotions.map((promotion) => {
    const config = promotionConfig(promotion.ruleConfig);
    const displayProductIds =
      promotion.ruleType === "combo"
        ? config.requiredProductIds
        : promotion.ruleType === "daily_item"
          ? config.dailyProductIds
          : promotion.productId
            ? [promotion.productId]
            : [];
    return {
      id: promotion.id,
      name: promotion.name,
      scope: promotion.scope,
      ruleType: promotion.ruleType,
      productId: promotion.productId ?? "",
      productName:
        displayProductIds
          .map((id) => productNames.get(id))
          .filter(Boolean)
          .join(" + ") || null,
      minQuantity: promotion.minQuantity ? String(promotion.minQuantity) : "",
      minOrderAmount: promotion.minOrderAmount ?? "",
      requiredProductIds: config.requiredProductIds,
      dailyProductIds: config.dailyProductIds,
      dailyCategoryIds: config.dailyCategoryIds,
      requiredQuantity: config.requiredQuantity,
      rewardProductIds: config.rewardProductIds,
      rewardQuantity: config.rewardQuantity,
      daysOfWeek: Array.isArray(promotion.daysOfWeek)
        ? promotion.daysOfWeek.map(Number)
        : [],
      startTime: promotion.startTime ?? "",
      endTime: promotion.endTime ?? "",
      discountType: promotion.discountType,
      value: promotion.value,
      stackable: promotion.stackable,
      active: promotion.active,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons & Promotions"
        description="Configure manual coupon codes and automatic discount rules."
      />
      <DiscountsManagement
        coupons={couponRows}
        promotions={promotionRows}
        products={productOptions}
        categories={categories}
      />
    </div>
  );
}
