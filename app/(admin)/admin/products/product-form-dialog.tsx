"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { type ProductInput, unitOptions } from "@/lib/validations/products";
import { createInlineCategory } from "./actions";

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
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors<keyof ProductInput>>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCreatingCategory, startCategoryTransition] = useTransition();
  const selectedCategory = categoryOptions.find(
    (category) => category.id === values.categoryId,
  );

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return categoryOptions;
    return categoryOptions.filter((category) =>
      category.name.toLowerCase().includes(query),
    );
  }, [categoryOptions, categoryQuery]);

  const exactCategoryMatch = categoryOptions.some(
    (category) =>
      category.name.toLowerCase() === categoryQuery.trim().toLowerCase(),
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setValues(defaultProduct(product));
      setCategoryOptions(categories);
      setCategoryQuery("");
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

  function handleCreateCategory() {
    const name = categoryQuery.trim();
    if (!name) return;

    startCategoryTransition(async () => {
      const result = await createInlineCategory(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setCategoryOptions((current) => {
        if (current.some((category) => category.id === result.category.id)) {
          return current;
        }
        return [...current, result.category].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });
      updateValue("categoryId", result.category.id);
      setCategoryQuery("");
      toast.success(`Category ${result.category.name} selected.`);
    });
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
              <div className="rounded-lg border p-2">
                <div className="flex items-center gap-2">
                  {selectedCategory ? (
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                  ) : null}
                  <select
                    id={`${mode}-product-category`}
                    value={values.categoryId}
                    onChange={(event) =>
                      updateValue("categoryId", event.target.value)
                    }
                    className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
                    aria-invalid={!!fieldMessage(fieldErrors, "categoryId")}
                  >
                    <option value="">Uncategorized</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={categoryQuery}
                    onChange={(event) => setCategoryQuery(event.target.value)}
                    placeholder="Type a category name..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateCategory}
                    disabled={
                      !categoryQuery.trim() ||
                      exactCategoryMatch ||
                      isCreatingCategory
                    }
                  >
                    {isCreatingCategory ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Create
                  </Button>
                </div>
                {categoryQuery.trim() && filteredCategories.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {filteredCategories.slice(0, 5).map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="hover:bg-muted inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-xs"
                        onClick={() => {
                          updateValue("categoryId", category.id);
                          setCategoryQuery("");
                        }}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </button>
                    ))}
                  </div>
                ) : null}
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
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
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
