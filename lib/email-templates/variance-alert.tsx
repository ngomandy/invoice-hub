import * as React from "react";
import { formatCurrency, formatMonth, formatVariance } from "@/lib/utils";

type VarianceAlertProps = {
  clientName: string;
  month: string;
  expectedTotal: number;
  billedTotal: number;
  variance: number;
  varianceReason: string | null;
  enteredBy: string;
  clientUrl: string;
};

export function VarianceAlertEmail({
  clientName,
  month,
  expectedTotal,
  billedTotal,
  variance,
  varianceReason,
  enteredBy,
  clientUrl,
}: VarianceAlertProps) {
  const isOver = variance > 0;
  const accentColor = isOver ? "#dc2626" : "#d97706";
  const accentBg = isOver ? "#fef2f2" : "#fffbeb";
  const accentBorder = isOver ? "#fecaca" : "#fde68a";
  const label = isOver ? "OVERBILLED" : "UNDERBILLED";

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f8fafc", margin: 0, padding: "32px 16px" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ backgroundColor: accentColor, padding: "24px 32px" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 4px" }}>
              Invoice Hub · Variance Alert
            </p>
            <h1 style={{ color: "#ffffff", fontSize: "20px", margin: 0, fontWeight: "700" }}>
              {label}: {clientName}
            </h1>
          </div>

          {/* Summary */}
          <div style={{ padding: "24px 32px", borderBottom: "1px solid #e2e8f0" }}>
            <p style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
              {clientName} — {formatMonth(month)}
            </p>
            <p style={{ margin: "0", fontSize: "13px", color: "#475569" }}>
              Billed by <strong>{enteredBy}</strong>
            </p>
          </div>

          {/* Variance highlight */}
          <div style={{ padding: "20px 32px", backgroundColor: accentBg, borderBottom: `1px solid ${accentBorder}` }}>
            <p style={{ margin: "0 0 12px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: accentColor, fontWeight: "600" }}>
              Variance
            </p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", fontFamily: "monospace", color: accentColor }}>
              {formatVariance(variance)}
            </p>
          </div>

          {/* Figures */}
          <div style={{ padding: "24px 32px", borderBottom: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  { label: "Expected Close", value: expectedTotal, color: "#0f172a" },
                  { label: "Billed Amount", value: billedTotal, color: "#0f172a" },
                  { label: isOver ? "Overbilled by" : "Underbilled by", value: Math.abs(variance), color: accentColor },
                ].map(({ label: l, value, color }) => (
                  <tr key={l}>
                    <td style={{ padding: "6px 0", fontSize: "13px", color: "#475569" }}>{l}</td>
                    <td style={{ padding: "6px 0", fontSize: "13px", fontFamily: "monospace", fontWeight: "600", color, textAlign: "right" }}>
                      {formatCurrency(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Commentary */}
          {varianceReason ? (
            <div style={{ padding: "20px 32px", borderBottom: "1px solid #e2e8f0" }}>
              <p style={{ margin: "0 0 8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", fontWeight: "600" }}>
                Reason provided
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#475569", backgroundColor: "#f8fafc", padding: "10px 12px", borderLeft: "3px solid #2563eb" }}>
                {varianceReason}
              </p>
            </div>
          ) : (
            <div style={{ padding: "20px 32px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#fffbeb" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#92400e" }}>
                ⚠ No reason was provided for this variance.
              </p>
            </div>
          )}

          {/* CTA */}
          <div style={{ padding: "24px 32px" }}>
            <a href={clientUrl} style={{ display: "inline-block", backgroundColor: "#2563eb", color: "#ffffff", padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
              Review Client →
            </a>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: "#f8fafc", padding: "16px 32px", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
              Invoice Hub · Variance threshold: $500 · You are receiving this as a team member.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
