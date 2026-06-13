"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/pos/pricing";

type DashboardChartsProps = {
  revenueByDay: { label: string; revenue: number; orders: number }[];
  salesByHour: { label: string; revenue: number; orders: number }[];
  topProducts: { product: string; quantity: number; revenue: number }[];
  salesByCategory: { category: string; revenue: number; quantity: number }[];
  paymentMix: { method: string; amount: number; count: number }[];
};

const colors = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];

export function DashboardCharts({
  revenueByDay,
  salesByHour,
  topProducts,
  salesByCategory,
  paymentMix,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Revenue over time" empty={revenueByDay.length === 0}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(value) => `₹${value}`} />
            <Tooltip formatter={(value) => formatMoney(Number(value))} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.18}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top products" empty={topProducts.length === 0}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={topProducts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="product" hide />
            <YAxis />
            <Tooltip
              formatter={(value, name) =>
                name === "revenue" ? formatMoney(Number(value)) : value
              }
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Sales by category" empty={salesByCategory.length === 0}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={salesByCategory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" hide />
            <YAxis tickFormatter={(value) => `₹${value}`} />
            <Tooltip formatter={(value) => formatMoney(Number(value))} />
            <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Sales by hour" empty={salesByHour.length === 0}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={salesByHour}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(value) => `₹${value}`} />
            <Tooltip formatter={(value) => formatMoney(Number(value))} />
            <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Payment mix" empty={paymentMix.length === 0}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={paymentMix}
              dataKey="amount"
              nameKey="method"
              outerRadius={90}
              label
            >
              {paymentMix.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatMoney(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="text-muted-foreground flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm">
            No paid orders in this range.
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
