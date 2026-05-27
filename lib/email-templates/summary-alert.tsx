import {
  Body, Container, Head, Heading, Html, Preview, Row, Column,
  Section, Text, Hr, Link,
} from "@react-email/components";
import * as React from "react";

type ClientSummary = {
  name:        string;
  expected:    number | null;
  billed:      number | null;
  variance:    number | null;
  hasClose:    boolean;
  hasBilled:   boolean;
};

type Props = {
  month:          string;         // "May 2026"
  totalExpected:  number;
  totalBilled:    number;
  netVariance:    number;
  closedCount:    number;
  totalClients:   number;
  missingClose:   string[];       // client names missing close
  missingBilled:  string[];       // client names missing billed
  topVariances:   ClientSummary[];// top 5 by |variance|
  sentBy:         string;
  appUrl:         string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function SummaryAlertEmail({
  month, totalExpected, totalBilled, netVariance,
  closedCount, totalClients, missingClose, missingBilled,
  topVariances, sentBy, appUrl,
}: Props) {
  const varianceColor = netVariance > 0 ? "#ef4444" : netVariance < 0 ? "#f59e0b" : "#22c55e";
  const varianceLabel = netVariance > 0 ? "Overbilled" : netVariance < 0 ? "Underbilled" : "On target";

  return (
    <Html>
      <Head />
      <Preview>[Invoice Hub] Monthly Summary — {month}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden", margin: "0 auto" }}>

          {/* Header */}
          <Section style={{ backgroundColor: "#3b82f6", padding: "24px 32px" }}>
            <Heading style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: 0 }}>
              Monthly Close Summary
            </Heading>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, margin: "4px 0 0" }}>
              {month} · Sent by {sentBy}
            </Text>
          </Section>

          {/* Headline metrics */}
          <Section style={{ padding: "24px 32px 0" }}>
            <Row>
              <Column style={{ textAlign: "center", padding: "0 8px" }}>
                <Text style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", margin: "0 0 4px" }}>Expected</Text>
                <Text style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>{fmt(totalExpected)}</Text>
              </Column>
              <Column style={{ textAlign: "center", padding: "0 8px" }}>
                <Text style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", margin: "0 0 4px" }}>Billed</Text>
                <Text style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>{fmt(totalBilled)}</Text>
              </Column>
              <Column style={{ textAlign: "center", padding: "0 8px" }}>
                <Text style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", margin: "0 0 4px" }}>Net Variance</Text>
                <Text style={{ fontSize: 22, fontWeight: 700, color: varianceColor, margin: 0 }}>
                  {netVariance > 0 ? "+" : ""}{fmt(netVariance)}
                </Text>
                <Text style={{ fontSize: 11, color: varianceColor, margin: "2px 0 0" }}>{varianceLabel}</Text>
              </Column>
              <Column style={{ textAlign: "center", padding: "0 8px" }}>
                <Text style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", margin: "0 0 4px" }}>Closes</Text>
                <Text style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>{closedCount}/{totalClients}</Text>
                <Text style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>clients</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={{ borderColor: "#e2e8f0", margin: "24px 0" }} />

          {/* Warnings */}
          {missingClose.length > 0 && (
            <Section style={{ padding: "0 32px 16px" }}>
              <Text style={{ fontSize: 13, fontWeight: 600, color: "#92400e", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "10px 14px", margin: 0 }}>
                ⚠ {missingClose.length} client{missingClose.length !== 1 ? "s" : ""} missing closes:{" "}
                {missingClose.join(", ")}
              </Text>
            </Section>
          )}
          {missingBilled.length > 0 && (
            <Section style={{ padding: "0 32px 16px" }}>
              <Text style={{ fontSize: 13, fontWeight: 600, color: "#7f1d1d", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", margin: 0 }}>
                ✕ {missingBilled.length} client{missingBilled.length !== 1 ? "s" : ""} missing billed amounts:{" "}
                {missingBilled.join(", ")}
              </Text>
            </Section>
          )}

          {/* Top variances */}
          {topVariances.length > 0 && (
            <Section style={{ padding: "0 32px 24px" }}>
              <Text style={{ fontSize: 13, fontWeight: 600, color: "#475569", margin: "0 0 12px" }}>
                Notable Variances
              </Text>
              {topVariances.map((c, i) => (
                <Row key={i} style={{ marginBottom: 8 }}>
                  <Column style={{ width: "45%" }}>
                    <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, margin: 0 }}>{c.name}</Text>
                  </Column>
                  <Column style={{ width: "25%", textAlign: "right" }}>
                    <Text style={{ fontSize: 12, color: "#475569", margin: 0, fontFamily: "monospace" }}>
                      {c.expected != null ? fmt(c.expected) : "—"}
                    </Text>
                  </Column>
                  <Column style={{ width: "30%", textAlign: "right" }}>
                    <Text style={{ fontSize: 12, color: c.variance != null ? (c.variance > 0 ? "#ef4444" : c.variance < 0 ? "#f59e0b" : "#22c55e") : "#94a3b8", fontWeight: 600, margin: 0, fontFamily: "monospace" }}>
                      {c.variance != null ? `${c.variance > 0 ? "+" : ""}${fmt(c.variance)}` : "—"}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {/* CTA */}
          <Section style={{ padding: "16px 32px 32px", textAlign: "center" }}>
            <Link href={appUrl + "/dashboard"} style={{ display: "inline-block", backgroundColor: "#3b82f6", color: "#ffffff", fontSize: 13, fontWeight: 600, padding: "10px 24px", borderRadius: 6, textDecoration: "none" }}>
              Open Dashboard →
            </Link>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
