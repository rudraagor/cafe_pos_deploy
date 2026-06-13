import { PosShellProvider } from "@/components/dashboard/pos-shell-context";
import { SidebarShell } from "@/components/dashboard/sidebar-shell";
import { getCurrentUser } from "@/lib/auth";
import { getPosTableMap } from "@/lib/pos/queries";
import { getOpenSessionForUser } from "@/lib/pos/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [openSession, tableMap] = await Promise.all([
    getOpenSessionForUser(user.id),
    getPosTableMap(),
  ]);

  return (
    <PosShellProvider tableMap={tableMap} isAdmin={user.role === "admin"}>
      <SidebarShell
        role={user.role}
        userName={user.name ?? user.email ?? "User"}
        hasOpenSession={!!openSession}
      >
        {children}
      </SidebarShell>
    </PosShellProvider>
  );
}
