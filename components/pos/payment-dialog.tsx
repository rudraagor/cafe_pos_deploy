"use client";

import {
  Banknote,
  Copy,
  CreditCard,
  IndianRupee,
  Loader2,
  QrCode,
} from "lucide-react";
import { useMemo, useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { takePayment } from "@/app/(dashboard)/pos/actions";
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
import { useCartStore } from "@/lib/pos/cart-store";
import { formatMoney } from "@/lib/pos/pricing";
import { useRouter } from "next/navigation";

export type EnabledPaymentMethod = {
  type: "cash" | "card" | "upi";
  enabled: boolean;
  upiId: string | null;
};

type PaymentDialogProps = {
  order: {
    id: string;
    orderNumber: string;
    total: number;
    tableId: string | null;
  };
  methods: EnabledPaymentMethod[];
  upiQrDataUrl?: string | null;
  upiPaymentUrl?: string | null;
  defaultOpen?: boolean;
  trigger?: ReactElement;
};

const methodLabels = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
} satisfies Record<EnabledPaymentMethod["type"], string>;

const methodIcons = {
  cash: Banknote,
  card: CreditCard,
  upi: QrCode,
} satisfies Record<EnabledPaymentMethod["type"], typeof Banknote>;

export function PaymentDialog({
  order,
  methods,
  upiQrDataUrl,
  upiPaymentUrl,
  defaultOpen = false,
  trigger,
}: PaymentDialogProps) {
  const router = useRouter();
  const clearTable = useCartStore((s) => s.clearTable);
  const visibleMethods = methods.filter((method) => method.enabled);
  const [open, setOpen] = useState(defaultOpen);
  const [method, setMethod] = useState<EnabledPaymentMethod["type"]>(
    visibleMethods[0]?.type ?? "cash",
  );
  const [tendered, setTendered] = useState(order.total.toFixed(2));
  const [reference, setReference] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedType = visibleMethods.some((row) => row.type === method)
    ? method
    : (visibleMethods[0]?.type ?? "cash");
  const selectedMethod = visibleMethods.find((row) => row.type === selectedType);
  const numericTendered = Number(tendered || 0);
  const changeDue = selectedType === "cash" ? numericTendered - order.total : 0;
  const quickAmounts = useMemo(() => {
    const total = order.total;
    const rounded10 = Math.ceil(total / 10) * 10;
    const rounded50 = Math.ceil(total / 50) * 50;
    const rounded100 = Math.ceil(total / 100) * 100;
    return [...new Set([total, rounded10, rounded50, rounded100])]
      .filter((amount) => amount >= total)
      .slice(0, 4);
  }, [order.total]);

  function submit() {
    setFieldError(null);
    startTransition(async () => {
      const result = await takePayment({
        orderId: order.id,
        method: selectedType,
        tendered: selectedType === "cash" ? numericTendered : undefined,
        reference: selectedType === "card" ? reference : undefined,
      });

      if (!result.ok) {
        setFieldError(result.fieldErrors?.tendered?.[0] ?? null);
        toast.error(result.error);
        return;
      }

      if (order.tableId) clearTable(order.tableId);
      toast.success(result.message ?? "Payment recorded.");
      if (result.emailMessage && !result.emailSent) {
        toast.info(result.emailMessage);
      }
      setOpen(false);
      router.replace(`/pos/orders/${order.id}`);
      router.refresh();
    });
  }

  const disabled =
    visibleMethods.length === 0 ||
    !selectedMethod ||
    (selectedType === "cash" && changeDue < 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>
            {order.orderNumber} · {formatMoney(order.total)}
          </DialogDescription>
        </DialogHeader>

        {visibleMethods.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No payment methods are enabled. Enable cash, card, or UPI from Admin.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {visibleMethods.map((row) => {
                const Icon = methodIcons[row.type];
                return (
                  <Button
                    key={row.type}
                    type="button"
                    variant={selectedType === row.type ? "default" : "outline"}
                    onClick={() => setMethod(row.type)}
                    className="h-12 flex-col gap-1"
                  >
                    <Icon className="size-4" />
                    {methodLabels[row.type]}
                  </Button>
                );
              })}
            </div>

            {selectedType === "cash" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cash-tendered">Cash received</Label>
                  <div className="relative">
                    <IndianRupee className="text-muted-foreground absolute top-2 left-2 size-4" />
                    <Input
                      id="cash-tendered"
                      type="number"
                      min={0}
                      step="0.01"
                      value={tendered}
                      onChange={(event) => setTendered(event.target.value)}
                      className="pl-8"
                      aria-invalid={!!fieldError || changeDue < 0}
                    />
                  </div>
                  {fieldError ? (
                    <p className="text-destructive text-xs">{fieldError}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTendered(amount.toFixed(2))}
                    >
                      {formatMoney(amount)}
                    </Button>
                  ))}
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Change due</p>
                  <p className="text-2xl font-semibold">
                    {formatMoney(Math.max(changeDue, 0))}
                  </p>
                </div>
              </div>
            ) : null}

            {selectedType === "upi" ? (
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <div className="rounded-lg border bg-white p-2">
                  {upiQrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={upiQrDataUrl}
                      alt="UPI payment QR"
                      className="size-full"
                    />
                  ) : (
                    <div className="text-muted-foreground flex aspect-square items-center justify-center text-xs">
                      QR unavailable
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Scan to pay</p>
                  <p className="text-muted-foreground">
                    Amount: {formatMoney(order.total)}
                  </p>
                  <p className="text-muted-foreground break-all">
                    {selectedMethod?.upiId}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!upiPaymentUrl}
                    onClick={() => {
                      if (!upiPaymentUrl) return;
                      navigator.clipboard.writeText(upiPaymentUrl);
                      toast.success("UPI link copied.");
                    }}
                  >
                    <Copy className="size-4" />
                    Copy UPI link
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedType === "card" ? (
              <div className="space-y-2">
                <Label htmlFor="card-reference">Reference</Label>
                <Input
                  id="card-reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Optional transaction reference"
                />
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter showCloseButton>
          <Button type="button" onClick={submit} disabled={disabled || isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <IndianRupee className="size-4" />
            )}
            Mark paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
