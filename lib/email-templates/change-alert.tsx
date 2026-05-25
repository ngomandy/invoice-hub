import * as React from "react";
import { CloseChange } from "@/lib/types";
import { formatCurrency, formatMonth, formatDateTime } from "@/lib/utils";

type ChangeAlertProps = {
  change: CloseChange;
  clientName: string;
  historyUrl: string;
};

function DiffRow({
  label,
  prev,
  next,
}: {
  label: string;
  prev: number;
  next: number;
}) {
  const changed = prev !== next;
  const delta = next - prev;
  return (
    <tr style={{ backgroundColor: changed ? "#fffbeb" : "transparent" }}>
      <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "13px" }}>
        {label}
      </td>
      <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: "13px", color: changed ? "#dc2626" : "#0f172a", textDecoration: changed ? "line-through" : "none" }}>
        {formatCurrency(prev)}
      </td>
      <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: "13px", fontWeight: changed ? "700" : "400", color: "#0f172a" }}>
        {formatCurrency(next)}
      </td>
      <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: "13px", color: delta > 0 ? "#dc2626" : delta < 0 ? "#16a34a" : "#94a3b8" }}>
        {delta === 0 ? "—" : delta > 0 ? `+${formatCurrency(delta)}` : `-${formatCurrency(Math.abs(delta))}`}
      </td>
    </tr>
  );
}

export function ChangeAlertEmail({ change, clientName, historyUrl }: ChangeAlertProps) {
  const monthLabel = formatMonth(change.close_month);
  const changedAt = formatDateTime(change.changed_at);
  const authorName = change.changed_by_name || "A team member";

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f8fafc", margin: 0, padding: "32px 16px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ backgroundColor: "#2563eb", padding: "24px 32px" }}>
            <p style={{ color: "#bfdbfe", fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 4px" }}>
              Invoice Hub Alert
            </p>
            <h1 style={{ color: "#ffffff", fontSize: "20px", margin: 0, fontWeight: "700" }}>
              Revenue Close Updated
            </h1>
          </div>

          {/* Meta */}
          <div style={{ padding: "24px 32px", borderBottom: "1px solid #e2e8f0" }}>
            <p style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
              {clientName} — {monthLabel}
            </p>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#475569" }}>
              Version {change.new_expected_total !== change.prev_expected_total ? "updated" : ""}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
              <strong>Changed by:</strong> {authorName}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#475569" }}>
              <strong>Time:</strong> {changedAt}
            </p>
            {change.reason && (
              <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#475569", backgroundColor: "#f8fafc", padding: "10px 12px", borderLeft: "3px solid #2563eb" }}>
                <strong>Reason:</strong> {change.reason}
              </p>
            )}
          </div>

          {/* Diff table */}
          <div style={{ padding: "24px 32px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", fontWeight: "600" }}>
              Changes
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>Field</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>Before</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>After</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", borderBottom: "1px solid #e2e8f0" }}>Change</th>
                </tr>
              </thead>
              <tbody>
                <DiffRow label="Net Usage" prev={change.prev_net_usage} next={change.new_net_usage} />
                <DiffRow label="Rollover From Previous" prev={change.prev_rollover_from_previous} next={change.new_rollover_from_previous} />
                <DiffRow label="Rollover To Next" prev={change.prev_rollover_to_next} next={change.new_rollover_to_next} />
                <DiffRow label="Discounts" prev={change.prev_discounts} next={change.new_discounts} />
                <DiffRow label="Expected Total" prev={change.prev_expected_total} next={change.new_expected_total} />
              </tbody>
            </table>
          </div>

          {/* CTA */}
          <div style={{ padding: "0 32px 32px" }}>
            <a href={historyUrl} style={{ display: "inline-block", backgroundColor: "#2563eb", color: "#ffffff", padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
              View Full History →
            </a>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: "#f8fafc", padding: "16px 32px", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
              You are receiving this because you are a member of Invoice Hub.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
