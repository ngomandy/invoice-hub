"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

const METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check",         label: "Check" },
  { value: "cash",          label: "Cash" },
  { value: "stripe",        label: "Stripe" },
  { value: "paypal",        label: "PayPal" },
  { value: "other",         label: "Other" },
];

type Props = {
  invoiceId:  string;
  amountDue:  number;
};

export default function RecordPaymentForm({ invoiceId, amountDue }: Props) {
  const router = useRouter();
  const [open,        setOpen]        = useState(false);
  const [amount,      setAmount]      = useState(String(amountDue.toFixed(2)));
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10));
  const [method,      setMethod]      = useState("bank_transfer");
  const [reference,   setReference]   = useState("");
  const [notes]                       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return setError("Enter a valid amount");
    setSaving(true); setError("");

    const res  = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amount: parseFloat(amount), payment_date: date, method, reference: reference.trim() || null, notes: notes.trim() || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to record payment");
    } else {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={amountDue <= 0}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-positive text-white hover:opacity-90 disabled:opacity-40 transition-colors"
      >
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Record Payment
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-surface-border rounded-lg p-4 space-y-3 max-w-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-text-primary">Record Payment</p>
        <button type="button" onClick={() => setOpen(false)} className="text-text-muted hover:text-text-secondary text-sm">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Amount *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            className="w-full border border-surface-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="text-[10px] text-text-muted mt-0.5">Balance due: {formatCurrency(amountDue)}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-surface-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full border border-surface-border rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Reference / Check #</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Optional"
          className="w-full border border-surface-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {error && <p className="text-xs text-negative">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="text-sm font-medium bg-positive text-white px-4 py-1.5 rounded disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Payment"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-muted hover:text-text-secondary px-2">Cancel</button>
      </div>
    </form>
  );
}
