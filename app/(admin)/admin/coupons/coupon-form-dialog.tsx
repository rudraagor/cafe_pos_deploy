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
import type { CouponInput } from "@/lib/validations/discounts";

export type CouponFormValue = {
  code: string;
  discountType: "percent" | "fixed";
  value: string;
  active: boolean;
};

type CouponFormDialogProps = {
  mode: "create" | "edit";
  coupon?: CouponFormValue;
  action: (formData: FormData) => Promise<ActionResult<keyof CouponInput>>;
};

function defaultCoupon(coupon?: CouponFormValue): CouponFormValue {
  return (
    coupon ?? {
      code: "",
      discountType: "percent",
      value: "10",
      active: true,
    }
  );
}

export function CouponFormDialog({
  mode,
  coupon,
  action,
}: CouponFormDialogProps) {
  const router = useRouter();
  const isCreate = mode === "create";
  const title = isCreate ? "New coupon" : "Edit coupon";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CouponFormValue>(defaultCoupon(coupon));
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors<keyof CouponInput>>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setValues(defaultCoupon(coupon));
      setFieldErrors(undefined);
      setServerError(null);
    }
    setOpen(nextOpen);
  }

  function updateValue<TKey extends keyof CouponFormValue>(
    key: TKey,
    value: CouponFormValue[TKey],
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
          result.message ?? (isCreate ? "Coupon created." : "Coupon updated."),
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
            Add coupon
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Coupons are typed manually by employees in the POS discount popup.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-coupon-code`}>Code</Label>
            <Input
              id={`${mode}-coupon-code`}
              value={values.code}
              onChange={(event) => updateValue("code", event.target.value)}
              className="uppercase"
              aria-invalid={!!fieldErrors?.code?.[0]}
            />
            {fieldErrors?.code?.[0] ? (
              <p className="text-destructive text-sm">{fieldErrors.code[0]}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-coupon-type`}>Discount type</Label>
              <select
                id={`${mode}-coupon-type`}
                value={values.discountType}
                onChange={(event) =>
                  updateValue(
                    "discountType",
                    event.target.value as CouponFormValue["discountType"],
                  )
                }
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-coupon-value`}>Value</Label>
              <Input
                id={`${mode}-coupon-value`}
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
