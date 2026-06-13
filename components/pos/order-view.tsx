"use client";

import { useState } from "react";
import { CartPanel } from "@/components/pos/cart-panel";
import { FloorPopup } from "@/components/pos/floor-popup";
import { OrderSummary } from "@/components/pos/order-summary";
import {
  ProductGrid,
  type PosCategory,
  type PosProduct,
} from "@/components/pos/product-grid";
import type { FloorWithTables } from "@/components/pos/table-grid";
import type { PromotionInput } from "@/lib/pos/pricing";

type CustomerOption = { id: string; name: string; email: string | null };

type OrderViewProps = {
  tableId: string | null;
  products: PosProduct[];
  categories: PosCategory[];
  promotions: PromotionInput[];
  customers: CustomerOption[];
  floors: FloorWithTables[];
  occupiedTableIds: string[];
};

export function OrderView({
  tableId,
  products,
  categories,
  promotions,
  customers,
  floors,
  occupiedTableIds,
}: OrderViewProps) {
  const [floorOpen, setFloorOpen] = useState(false);
  const searchQuery = "";

  if (!tableId) {
    return (
      <>
        <div className="text-muted-foreground flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6 text-sm">
          Select a table to start an order.
        </div>
        <FloorPopup
          open
          onOpenChange={setFloorOpen}
          floors={floors}
          occupiedTableIds={occupiedTableIds}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[1fr_320px_280px]">
        <ProductGrid
          products={products}
          categories={categories}
          tableId={tableId}
          searchQuery={searchQuery}
        />
        <div className="hidden border-l lg:block">
          <CartPanel tableId={tableId} promotions={promotions} />
        </div>
        <OrderSummary
          tableId={tableId}
          promotions={promotions}
          customers={customers}
        />
      </div>
      <FloorPopup
        open={floorOpen}
        onOpenChange={setFloorOpen}
        floors={floors}
        occupiedTableIds={occupiedTableIds}
      />
    </>
  );
}
