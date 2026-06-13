import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { formatMoney } from "@/lib/pos/pricing";

type ReceiptEmailProps = {
  brandName: string;
  customerName: string;
  orderNumber: string;
  total: number;
  receiptUrl: string;
  prepMinutes: number;
};

export function ReceiptEmail({
  brandName,
  customerName,
  orderNumber,
  total,
  receiptUrl,
  prepMinutes,
}: ReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your receipt for {orderNumber} from {brandName}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>{brandName}</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Thanks for visiting. Your order {orderNumber} is paid.
          </Text>
          <Text style={text}>
            Order received. It should be ready within about {prepMinutes} minutes.
          </Text>
          <Section style={totalBox}>
            <Text style={label}>Total paid</Text>
            <Text style={totalText}>{formatMoney(total)}</Text>
          </Section>
          <Link href={receiptUrl} style={button}>
            View digital receipt
          </Link>
          <Text style={muted}>
            If the button does not work, open this link: {receiptUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f7f9",
  fontFamily: "Arial, sans-serif",
  margin: 0,
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  margin: "32px auto",
  padding: 24,
  width: "420px",
};

const heading = { color: "#111827", fontSize: 24, margin: "0 0 16px" };
const text = { color: "#374151", fontSize: 14, lineHeight: "22px" };
const muted = { color: "#6b7280", fontSize: 12, lineHeight: "18px" };
const totalBox = {
  backgroundColor: "#f9fafb",
  borderRadius: 8,
  margin: "20px 0",
  padding: 16,
};
const label = { color: "#6b7280", fontSize: 12, margin: "0 0 4px" };
const totalText = {
  color: "#111827",
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
};
const button = {
  backgroundColor: "#111827",
  borderRadius: 6,
  color: "#ffffff",
  display: "inline-block",
  fontSize: 14,
  fontWeight: 700,
  padding: "12px 16px",
  textDecoration: "none",
};
