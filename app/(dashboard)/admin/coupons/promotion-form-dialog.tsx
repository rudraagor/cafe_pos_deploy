"use client";

import { Loader2, Pencil, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { PromotionInput } from "@/lib/validations/discounts";

export type PromotionProductOption = {
  id: string;
  name: string;
};

export type PromotionFormValue = {
  name: string;
  scope: "product" | "order";
  ruleType: "order_threshold" | "product_quantity" | "combo" | "daily_item";
  productId: string;
  minQuantity: string;
  minOrderAmount: string;
  requiredProductIds: string[];
  dailyProductIds: string[];
  dailyCategoryIds: string[];
  requiredQuantity: string;
  rewardProductIds: string[];
  rewardQuantity: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  discountType: "percent" | "fixed";
  value: string;
  stackable: boolean;
  active: boolean;
};

type PromotionFormDialogProps = {
  mode: "create" | "edit";
  promotion?: PromotionFormValue;
  products: PromotionProductOption[];
  categories: PromotionProductOption[];
  action: (formData: FormData) => Promise<ActionResult<keyof PromotionInput>>;
};

function defaultPromotion(promotion?: PromotionFormValue): PromotionFormValue {
  return (
    promotion ?? {
      name: "",
      scope: "order",
      ruleType: "order_threshold",
      productId: "",
      minQuantity: "",
      minOrderAmount: "500",
      requiredProductIds: [],
      dailyProductIds: [],
      dailyCategoryIds: [],
      requiredQuantity: "1",
      rewardProductIds: [],
      rewardQuantity: "1",
      daysOfWeek: [],
      startTime: "",
      endTime: "",
      discountType: "fixed",
      value: "50",
      stackable: true,
      active: true,
    }
  );
}

const weekdays = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export function PromotionFormDialog({
  mode,
  promotion,
  products,
  categories,
  action,
}: PromotionFormDialogProps) {
  const router = useRouter();
  const isCreate = mode === "create";
  const title = isCreate ? "New promotion" : "Edit promotion";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PromotionFormValue>(
    defaultPromotion(promotion),
  );
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors<keyof PromotionInput>>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setValues(defaultPromotion(promotion));
      setFieldErrors(undefined);
      setServerError(null);
    }
    setOpen(nextOpen);
  }

  function updateValue<TKey extends keyof PromotionFormValue>(
    key: TKey,
    value: PromotionFormValue[TKey],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (Array.isArray(value)) {
        for (const item of value) formData.append(key, String(item));
      } else {
        formData.set(key, String(value));
      }
    }
    setFieldErrors(undefined);
    setServerError(null);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(
          result.message ??
            (isCreate ? "Promotion created." : "Promotion updated."),
        );
        setOpen(false);
        router.refresh();
        return;
      }

      setFieldErrors(result.fieldErrors);
      setServerError(result.error);
      toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={isCreate ? "default" : "ghost"}
            size={isCreate ? "default" : "icon-sm"}
            aria-label={title}
          />
        }
      >
        {isCreate ? (
          <>
            <Plus className="size-4" />
            Add promotion
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Automated discounts apply when the cart satisfies these conditions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-promotion-name`}>Name</Label>
              <Input
                id={`${mode}-promotion-name`}
                value={values.name}
                onChange={(event) => updateValue("name", event.target.value)}
                aria-invalid={!!fieldErrors?.name?.[0]}
              />
              {fieldErrors?.name?.[0] ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.name[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-promotion-rule`}>Rule type</Label>
              <select
                id={`${mode}-promotion-rule`}
                value={values.ruleType}
                onChange={(event) =>
                  updateValue(
                    "ruleType",
                    event.target.value as PromotionFormValue["ruleType"],
                  )
                }
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                <option value="order_threshold">Order threshold</option>
                <option value="product_quantity">Product quantity</option>
                <option value="combo">Combo / buy X get Y</option>
                <option value="daily_item">Dish of the day</option>
              </select>
            </div>
          </div>

          <input
            type="hidden"
            name="scope"
            value={values.ruleType === "order_threshold" ? "order" : "product"}
          />

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Trigger</h3>
            <p className="text-muted-foreground text-xs">
              Define what the cart must contain before this promotion applies.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {values.ruleType === "product_quantity" ? (
                <>
                  <ProductChecklist
                    label="Product"
                    products={products}
                    values={values.productId ? [values.productId] : []}
                    onChange={(next) => updateValue("productId", next[0] ?? "")}
                    searchPlaceholder="Search products..."
                    multiple={false}
                    emptyHint="Select one product for this promotion."
                  />
                  {fieldErrors?.productId?.[0] ? (
                    <p className="text-destructive text-sm sm:col-span-2">
                      {fieldErrors.productId[0]}
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-promotion-qty`}>
                      Minimum quantity
                    </Label>
                    <Input
                      id={`${mode}-promotion-qty`}
                      value={values.minQuantity}
                      inputMode="numeric"
                      onChange={(event) =>
                        updateValue("minQuantity", event.target.value)
                      }
                      aria-invalid={!!fieldErrors?.minQuantity?.[0]}
                    />
                    {fieldErrors?.minQuantity?.[0] ? (
                      <p className="text-destructive text-sm">
                        {fieldErrors.minQuantity[0]}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {values.ruleType === "order_threshold" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`${mode}-promotion-amount`}>
                    Minimum order amount
                  </Label>
                  <Input
                    id={`${mode}-promotion-amount`}
                    value={values.minOrderAmount}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateValue("minOrderAmount", event.target.value)
                    }
                    aria-invalid={!!fieldErrors?.minOrderAmount?.[0]}
                  />
                  {fieldErrors?.minOrderAmount?.[0] ? (
                    <p className="text-destructive text-sm">
                      {fieldErrors.minOrderAmount[0]}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {values.ruleType === "combo" ? (
                <>
                  <ProductChecklist
                    label="Required products"
                    products={products}
                    values={values.requiredProductIds}
                    onChange={(next) => updateValue("requiredProductIds", next)}
                    searchPlaceholder="Search products..."
                  />
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-combo-required-qty`}>
                      Quantity needed for each
                    </Label>
                    <Input
                      id={`${mode}-combo-required-qty`}
                      value={values.requiredQuantity}
                      inputMode="numeric"
                      onChange={(event) =>
                        updateValue("requiredQuantity", event.target.value)
                      }
                      aria-invalid={!!fieldErrors?.requiredQuantity?.[0]}
                    />
                  </div>
                  {fieldErrors?.requiredProductIds?.[0] ? (
                    <p className="text-destructive text-sm sm:col-span-2">
                      {fieldErrors.requiredProductIds[0]}
                    </p>
                  ) : null}
                </>
              ) : null}

              {values.ruleType === "daily_item" ? (
                <>
                  <ProductChecklist
                    label="Dish of the day items"
                    products={products}
                    values={values.dailyProductIds}
                    onChange={(next) => updateValue("dailyProductIds", next)}
                    searchPlaceholder="Search products..."
                  />
                  <ProductChecklist
                    label="Eligible categories"
                    products={categories}
                    values={values.dailyCategoryIds}
                    onChange={(next) => updateValue("dailyCategoryIds", next)}
                    searchPlaceholder="Search categories..."
                  />
                  <div className="space-y-2">
                    <Label>Redeemable days</Label>
                    <WeekdayPicker
                      values={values.daysOfWeek}
                      onChange={(next) => updateValue("daysOfWeek", next)}
                    />
                    <p className="text-muted-foreground text-xs">
                      Leave empty to allow every day.
                    </p>
                  </div>
                  {fieldErrors?.dailyProductIds?.[0] ? (
                    <p className="text-destructive text-sm sm:col-span-2">
                      {fieldErrors.dailyProductIds[0]}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Discount</h3>
            <p className="text-muted-foreground text-xs">
              For combo offers, choose one or more reward products for
              buy-X-get-Y-free, or leave empty to discount the matching combo.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${mode}-promotion-type`}>Discount type</Label>
                <select
                  id={`${mode}-promotion-type`}
                  value={values.discountType}
                  onChange={(event) =>
                    updateValue(
                      "discountType",
                      event.target.value as PromotionFormValue["discountType"],
                    )
                  }
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${mode}-promotion-value`}>Value</Label>
                <Input
                  id={`${mode}-promotion-value`}
                  value={values.value}
                  inputMode="decimal"
                  onChange={(event) => updateValue("value", event.target.value)}
                  aria-invalid={!!fieldErrors?.value?.[0]}
                />
                {fieldErrors?.value?.[0] ? (
                  <p className="text-destructive text-sm">
                    {fieldErrors.value[0]}
                  </p>
                ) : null}
              </div>
              {values.ruleType === "combo" ? (
                <>
                  <div className="space-y-2 sm:col-span-2">
                    <ProductChecklist
                      label="Reward products"
                      products={products}
                      values={values.rewardProductIds}
                      onChange={(next) => updateValue("rewardProductIds", next)}
                      searchPlaceholder="Search products..."
                      emptyHint="Leave empty to discount the matching combo subtotal."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-reward-qty`}>
                      Reward quantity
                    </Label>
                    <Input
                      id={`${mode}-reward-qty`}
                      value={values.rewardQuantity}
                      inputMode="numeric"
                      onChange={(event) =>
                        updateValue("rewardQuantity", event.target.value)
                      }
                      aria-invalid={!!fieldErrors?.rewardQuantity?.[0]}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Schedule</h3>
            <p className="text-muted-foreground text-xs">
              Optional time gating for happy-hour or daypart offers.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {values.ruleType !== "daily_item" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Days</Label>
                  <WeekdayPicker
                    values={values.daysOfWeek}
                    onChange={(next) => updateValue("daysOfWeek", next)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Leave empty to allow every day.
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor={`${mode}-start-time`}>Start time</Label>
                <Input
                  id={`${mode}-start-time`}
                  type="time"
                  value={values.startTime}
                  onChange={(event) =>
                    updateValue("startTime", event.target.value)
                  }
                  aria-invalid={!!fieldErrors?.startTime?.[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${mode}-end-time`}>End time</Label>
                <Input
                  id={`${mode}-end-time`}
                  type="time"
                  value={values.endTime}
                  onChange={(event) =>
                    updateValue("endTime", event.target.value)
                  }
                  aria-invalid={!!fieldErrors?.endTime?.[0]}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm font-medium">Active</span>
              <Switch
                checked={values.active}
                onChange={(event) =>
                  updateValue("active", event.target.checked)
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">
                  Can be clubbed
                </span>
                <span className="text-muted-foreground block text-xs">
                  Allow with other coupons/promos.
                </span>
              </span>
              <Switch
                checked={values.stackable}
                onChange={(event) =>
                  updateValue("stackable", event.target.checked)
                }
              />
            </label>
          </div>
          {serverError ? (
            <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
              {serverError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isCreate ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductChecklist({
  label,
  products,
  values,
  onChange,
  searchPlaceholder = "Search...",
  multiple = true,
  emptyHint,
}: {
  label: string;
  products: PromotionProductOption[];
  values: string[];
  onChange: (values: string[]) => void;
  searchPlaceholder?: string;
  multiple?: boolean;
  emptyHint?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const selected = useMemo(() => new Set(values), [values]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    const matching = products.filter((product) =>
      product.name.toLowerCase().includes(query),
    );
    const selectedNotShown = products.filter(
      (product) =>
        selected.has(product.id) &&
        !matching.some((match) => match.id === product.id),
    );

    return [...selectedNotShown, ...matching];
  }, [products, searchQuery, selected]);

  function toggle(id: string) {
    if (multiple) {
      if (selected.has(id)) {
        onChange(values.filter((value) => value !== id));
        return;
      }
      onChange([...values, id]);
      return;
    }

    onChange(selected.has(id) ? [] : [id]);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 pl-8"
        />
      </div>
      <div className="max-h-44 overflow-y-auto rounded-lg border p-2">
        {filteredProducts.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-center text-sm">
            No matches found.
          </p>
        ) : (
          filteredProducts.map((product) => (
            <label
              key={product.id}
              className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={multiple ? undefined : label}
                checked={selected.has(product.id)}
                onChange={() => toggle(product.id)}
                className="border-input size-4 rounded"
              />
              <span className="min-w-0 truncate">{product.name}</span>
            </label>
          ))
        )}
      </div>
      {values.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {multiple ? `${values.length} selected` : "1 selected"}
        </p>
      ) : emptyHint ? (
        <p className="text-muted-foreground text-xs">{emptyHint}</p>
      ) : null}
    </div>
  );
}

function WeekdayPicker({
  values,
  onChange,
}: {
  values: number[];
  onChange: (values: number[]) => void;
}) {
  const selected = new Set(values);

  function toggle(day: number) {
    if (selected.has(day)) {
      onChange(values.filter((value) => value !== day));
      return;
    }
    onChange([...values, day]);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {weekdays.map((day) => (
        <button
          key={day.value}
          type="button"
          onClick={() => toggle(day.value)}
          className={`h-8 rounded-md border px-2 text-xs font-medium ${
            selected.has(day.value)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background hover:bg-muted"
          }`}
        >
          {day.label}
        </button>
      ))}
    </div>
  );
}
