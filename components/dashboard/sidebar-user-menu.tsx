"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

type SidebarUserMenuProps = {
  name: string;
  role: Role;
  collapsed?: boolean;
};

export function SidebarUserMenu({
  name,
  role,
  collapsed = false,
}: SidebarUserMenuProps) {
  if (collapsed) {
    return (
      <form action={logout} className="flex justify-center p-2">
        <button
          type="submit"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg p-2 transition-colors"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="size-5" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
      <div
        className={cn(
          "min-w-0 overflow-hidden transition-[max-width,opacity]",
          collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] flex-1 opacity-100",
        )}
        style={{
          transitionDuration: "300ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-muted-foreground truncate text-xs capitalize">
          {role}
        </p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className={cn(
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg p-1.5 transition-colors",
          )}
          aria-label="Log out"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
