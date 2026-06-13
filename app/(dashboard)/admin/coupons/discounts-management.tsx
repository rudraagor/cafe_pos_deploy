"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DataTableShell } from "@/components/admin/data-table-shell";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  createCoupon,
  createPromotion,
  deleteCoupon,
  deletePromotion,
  updateCoupon,
  updatePromotion,
} from "./actions";
import { CouponFormDialog, type CouponFormValue } from "./coupon-form-dialog";
import {
  PromotionFormDialog,
  type PromotionFormValue,
  type PromotionProductOption,
} from "./promotion-form-dialog";

export type CouponRow = CouponFormValue & {
  id: string;
};

export type PromotionRow = PromotionFormValue & {
  id: string;
  productName: string | null;
};

type DiscountsManagementProps = {
  coupons: CouponRow[];
  promotions: PromotionRow[];
  products: PromotionProductOption[];
};

function discountLabel(type: "percent" | "fixed", value: string) {
  return type === "percent" ? `${value}%` : `₹${Number(value).toFixed(2)}`;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      aria-selected={active}
      className={cn(
        "h-9 rounded-md px-4 font-semibold transition-colors",
        active
          ? "bg-background text-foreground shadow-sm hover:bg-background"
          : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
      )}
    >
      {children}
    </Button>
  );
}

export function DiscountsManagement({
  coupons,
  promotions,
  products,
}: DiscountsManagementProps) {
  const [activeTab, setActiveTab] = useState<"coupons" | "promotions">(
    "coupons",
  );

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Discount modules"
        className="bg-muted inline-flex rounded-lg p-1"
      >
        <TabButton
          active={activeTab === "coupons"}
          onClick={() => setActiveTab("coupons")}
        >
          Coupons
        </TabButton>
        <TabButton
          active={activeTab === "promotions"}
          onClick={() => setActiveTab("promotions")}
        >
          Promotions
        </TabButton>
      </div>

      {activeTab === "coupons" ? (
        <CouponPanel coupons={coupons} />
      ) : (
        <PromotionPanel promotions={promotions} products={products} />
      )}
    </div>
  );
}

function CouponPanel({ coupons }: { coupons: CouponRow[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? coupons.filter((coupon) =>
            coupon.code.toLowerCase().includes(normalizedQuery),
          )
        : coupons,
    [coupons, normalizedQuery],
  );

  return (
    <DataTableShell
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search coupons..."
      toolbarActions={<CouponFormDialog mode="create" action={createCoupon} />}
      empty={filtered.length === 0}
      emptyTitle={coupons.length === 0 ? "No coupons yet" : "No coupons found"}
      emptyDescription={
        coupons.length === 0
          ? "Create manual codes for employees to redeem in POS."
          : "Try a different coupon code."
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((coupon) => (
            <TableRow key={coupon.id}>
              <TableCell className="font-mono font-medium">
                {coupon.code}
              </TableCell>
              <TableCell>
                {discountLabel(coupon.discountType, coupon.value)}
              </TableCell>
              <TableCell>
                <Badge variant={coupon.active ? "secondary" : "outline"}>
                  {coupon.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <CouponFormDialog
                    mode="edit"
                    coupon={coupon}
                    action={updateCoupon.bind(null, coupon.id)}
                  />
                  <DeleteButton
                    itemName={coupon.code}
                    title="Delete coupon?"
                    description={`${coupon.code} will no longer be redeemable.`}
                    action={deleteCoupon.bind(null, coupon.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

function PromotionPanel({
  promotions,
  products,
}: {
  promotions: PromotionRow[];
  products: PromotionProductOption[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? promotions.filter((promotion) =>
            [promotion.name, promotion.productName ?? "", promotion.scope]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : promotions,
    [normalizedQuery, promotions],
  );

  return (
    <DataTableShell
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search promotions..."
      toolbarActions={
        <PromotionFormDialog
          mode="create"
          products={products}
          action={createPromotion}
        />
      }
      empty={filtered.length === 0}
      emptyTitle={
        promotions.length === 0 ? "No promotions yet" : "No promotions found"
      }
      emptyDescription={
        promotions.length === 0
          ? "Create automated discounts for product or order thresholds."
          : "Try another promotion name."
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-28 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((promotion) => (
            <TableRow key={promotion.id}>
              <TableCell className="font-medium">{promotion.name}</TableCell>
              <TableCell>
                {promotion.scope === "product"
                  ? `${promotion.productName ?? "Product"} x${promotion.minQuantity}`
                  : `Order ₹${Number(promotion.minOrderAmount).toFixed(2)}`}
              </TableCell>
              <TableCell>
                {discountLabel(promotion.discountType, promotion.value)}
              </TableCell>
              <TableCell>
                <Badge variant={promotion.active ? "secondary" : "outline"}>
                  {promotion.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <PromotionFormDialog
                    mode="edit"
                    promotion={promotion}
                    products={products}
                    action={updatePromotion.bind(null, promotion.id)}
                  />
                  <DeleteButton
                    itemName={promotion.name}
                    title="Delete promotion?"
                    description={`${promotion.name} will stop applying automatically.`}
                    action={deletePromotion.bind(null, promotion.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
