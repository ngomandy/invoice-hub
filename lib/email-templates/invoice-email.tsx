import {
  Body, Container, Head, Heading, Html, Preview, Row, Column,
  Section, Text, Hr, Button,
} from "@react-email/components";
import * as React from "react";

type LineItem = {
  description: string;
  quantity:    number;
  unit_price:  number;
  tax_rate:    number;
};

type Props = {
  invoiceNumber: string;
  companyName:   string;
  clientName:    string;
  issueDate:     string;
  dueDate:       string;
  lineItems:     LineItem[];
  subtotal:      number;
  taxAmount:     number;
  total:         number;
  notes?:        string | null;
  viewUrl:       string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function InvoiceEmail({
  invoiceNumber, companyName, clientName, issueDate, dueDate,
  lineItems, subtotal, taxAmount, total, notes, viewUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} from {companyName} — {fmt(total)} due {dueDate}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden", margin: "0 auto" }}>

          {/* Header */}
          <Section style={{ backgroundColor: "#3b82f6", padding: "24px 32px" }}>
            <Heading style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: 0 }}>
              Invoice {invoiceNumber}
            </Heading>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, margin: "4px 0 0" }}>
              From {companyName}
            </Text>
          </Section>

          {/* Meta */}
          <Section style={{ padding: "24px 32px 0" }}>
            <Row>
              <Column style={{ width: "50%" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Bill To</Text>
                <Text style={{ fontSize: 14, color: "#0f172a", fontWeight: 600, margin: 0 }}>{clientName}</Text>
              </Column>
              <Column style={{ width: "25%", textAlign: "right" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Issued</Text>
                <Text style={{ fontSize: 13, color: "#0f172a", margin: 0 }}>{issueDate}</Text>
              </Column>
              <Column style={{ width: "25%", textAlign: "right" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Due</Text>
                <Text style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, margin: 0 }}>{dueDate}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={{ borderColor: "#e2e8f0", margin: "20px 0" }} />

          {/* Line items */}
          <Section style={{ padding: "0 32px" }}>
            {/* Header row */}
            <Row style={{ marginBottom: 8 }}>
              <Column style={{ width: "55%" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Description</Text>
              </Column>
              <Column style={{ width: "15%", textAlign: "right" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Qty</Text>
              </Column>
              <Column style={{ width: "15%", textAlign: "right" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Price</Text>
              </Column>
              <Column style={{ width: "15%", textAlign: "right" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Amount</Text>
              </Column>
            </Row>
            {lineItems.map((item, i) => (
              <Row key={i} style={{ marginBottom: 6 }}>
                <Column style={{ width: "55%" }}>
                  <Text style={{ fontSize: 13, color: "#0f172a", margin: 0 }}>{item.description}</Text>
                </Column>
                <Column style={{ width: "15%", textAlign: "right" }}>
                  <Text style={{ fontSize: 13, color: "#475569", margin: 0, fontFamily: "monospace" }}>{item.quantity}</Text>
                </Column>
                <Column style={{ width: "15%", textAlign: "right" }}>
                  <Text style={{ fontSize: 13, color: "#475569", margin: 0, fontFamily: "monospace" }}>{fmt(item.unit_price)}</Text>
                </Column>
                <Column style={{ width: "15%", textAlign: "right" }}>
                  <Text style={{ fontSize: 13, color: "#0f172a", margin: 0, fontFamily: "monospace" }}>{fmt(item.quantity * item.unit_price)}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={{ borderColor: "#e2e8f0", margin: "16px 0" }} />

          {/* Totals */}
          <Section style={{ padding: "0 32px 8px" }}>
            {taxAmount > 0 && (
              <Row style={{ marginBottom: 4 }}>
                <Column style={{ width: "75%" }} />
                <Column style={{ width: "12%", textAlign: "right" }}>
                  <Text style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Subtotal</Text>
                </Column>
                <Column style={{ width: "13%", textAlign: "right" }}>
                  <Text style={{ fontSize: 12, color: "#0f172a", margin: 0, fontFamily: "monospace" }}>{fmt(subtotal)}</Text>
                </Column>
              </Row>
            )}
            {taxAmount > 0 && (
              <Row style={{ marginBottom: 8 }}>
                <Column style={{ width: "75%" }} />
                <Column style={{ width: "12%", textAlign: "right" }}>
                  <Text style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Tax</Text>
                </Column>
                <Column style={{ width: "13%", textAlign: "right" }}>
                  <Text style={{ fontSize: 12, color: "#0f172a", margin: 0, fontFamily: "monospace" }}>{fmt(taxAmount)}</Text>
                </Column>
              </Row>
            )}
            <Row>
              <Column style={{ width: "65%" }} />
              <Column style={{ width: "35%", textAlign: "right", backgroundColor: "#f8fafc", padding: "10px 0", borderRadius: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "monospace" }}>
                  Total: {fmt(total)}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Notes */}
          {notes && (
            <Section style={{ padding: "0 32px 16px" }}>
              <Text style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", margin: 0 }}>{notes}</Text>
            </Section>
          )}

          {/* CTA */}
          <Section style={{ padding: "16px 32px 32px", textAlign: "center" }}>
            <Button
              href={viewUrl}
              style={{ backgroundColor: "#3b82f6", color: "#ffffff", fontSize: 13, fontWeight: 600, padding: "12px 28px", borderRadius: 6, textDecoration: "none" }}
            >
              View Invoice →
            </Button>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
