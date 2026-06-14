"use client";

import { ClipboardList, Grid2X2, ShoppingBag, Utensils } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FloorPopup } from "@/components/pos/floor-popup";
import { PosCartColumn } from "@/components/pos/pos-cart-column";
import {
  ProductGrid,
  type PosCategory,
  type PosProduct,
} from "@/components/pos/product-grid";
import type { FloorWithTables } from "@/components/pos/table-grid";
import { Button, buttonVariants } from "@/components/ui/button";
import { TAKEAWAY_CART_ID } from "@/lib/pos/cart-store";
import type {
  TableOccupancy,
  UpcomingTableReservation,
} from "@/lib/pos/queries";
import type { PromotionInput } from "@/lib/pos/pricing";
import { cn } from "@/lib/utils";

type CustomerOption = { id: string; name: string; email: string | null };

type OrderViewProps = {
  tableId: string | null;
  tableIds?: string[];
  reservationId?: string | null;
  initialReservationCustomerName?: string | null;
  products: PosProduct[];
  categories: PosCategory[];
  promotions: PromotionInput[];
  customers: CustomerOption[];
  floors: FloorWithTables[];
  occupiedTableIds: string[];
  occupiedOrdersByTable?: Record<string, TableOccupancy>;
  upcomingReservationsByTable?: Record<string, UpcomingTableReservation>;
  fulfillmentType?: "dine_in" | "takeaway";
};

export function OrderView({
  tableId,
  tableIds = [],
  reservationId,
  initialReservationCustomerName,
  products,
  categories,
  promotions,
  customers,
  floors,
  occupiedTableIds,
  occupiedOrdersByTable,
  upcomingReservationsByTable,
  fulfillmentType = "dine_in",
}: OrderViewProps) {
  const [floorOpen, setFloorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const cartId = fulfillmentType === "takeaway" ? TAKEAWAY_CART_ID : tableId;
  if (!cartId) {
    return (
      <>
        <div className="flex min-h-full items-center justify-center p-6">
          <div className="w-full max-w-2xl space-y-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Start an order
              </h1>
              <p className="text-muted-foreground text-sm">
                Choose dine-in, takeaway, or jump back into active work.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                className="h-24 justify-start gap-3 px-4"
                onClick={() => setFloorOpen(true)}
              >
                <Utensils className="size-5" />
                <span className="text-left">
                  <span className="block font-semibold">Select Table</span>
                  <span className="block text-xs opacity-80">
                    Start dine-in service
                  </span>
                </span>
              </Button>
              <Link
                href="/pos/takeaway"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-24 justify-start gap-3 px-4",
                )}
              >
                <ShoppingBag className="size-5" />
                <span className="text-left">
                  <span className="block font-semibold">Takeaway</span>
                  <span className="text-muted-foreground block text-xs">
                    No table required
                  </span>
                </span>
              </Link>
              <Link
                href="/pos/orders"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-20 justify-start gap-3 px-4",
                )}
              >
                <ClipboardList className="size-5" />
                Orders
              </Link>
              <Link
                href="/pos/tables"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-20 justify-start gap-3 px-4",
                )}
              >
                <Grid2X2 className="size-5" />
                Table View
              </Link>
            </div>
          </div>
        </div>
        <FloorPopup
          open={floorOpen}
          onOpenChange={setFloorOpen}
          floors={floors}
          occupiedTableIds={occupiedTableIds}
          occupiedOrdersByTable={occupiedOrdersByTable}
          upcomingReservationsByTable={upcomingReservationsByTable}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid h-full min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_minmax(320px,400px)]">
        <ProductGrid
          products={products}
          categories={categories}
          tableId={cartId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          promotions={promotions}
        />
        <div className="hidden h-full min-h-0 overflow-hidden lg:block">
          <PosCartColumn
            tableId={cartId}
            orderTableId={fulfillmentType === "dine_in" ? tableId : null}
            orderTableIds={fulfillmentType === "dine_in" ? tableIds : []}
            reservationId={reservationId}
            reservationCustomerName={initialReservationCustomerName}
            fulfillmentType={fulfillmentType}
            promotions={promotions}
            products={products}
            categories={categories}
            customers={customers}
          />
        </div>
      </div>
      <FloorPopup
        open={floorOpen}
        onOpenChange={setFloorOpen}
        floors={floors}
        occupiedTableIds={occupiedTableIds}
        occupiedOrdersByTable={occupiedOrdersByTable}
        upcomingReservationsByTable={upcomingReservationsByTable}
      />
    </>
  );
}
