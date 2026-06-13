"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/reports/chart-card";
import { formatMoney } from "@/lib/pos/pricing";

const colors = [
  "var(--chart-1, #10b981)",
  "var(--chart-2, #f59e0b)",
  "var(--chart-3, #3b82f6)",
  "var(--chart-4, #ef4444)",
  "var(--chart-5, #8b5cf6)",
];

type DashboardChartsData = {
  revenueByDay: { label: string; revenue: number; orders: number }[];
  salesByHour: { label: string; revenue: number; orders: number }[];
  topProducts: { product: string; quantity: number; revenue: number }[];
  salesByCategory: { category: string; revenue: number; quantity: number }[];
  paymentMix: { method: string; amount: number; count: number }[];
  salesByEmployee: { employee: string; revenue: number; orderCount: number }[];
  salesByFulfillment: { label: string; revenue: number; orderCount: number }[];
  productVelocity: { product: string; perDay: number; quantity: number }[];
};

export function RevenueTrendChart({
  data,
}: {
  data: DashboardChartsData["revenueByDay"];
}) {
  return (
    <ChartCard title="Revenue over time" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis yAxisId="left" tickFormatter={(v) => `₹${v}`} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip
            formatter={(value, name) =>
              name === "revenue" ? formatMoney(Number(value)) : value
            }
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke={colors[0]}
            fill={colors[0]}
            fillOpacity={0.18}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orders"
            stroke={colors[2]}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function OrdersTrendChart({
  data,
}: {
  data: DashboardChartsData["revenueByDay"];
}) {
  return (
    <ChartCard title="Orders over time" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="orders"
            stroke={colors[2]}
            fill={colors[2]}
            fillOpacity={0.18}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopProductsChart({
  data,
}: {
  data: DashboardChartsData["topProducts"];
}) {
  return (
    <ChartCard title="Top products" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="product" width={100} tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(label) => String(label)} />
          <Bar dataKey="quantity" fill={colors[2]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CategorySalesChart({
  data,
}: {
  data: DashboardChartsData["salesByCategory"];
}) {
  return (
    <ChartCard title="Sales by category" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="category"
            outerRadius={90}
            label={({ name }) => String(name ?? "")}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HourlySalesChart({
  data,
}: {
  data: DashboardChartsData["salesByHour"];
}) {
  return (
    <ChartCard title="Sales by hour" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(v) => `₹${v}`} />
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
          <Bar dataKey="revenue" fill={colors[4]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PaymentMixChart({
  data,
}: {
  data: DashboardChartsData["paymentMix"];
}) {
  return (
    <ChartCard title="Payment mix" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="method" outerRadius={90} label>
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) =>
              `${formatMoney(Number(value))} (${item.payload.count} payments)`
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function EmployeeLeaderboardChart({
  data,
}: {
  data: DashboardChartsData["salesByEmployee"];
}) {
  return (
    <ChartCard title="Employee leaderboard" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => `₹${v}`} />
          <YAxis type="category" dataKey="employee" width={100} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
          <Bar dataKey="revenue" fill={colors[0]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function FulfillmentSplitChart({
  data,
}: {
  data: DashboardChartsData["salesByFulfillment"];
}) {
  return (
    <ChartCard title="Fulfillment split" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="revenue" nameKey="label" outerRadius={90} label>
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function InventoryVelocityChart({
  data,
}: {
  data: DashboardChartsData["productVelocity"];
}) {
  return (
    <ChartCard
      title="Inventory velocity"
      description="Units sold per day in this range"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="product" width={100} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="perDay" fill={colors[1]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export type { DashboardChartsData };
