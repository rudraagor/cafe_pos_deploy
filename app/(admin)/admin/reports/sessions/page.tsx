import Link from "next/link";
import { SessionListTable } from "@/components/reports/session-list-table";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getSessionList } from "@/lib/reports/queries";

export default async function SessionReportsPage() {
  await requireRole("admin");
  const sessions = await getSessionList();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Session reports
          </h1>
          <p className="text-muted-foreground text-sm">
            Review cashier sessions, closing totals, and paid-order revenue.
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/reports" />}>
          Back to reports
        </Button>
      </div>

      <SessionListTable
        sessions={sessions.map((session) => ({
          id: session.id,
          openedAt: session.openedAt.toISOString(),
          status: session.status,
          cashier: session.cashier,
          paidOrders: session.paidOrders,
          revenue: session.revenue,
          closingAmount: session.closingAmount,
        }))}
      />
    </div>
  );
}
