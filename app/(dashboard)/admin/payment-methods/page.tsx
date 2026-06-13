import { PageHeader } from "@/components/admin/page-header";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PaymentMethodsPanel,
  type PaymentMethodRow,
} from "./payment-methods-panel";

const paymentDefaults = [
  {
    type: "cash",
    label: "Cash",
    description: "Cash received and change due at checkout.",
  },
  {
    type: "card",
    label: "Digital / Card",
    description: "Card, bank, and other reference-based payments.",
  },
  {
    type: "upi",
    label: "UPI QR",
    description: "Dynamic QR generated later from the configured UPI ID.",
  },
] as const;

export default async function PaymentMethodsPage() {
  await requireRole("admin");

  const methods = await db.query.paymentMethods.findMany();
  const byType = new Map(methods.map((method) => [method.type, method]));
  const rows: PaymentMethodRow[] = paymentDefaults.map((method) => {
    const existing = byType.get(method.type);
    return {
      ...method,
      enabled: existing?.enabled ?? false,
      upiId: existing?.upiId ?? "",
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Methods"
        description="Choose which checkout methods appear on the POS payment screen."
      />
      <PaymentMethodsPanel rows={rows} />
    </div>
  );
}
