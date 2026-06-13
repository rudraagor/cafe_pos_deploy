export type DiscountType = "percent" | "fixed";

export type PricingLineInput = {
  cartLineId?: string;
  productId: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  qty: number;
  isKitchenItem: boolean;
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
};

export type CouponInput = {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
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

export function computeOrder(
  items: PricingLineInput[],
  options: {
    promotions?: PromotionInput[];
    coupon?: CouponInput | null;
  } = {},
): ComputedOrder {
  const promotions = options.promotions ?? [];
  const productPromos = promotions.filter((p) => p.scope === "product");
  const orderPromos = promotions.filter((p) => p.scope === "order");

  const lines: ComputedLine[] = items.map((item) => {
    const lineGross = roundMoney(item.unitPrice * item.qty);
    let lineDiscount = 0;

    for (const promo of productPromos) {
      if (
        promo.productId === item.productId &&
        promo.minQuantity != null &&
        item.qty >= promo.minQuantity
      ) {
        lineDiscount += applyDiscount(lineGross, promo.discountType, promo.value);
      }
    }

    lineDiscount = roundMoney(Math.min(lineDiscount, lineGross));
    const lineTaxable = roundMoney(lineGross - lineDiscount);
    const lineTax = roundMoney(lineTaxable * (item.taxRate / 100));
    const lineTotal = roundMoney(lineTaxable + lineTax);

    return {
      ...item,
      lineGross,
      lineDiscount,
      lineTaxable,
      lineTax,
      lineTotal,
    };
  });

  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineGross, 0),
  );
  const lineDiscountTotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineDiscount, 0),
  );
  const netAfterLineDiscounts = roundMoney(subtotal - lineDiscountTotal);

  const orderDiscounts: OrderDiscountLine[] = [];
  let orderDiscountTotal = 0;

  for (const promo of orderPromos) {
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
      }
    }
  }

  let appliedCoupon: CouponInput | null = null;
  if (options.coupon) {
    const base = roundMoney(netAfterLineDiscounts - orderDiscountTotal);
    const amount = applyDiscount(
      base,
      options.coupon.discountType,
      options.coupon.value,
    );
    if (amount > 0) {
      orderDiscounts.push({
        id: options.coupon.id,
        label: `Coupon ${options.coupon.code}`,
        amount,
        type: "coupon",
      });
      orderDiscountTotal = roundMoney(orderDiscountTotal + amount);
      appliedCoupon = options.coupon;
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
