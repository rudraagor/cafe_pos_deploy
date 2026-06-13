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

export function TopOrdersTable({
  rows,
}: {
  rows: {
    id: string;
    orderNumber: string;
    customer: string;
    employee: string;
    total: number;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.orderNumber}</TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell>{row.employee}</TableCell>
                <TableCell>{formatMoney(row.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function TopCategoriesTable({
  rows,
}: {
  rows: { category: string; quantity: number; revenue: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top categories</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.category}>
                <TableCell>{row.category}</TableCell>
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
