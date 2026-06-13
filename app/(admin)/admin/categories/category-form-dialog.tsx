"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import type { ActionResult } from "@/lib/action-result";
import {
  type CategoryInput,
  categoryPalette,
  categorySchema,
} from "@/lib/validations/categories";

type CategoryFormAction = (
  formData: FormData,
) => Promise<ActionResult<keyof CategoryInput>>;

type CategoryFormDialogProps = {
  mode: "create" | "edit";
  category?: {
    name: string;
    color: string;
  };
  action: CategoryFormAction;
};

export function CategoryFormDialog({
  mode,
  category,
  action,
}: CategoryFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const defaultValues = useMemo(
    () => ({
      name: category?.name ?? "",
      color: category?.color ?? categoryPalette[0],
    }),
    [category?.color, category?.name],
  );

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  const color = useWatch({ control: form.control, name: "color" });
  const currentColor = color ?? defaultValues.color;
  const isCreate = mode === "create";
  const title = isCreate ? "New category" : "Edit category";

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(defaultValues);
      setServerError(null);
    }
    setOpen(nextOpen);
  }

  function submit(values: CategoryInput) {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("color", values.color);
    setServerError(null);

    startTransition(async () => {
      const result = await action(formData);

      if (result.ok) {
        toast.success(
          result.message ??
            (isCreate ? "Category created." : "Category updated."),
        );
        setOpen(false);
        form.reset(isCreate ? { name: "", color: categoryPalette[0] } : values);
        router.refresh();
        return;
      }

      setServerError(result.error);
      for (const [field, messages] of Object.entries(
        result.fieldErrors ?? {},
      )) {
        const message = messages?.[0];
        if (message) {
          form.setError(field as keyof CategoryInput, { message });
        }
      }
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
            Add category
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Category colors are reused later in POS product cards and filters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-category-name`}>Name</Label>
            <Input
              id={`${mode}-category-name`}
              aria-invalid={!!form.formState.errors.name}
              autoComplete="off"
              {...form.register("name")}
            />
            {form.formState.errors.name?.message ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-category-color`}>Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${mode}-category-color`}
                type="color"
                aria-invalid={!!form.formState.errors.color}
                className="h-9 w-14 cursor-pointer p-1"
                {...form.register("color")}
              />
              <Input
                value={currentColor}
                onChange={(event) =>
                  form.setValue("color", event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                aria-invalid={!!form.formState.errors.color}
                className="font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryPalette.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Use ${swatch}`}
                  className="ring-offset-background focus-visible:ring-ring size-7 rounded-lg border transition hover:scale-105 focus-visible:ring-2 focus-visible:outline-none"
                  style={{
                    backgroundColor: swatch,
                    borderColor:
                      currentColor === swatch ? "var(--foreground)" : swatch,
                  }}
                  onClick={() =>
                    form.setValue("color", swatch, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              ))}
            </div>
            {form.formState.errors.color?.message ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.color.message}
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
