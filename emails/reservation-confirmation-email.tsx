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

type ReservationConfirmationEmailProps = {
  brandName: string;
  customerName: string;
  startLabel: string;
  durationMinutes: number;
  tableLabels: string;
  partySize: number;
};

export function ReservationConfirmationEmail({
  brandName,
  customerName,
  startLabel,
  durationMinutes,
  tableLabels,
  partySize,
}: ReservationConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your reservation at {brandName} is confirmed</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>{brandName}</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>Your reservation is confirmed.</Text>
          <Section style={box}>
            <Text style={label}>Time</Text>
            <Text style={value}>{startLabel}</Text>
            <Text style={label}>Table</Text>
            <Text style={value}>{tableLabels}</Text>
            <Text style={label}>Party size</Text>
            <Text style={value}>{partySize}</Text>
            <Text style={label}>Expected duration</Text>
            <Text style={value}>{durationMinutes} minutes</Text>
          </Section>
          <Text style={text}>
            We will hold the table for 30 minutes after your reservation time.
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
const box = {
  backgroundColor: "#f1f5f9",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};
const label = { fontSize: "12px", color: "#64748b", margin: "12px 0 4px" };
const value = { fontSize: "16px", color: "#0f172a", fontWeight: "700", margin: 0 };
