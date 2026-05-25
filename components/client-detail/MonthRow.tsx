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

  return (
    <tr className={`border-b border-surface-border hover:bg-surface-muted/50 transition-colors ${isCurrentMonth ? "bg-brand/5" : ""}`}>
      <td className="px-4 py-3 text-sm font-medium text-text-primary w-24">
        {formatMonthAbbr(month)}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-text-primary">
        {close ? formatCurrency(close.expected_total) : <span className="text-text-muted">—</span>}
      </td>
      <td className="px-4 py-3 text-sm">
        {editingBilled ? (
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            <span className="font-mono">
              {billed ? formatCurrency(billed.billed_total) : <span className="text-text-muted">—</span>}
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
      <td className="px-4 py-3">
        <VarianceBadge variance={variance} />
      </td>
      <td className="px-4 py-3">{statusBadge()}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {close && (
            <Link
              href={`/clients/${clientId}/close?month=${month}`}
              className="text-xs text-text-secondary hover:text-brand transition-colors"
            >
              Edit close
            </Link>
          )}
          {!editingBilled && (
            <button
              onClick={() => setEditingBilled(true)}
              className="text-xs text-text-secondary hover:text-brand transition-colors"
            >
              {billed ? "Edit billed" : "Enter billed"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
