import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type CouponOfferEmailProps = {
  brandName: string;
  customerName: string;
  couponCode: string;
  discountLabel: string;
  personalMessage?: string;
};

export function CouponOfferEmail({
  brandName,
  customerName,
  couponCode,
  discountLabel,
  personalMessage,
}: CouponOfferEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>A special offer from {brandName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>{brandName}</Heading>
          <Text style={text}>Hi {customerName},</Text>
          {personalMessage ? <Text style={text}>{personalMessage}</Text> : null}
          <Section style={codeBox}>
            <Text style={codeLabel}>Your coupon code</Text>
            <Text style={codeValue}>{couponCode}</Text>
            <Text style={discount}>{discountLabel}</Text>
          </Section>
          <Text style={text}>
            Show this code on your next visit. We look forward to serving you again.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" };
const container = {
  margin: "0 auto",
  padding: "24px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
};
const heading = { fontSize: "24px", lineHeight: "32px", marginBottom: "16px" };
const text = { fontSize: "14px", lineHeight: "22px", color: "#334155" };
const codeBox = {
  backgroundColor: "#f1f5f9",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};
const codeLabel = { fontSize: "12px", color: "#64748b", margin: "0 0 4px" };
const codeValue = {
  fontSize: "28px",
  fontWeight: "700",
  letterSpacing: "2px",
  margin: "0 0 8px",
};
const discount = { fontSize: "14px", color: "#0f172a", margin: 0 };
