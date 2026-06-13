"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  listActiveCoupons,
  sendCouponOffer,
} from "@/app/(admin)/admin/reports/marketing-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CouponOption = {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  value: number;
};

export function SendCouponDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: { id: string; name: string };
}) {
  const [coupons, setCoupons] = useState<CouponOption[]>([]);
  const [couponId, setCouponId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    listActiveCoupons()
      .then((rows) => {
        setCoupons(rows);
        setCouponId(rows[0]?.id ?? "");
        if (rows.length === 0) {
          toast.error("No active coupons. Create one under Admin → Coupons.");
        }
      })
      .catch(() => {
        toast.error("Could not load coupons.");
      });
  }, [open]);

  function submit() {
    if (!couponId) {
      toast.error("Select a coupon first.");
      return;
    }
    startTransition(async () => {
      const result = await sendCouponOffer({
        customerId: customer.id,
        couponId,
        message,
      });
      if (result.ok) {
        toast.success(`Coupon sent to ${customer.name}.`);
        onOpenChange(false);
        setMessage("");
      } else {
        toast.error(result.error);
      }
    });
  }

  const selected = coupons.find((coupon) => coupon.id === couponId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send coupon offer</DialogTitle>
          <DialogDescription>
            Email an active coupon code to {customer.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="coupon-select">Coupon</Label>
            <select
              id="coupon-select"
              value={couponId}
              onChange={(event) => setCouponId(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              {coupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.code} (
                  {coupon.discountType === "percent"
                    ? `${coupon.value}%`
                    : `₹${coupon.value}`}
                  )
                </option>
              ))}
            </select>
          </div>

          {selected ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              Preview: code <strong>{selected.code}</strong>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="coupon-message">Personal message (optional)</Label>
            <Textarea
              id="coupon-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Thanks for visiting us this week…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !couponId}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
