"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  productId: string;
  minQuantity: string;
  minOrderAmount: string;
  discountType: "percent" | "fixed";
  value: string;
  active: boolean;
};

type PromotionFormDialogProps = {
  mode: "create" | "edit";
  promotion?: PromotionFormValue;
  products: PromotionProductOption[];
  action: (formData: FormData) => Promise<ActionResult<keyof PromotionInput>>;
};

function defaultPromotion(promotion?: PromotionFormValue): PromotionFormValue {
  return (
    promotion ?? {
      name: "",
      scope: "order",
      productId: "",
      minQuantity: "",
      minOrderAmount: "500",
      discountType: "fixed",
      value: "50",
      active: true,
    }
  );
}

export function PromotionFormDialog({
  mode,
  promotion,
  products,
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
      formData.set(key, String(value));
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor={`${mode}-promotion-scope`}>Scope</Label>
              <select
                id={`${mode}-promotion-scope`}
                value={values.scope}
                onChange={(event) =>
                  updateValue(
                    "scope",
                    event.target.value as PromotionFormValue["scope"],
                  )
                }
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                <option value="order">Order</option>
                <option value="product">Product</option>
              </select>
            </div>

            {values.scope === "product" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-promotion-product`}>Product</Label>
                  <select
                    id={`${mode}-promotion-product`}
                    value={values.productId}
                    onChange={(event) =>
                      updateValue("productId", event.target.value)
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
                    aria-invalid={!!fieldErrors?.productId?.[0]}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors?.productId?.[0] ? (
                    <p className="text-destructive text-sm">
                      {fieldErrors.productId[0]}
                    </p>
                  ) : null}
                </div>
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
            ) : (
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
            )}

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
          </div>

          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="text-sm font-medium">Active</span>
            <Switch
              checked={values.active}
              onChange={(event) => updateValue("active", event.target.checked)}
            />
          </label>
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
