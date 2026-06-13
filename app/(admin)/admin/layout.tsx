import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { adminNav } from "@/lib/nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <span className="text-lg font-semibold tracking-tight">Cafe POS</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            Admin
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {adminNav.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={<Icon className="size-4" />}
            />
          ))}
        </nav>
        <div className="border-t p-3">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <Link href="/admin" className="font-medium md:hidden">
            Cafe POS
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/pos"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Open POS Terminal
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
