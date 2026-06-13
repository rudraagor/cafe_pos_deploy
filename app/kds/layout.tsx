import { KdsThemeToggle } from "@/components/kds/kds-theme-toggle";

export default function KdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-6 py-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">
            Kitchen Display
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> To Cook
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" /> Preparing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-sky-500" /> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500" /> Overdue
            </span>
          </div>
          <KdsThemeToggle />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
