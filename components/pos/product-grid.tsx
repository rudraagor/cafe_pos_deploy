"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/lib/pos/cart-store";
import {
  modifierLabel,
  modifiersAllowNote,
  normalizeModifiers,
  type ModifierId,
} from "@/lib/pos/modifiers";
import { cn } from "@/lib/utils";

export type PosProduct = {
  id: string;
  name: string;
  price: string;
  taxRate: string;
  isKitchenItem: boolean;
  isOutOfStock: boolean;
  supportedModifiers: string[];
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
  onSearchChange?: (value: string) => void;
};

export function ProductGrid({
  products,
  categories,
  tableId,
  searchQuery: controlledSearch = "",
  onSearchChange,
}: ProductGridProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const searchQuery = onSearchChange ? controlledSearch : internalSearch;
  const setSearchQuery = onSearchChange ?? setInternalSearch;
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [customizing, setCustomizing] = useState<PosProduct | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<ModifierId[]>([]);
  const [note, setNote] = useState("");
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

  function addProduct(product: PosProduct) {
    if (product.isOutOfStock) return;
    const supportedModifiers = normalizeModifiers(product.supportedModifiers);
    if (supportedModifiers.length > 0) {
      setCustomizing(product);
      setSelectedModifiers([]);
      setNote("");
      return;
    }
    addConfiguredProduct(product, [], "");
  }

  function addConfiguredProduct(
    product: PosProduct,
    modifiers: ModifierId[],
    itemNote: string,
  ) {
    const color = product.categoryColor ?? "#64748b";
    addItem(tableId, {
      productId: product.id,
      name: product.name,
      unitPrice: Number(product.price),
      taxRate: Number(product.taxRate),
      isKitchenItem: product.isKitchenItem,
      categoryId: product.categoryId,
      categoryColor: color,
      modifiers,
      note: itemNote.trim() || undefined,
    });
  }

  function toggleModifier(modifier: ModifierId) {
    setSelectedModifiers((current) =>
      current.includes(modifier)
        ? current.filter((item) => item !== modifier)
        : [...current, modifier],
    );
  }

  function submitCustomization() {
    if (!customizing) return;
    addConfiguredProduct(customizing, selectedModifiers, note);
    setCustomizing(null);
  }

  const supportedForCustomizing = normalizeModifiers(
    customizing?.supportedModifiers,
  );
  const noteAllowed = modifiersAllowNote([
    ...supportedForCustomizing,
    ...selectedModifiers,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
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

      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products..."
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => {
          const color = product.categoryColor ?? "#64748b";
          const outOfStock = product.isOutOfStock;
          return (
            <button
              key={product.id}
              type="button"
              disabled={outOfStock}
              onClick={() => addProduct(product)}
              className={cn(
                "flex flex-col rounded-lg border p-3 text-left transition-transform",
                outOfStock
                  ? "bg-muted/50 cursor-not-allowed opacity-60 grayscale"
                  : "active:scale-95",
              )}
              style={{ borderTopColor: color, borderTopWidth: 3 }}
            >
              <span className="line-clamp-2 text-sm font-medium">
                {product.name}
              </span>
              <span className="text-muted-foreground mt-1 text-xs">
                ₹{Number(product.price).toFixed(2)}
              </span>
              {outOfStock ? (
                <span className="mt-2 rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 uppercase">
                  Out of stock
                </span>
              ) : normalizeModifiers(product.supportedModifiers).length > 0 ? (
                <span className="mt-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Customizable
                </span>
              ) : null}
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
            No products found.
          </p>
        ) : null}
      </div>
      <Dialog open={!!customizing} onOpenChange={(open) => !open && setCustomizing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{customizing?.name ?? "Customize item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Prep options</Label>
              <div className="flex flex-wrap gap-2">
                {supportedForCustomizing.map((modifier) => {
                  const active = selectedModifiers.includes(modifier);
                  return (
                    <button
                      key={modifier}
                      type="button"
                      onClick={() => toggleModifier(modifier)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium",
                        active
                          ? "border-amber-600 bg-amber-500/20 text-amber-800"
                          : "hover:bg-muted",
                      )}
                    >
                      {modifierLabel(modifier)}
                    </button>
                  );
                })}
              </div>
            </div>
            {noteAllowed ? (
              <div className="space-y-2">
                <Label htmlFor="item-note">Note</Label>
                <Textarea
                  id="item-note"
                  value={note}
                  maxLength={160}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Allergy, less spicy, packing note..."
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomizing(null)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitCustomization}>
              Add item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
