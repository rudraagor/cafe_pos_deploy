import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  CupSoda,
  LayoutGrid,
  ShoppingBag,
  type LucideIcon,
  Monitor,
  Package,
  ScrollText,
  Tags,
  TicketPercent,
  Users,
  Wallet,
} from "lucide-react";
import type { Role } from "@/lib/auth";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** POS links that need an open register session before use. */
  requiresSession?: boolean;
};

/** POS terminal sections (formerly the top header nav). */
export const posNav: NavItem[] = [
  { label: "POS Orders", href: "/pos", icon: CupSoda },
  {
    label: "Takeaway",
    href: "/pos/takeaway",
    icon: ShoppingBag,
    requiresSession: true,
  },
  {
    label: "Orders",
    href: "/pos/orders",
    icon: ClipboardList,
    requiresSession: true,
  },
  {
    label: "Customer",
    href: "/pos/customers",
    icon: Users,
  },
  {
    label: "Table View",
    href: "/pos/tables",
    icon: LayoutGrid,
    requiresSession: true,
  },
];

export const adminNav: NavItem[] = [
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Category", href: "/admin/categories", icon: Tags },
  { label: "Payment Method", href: "/admin/payment-methods", icon: Wallet },
  { label: "Coupon & Promotion", href: "/admin/coupons", icon: TicketPercent },
  { label: "Booking", href: "/admin/booking", icon: CalendarClock },
  { label: "User / Employee", href: "/admin/users", icon: Users },
  { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
  { label: "KDS", href: "/kds", icon: Monitor },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
];

export function getSidebarNav(role: Role): NavItem[] {
  if (role === "admin") {
    return [...posNav, ...adminNav];
  }
  return posNav;
}
