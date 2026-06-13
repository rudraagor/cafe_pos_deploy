import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/pos/pricing";
import { getSessionList } from "@/lib/reports/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opened</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid orders</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Closing amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>{session.openedAt.toLocaleString()}</TableCell>
                <TableCell>{session.cashier ?? "Unknown"}</TableCell>
                <TableCell>
                  <Badge variant={session.status === "open" ? "secondary" : "default"}>
                    {session.status}
                  </Badge>
                </TableCell>
                <TableCell>{session.paidOrders}</TableCell>
                <TableCell>{formatMoney(session.revenue)}</TableCell>
                <TableCell>
                  {session.closingAmount == null
                    ? "Open"
                    : formatMoney(session.closingAmount)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/reports/sessions/${session.id}`}
                    className="text-sm underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
