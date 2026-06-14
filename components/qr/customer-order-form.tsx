"use client";

import { Minus, Plus, Send, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PromotionsOffersButton } from "@/components/promotions/promotions-offers-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  modifierLabel,
  modifiersAllowNote,
  normalizeModifiers,
  type ModifierId,
} from "@/lib/pos/modifiers";
import { formatMoney } from "@/lib/pos/pricing";
import type { PromotionInput } from "@/lib/pos/pricing";
import { cn } from "@/lib/utils";

type QrProduct = {
  id: string;
  name: string;
  price: string;
  isOutOfStock: boolean;
  supportedModifiers: string[];
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

type QrCategory = {
  id: string;
  name: string;
  color: string;
};

type CartLine = {
  lineId: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  modifiers: ModifierId[];
  note: string;
};

type CustomerOrderFormProps = {
  token: string;
  tableLabel: string;
  products: QrProduct[];
  categories: QrCategory[];
  promotions?: PromotionInput[];
};

export function CustomerOrderForm({
  token,
  tableLabel,
  products,
  categories,
  promotions = [],
}: CustomerOrderFormProps) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatches =
        activeCategory === "all" || product.categoryId === activeCategory;
      const searchMatches = !q || product.name.toLowerCase().includes(q);
      return categoryMatches && searchMatches;
    });
  }, [activeCategory, products, search]);

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const totalQty = cart.reduce((sum, line) => sum + line.qty, 0);

  function addProduct(product: QrProduct) {
    if (product.isOutOfStock) return;
    setCart((current) => [
      ...current,
      {
        lineId: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        qty: 1,
        modifiers: [],
        note: "",
      },
    ]);
  }

  function updateLine(lineId: string, next: Partial<CartLine>) {
    setCart((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, ...next } : line)),
    );
  }

  function removeLine(lineId: string) {
    setCart((current) => current.filter((line) => line.lineId !== lineId));
  }

  function productForLine(line: CartLine) {
    return products.find((product) => product.id === line.productId) ?? null;
  }

  function toggleModifier(line: CartLine, modifier: ModifierId) {
    const nextModifiers = line.modifiers.includes(modifier)
      ? line.modifiers.filter((item) => item !== modifier)
      : [...line.modifiers, modifier];
    updateLine(line.lineId, { modifiers: nextModifiers });
  }

  async function submitOrder() {
    if (cart.length === 0) {
      toast.error("Add at least one item.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Enter your name.");
      return;
    }
    if (!customerEmail.trim()) {
      toast.error("Enter your email.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/qr-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          items: cart.map((line) => ({
            productId: line.productId,
            qty: line.qty,
            modifiers: line.modifiers,
            note: line.note.trim() || undefined,
          })),
        }),
      });
      const result = (await parseResponse(response)) as {
        ok?: boolean;
        orderNumber?: string;
        error?: string;
      };
      if (!response.ok || !result.ok) {
        toast.error(result.error ?? "Could not submit order.");
        return;
      }
      setCart([]);
      setCustomerName("");
      setCustomerEmail("");
      toast.success(`Sent ${result.orderNumber} for waiter approval.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Chai Biskit Cafe</p>
            <h1 className="text-lg font-semibold">{tableLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            {promotions.length > 0 ? (
              <PromotionsOffersButton
                promotions={promotions}
                products={products}
                categories={categories}
                variant="guest"
                size="sm"
              />
            ) : null}
            <Badge variant="secondary">
              <ShoppingBag className="size-3" />
              {totalQty} items
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
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
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                  activeCategory === category.id
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                style={
                  activeCategory === category.id
                    ? { backgroundColor: category.color }
                    : undefined
                }
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </button>
            ))}
          </div>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search menu"
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const color = product.categoryColor ?? "#64748b";
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={product.isOutOfStock}
                  onClick={() => addProduct(product)}
                  className={cn(
                    "min-h-28 rounded-lg border p-3 text-left transition-transform",
                    product.isOutOfStock
                      ? "cursor-not-allowed bg-muted/50 opacity-60"
                      : "active:scale-95",
                  )}
                  style={{ borderTopColor: color, borderTopWidth: 3 }}
                >
                  <span className="line-clamp-2 text-sm font-medium">{product.name}</span>
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {formatMoney(Number(product.price))}
                  </span>
                  {product.isOutOfStock ? (
                    <span className="mt-2 inline-block rounded bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 uppercase">
                      Out
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Your order</h2>
              <span className="text-sm font-medium">{formatMoney(subtotal)}</span>
            </div>

            <div className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tap menu items to add them.</p>
              ) : null}
              {cart.map((line) => {
                const product = productForLine(line);
                const supportedModifiers = normalizeModifiers(product?.supportedModifiers);
                const noteAllowed = modifiersAllowNote([
                  ...supportedModifiers,
                  ...line.modifiers,
                ]);
                return (
                  <div key={line.lineId} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{line.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(line.price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          aria-label={`Decrease ${line.name}`}
                          onClick={() =>
                            line.qty === 1
                              ? removeLine(line.lineId)
                              : updateLine(line.lineId, { qty: line.qty - 1 })
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{line.qty}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          aria-label={`Increase ${line.name}`}
                          disabled={line.qty >= 20}
                          onClick={() => updateLine(line.lineId, { qty: line.qty + 1 })}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {supportedModifiers.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {supportedModifiers.map((modifier) => {
                          const active = line.modifiers.includes(modifier);
                          return (
                            <button
                              key={modifier}
                              type="button"
                              onClick={() => toggleModifier(line, modifier)}
                              className={cn(
                                "rounded-full border px-2 py-1 text-xs font-medium",
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
                    ) : null}

                    {noteAllowed ? (
                      <Textarea
                        value={line.note}
                        maxLength={160}
                        onChange={(event) =>
                          updateLine(line.lineId, { note: event.target.value })
                        }
                        placeholder="Prep note"
                        className="min-h-16 text-sm"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Name</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="you@example.com"
                  maxLength={120}
                  autoComplete="email"
                />
              </div>
            </div>
            <Button
              type="button"
              className="mt-4 w-full"
              disabled={submitting || cart.length === 0}
              onClick={submitOrder}
            >
              <Send className="size-4" />
              Send for approval
            </Button>
          </div>
        </aside>
      </main>
    </div>
  );
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
