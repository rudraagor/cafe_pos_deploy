import { Search, UserCircle2 } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { CurrentTableIndicator } from "@/components/pos/current-table-indicator";
import { PosHamburgerMenu } from "@/components/pos-hamburger-menu";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { floors, tables } from "@/lib/db/schema";
import { posNav } from "@/lib/nav";
import { eq } from "drizzle-orm";

async function getTableMap() {
  const rows = await db
    .select({
      id: tables.id,
      number: tables.number,
      floorName: floors.name,
    })
    .from(tables)
    .innerJoin(floors, eq(tables.floorId, floors.id));

  return Object.fromEntries(
    rows.map((r) => [r.id, { number: r.number, floorName: r.floorName }]),
  );
}

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const tableMap = await getTableMap();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-3">
        <span className="px-2 text-base font-semibold tracking-tight">
          Cafe POS
        </span>

        <nav className="flex items-center gap-1">
          {posNav.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={<Icon className="size-4" />}
              variant="top"
            />
          ))}
        </nav>

        <div className="relative mx-2 hidden flex-1 items-center md:flex">
          <Search className="absolute left-3 size-4 text-muted-foreground" />
          <input
            placeholder="Search products..."
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <CurrentTableIndicator tables={tableMap} />
          <span className="hidden text-sm font-medium sm:inline">
            {user?.name}
          </span>
          <UserCircle2 className="size-7 text-muted-foreground" />
          <PosHamburgerMenu isAdmin={user?.role === "admin"} />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
