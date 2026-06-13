import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/pos/pricing";

export function TopProductsTable({
  rows,
}: {
  rows: { product: string; quantity: number; revenue: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top products</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.product}>
                <TableCell>{row.product}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{formatMoney(row.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SessionsLinkCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Review cashier Z-reports with opening float, closing amount, paid
          orders, payment mix, discounts, and tax.
        </p>
        <Link href="/admin/reports/sessions" className="text-sm underline">
          Open session reports
        </Link>
      </CardContent>
    </Card>
  );
}
