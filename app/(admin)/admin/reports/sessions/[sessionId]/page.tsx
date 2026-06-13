import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/pos/pricing";
import { getSessionReport } from "@/lib/reports/queries";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionReportDetailPage({ params }: PageProps) {
  await requireRole("admin");
  const { sessionId } = await params;
  const report = await getSessionReport(sessionId);
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Session Z-report
          </h1>
          <p className="text-muted-foreground text-sm">
            {report.openedAt.toLocaleString()} by {report.cashier}
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/admin/reports/sessions" />}
        >
          Back to sessions
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Status" value={report.status} />
        <MetricCard label="Paid orders" value={String(report.orderCount)} />
        <MetricCard label="Revenue" value={formatMoney(report.revenue)} />
        <MetricCard
          label="Closing amount"
          value={
            report.closingAmount == null
              ? "Open"
              : formatMoney(report.closingAmount)
          }
        />
        <MetricCard label="Gross" value={formatMoney(report.gross)} />
        <MetricCard label="Discounts" value={formatMoney(report.discountTotal)} />
        <MetricCard label="Tax" value={formatMoney(report.taxTotal)} />
        <MetricCard label="Opening float" value={formatMoney(report.openingFloat)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payment mix</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.payments.map((payment) => (
                  <TableRow key={payment.method}>
                    <TableCell>
                      <Badge variant="secondary">{payment.method}</Badge>
                    </TableCell>
                    <TableCell>{payment.count}</TableCell>
                    <TableCell>{formatMoney(payment.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paid orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Paid at</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>{order.paidAt.toLocaleString()}</TableCell>
                    <TableCell>{formatMoney(order.subtotal)}</TableCell>
                    <TableCell>{formatMoney(order.discountTotal)}</TableCell>
                    <TableCell>{formatMoney(order.tax)}</TableCell>
                    <TableCell>{formatMoney(order.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
