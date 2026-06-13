"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PosHamburgerMenu } from "@/components/pos-hamburger-menu";
import { usePosShell } from "@/components/dashboard/pos-shell-context";
import { CurrentTableIndicator } from "@/components/pos/current-table-indicator";
import { posNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

const SESSION_REQUIRED_HINT = "Open a POS session first";

type PosTopHeaderProps = {
  hasOpenSession: boolean;
  isAdmin: boolean;
};

export function PosTopHeader({ hasOpenSession, isAdmin }: PosTopHeaderProps) {
  const pathname = usePathname();
  const posShell = usePosShell();

  return (
    <header className="bg-card border-sidebar-border flex h-20 shrink-0 items-center gap-4 border-b px-4">
      <Link href="/pos" className="flex shrink-0 items-center">
        <Image
          src="/logo.png"
          alt="Chai Biskit Cafe"
          width={166}
          height={136}
          priority
          className="h-[4.5rem] w-auto object-contain"
        />
      </Link>

      <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-2">
        {posNav.map((item) => {
          const Icon = item.icon;
          const disabled = item.requiresSession === true && !hasOpenSession;
          const active =
            !disabled &&
            (pathname === item.href ||
              (item.href !== "/pos" && pathname.startsWith(item.href + "/")));

          const className = cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
            disabled
              ? "text-muted-foreground/40 cursor-not-allowed"
              : active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-foreground/80 hover:bg-muted",
          );

          const content = (
            <>
              <Icon className="size-4 shrink-0" />
              <span>{item.label === "Table View" ? "Table view" : item.label}</span>
            </>
          );

          if (disabled) {
            return (
              <span
                key={item.href}
                className={className}
                title={SESSION_REQUIRED_HINT}
              >
                {content}
              </span>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <CurrentTableIndicator
          tables={posShell?.tableMap ?? {}}
          variant="header"
        />
        <PosHamburgerMenu isAdmin={isAdmin} collapsed={false} variant="header" />
      </div>
    </header>
  );
}
