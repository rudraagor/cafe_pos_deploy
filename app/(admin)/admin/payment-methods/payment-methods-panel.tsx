"use client";

import { CreditCard, IndianRupee, Loader2, QrCode } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldErrors } from "@/lib/action-result";
import type { PaymentMethodInput } from "@/lib/validations/payment-methods";
import { updatePaymentMethod } from "./actions";

export type PaymentMethodRow = {
  type: "cash" | "card" | "upi";
  label: string;
  description: string;
  enabled: boolean;
  upiId: string;
};

type PaymentMethodsPanelProps = {
  rows: PaymentMethodRow[];
};

const icons = {
  cash: IndianRupee,
  card: CreditCard,
  upi: QrCode,
};

export function PaymentMethodsPanel({ rows }: PaymentMethodsPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {rows.map((row) => (
        <PaymentMethodCard key={row.type} row={row} />
      ))}
    </div>
  );
}

function PaymentMethodCard({ row }: { row: PaymentMethodRow }) {
  const Icon = icons[row.type];
  const [enabled, setEnabled] = useState(row.enabled);
  const [upiId, setUpiId] = useState(row.upiId);
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors<keyof PaymentMethodInput>>();
  const [isPending, startTransition] = useTransition();
  const upiError = fieldErrors?.upiId?.[0];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("type", row.type);
    formData.set("enabled", String(enabled));
    formData.set("upiId", upiId);
    setFieldErrors(undefined);

    startTransition(async () => {
      const result = await updatePaymentMethod(formData);
      if (result.ok) {
        toast.success(result.message ?? "Payment method updated.");
        return;
      }

      setFieldErrors(result.fieldErrors);
      toast.error(result.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="font-medium">{row.label}</h2>
            <p className="text-muted-foreground text-sm">{row.description}</p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          aria-label={`Enable ${row.label}`}
        />
      </div>

      {row.type === "upi" ? (
        <div className="space-y-2">
          <Label htmlFor="upi-id">UPI ID</Label>
          <Input
            id="upi-id"
            value={upiId}
            onChange={(event) => setUpiId(event.target.value)}
            placeholder="cafe@ybl"
            aria-invalid={!!upiError}
            disabled={!enabled}
          />
          {upiError ? (
            <p className="text-destructive text-sm">{upiError}</p>
          ) : null}
        </div>
      ) : (
        <div className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          {enabled
            ? "Visible during checkout."
            : "Hidden from checkout until enabled."}
        </div>
      )}

      <div className="mt-auto flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </form>
  );
}
