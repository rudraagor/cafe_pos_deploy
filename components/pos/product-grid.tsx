"use client";

import { useMemo, useState } from "react";
import { useCartStore } from "@/lib/pos/cart-store";
import { cn } from "@/lib/utils";

export type PosProduct = {
  id: string;
  name: string;
  price: string;
  taxRate: string;
  isKitchenItem: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

export type PosCategory = {
  id: string;
  name: string;
  color: string;
};

type ProductGridProps = {
  products: PosProduct[];
  categories: PosCategory[];
  tableId: string;
  searchQuery?: string;
};

export function ProductGrid({
  products,
  categories,
  tableId,
  searchQuery = "",
}: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const addItem = useCartStore((s) => s.addItem);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === "all" || p.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 overflow-x-auto border-b p-2">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              activeCategory === cat.id
                ? "text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
            style={
              activeCategory === cat.id
                ? { backgroundColor: cat.color }
                : undefined
            }
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => {
          const color = product.categoryColor ?? "#64748b";
          return (
            <button
              key={product.id}
              type="button"
              onClick={() =>
                addItem(tableId, {
                  productId: product.id,
                  name: product.name,
                  unitPrice: Number(product.price),
                  taxRate: Number(product.taxRate),
                  isKitchenItem: product.isKitchenItem,
                  categoryColor: color,
                })
              }
              className="flex flex-col rounded-lg border p-3 text-left transition-transform active:scale-95"
              style={{ borderTopColor: color, borderTopWidth: 3 }}
            >
              <span className="line-clamp-2 text-sm font-medium">
                {product.name}
              </span>
              <span className="text-muted-foreground mt-1 text-xs">
                ₹{Number(product.price).toFixed(2)}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
            No products found.
          </p>
        ) : null}
      </div>
    </div>
  );
}
