export default function KdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">
            Kitchen Display
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
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
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
