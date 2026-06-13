import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRole = pgEnum("user_role", ["admin", "employee"]);
export const discountType = pgEnum("discount_type", ["percent", "fixed"]);
export const promoScope = pgEnum("promo_scope", ["product", "order"]);
export const paymentType = pgEnum("payment_type", ["cash", "card", "upi"]);
export const orderStatus = pgEnum("order_status", [
  "draft",
  "paid",
  "cancelled",
]);
export const orderFulfillmentType = pgEnum("order_fulfillment_type", [
  "dine_in",
  "takeaway",
]);
export const kdsStage = pgEnum("kds_stage", [
  "to_cook",
  "preparing",
  "completed",
]);
export const unitOfMeasure = pgEnum("unit_of_measure", [
  "piece",
  "kg",
  "litre",
]);
export const sessionStatus = pgEnum("session_status", ["open", "closed"]);
export const reservationStatus = pgEnum("reservation_status", [
  "booked",
  "seated",
  "expired",
  "cancelled",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

// ---------------------------------------------------------------------------
// Users / accounts
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("employee"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Catalog: categories + products
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#64748b"),
  ...timestamps,
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  unitOfMeasure: unitOfMeasure("unit_of_measure").notNull().default("piece"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  description: text("description"),
  supportedModifiers: jsonb("supported_modifiers").notNull().default([]),
  isKitchenItem: boolean("is_kitchen_item").notNull().default(true),
  isOutOfStock: boolean("is_out_of_stock").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Payment method configuration (one row per type)
// ---------------------------------------------------------------------------
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: paymentType("type").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  upiId: text("upi_id"),
});

// ---------------------------------------------------------------------------
// Floors + tables
// ---------------------------------------------------------------------------
export const floors = pgTable("floors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ...timestamps,
});

export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  floorId: uuid("floor_id")
    .notNull()
    .references(() => floors.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  seats: integer("seats").notNull().default(4),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Discounts: coupons (manual code) + automated promotions
// ---------------------------------------------------------------------------
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  discountType: discountType("discount_type").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  scope: promoScope("scope").notNull(),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "cascade",
  }),
  minQuantity: integer("min_quantity"),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  discountType: discountType("discount_type").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// POS sessions
// ---------------------------------------------------------------------------
export const posSessions = pgTable("pos_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  openedBy: uuid("opened_by")
    .notNull()
    .references(() => users.id),
  openedAt: timestamp("opened_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  openingFloat: numeric("opening_float", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  closingAmount: numeric("closing_amount", { precision: 10, scale: 2 }),
  status: sessionStatus("status").notNull().default("open"),
});

// ---------------------------------------------------------------------------
// Orders + line items + payments
// ---------------------------------------------------------------------------
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  sessionId: uuid("session_id").references(() => posSessions.id, {
    onDelete: "set null",
  }),
  tableId: uuid("table_id").references(() => tables.id, {
    onDelete: "set null",
  }),
  fulfillmentType: orderFulfillmentType("fulfillment_type")
    .notNull()
    .default("dine_in"),
  customerId: uuid("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  employeeId: uuid("employee_id").references(() => users.id),
  couponId: uuid("coupon_id").references(() => coupons.id, {
    onDelete: "set null",
  }),
  status: orderStatus("status").notNull().default("draft"),
  kdsStage: kdsStage("kds_stage").notNull().default("to_cook"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  discountTotal: numeric("discount_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  sentToKitchenAt: timestamp("sent_to_kitchen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderTables = pgTable(
  "order_tables",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    tableId: uuid("table_id")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.orderId, table.tableId] })],
);

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  partySize: integer("party_size").notNull().default(2),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(90),
  status: reservationStatus("status").notNull().default("booked"),
  linkedOrderId: uuid("linked_order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  ...timestamps,
});

export const reservationTables = pgTable(
  "reservation_tables",
  {
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    tableId: uuid("table_id")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.reservationId, table.tableId] })],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  nameSnapshot: text("name_snapshot").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  taxRateSnapshot: numeric("tax_rate_snapshot", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  lineDiscount: numeric("line_discount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  isKitchenItem: boolean("is_kitchen_item").notNull().default(true),
  itemCompleted: boolean("item_completed").notNull().default(false),
  modifiers: jsonb("modifiers").notNull().default([]),
  note: text("note"),
  ...timestamps,
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: paymentType("method").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  changeDue: numeric("change_due", { precision: 10, scale: 2 }),
  reference: text("reference"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// AI report cache
// ---------------------------------------------------------------------------
export const aiReports = pgTable("ai_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  rangeStart: timestamp("range_start", { withTimezone: true }).notNull(),
  rangeEnd: timestamp("range_end", { withTimezone: true }).notNull(),
  payload: jsonb("payload").notNull(),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const floorsRelations = relations(floors, ({ many }) => ({
  tables: many(tables),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  floor: one(floors, {
    fields: [tables.floorId],
    references: [floors.id],
  }),
  orderTables: many(orderTables),
  reservationTables: many(reservationTables),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(posSessions, {
    fields: [orders.sessionId],
    references: [posSessions.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  employee: one(users, {
    fields: [orders.employeeId],
    references: [users.id],
  }),
  coupon: one(coupons, {
    fields: [orders.couponId],
    references: [coupons.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  orderTables: many(orderTables),
  reservations: many(reservations),
}));

export const orderTablesRelations = relations(orderTables, ({ one }) => ({
  order: one(orders, {
    fields: [orderTables.orderId],
    references: [orders.id],
  }),
  table: one(tables, {
    fields: [orderTables.tableId],
    references: [tables.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  linkedOrder: one(orders, {
    fields: [reservations.linkedOrderId],
    references: [orders.id],
  }),
  createdByUser: one(users, {
    fields: [reservations.createdBy],
    references: [users.id],
  }),
  reservationTables: many(reservationTables),
}));

export const reservationTablesRelations = relations(
  reservationTables,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationTables.reservationId],
      references: [reservations.id],
    }),
    table: one(tables, {
      fields: [reservationTables.tableId],
      references: [tables.id],
    }),
  }),
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const posSessionsRelations = relations(posSessions, ({ one, many }) => ({
  openedByUser: one(users, {
    fields: [posSessions.openedBy],
    references: [users.id],
  }),
  orders: many(orders),
}));
