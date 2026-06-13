import {
  BarChart3,
  CalendarClock,
  CupSoda,
  LayoutGrid,
  ShoppingBag,
  type LucideIcon,
  Monitor,
  Package,
  Tags,
  TicketPercent,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const adminNav: NavItem[] = [
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Category", href: "/admin/categories", icon: Tags },
  { label: "Payment Method", href: "/admin/payment-methods", icon: Wallet },
  { label: "Coupon & Promotion", href: "/admin/coupons", icon: TicketPercent },
  { label: "Booking", href: "/admin/booking", icon: CalendarClock },
  { label: "User / Employee", href: "/admin/users", icon: Users },
  { label: "KDS", href: "/kds", icon: Monitor },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
];

export const posNav: NavItem[] = [
  { label: "POS Order", href: "/pos", icon: CupSoda },
  { label: "Takeaway", href: "/pos/takeaway", icon: ShoppingBag },
  { label: "Orders", href: "/pos/orders", icon: LayoutGrid },
  { label: "Customer", href: "/pos/customers", icon: Users },
  { label: "Table View", href: "/pos/tables", icon: LayoutGrid },
];
