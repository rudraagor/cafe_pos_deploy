"use client";

import {
  Banknote,
  Copy,
  CreditCard,
  IndianRupee,
  Loader2,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { takePayment, takeSplitPayment } from "@/app/(dashboard)/pos/actions";
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

type SplitLine = {
  id: string;
  method: EnabledPaymentMethod["type"];
  amount: string;
  tendered: string;
  reference: string;
};

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
  const [splitMode, setSplitMode] = useState(false);
  const [splitLines, setSplitLines] = useState<SplitLine[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedType = visibleMethods.some((row) => row.type === method)
    ? method
    : (visibleMethods[0]?.type ?? "cash");
  const selectedMethod = visibleMethods.find(
    (row) => row.type === selectedType,
  );
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
  const splitTotal = useMemo(
    () => splitLines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
    [splitLines],
  );
  const splitRemaining = Math.round((order.total - splitTotal) * 100) / 100;

  function submit() {
    setFieldError(null);
    startTransition(async () => {
      const result = splitMode
        ? await takeSplitPayment({
            orderId: order.id,
            payments: splitLines.map((line) => ({
              method: line.method,
              amount: Number(line.amount || 0),
              tendered:
                line.method === "cash" ? Number(line.tendered || 0) : undefined,
              reference:
                line.method === "card" || line.method === "upi"
                  ? line.reference
                  : undefined,
            })),
          })
        : await takePayment({
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
    (splitMode
      ? splitLines.length === 0 ||
        Math.abs(splitRemaining) > 0.009 ||
        splitLines.some(
          (line) =>
            Number(line.amount || 0) <= 0 ||
            (line.method === "cash" &&
              Number(line.tendered || 0) < Number(line.amount || 0)),
        )
      : selectedType === "cash" && changeDue < 0);

  function addSplitLine(
    methodType: EnabledPaymentMethod["type"] = selectedType,
  ) {
    setSplitLines((lines) => {
      const nextLines = [
        ...lines,
        {
          id: crypto.randomUUID(),
          method: methodType,
          amount: "0.00",
          tendered: "0.00",
          reference: "",
        },
      ];
      return rebalanceSplitLines(nextLines, order.total);
    });
    setSplitMode(true);
  }

  function rebalanceSplitLines(lines: SplitLine[], total: number) {
    const baseAmount = Math.floor((total / lines.length) * 100) / 100;
    return lines.map((line, index) => {
      const amount =
        index === lines.length - 1
          ? total - baseAmount * (lines.length - 1)
          : baseAmount;
      return {
        ...line,
        amount: amount.toFixed(2),
        tendered: line.method === "cash" ? amount.toFixed(2) : line.tendered,
      };
    });
  }

  function makeSplitLines(shares: number) {
    return rebalanceSplitLines(
      Array.from({ length: shares }, () => ({
        id: crypto.randomUUID(),
        method: selectedType,
        amount: "0.00",
        tendered: "0.00",
        reference: "",
      })),
      order.total,
    );
  }

  function updateSplitLine(id: string, patch: Partial<SplitLine>) {
    setSplitLines((lines) =>
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeSplitLine(id: string) {
    setSplitLines((lines) => lines.filter((line) => line.id !== id));
  }

  function splitEqually(shares: number) {
    setSplitLines(makeSplitLines(shares));
    setSplitMode(true);
  }

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
          <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No payment methods are enabled. Enable cash, card, or UPI from
            Admin.
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

            <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">Split payment</p>
                <p className="text-muted-foreground text-xs">
                  Mix cash, card, and UPI on one bill.
                </p>
              </div>
              <Button
                type="button"
                variant={splitMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (splitMode) {
                    setSplitMode(false);
                    setSplitLines([]);
                  } else {
                    addSplitLine();
                  }
                }}
              >
                {splitMode ? "Use single" : "Split"}
              </Button>
            </div>

            {splitMode ? (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Payment lines</p>
                  <div className="flex flex-wrap gap-1">
                    {[2, 3, 4].map((shares) => (
                      <Button
                        key={shares}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => splitEqually(shares)}
                      >
                        {shares}-way
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSplitLine()}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {splitLines.map((line) => (
                    <div
                      key={line.id}
                      className="grid gap-2 rounded-md border p-2 sm:grid-cols-[110px_1fr_1fr_auto]"
                    >
                      <div className="space-y-1">
                        <Label
                          htmlFor={`split-method-${line.id}`}
                          className="text-muted-foreground text-[11px]"
                        >
                          Method
                        </Label>
                        <select
                          id={`split-method-${line.id}`}
                          value={line.method}
                          onChange={(event) =>
                            updateSplitLine(line.id, {
                              method: event.target
                                .value as EnabledPaymentMethod["type"],
                            })
                          }
                          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                        >
                          {visibleMethods.map((row) => (
                            <option key={row.type} value={row.type}>
                              {methodLabels[row.type]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`split-amount-${line.id}`}
                          className="text-muted-foreground text-[11px]"
                        >
                          Amount
                        </Label>
                        <Input
                          id={`split-amount-${line.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.amount}
                          onChange={(event) =>
                            updateSplitLine(line.id, {
                              amount: event.target.value,
                              tendered:
                                line.method === "cash"
                                  ? event.target.value
                                  : line.tendered,
                            })
                          }
                          placeholder="Amount"
                        />
                      </div>
                      {line.method === "cash" ? (
                        <div className="space-y-1">
                          <Label
                            htmlFor={`split-tendered-${line.id}`}
                            className="text-muted-foreground text-[11px]"
                          >
                            Cash received
                          </Label>
                          <Input
                            id={`split-tendered-${line.id}`}
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.tendered}
                            onChange={(event) =>
                              updateSplitLine(line.id, {
                                tendered: event.target.value,
                              })
                            }
                            placeholder="Cash received"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label
                            htmlFor={`split-reference-${line.id}`}
                            className="text-muted-foreground text-[11px]"
                          >
                            Reference
                          </Label>
                          <Input
                            id={`split-reference-${line.id}`}
                            value={line.reference}
                            onChange={(event) =>
                              updateSplitLine(line.id, {
                                reference: event.target.value,
                              })
                            }
                            placeholder={`${methodLabels[line.method]} ref`}
                          />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="self-end"
                        onClick={() => removeSplitLine(line.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted rounded-md p-2">
                    <p className="text-muted-foreground text-xs">Assigned</p>
                    <p className="font-semibold">{formatMoney(splitTotal)}</p>
                  </div>
                  <div className="bg-muted rounded-md p-2">
                    <p className="text-muted-foreground text-xs">Remaining</p>
                    <p className="font-semibold">
                      {formatMoney(Math.max(splitRemaining, 0))}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {!splitMode && selectedType === "cash" ? (
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

            {!splitMode && selectedType === "upi" ? (
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

            {!splitMode && selectedType === "card" ? (
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
          <Button
            type="button"
            onClick={submit}
            disabled={disabled || isPending}
          >
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
