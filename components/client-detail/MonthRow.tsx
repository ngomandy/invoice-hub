"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatMonthAbbr } from "@/lib/utils";
import VarianceBadge from "./VarianceBadge";
import { MonthData } from "@/lib/types";

type MonthRowProps = {
  data: MonthData;
  clientId: string;
  isCurrentMonth: boolean;
};

export default function MonthRow({ data, clientId, isCurrentMonth }: MonthRowProps) {
  const { month, close, billed } = data;
  const router = useRouter();
  const [editingBilled, setEditingBilled] = useState(false);
  const [billedValue, setBilledValue] = useState(
    billed ? String(billed.billed_total) : ""
  );
  const [saving, setSaving] = useState(false);

  const variance =
    close && billed ? billed.billed_total - close.expected_total : null;

  async function saveBilled() {
    if (!billedValue) return;
    setSaving(true);
    await fetch("/api/billed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        close_month: month,
        billed_total: parseFloat(billedValue),
      }),
    });
    setSaving(false);
    setEditingBilled(false);
    router.refresh();
  }

  const statusBadge = () => {
    if (!close) {
      return (
        <span className="text-xs text-text-muted bg-surface-muted px-2 py-0.5 rounded border border-surface-border">
          No close
        </span>
      );
    }
    if ((close.change_count ?? 0) > 0) {
      return (
        <span className="text-xs text-warning bg-warning-bg px-2 py-0.5 rounded border border-warning-border">
          Changed ×{close.change_count}
        </span>
      );
    }
    return (
      <span className="text-xs text-positive bg-positive-bg px-2 py-0.5 rounded border border-positive-border">
        Locked
      </span>
    );
  };

  const dash = <span className="text-text-muted">—</span>;

  return (
    <tr className={`border-b border-surface-border hover:bg-surface-muted/50 transition-colors ${isCurrentMonth ? "bg-brand/5" : ""}`}>
      {/* Month */}
      <td className="px-4 py-3 text-sm font-medium text-text-primary w-20">
        {formatMonthAbbr(month)}
      </td>

      {/* Net Usage */}
      <td className="px-4 py-3 text-sm text-right font-mono text-text-secondary tabular-nums">
        {close?.net_usage != null ? formatCurrency(close.net_usage) : dash}
      </td>

      {/* Rollover From Previous */}
      <td className="px-4 py-3 text-sm text-right font-mono text-text-secondary tabular-nums">
        {close?.rollover_from_previous != null ? formatCurrency(close.rollover_from_previous) : dash}
      </td>

      {/* Rollover To Next */}
      <td className="px-4 py-3 text-sm text-right font-mono text-text-secondary tabular-nums">
        {close?.rollover_to_next != null ? formatCurrency(close.rollover_to_next) : dash}
      </td>

      {/* Discounts */}
      <td className="px-4 py-3 text-sm text-right font-mono text-text-secondary tabular-nums">
        {close?.discounts != null ? formatCurrency(close.discounts) : dash}
      </td>

      {/* Expected Close */}
      <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-text-primary tabular-nums">
        {close ? formatCurrency(close.expected_total) : dash}
      </td>

      {/* Billed Amount — inline editable */}
      <td className="px-4 py-3 text-sm text-right">
        {editingBilled ? (
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              value={billedValue}
              onChange={(e) => setBilledValue(e.target.value)}
              className="w-28 border border-surface-border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
              autoFocus
              step="0.01"
            />
            <button
              onClick={saveBilled}
              disabled={saving}
              className="text-xs bg-brand text-white px-2 py-1 rounded hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={() => setEditingBilled(false)}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span className="font-mono tabular-nums text-text-secondary">
              {billed ? formatCurrency(billed.billed_total) : dash}
            </span>
            <button
              onClick={() => setEditingBilled(true)}
              className="text-xs text-brand hover:text-brand-dark opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {billed ? "Edit" : "Enter"}
            </button>
          </div>
        )}
      </td>

      {/* Variance */}
      <td className="px-4 py-3 text-right">
        <VarianceBadge variance={variance} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">{statusBadge()}</td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {close && (
            <Link
              href={`/clients/${clientId}/close?month=${month}`}
              className="text-xs text-text-secondary hover:text-brand transition-colors whitespace-nowrap"
            >
              Edit close
            </Link>
          )}
          {!editingBilled && (
            <button
              onClick={() => setEditingBilled(true)}
              className="text-xs text-text-secondary hover:text-brand transition-colors whitespace-nowrap"
            >
              {billed ? "Edit billed" : "Enter billed"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
