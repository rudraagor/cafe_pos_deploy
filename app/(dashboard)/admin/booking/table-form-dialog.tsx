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
import type { TableInput } from "@/lib/validations/booking";

export type FloorOption = {
  id: string;
  name: string;
};

export type TableFormValue = {
  floorId: string;
  number: string;
  seats: string;
  active: boolean;
};

type TableFormDialogProps = {
  mode: "create" | "edit";
  floors: FloorOption[];
  table?: TableFormValue;
  action: (formData: FormData) => Promise<ActionResult<keyof TableInput>>;
};

function defaultTable(floors: FloorOption[], table?: TableFormValue) {
  return (
    table ?? {
      floorId: floors[0]?.id ?? "",
      number: "",
      seats: "4",
      active: true,
    }
  );
}

export function TableFormDialog({
  mode,
  floors,
  table,
  action,
}: TableFormDialogProps) {
  const router = useRouter();
  const isCreate = mode === "create";
  const title = isCreate ? "New table" : "Edit table";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TableFormValue>(
    defaultTable(floors, table),
  );
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors<keyof TableInput>>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setValues(defaultTable(floors, table));
      setFieldErrors(undefined);
      setServerError(null);
    }
    setOpen(nextOpen);
  }

  function updateValue<TKey extends keyof TableFormValue>(
    key: TKey,
    value: TableFormValue[TKey],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("floorId", values.floorId);
    formData.set("number", values.number);
    formData.set("seats", values.seats);
    formData.set("active", String(values.active));
    setFieldErrors(undefined);
    setServerError(null);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(
          result.message ?? (isCreate ? "Table created." : "Table updated."),
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
            variant={isCreate ? "outline" : "ghost"}
            size={isCreate ? "sm" : "icon-sm"}
            aria-label={title}
            disabled={floors.length === 0}
          />
        }
      >
        {isCreate ? (
          <>
            <Plus className="size-4" />
            Add table
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Tables appear in the POS table selection view.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-table-floor`}>Floor</Label>
            <select
              id={`${mode}-table-floor`}
              value={values.floorId}
              onChange={(event) => updateValue("floorId", event.target.value)}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
              aria-invalid={!!fieldErrors?.floorId?.[0]}
            >
              {floors.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </select>
            {fieldErrors?.floorId?.[0] ? (
              <p className="text-destructive text-sm">
                {fieldErrors.floorId[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-table-number`}>Table number</Label>
              <Input
                id={`${mode}-table-number`}
                value={values.number}
                inputMode="numeric"
                onChange={(event) => updateValue("number", event.target.value)}
                aria-invalid={!!fieldErrors?.number?.[0]}
              />
              {fieldErrors?.number?.[0] ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.number[0]}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-table-seats`}>Seats</Label>
              <Input
                id={`${mode}-table-seats`}
                value={values.seats}
                inputMode="numeric"
                onChange={(event) => updateValue("seats", event.target.value)}
                aria-invalid={!!fieldErrors?.seats?.[0]}
              />
              {fieldErrors?.seats?.[0] ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.seats[0]}
                </p>
              ) : null}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-medium">Active</span>
              <span className="text-muted-foreground block text-xs">
                Inactive tables are hidden from POS selection.
              </span>
            </span>
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
