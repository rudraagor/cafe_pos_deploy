"use client";

import { Pencil, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { modifierPresets, type ModifierId } from "@/lib/pos/modifiers";
import { type ProductInput, unitOptions } from "@/lib/validations/products";

export type ProductCategoryOption = {
  id: string;
  name: string;
  color: string;
};

export type ProductFormValue = {
  name: string;
  categoryId: string;
  price: string;
  unitOfMeasure: (typeof unitOptions)[number];
  taxRate: string;
  description: string;
  supportedModifiers: string[];
  isKitchenItem: boolean;
};

type ProductFormDialogProps = {
  mode: "create" | "edit";
  product?: ProductFormValue;
  categories: ProductCategoryOption[];
  action: (formData: FormData) => Promise<ActionResult<keyof ProductInput>>;
};

function fieldMessage(
  fieldErrors: FieldErrors<keyof ProductInput> | undefined,
  field: keyof ProductInput,
) {
  return fieldErrors?.[field]?.[0];
}

function defaultProduct(product?: ProductFormValue): ProductFormValue {
  return (
    product ?? {
      name: "",
      categoryId: "",
      price: "",
      unitOfMeasure: "piece",
      taxRate: "5",
      description: "",
      supportedModifiers: [],
      isKitchenItem: true,
    }
  );
}

export function ProductFormDialog({
  mode,
  product,
  categories,
  action,
}: ProductFormDialogProps) {
  const router = useRouter();
  const isCreate = mode === "create";
  const title = isCreate ? "New product" : "Edit product";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ProductFormValue>(
    defaultProduct(product),
  );
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors<keyof ProductInput>>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCategory = categories.find(
    (category) => category.id === values.categoryId,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setValues(defaultProduct(product));
      setFieldErrors(undefined);
      setServerError(null);
    }
    setOpen(nextOpen);
  }

  function updateValue<TKey extends keyof ProductFormValue>(
    key: TKey,
    value: ProductFormValue[TKey],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key === "supportedModifiers") continue;
      formData.set(key, String(value));
    }
    for (const modifier of values.supportedModifiers) {
      formData.append("supportedModifiers", modifier);
    }

    setFieldErrors(undefined);
    setServerError(null);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(
          result.message ??
            (isCreate ? "Product created." : "Product updated."),
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

  function toggleModifier(modifier: ModifierId) {
    setValues((current) => {
      const enabled = current.supportedModifiers.includes(modifier);
      return {
        ...current,
        supportedModifiers: enabled
          ? current.supportedModifiers.filter((item) => item !== modifier)
          : [...current.supportedModifiers, modifier],
      };
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
            Add product
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure what appears on POS product cards and kitchen tickets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-name`}>Name</Label>
              <Input
                id={`${mode}-product-name`}
                value={values.name}
                onChange={(event) => updateValue("name", event.target.value)}
                aria-invalid={!!fieldMessage(fieldErrors, "name")}
              />
              {fieldMessage(fieldErrors, "name") ? (
                <p className="text-destructive text-sm">
                  {fieldMessage(fieldErrors, "name")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-category`}>Category</Label>
              <div className="border-input flex h-10 items-center gap-2 rounded-lg border px-3">
                {selectedCategory ? (
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                ) : null}
                <select
                  id={`${mode}-product-category`}
                  value={values.categoryId}
                  onChange={(event) =>
                    updateValue("categoryId", event.target.value)
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  aria-invalid={!!fieldMessage(fieldErrors, "categoryId")}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              {fieldMessage(fieldErrors, "categoryId") ? (
                <p className="text-destructive text-sm">
                  {fieldMessage(fieldErrors, "categoryId")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-price`}>Price</Label>
              <Input
                id={`${mode}-product-price`}
                value={values.price}
                inputMode="decimal"
                onChange={(event) => updateValue("price", event.target.value)}
                aria-invalid={!!fieldMessage(fieldErrors, "price")}
              />
              {fieldMessage(fieldErrors, "price") ? (
                <p className="text-destructive text-sm">
                  {fieldMessage(fieldErrors, "price")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-unit`}>Unit</Label>
              <select
                id={`${mode}-product-unit`}
                value={values.unitOfMeasure}
                onChange={(event) =>
                  updateValue(
                    "unitOfMeasure",
                    event.target.value as ProductFormValue["unitOfMeasure"],
                  )
                }
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-product-tax`}>Tax %</Label>
              <Input
                id={`${mode}-product-tax`}
                value={values.taxRate}
                inputMode="decimal"
                onChange={(event) => updateValue("taxRate", event.target.value)}
                aria-invalid={!!fieldMessage(fieldErrors, "taxRate")}
              />
              {fieldMessage(fieldErrors, "taxRate") ? (
                <p className="text-destructive text-sm">
                  {fieldMessage(fieldErrors, "taxRate")}
                </p>
              ) : null}
            </div>

            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">Kitchen item</span>
                <span className="text-muted-foreground block text-xs">
                  Send this product to the KDS later.
                </span>
              </span>
              <Switch
                checked={values.isKitchenItem}
                onChange={(event) =>
                  updateValue("isKitchenItem", event.target.checked)
                }
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-product-description`}>Description</Label>
            <Textarea
              id={`${mode}-product-description`}
              value={values.description}
              onChange={(event) =>
                updateValue("description", event.target.value)
              }
              aria-invalid={!!fieldMessage(fieldErrors, "description")}
            />
            {fieldMessage(fieldErrors, "description") ? (
              <p className="text-destructive text-sm">
                {fieldMessage(fieldErrors, "description")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Supported prep options</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {modifierPresets.map((modifier) => {
                const checked = values.supportedModifiers.includes(modifier.id);
                return (
                  <label
                    key={modifier.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {modifier.label}
                      </span>
                      {modifier.noteAllowed ? (
                        <span className="text-muted-foreground block text-xs">
                          Allows waiter note.
                        </span>
                      ) : null}
                    </span>
                    <Switch
                      checked={checked}
                      onChange={() => toggleModifier(modifier.id)}
                    />
                  </label>
                );
              })}
            </div>
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
              {isCreate ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
