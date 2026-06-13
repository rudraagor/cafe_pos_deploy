import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminNav } from "@/lib/nav";

const configLinks = adminNav.filter((item) =>
  [
    "/admin/products",
    "/admin/categories",
    "/admin/payment-methods",
    "/admin/coupons",
    "/admin/booking",
    "/admin/users",
  ].includes(item.href),
);

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Admin Configuration
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage the cafe data used by POS, KDS, checkout, and discounts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {configLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-muted/50 h-full transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="size-4" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Open {label.toLowerCase()} settings.
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
