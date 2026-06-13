"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { validateCoupon } from "@/app/(dashboard)/pos/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTableCart, useCartStore } from "@/lib/pos/cart-store";

type DiscountPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
};

export function DiscountPopup({
  open,
  onOpenChange,
  tableId,
}: DiscountPopupProps) {
  const cart = useTableCart(tableId);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const [code, setCode] = useState(cart.couponCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!scannerOpen || !videoRef.current) return;

    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    setScannerError(null);

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result || cancelled) return;
        const nextCode = extractCouponCode(result.getText());
        setCode(nextCode.toUpperCase());
        setScannerOpen(false);
        toast.success("Coupon QR scanned.");
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch(() => {
        setScannerError("Camera unavailable. Enter the code manually.");
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [scannerOpen]);

  function handleApply() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter a coupon code.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await validateCoupon(trimmed);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setCoupon(tableId, {
        code: result.coupon.code,
        id: result.coupon.id,
        discountType: result.coupon.discountType as "percent" | "fixed",
        value: result.coupon.value,
      });
      toast.success(`Coupon ${result.coupon.code} applied.`);
      onOpenChange(false);
    });
  }

  function handleClear() {
    setCoupon(tableId, null);
    setCode("");
    setError(null);
    toast.success("Coupon removed.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply coupon</DialogTitle>
          <DialogDescription>
            Enter a coupon code. Automated promotions apply automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="coupon-code">Coupon code</Label>
          <Input
            id="coupon-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
          />
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setScannerOpen((current) => !current)}
          >
            {scannerOpen ? "Close scanner" : "Scan QR code"}
          </Button>
          {scannerOpen ? (
            <div className="space-y-2 rounded-lg border p-2">
              <video
                ref={videoRef}
                className="aspect-video w-full rounded-md bg-black"
                muted
                playsInline
              />
              <p className="text-muted-foreground text-xs">
                Point the camera at a coupon QR.
              </p>
              {scannerError ? (
                <p className="text-destructive text-xs">{scannerError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {cart.couponCode ? (
            <Button type="button" variant="outline" onClick={handleClear}>
              Remove
            </Button>
          ) : null}
          <Button type="button" onClick={handleApply} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function extractCouponCode(raw: string) {
  try {
    const url = new URL(raw);
    return url.searchParams.get("code") ?? raw;
  } catch {
    return raw.trim();
  }
}
