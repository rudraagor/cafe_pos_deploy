"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  IndianRupee,
  Minus,
  Package,
  ReceiptText,
  Tag,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/pos/pricing";
import { cn } from "@/lib/utils";

type KpiCardsProps = {
  summary: {
    revenue: number;
    gross: number;
    orderCount: number;
    averageOrderValue: number;
    discountTotal: number;
    taxTotal: number;
  };
  comparison: {
    revenueDelta: number;
    orderCountDelta: number;
    aovDelta: number;
    discountDelta: number;
    taxDelta: number;
    grossDelta: number;
  };
  itemsSold: number;
  dineInShare: {
    percent: number;
    dineInOrders: number;
    totalOrders: number;
  };
};

export function KpiCards({
  summary,
  comparison,
  itemsSold,
  dineInShare,
}: KpiCardsProps) {
  const cards = [
    {
      label: "Revenue",
      value: formatMoney(summary.revenue),
      delta: comparison.revenueDelta,
      icon: IndianRupee,
    },
    {
      label: "Paid orders",
      value: String(summary.orderCount),
      delta: comparison.orderCountDelta,
      icon: ReceiptText,
    },
    {
      label: "Avg order value",
      value: formatMoney(summary.averageOrderValue),
      delta: comparison.aovDelta,
      icon: TrendingUp,
    },
    {
      label: "Gross sales",
      value: formatMoney(summary.gross),
      delta: comparison.grossDelta,
      icon: TrendingUp,
    },
    {
      label: "Tax collected",
      value: formatMoney(summary.taxTotal),
      delta: comparison.taxDelta,
      icon: Tag,
    },
    {
      label: "Discounts",
      value: formatMoney(summary.discountTotal),
      delta: comparison.discountDelta,
      icon: Tag,
    },
    {
      label: "Items sold",
      value: String(itemsSold),
      delta: null,
      icon: Package,
    },
    {
      label: "Dine-in share",
      value: `${dineInShare.percent.toFixed(1)}%`,
      delta: null,
      icon: Utensils,
      subtitle:
        dineInShare.totalOrders > 0
          ? `${dineInShare.dineInOrders} of ${dineInShare.totalOrders} orders`
          : "No paid orders in range",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, delta, icon: Icon, subtitle }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{label}</CardTitle>
            <Icon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{value}</p>
            {delta != null ? (
              <DeltaBadge delta={delta} />
            ) : subtitle ? (
              <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const rounded = Math.round(delta * 10) / 10;
  const flat = Math.abs(rounded) < 0.5;
  const positive = rounded > 0;

  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-xs",
        flat && "text-muted-foreground",
        !flat && positive && "text-emerald-600",
        !flat && !positive && "text-red-600",
      )}
    >
      {flat ? (
        <Minus className="size-3" />
      ) : positive ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {flat ? "Flat vs prior period" : `${rounded > 0 ? "+" : ""}${rounded}% vs prior period`}
    </p>
  );
}
