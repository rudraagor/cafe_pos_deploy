import { Search, UserCircle2 } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { PosHamburgerMenu } from "@/components/pos-hamburger-menu";
import { getCurrentUser } from "@/lib/auth";
import { posNav } from "@/lib/nav";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

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
          <span className="hidden rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline">
            No table
          </span>
          <span className="hidden text-sm font-medium sm:inline">
            {user?.name}
          </span>
          <UserCircle2 className="size-7 text-muted-foreground" />
          <PosHamburgerMenu />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
