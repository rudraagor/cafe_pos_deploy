import { IndianRupee, ReceiptText, Tag, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/pos/pricing";

type KpiCardsProps = {
  summary: {
    revenue: number;
    orderCount: number;
    averageOrderValue: number;
    discountTotal: number;
    taxTotal: number;
  };
};

export function KpiCards({ summary }: KpiCardsProps) {
  const cards = [
    {
      label: "Revenue",
      value: formatMoney(summary.revenue),
      icon: IndianRupee,
    },
    {
      label: "Paid orders",
      value: summary.orderCount,
      icon: ReceiptText,
    },
    {
      label: "Avg order value",
      value: formatMoney(summary.averageOrderValue),
      icon: TrendingUp,
    },
    {
      label: "Discounts",
      value: formatMoney(summary.discountTotal),
      icon: Tag,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{label}</CardTitle>
            <Icon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
