"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; name: string; payment_terms?: number | null };

type Props = { clients: Client[] };

const STATUS_OPTIONS = [
  { value: "sent",   label: "Sent — awaiting payment" },
  { value: "viewed", label: "Viewed — client opened it" },
  { value: "paid",   label: "Paid — fully collected" },
  { value: "draft",  label: "Draft — not yet sent" },
];

export default function NetSuiteImportForm({ clients }: Props) {
  const router = useRouter();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [netsuiteId,    setNetsuiteId]    = useState("");
  const [clientId,      setClientId]      = useState("");
  const [issueDate,     setIssueDate]     = useState(new Date().toISOString().slice(0, 10));
  const [dueDate,       setDueDate]       = useState("");
  const [total,         setTotal]         = useState("");
  const [status,        setStatus]        = useState("sent");
  const [notes,         setNotes]         = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  function handleClientChange(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (client?.payment_terms && issueDate) {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + client.payment_terms);
      setDueDate(d.toISOString().slice(0, 10));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceNumber.trim()) return setError("NetSuite invoice number is required");
    if (!clientId)             return setError("Please select a client");
    if (!dueDate)              return setError("Due date is required");
    const amount = parseFloat(total);
    if (!total || isNaN(amount) || amount <= 0) return setError("Enter a valid total amount");

    setSaving(true); setError("");

    const res = await fetch("/api/invoices", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_number: invoiceNumber.trim(),
        netsuite_id:    netsuiteId.trim() || null,
        source:         "netsuite",
        client_id:      clientId,
        issue_date:     issueDate,
        due_date:       dueDate,
        status,
        notes:          notes.trim() || null,
        items: [{
          description: `NetSuite Invoice ${invoiceNumber.trim()}`,
          quantity:    1,
          unit_price:  amount,
          tax_rate:    0,
          sort_order:  0,
        }],
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to record invoice");
    } else {
      router.push(`/invoices/${data.id}`);
      router.refresh();
    }
  }

  const inputCls = "w-full border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white";
  const labelCls = "block text-xs font-medium text-text-secondary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* NetSuite reference */}
      <div className="bg-white border border-surface-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">NetSuite Reference</h2>
        <p className="text-xs text-text-muted mb-4">The invoice was created in NetSuite — record it here for payment tracking and reporting.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>NetSuite Invoice # *</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. 1234 or INV-1234"
              className={inputCls + " font-mono"}
              required
            />
            <p className="text-[10px] text-text-muted mt-1">Invoice number as shown in NetSuite</p>
          </div>
          <div>
            <label className={labelCls}>NetSuite Internal ID <span className="text-text-muted font-normal">(optional)</span></label>
            <input
              type="text"
              value={netsuiteId}
              onChange={(e) => setNetsuiteId(e.target.value)}
              placeholder="e.g. 98765"
              className={inputCls + " font-mono"}
            />
            <p className="text-[10px] text-text-muted mt-1">Internal record ID for back-reference</p>
          </div>
        </div>
      </div>

      {/* Invoice details */}
      <div className="bg-white border border-surface-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Client *</label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Issue Date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Due Date *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Invoice Total (USD) *</label>
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              min="0.01" step="0.01" placeholder="0.00"
              className={inputCls + " font-mono"}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Notes <span className="text-text-muted font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this invoice…"
              className={inputCls + " resize-none"}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {saving ? "Recording…" : "Record Invoice"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-text-secondary border border-surface-border px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
