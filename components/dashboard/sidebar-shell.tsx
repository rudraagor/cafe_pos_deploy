"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import { CurrentTableIndicator } from "@/components/pos/current-table-indicator";
import { PosHamburgerMenu } from "@/components/pos-hamburger-menu";
import { PosTopHeader } from "@/components/pos/pos-top-header";
import { SidebarUserMenu } from "@/components/dashboard/sidebar-user-menu";
import { usePosShell } from "@/components/dashboard/pos-shell-context";
import { getSidebarNav, type NavItem } from "@/lib/nav";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "dashboard-sidebar-collapsed";
const SIDEBAR_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const SIDEBAR_DURATION = "300ms";

const SESSION_REQUIRED_HINT = "Open a POS session first";

type SidebarShellProps = {
  role: Role;
  userName: string;
  hasOpenSession: boolean;
  children: ReactNode;
};

export function SidebarShell({
  role,
  userName,
  hasOpenSession,
  children,
}: SidebarShellProps) {
  const pathname = usePathname();
  const nav = getSidebarNav(role);
  const posShell = usePosShell();
  const isPosRoute = pathname.startsWith("/pos");
  const isAdminRoute = pathname.startsWith("/admin");
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const sidebarTransition = {
    transitionProperty: "width",
    transitionDuration: SIDEBAR_DURATION,
    transitionTimingFunction: SIDEBAR_EASE,
  } as const;

  if (role === "employee") {
    return (
      <div className="bg-background flex h-dvh flex-col overflow-hidden">
        <PosTopHeader
          hasOpenSession={hasOpenSession}
          isAdmin={false}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen">
      <aside
        style={sidebarTransition}
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "border-sidebar-border relative flex shrink-0 items-center border-b",
            collapsed ? "h-[4.5rem] justify-center px-2" : "h-24 justify-between px-3",
          )}
        >
          <Link
            href={role === "admin" ? "/admin" : "/pos"}
            className={cn("flex items-center", collapsed && "justify-center")}
            title="Chai Biskit Cafe"
          >
            <Image
              src="/logo.png"
              alt="Chai Biskit Cafe"
              width={collapsed ? 56 : 166}
              height={collapsed ? 56 : 136}
              priority
              className={cn(
                "w-auto object-contain",
                collapsed ? "h-14" : "h-20",
              )}
              style={{
                transitionProperty: "height, width",
                transitionDuration: SIDEBAR_DURATION,
                transitionTimingFunction: SIDEBAR_EASE,
              }}
            />
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0 rounded-full p-1.5 transition-[opacity,transform,background-color]",
              collapsed
                ? "pointer-events-none absolute opacity-0"
                : "opacity-100",
            )}
            style={{
              transitionDuration: SIDEBAR_DURATION,
              transitionTimingFunction: SIDEBAR_EASE,
            }}
            aria-label="Collapse sidebar"
            tabIndex={collapsed ? -1 : 0}
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        {collapsed ? (
          <div className="flex shrink-0 justify-center py-2">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-full p-1.5 transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}

        <nav className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-2 py-3">
          {nav.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              hasOpenSession={hasOpenSession}
            />
          ))}
        </nav>

        <div className="bg-sidebar border-sidebar-border mt-auto shrink-0 border-t shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.25)]">
          {isPosRoute && posShell ? (
            <div
              className={cn(
                "space-y-2 px-2 py-3",
                collapsed && "flex flex-col items-center",
              )}
            >
              {!collapsed ? (
                <CurrentTableIndicator tables={posShell.tableMap} />
              ) : null}
              <PosHamburgerMenu
                isAdmin={posShell.isAdmin}
                collapsed={collapsed}
              />
            </div>
          ) : null}

          <div className={cn(isPosRoute && posShell && "border-sidebar-border border-t")}>
            <SidebarUserMenu
              name={userName}
              role={role}
              collapsed={collapsed && mounted}
            />
          </div>
        </div>
      </aside>

      <main
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          isAdminRoute && "p-6",
          isPosRoute && "overflow-hidden",
        )}
      >
        {children}
      </main>
    </div>
  );
}

function SidebarNavItem({
  item,
  collapsed,
  hasOpenSession,
}: {
  item: NavItem;
  collapsed: boolean;
  hasOpenSession: boolean;
}) {
  const Icon = item.icon;
  const disabled = item.requiresSession === true && !hasOpenSession;

  return (
    <NavLink
      href={item.href}
      label={item.label}
      icon={<Icon className="size-5 shrink-0" />}
      collapsed={collapsed}
      disabled={disabled}
      disabledReason={disabled ? SESSION_REQUIRED_HINT : undefined}
    />
  );
}
