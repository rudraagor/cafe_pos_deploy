export type WidgetId =
  | "kpi_summary"
  | "revenue_trend"
  | "orders_trend"
  | "top_products_chart"
  | "category_sales"
  | "hourly_sales"
  | "payment_mix"
  | "employee_leaderboard"
  | "fulfillment_split"
  | "inventory_velocity"
  | "top_products_table"
  | "top_orders_table"
  | "top_categories_table"
  | "sessions_link"
  | "live_floor"
  | "customer_marketing"
  | "ai_insights";

export type WidgetLayoutEntry = {
  id: WidgetId;
  visible: boolean;
  order: number;
};

export type DashboardLayout = {
  version: 1;
  widgets: WidgetLayoutEntry[];
};

export const LAYOUT_STORAGE_KEY = "cafe-reports-layout-v1";

export const WIDGET_CATALOG: {
  id: WidgetId;
  label: string;
  description: string;
  group: "kpi" | "chart" | "table" | "ops" | "ai";
}[] = [
  { id: "kpi_summary", label: "KPI summary", description: "Revenue, orders, AOV, tax, discounts with deltas", group: "kpi" },
  { id: "revenue_trend", label: "Revenue trend", description: "Daily revenue and order count", group: "chart" },
  { id: "orders_trend", label: "Orders trend", description: "Daily paid order volume", group: "chart" },
  { id: "top_products_chart", label: "Top products chart", description: "Best sellers by quantity or revenue", group: "chart" },
  { id: "category_sales", label: "Category sales", description: "Revenue by menu category", group: "chart" },
  { id: "hourly_sales", label: "Hourly sales", description: "Revenue by hour of day", group: "chart" },
  { id: "payment_mix", label: "Payment mix", description: "Cash, card, and UPI split", group: "chart" },
  { id: "employee_leaderboard", label: "Employee leaderboard", description: "Sales by cashier", group: "chart" },
  { id: "fulfillment_split", label: "Fulfillment split", description: "Dine-in vs takeaway", group: "chart" },
  { id: "inventory_velocity", label: "Inventory velocity", description: "Units sold per day by product", group: "chart" },
  { id: "top_products_table", label: "Top products table", description: "Sortable product performance", group: "table" },
  { id: "top_orders_table", label: "Top orders table", description: "Highest value orders with customer links", group: "table" },
  { id: "top_categories_table", label: "Top categories table", description: "Category qty and revenue", group: "table" },
  { id: "sessions_link", label: "Session reports", description: "Link to Z-reports", group: "ops" },
  { id: "live_floor", label: "Live floor", description: "Occupied tables in open session", group: "ops" },
  { id: "customer_marketing", label: "Customer marketing", description: "Search customers and send coupon emails", group: "ops" },
  { id: "ai_insights", label: "AI insights", description: "Briefing, inventory advisor, Q&A", group: "ai" },
];

export function defaultDashboardLayout(): DashboardLayout {
  return {
    version: 1,
    widgets: WIDGET_CATALOG.map((widget, index) => ({
      id: widget.id,
      visible: true,
      order: index,
    })),
  };
}

/** Stable default used for SSR and the pre-hydration client paint. */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = defaultDashboardLayout();

export function normalizeLayout(layout: DashboardLayout): DashboardLayout {
  const known = new Set(WIDGET_CATALOG.map((w) => w.id));
  const seen = new Set<WidgetId>();
  const widgets = layout.widgets
    .filter((entry) => known.has(entry.id) && !seen.has(entry.id))
    .map((entry, index) => {
      seen.add(entry.id);
      return { ...entry, order: index };
    });

  for (const widget of WIDGET_CATALOG) {
    if (!seen.has(widget.id)) {
      widgets.push({ id: widget.id, visible: false, order: widgets.length });
    }
  }

  return { version: 1, widgets };
}
