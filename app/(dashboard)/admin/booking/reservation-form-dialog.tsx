"use client";

import { CalendarPlus, Loader2, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { ReservationInput } from "@/lib/validations/booking";
import type { BookingFloor } from "./booking-management";

export type ReservationFormValue = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: string;
  startAt: string;
  durationMinutes: string;
  tableIds: string[];
  notes: string;
};

type ReservationFormDialogProps = {
  mode: "create" | "edit";
  floors: BookingFloor[];
  reservation?: ReservationFormValue;
  action: (formData: FormData) => Promise<ActionResult<keyof ReservationInput>>;
};

function formatDateTimeLocal(date = new Date()) {
  const next = new Date(date.getTime() + 30 * 60000);
  next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
}

function defaultReservation(reservation?: ReservationFormValue) {
  return (
    reservation ?? {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      partySize: "2",
      startAt: formatDateTimeLocal(),
      durationMinutes: "90",
      tableIds: [],
      notes: "",
    }
  );
}

export function ReservationFormDialog({
  mode,
  floors,
  reservation,
  action,
}: ReservationFormDialogProps) {
  const router = useRouter();
  const isCreate = mode === "create";
  const title = isCreate ? "New reservation" : "Edit reservation";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(defaultReservation(reservation));
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors<keyof ReservationInput>>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setValues(defaultReservation(reservation));
      setFieldErrors(undefined);
      setServerError(null);
    }
    setOpen(nextOpen);
  }

  function updateValue<TKey extends keyof ReservationFormValue>(
    key: TKey,
    value: ReservationFormValue[TKey],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleTable(tableId: string) {
    updateValue(
      "tableIds",
      values.tableIds.includes(tableId)
        ? values.tableIds.filter((id) => id !== tableId)
        : [...values.tableIds, tableId],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("customerName", values.customerName);
    formData.set("customerEmail", values.customerEmail);
    formData.set("customerPhone", values.customerPhone);
    formData.set("partySize", values.partySize);
    formData.set("startAt", values.startAt);
    formData.set("durationMinutes", values.durationMinutes);
    formData.set("notes", values.notes);
    values.tableIds.forEach((tableId) => formData.append("tableIds", tableId));
    setFieldErrors(undefined);
    setServerError(null);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(result.message ?? "Reservation saved.");
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
            size={isCreate ? "sm" : "icon-sm"}
            aria-label={title}
          />
        }
      >
        {isCreate ? (
          <>
            <CalendarPlus className="size-4" />
            Add reservation
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Reserve one or more tables for a customer and send confirmation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" error={fieldErrors?.customerName?.[0]}>
              <Input
                value={values.customerName}
                onChange={(event) =>
                  updateValue("customerName", event.target.value)
                }
                aria-invalid={!!fieldErrors?.customerName?.[0]}
              />
            </Field>
            <Field label="Email" error={fieldErrors?.customerEmail?.[0]}>
              <Input
                type="email"
                value={values.customerEmail}
                onChange={(event) =>
                  updateValue("customerEmail", event.target.value)
                }
                aria-invalid={!!fieldErrors?.customerEmail?.[0]}
              />
            </Field>
            <Field label="Phone" error={fieldErrors?.customerPhone?.[0]}>
              <Input
                value={values.customerPhone}
                onChange={(event) =>
                  updateValue("customerPhone", event.target.value)
                }
                aria-invalid={!!fieldErrors?.customerPhone?.[0]}
              />
            </Field>
            <Field label="Party size" error={fieldErrors?.partySize?.[0]}>
              <Input
                value={values.partySize}
                inputMode="numeric"
                onChange={(event) => updateValue("partySize", event.target.value)}
                aria-invalid={!!fieldErrors?.partySize?.[0]}
              />
            </Field>
            <Field label="Start time" error={fieldErrors?.startAt?.[0]}>
              <Input
                type="datetime-local"
                value={values.startAt}
                onChange={(event) => updateValue("startAt", event.target.value)}
                aria-invalid={!!fieldErrors?.startAt?.[0]}
              />
            </Field>
            <Field
              label="Duration minutes"
              error={fieldErrors?.durationMinutes?.[0]}
            >
              <Input
                value={values.durationMinutes}
                inputMode="numeric"
                onChange={(event) =>
                  updateValue("durationMinutes", event.target.value)
                }
                aria-invalid={!!fieldErrors?.durationMinutes?.[0]}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Tables</Label>
            <div className="max-h-52 space-y-3 overflow-y-auto rounded-lg border p-3">
              {floors.map((floor) => (
                <div key={floor.id}>
                  <p className="mb-2 text-sm font-medium">{floor.name}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {floor.tables.map((table) => (
                      <label
                        key={table.id}
                        className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={values.tableIds.includes(table.id)}
                          onChange={() => toggleTable(table.id)}
                        />
                        T{table.number}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {fieldErrors?.tableIds?.[0] ? (
              <p className="text-destructive text-sm">
                {fieldErrors.tableIds[0]}
              </p>
            ) : null}
          </div>

          <Field label="Notes" error={fieldErrors?.notes?.[0]}>
            <Textarea
              value={values.notes}
              onChange={(event) => updateValue("notes", event.target.value)}
              aria-invalid={!!fieldErrors?.notes?.[0]}
            />
          </Field>

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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
