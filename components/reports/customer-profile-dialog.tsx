"use client";

import { Loader2, Mail, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchCustomerProfile } from "@/app/(dashboard)/admin/reports/marketing-actions";
import { SendCouponDialog } from "@/components/reports/send-coupon-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/pos/pricing";
import {
  formatReportDateTime,
  type ReportSearchParams,
} from "@/lib/reports/range";

type CustomerProfileDialogProps = {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: ReportSearchParams;
};

export function CustomerProfileDialog({
  customerId,
  open,
  onOpenChange,
  params,
}: CustomerProfileDialogProps) {
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof fetchCustomerProfile>
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    if (!open || !customerId) return;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setProfile(null);

      try {
        const result = await fetchCustomerProfile(
          customerId,
          JSON.parse(paramsKey) as ReportSearchParams,
        );
        if (!cancelled) setProfile(result);
      } catch {
        if (!cancelled) {
          setProfile({ ok: false, error: "Could not load customer profile." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, customerId, paramsKey]);

  const data = open && profile?.ok ? profile : null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) {
            setProfile(null);
            setLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{data?.profile.name ?? "Customer profile"}</DialogTitle>
            <DialogDescription>
              Contact details and order activity for the selected filter range.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading profile…
            </div>
          ) : profile && !profile.ok ? (
            <p className="text-destructive text-sm">{profile.error}</p>
          ) : data ? (
            <div className="space-y-4 text-sm">
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                <ProfileField label="Email" value={data.profile.email ?? "Not provided"} />
                <ProfileField label="Phone" value={data.profile.phone ?? "Not provided"} />
                <ProfileField label="Orders" value={String(data.profile.orderCount)} />
                <ProfileField
                  label="Spend"
                  value={formatMoney(data.profile.totalSpend)}
                />
                <ProfileField
                  label="Last order"
                  value={
                    data.profile.lastOrderAt
                      ? formatReportDateTime(data.profile.lastOrderAt)
                      : "—"
                  }
                />
                <ProfileField
                  label="Favorite item"
                  value={data.profile.favoriteProduct ?? "—"}
                />
              </div>
              {data.history.length > 0 ? (
                <div>
                  <p className="mb-2 font-medium">Recent orders</p>
                  <ul className="space-y-1">
                    {data.history.map((order) => (
                      <li
                        key={order.id}
                        className="flex justify-between gap-2 rounded-md border px-2 py-1.5"
                      >
                        <span>{order.orderNumber}</span>
                        <span className="text-muted-foreground">
                          {formatMoney(order.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            {customerId && data ? (
              <Button type="button" onClick={() => setCouponOpen(true)}>
                <Tag className="size-4" />
                Send coupon
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {customerId && data ? (
        <SendCouponDialog
          open={couponOpen}
          onOpenChange={setCouponOpen}
          customer={{ id: customerId, name: data.profile.name }}
        />
      ) : null}
    </>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium break-all">{value}</p>
    </div>
  );
}

export function CustomerNameButton({
  customerId,
  name,
  onClick,
}: {
  customerId: string | null;
  name: string;
  onClick: (customerId: string) => void;
}) {
  if (!customerId || name === "Walk-in") {
    return <span>{name}</span>;
  }
  return (
    <button
      type="button"
      className="text-primary hover:underline"
      onClick={() => onClick(customerId)}
    >
      {name}
    </button>
  );
}

export function SendCouponQuickAction({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Mail className="size-3.5" />
        Send coupon
      </Button>
      <SendCouponDialog
        open={open}
        onOpenChange={setOpen}
        customer={{ id: customerId, name: customerName }}
      />
    </>
  );
}
