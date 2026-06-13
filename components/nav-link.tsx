"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  icon,
  variant = "sidebar",
}: {
  href: string;
  label: string;
  icon: ReactNode;
  variant?: "sidebar" | "top";
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/pos" && pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        variant === "sidebar" && "gap-3",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      <span className={cn(variant === "top" && "hidden sm:inline")}>
        {label}
      </span>
    </Link>
  );
}
