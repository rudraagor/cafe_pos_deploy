"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SIDEBAR_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const SIDEBAR_DURATION = "300ms";

function NavLabel({
  label,
  collapsed,
  hiddenOnTop,
}: {
  label: string;
  collapsed: boolean;
  hiddenOnTop?: boolean;
}) {
  return (
    <span
      aria-hidden={collapsed}
      className={cn(
        "overflow-hidden whitespace-nowrap",
        hiddenOnTop && "hidden sm:inline",
        collapsed ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100",
      )}
      style={{
        transitionProperty: "max-width, opacity",
        transitionDuration: SIDEBAR_DURATION,
        transitionTimingFunction: SIDEBAR_EASE,
      }}
    >
      {label}
    </span>
  );
}

export function NavLink({
  href,
  label,
  icon,
  variant = "sidebar",
  collapsed = false,
  disabled = false,
  disabledReason,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  variant?: "sidebar" | "top";
  collapsed?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const pathname = usePathname();
  const active =
    !disabled &&
    (pathname === href ||
      (href !== "/pos" && pathname.startsWith(href + "/")));

  const className = cn(
    "flex items-center rounded-lg py-2 text-sm font-semibold",
    collapsed ? "justify-center px-2" : "gap-3 px-3",
    variant === "sidebar" && !collapsed && "gap-3",
    disabled
      ? "text-sidebar-foreground/35 cursor-not-allowed"
      : active
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );

  const style = {
    transitionProperty: "background-color, color, padding, gap",
    transitionDuration: SIDEBAR_DURATION,
    transitionTimingFunction: SIDEBAR_EASE,
  } as const;

  const title = collapsed
    ? disabled
      ? (disabledReason ?? label)
      : label
    : disabled
      ? disabledReason
      : undefined;

  const labelNode = (
    <NavLabel
      label={label}
      collapsed={collapsed}
      hiddenOnTop={variant === "top"}
    />
  );

  if (disabled) {
    return (
      <span aria-disabled="true" title={title} className={className} style={style}>
        {icon}
        {labelNode}
      </span>
    );
  }

  return (
    <Link href={href} title={title} className={className} style={style}>
      {icon}
      {labelNode}
    </Link>
  );
}
