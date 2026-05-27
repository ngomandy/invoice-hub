"use client";

import { useState, useEffect, useRef } from "react";
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

export default function CloseForm({ clientId, existingClose, defaultMonth }: CloseFormProps) {
  const router = useRouter();
  const now    = new Date();

  const initialMonth  = defaultMonth || existingClose?.close_month || getCurrentMonthStr();
  const [selectedYear,  setSelectedYear]  = useState(parseInt(initialMonth.substring(0, 4)));
  const [selectedMonth, setSelectedMonth] = useState(parseInt(initialMonth.substring(5, 7)) - 1);

  const [netUsage,    setNetUsage]    = useState(String(existingClose?.net_usage             ?? ""));
  const [rolloverFrom, setRolloverFrom] = useState(String(existingClose?.rollover_from_previous ?? "0"));
  const [rolloverTo,  setRolloverTo]  = useState(String(existingClose?.rollover_to_next       ?? "0"));
  const [discounts,   setDiscounts]   = useState(String(existingClose?.discounts              ?? "0"));
  const [reason,      setReason]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // Rollover auto-carry state
  const [autoCarryLabel, setAutoCarryLabel] = useState<string | null>(null);
  const userEditedRollover = useRef(false); // track if user manually changed rollover

  const isEdit    = !!existingClose;
  const closeMonth = toFirstOfMonth(selectedYear, selectedMonth + 1);
  const years      = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  // ── Rollover auto-carry ────────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit) return; // never auto-fill when editing
    if (userEditedRollover.current) return; // user manually set it — don't override

    // Compute previous month
    const prevDate  = new Date(selectedYear, selectedMonth - 1, 1); // month is 0-indexed, -1 gives prev
    const prevYear  = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1; // back to 1-indexed for toFirstOfMonth
    const prevMonthStr = toFirstOfMonth(prevYear, prevMonth);

    fetch(`/api/closes?clientId=${clientId}&year=${prevYear}`)
      .then((r) => r.json())
      .then((closes: RevenueClose[]) => {
        const prev = closes.find((c) => c.close_month === prevMonthStr);
        if (prev && prev.rollover_to_next > 0) {
          setRolloverFrom(String(prev.rollover_to_next));
          setAutoCarryLabel(`Auto-filled from ${MONTHS[prevDate.getMonth()]} ${prevYear} close`);
        } else {
          setAutoCarryLabel(null);
        }
      })
      .catch(() => setAutoCarryLabel(null));
  }, [selectedYear, selectedMonth, clientId, isEdit]);

  function handleRolloverFromChange(val: string) {
    userEditedRollover.current = true;
    setAutoCarryLabel(null);
    setRolloverFrom(val);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
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
        client_id:              clientId,
        close_month:            closeMonth,
        net_usage:              parseFloat(netUsage)     || 0,
        rollover_from_previous: parseFloat(rolloverFrom) || 0,
        rollover_to_next:       parseFloat(rolloverTo)   || 0,
        discounts:              parseFloat(discounts)    || 0,
        reason:                 reason || null,
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
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            disabled={isEdit}
            className="border border-surface-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-surface-muted disabled:text-text-muted"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {isEdit && (
          <p className="text-xs text-warning mt-2">
            ⚠ You are editing a locked close. A change record will be created and the team will be notified.
          </p>
        )}
      </div>

      {/* Billing figures */}
      <div className="bg-white border border-surface-border rounded-lg p-5 space-y-4">
        <p className="text-sm font-semibold text-text-primary">Billing Figures</p>

        {/* Net Usage */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Net Usage ($)</label>
          <input
            type="number"
            value={netUsage}
            onChange={(e) => setNetUsage(e.target.value)}
            required
            step="0.01"
            min="0"
            className="w-full border border-surface-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="0.00"
          />
        </div>

        {/* Rollover FROM — with auto-carry indicator */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-text-primary">
              Rollover FROM Previous Month ($)
            </label>
            {autoCarryLabel && !isEdit && (
              <span className="inline-flex items-center gap-1 text-xs text-brand font-medium bg-brand/10 px-2 py-0.5 rounded-full">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {autoCarryLabel}
              </span>
            )}
          </div>
          <input
            type="number"
            value={rolloverFrom}
            onChange={(e) => handleRolloverFromChange(e.target.value)}
            step="0.01"
            min="0"
            className={`w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand ${
              autoCarryLabel && !isEdit
                ? "border-brand/40 bg-brand/5"
                : "border-surface-border"
            }`}
            placeholder="0.00"
          />
        </div>

        {/* Rollover TO */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Rollover TO Next Month ($)
          </label>
          <input
            type="number"
            value={rolloverTo}
            onChange={(e) => setRolloverTo(e.target.value)}
            step="0.01"
            min="0"
            className="w-full border border-surface-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="0.00"
          />
        </div>

        {/* Discounts */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Discounts ($)</label>
          <input
            type="number"
            value={discounts}
            onChange={(e) => setDiscounts(e.target.value)}
            step="0.01"
            min="0"
            className="w-full border border-surface-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Live preview */}
      <LivePreviewBox
        netUsage={parseFloat(netUsage)     || 0}
        rolloverFrom={parseFloat(rolloverFrom) || 0}
        rolloverTo={parseFloat(rolloverTo)   || 0}
        discounts={parseFloat(discounts)    || 0}
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
