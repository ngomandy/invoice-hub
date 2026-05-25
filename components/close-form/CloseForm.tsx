"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LivePreviewBox from "./LivePreviewBox";
import { toFirstOfMonth, getCurrentMonthStr } from "@/lib/utils";
import { RevenueClose } from "@/lib/types";

type CloseFormProps = {
  clientId: string;
  clientName: string;
  existingClose: RevenueClose | null;
  defaultMonth: string;
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function CloseForm({
  clientId,
  existingClose,
  defaultMonth,
}: CloseFormProps) {
  const router = useRouter();
  const now = new Date();

  const initialMonth = defaultMonth || existingClose?.close_month || getCurrentMonthStr();
  const [selectedYear, setSelectedYear] = useState(parseInt(initialMonth.substring(0, 4)));
  const [selectedMonth, setSelectedMonth] = useState(parseInt(initialMonth.substring(5, 7)) - 1);

  const [netUsage, setNetUsage] = useState(String(existingClose?.net_usage ?? ""));
  const [rolloverFrom, setRolloverFrom] = useState(String(existingClose?.rollover_from_previous ?? "0"));
  const [rolloverTo, setRolloverTo] = useState(String(existingClose?.rollover_to_next ?? "0"));
  const [discounts, setDiscounts] = useState(String(existingClose?.discounts ?? "0"));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!existingClose;
  const closeMonth = toFirstOfMonth(selectedYear, selectedMonth + 1);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit && !reason.trim()) {
      setError("Reason for change is required when editing a locked close.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/closes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        close_month: closeMonth,
        net_usage: parseFloat(netUsage) || 0,
        rollover_from_previous: parseFloat(rolloverFrom) || 0,
        rollover_to_next: parseFloat(rolloverTo) || 0,
        discounts: parseFloat(discounts) || 0,
        reason: reason || null,
      }),
    });

    if (res.ok) {
      router.push(`/clients/${clientId}`);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save close");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Month selector */}
      <div className="bg-white border border-surface-border rounded-lg p-5">
        <p className="text-sm font-semibold text-text-primary mb-3">Close Period</p>
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            disabled={isEdit}
            className="border border-surface-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-surface-muted disabled:text-text-muted"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            disabled={isEdit}
            className="border border-surface-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-surface-muted disabled:text-text-muted"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {isEdit && (
          <p className="text-xs text-warning mt-2">
            ⚠ You are editing a locked close. A change record will be created and the team will be notified.
          </p>
        )}
      </div>

      {/* Numbers */}
      <div className="bg-white border border-surface-border rounded-lg p-5 space-y-4">
        <p className="text-sm font-semibold text-text-primary">Billing Figures</p>

        {[
          { label: "Net Usage ($)", value: netUsage, setter: setNetUsage, required: true },
          { label: "Rollover FROM Previous Month ($)", value: rolloverFrom, setter: setRolloverFrom, required: false },
          { label: "Rollover TO Next Month ($)", value: rolloverTo, setter: setRolloverTo, required: false },
          { label: "Discounts ($)", value: discounts, setter: setDiscounts, required: false },
        ].map(({ label, value, setter, required }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setter(e.target.value)}
              required={required}
              step="0.01"
              min="0"
              className="w-full border border-surface-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="0.00"
            />
          </div>
        ))}
      </div>

      {/* Live preview */}
      <LivePreviewBox
        netUsage={parseFloat(netUsage) || 0}
        rolloverFrom={parseFloat(rolloverFrom) || 0}
        rolloverTo={parseFloat(rolloverTo) || 0}
        discounts={parseFloat(discounts) || 0}
      />

      {/* Reason (edit only) */}
      {isEdit && (
        <div className="bg-white border border-surface-border rounded-lg p-5">
          <label className="block text-sm font-semibold text-text-primary mb-1">
            Reason for Change <span className="text-negative">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Explain why these figures are changing..."
            className="w-full border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-negative bg-negative-bg border border-negative-border rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : isEdit ? "Submit Change" : "Lock Close"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-text-secondary px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
