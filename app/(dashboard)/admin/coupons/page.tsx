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

  const [coupons, promotions, products] = await Promise.all([
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
  ]);

  const productOptions: PromotionProductOption[] = products;
  const productNames = new Map(
    products.map((product) => [product.id, product.name]),
  );
  const couponRows: CouponRow[] = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    active: coupon.active,
  }));
  const promotionRows: PromotionRow[] = promotions.map((promotion) => ({
    id: promotion.id,
    name: promotion.name,
    scope: promotion.scope,
    productId: promotion.productId ?? "",
    productName: promotion.productId
      ? (productNames.get(promotion.productId) ?? null)
      : null,
    minQuantity: promotion.minQuantity ? String(promotion.minQuantity) : "",
    minOrderAmount: promotion.minOrderAmount ?? "",
    discountType: promotion.discountType,
    value: promotion.value,
    active: promotion.active,
  }));

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
      />
    </div>
  );
}
