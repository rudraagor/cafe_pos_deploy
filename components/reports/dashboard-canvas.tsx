"use client";

import { AiWidgets } from "@/components/reports/ai-widgets";
import { DashboardToolbar } from "@/components/reports/dashboard-toolbar";
import { KpiCards } from "@/components/reports/kpi-cards";
import { useDashboardLayout } from "@/components/reports/use-dashboard-layout";
import {
  CategorySalesChart,
  EmployeeLeaderboardChart,
  FulfillmentSplitChart,
  HourlySalesChart,
  InventoryVelocityChart,
  OrdersTrendChart,
  PaymentMixChart,
  RevenueTrendChart,
  TopProductsChart,
} from "@/components/reports/widgets/charts";
import {
  LiveFloorWidget,
  MarketingWidget,
  SessionsLinkWidget,
  TopCategoriesTableWidget,
  TopOrdersTableWidget,
  TopProductsTableWidget,
} from "@/components/reports/widgets/tables";
import type { getReportDashboard } from "@/lib/reports/queries";
import type { getAdminLiveFloor } from "@/lib/reports/customers";
import type { WidgetId } from "@/lib/reports/widgets";
import type { ReportSearchParams } from "@/lib/reports/range";

type DashboardData = Awaited<ReturnType<typeof getReportDashboard>>;
type LiveFloorData = Awaited<ReturnType<typeof getAdminLiveFloor>>;

export function DashboardCanvas({
  dashboard,
  liveFloor,
  params,
}: {
  dashboard: DashboardData;
  liveFloor: LiveFloorData;
  params: ReportSearchParams;
}) {
  const { layout, visibleWidgets, toggleWidget, moveWidget, resetLayout } =
    useDashboardLayout();

  const dineInOrders =
    dashboard.salesByFulfillment.find(
      (entry) => entry.fulfillmentType === "dine_in",
    )?.orderCount ?? 0;
  const totalOrders = dashboard.summary.orderCount;
  const dineInShare = {
    percent: totalOrders > 0 ? (dineInOrders / totalOrders) * 100 : 0,
    dineInOrders,
    totalOrders,
  };

  function renderWidget(id: WidgetId) {
    switch (id) {
      case "kpi_summary":
        return (
          <KpiCards
            summary={dashboard.summary}
            comparison={dashboard.comparison}
            itemsSold={dashboard.itemsSold}
            dineInShare={dineInShare}
          />
        );
      case "revenue_trend":
        return <RevenueTrendChart data={dashboard.revenueByDay} />;
      case "orders_trend":
        return <OrdersTrendChart data={dashboard.revenueByDay} />;
      case "top_products_chart":
        return <TopProductsChart data={dashboard.topProducts} />;
      case "category_sales":
        return <CategorySalesChart data={dashboard.salesByCategory} />;
      case "hourly_sales":
        return <HourlySalesChart data={dashboard.salesByHour} />;
      case "payment_mix":
        return <PaymentMixChart data={dashboard.paymentMix} />;
      case "employee_leaderboard":
        return <EmployeeLeaderboardChart data={dashboard.salesByEmployee} />;
      case "fulfillment_split":
        return <FulfillmentSplitChart data={dashboard.salesByFulfillment} />;
      case "inventory_velocity":
        return <InventoryVelocityChart data={dashboard.productVelocity} />;
      case "top_products_table":
        return <TopProductsTableWidget rows={dashboard.topProducts} />;
      case "top_orders_table":
        return <TopOrdersTableWidget rows={dashboard.topOrders} params={params} />;
      case "top_categories_table":
        return <TopCategoriesTableWidget rows={dashboard.salesByCategory} />;
      case "sessions_link":
        return <SessionsLinkWidget />;
      case "live_floor":
        return (
          <LiveFloorWidget
            floors={liveFloor.floors}
            sessionOpen={liveFloor.sessionOpen}
            params={params}
          />
        );
      case "customer_marketing":
        return <MarketingWidget params={params} />;
      case "ai_insights":
        return <AiWidgets params={params} />;
      default:
        return null;
    }
  }

  const chartWidgets = new Set<WidgetId>([
    "revenue_trend",
    "orders_trend",
    "top_products_chart",
    "category_sales",
    "hourly_sales",
    "payment_mix",
    "employee_leaderboard",
    "fulfillment_split",
    "inventory_velocity",
  ]);

  const tablePair = new Set<WidgetId>([
    "top_products_table",
    "top_categories_table",
  ]);

  type LayoutGroup =
    | { kind: "single"; id: WidgetId }
    | { kind: "charts"; ids: WidgetId[] }
    | { kind: "tables"; ids: WidgetId[] };

  const groups: LayoutGroup[] = [];
  let chartBuffer: WidgetId[] = [];
  let tableBuffer: WidgetId[] = [];

  function flushCharts() {
    if (chartBuffer.length > 0) {
      groups.push({ kind: "charts", ids: [...chartBuffer] });
      chartBuffer = [];
    }
  }

  function flushTables() {
    if (tableBuffer.length > 0) {
      groups.push({ kind: "tables", ids: [...tableBuffer] });
      tableBuffer = [];
    }
  }

  for (const entry of visibleWidgets) {
    if (chartWidgets.has(entry.id)) {
      flushTables();
      chartBuffer.push(entry.id);
      continue;
    }
    flushCharts();
    if (tablePair.has(entry.id)) {
      tableBuffer.push(entry.id);
      continue;
    }
    flushTables();
    groups.push({ kind: "single", id: entry.id });
  }
  flushCharts();
  flushTables();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DashboardToolbar
          layout={layout}
          onToggle={toggleWidget}
          onMove={moveWidget}
          onReset={resetLayout}
        />
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          if (group.kind === "charts") {
            return (
              <div
                key={group.ids.join("-")}
                className="grid gap-4 xl:grid-cols-2"
              >
                {group.ids.map((id) => (
                  <div key={id}>{renderWidget(id)}</div>
                ))}
              </div>
            );
          }
          if (group.kind === "tables") {
            return (
              <div
                key={group.ids.join("-")}
                className="grid gap-4 xl:grid-cols-2"
              >
                {group.ids.map((id) => (
                  <div key={id}>{renderWidget(id)}</div>
                ))}
              </div>
            );
          }
          return <div key={group.id}>{renderWidget(group.id)}</div>;
        })}
      </div>
    </div>
  );
}
