import { Resend } from "resend";
import { ReservationConfirmationEmail } from "@/emails/reservation-confirmation-email";
import { getReceiptBrand } from "@/lib/receipt-brand";
import { formatReportDateTime } from "@/lib/reports/range";

export type ReservationEmailResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

export async function sendReservationConfirmation(input: {
  customerName: string;
  customerEmail: string;
  startAt: Date;
  durationMinutes: number;
  tableLabels: string;
  partySize: number;
}): Promise<ReservationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return {
      ok: true,
      skipped: true,
      reason: "Email is not configured (RESEND_API_KEY / RESEND_FROM).",
    };
  }

  const brand = getReceiptBrand();
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: input.customerEmail.trim(),
      subject: `${brand.name}: reservation confirmed`,
      react: ReservationConfirmationEmail({
        brandName: brand.name,
        customerName: input.customerName,
        startLabel: formatReportDateTime(input.startAt),
        durationMinutes: input.durationMinutes,
        tableLabels: input.tableLabels,
        partySize: input.partySize,
      }),
    });
    return { ok: true };
  } catch (error) {
    console.error("Reservation confirmation email failed", error);
    return { ok: false, error: "Reservation email failed to send." };
  }
}
