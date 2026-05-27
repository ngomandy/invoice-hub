"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

type Client = { id: string; name: string; payment_terms?: number | null };

type LineItem = {
  id:          string;
  description: string;
  quantity:    string;
  unit_price:  string;
  tax_rate:    string;
};

type Props = {
  invoiceId?:  string;           // present when editing
  clients:     Client[];
  defaults?:   {                 // pre-fill when editing
    client_id:  string;
    issue_date: string;
    due_date:   string;
    notes:      string;
    terms:      string;
    items:      { id: string; description: string; quantity: number; unit_price: number; tax_rate: number }[];
  };
  defaultPaymentTerms?: number;
};

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", quantity: "1", unit_price: "", tax_rate: "0" };
}

export default function InvoiceForm({ invoiceId, clients, defaults, defaultPaymentTerms = 30 }: Props) {
  const router = useRouter();

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultDue = (() => {
    const d = new Date();
    d.setDate(d.getDate() + defaultPaymentTerms);
    return d.toISOString().slice(0, 10);
  })();

  const [clientId,  setClientId]  = useState(defaults?.client_id  ?? "");
  const [issueDate, setIssueDate] = useState(defaults?.issue_date  ?? todayStr);
  const [dueDate,   setDueDate]   = useState(defaults?.due_date    ?? defaultDue);
  const [notes,     setNotes]     = useState(defaults?.notes       ?? "");
  const [terms,     setTerms]     = useState(defaults?.terms       ?? "");
  const [items,     setItems]     = useState<LineItem[]>(
    defaults?.items?.map((it) => ({
      id:          it.id,
      description: it.description,
      quantity:    String(it.quantity),
      unit_price:  String(it.unit_price),
      tax_rate:    String(it.tax_rate),
    })) ?? [newItem()]
  );
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // When client changes, auto-update due date based on client payment terms
  function handleClientChange(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (client?.payment_terms) {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + client.payment_terms);
      setDueDate(d.toISOString().slice(0, 10));
    }
  }

  // Line item helpers
  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it));
  }
  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  // Totals
  const subtotal = items.reduce((s, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    return s + qty * price;
  }, 0);
  const taxAmount = items.reduce((s, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    const rate = parseFloat(it.tax_rate) || 0;
    return s + qty * price * rate;
  }, 0);
  const total = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!clientId)  return setError("Please select a client");
    if (!dueDate)   return setError("Due date is required");
    const validItems = items.filter((it) => it.description.trim() && parseFloat(it.unit_price) > 0);
    if (validItems.length === 0) return setError("Add at least one line item with a description and price");

    setSaving(true);

    const payload = {
      client_id:  clientId,
      issue_date: issueDate,
      due_date:   dueDate,
      notes:      notes.trim() || null,
      terms:      terms.trim() || null,
      items:      validItems.map((it, idx) => ({
        description: it.description.trim(),
        quantity:    parseFloat(it.quantity) || 1,
        unit_price:  parseFloat(it.unit_price) || 0,
        tax_rate:    parseFloat(it.tax_rate)   || 0,
        sort_order:  idx,
      })),
    };

    try {
      const res = await fetch(
        invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices",
        {
          method:  invoiceId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save invoice");
      } else {
        router.push(`/invoices/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client + Dates */}
      <div className="bg-white border border-surface-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Client *</label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
              required
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              required
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Line Items</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-xs text-brand hover:text-brand-dark font-medium"
          >
            + Add Item
          </button>
        </div>

        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-surface-muted border-b border-surface-border text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          <div className="col-span-5">Description</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Tax %</div>
          <div className="col-span-1" />
        </div>

        {/* Items */}
        <div className="divide-y divide-surface-border">
          {items.map((item) => {
            /* line total displayed inline — kept for future use */
            return (
              <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Service or product description"
                    className="w-full border border-surface-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                    min="0"
                    step="0.01"
                    className="w-full border border-surface-border rounded px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.id, { unit_price: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full border border-surface-border rounded px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.tax_rate}
                    onChange={(e) => updateItem(item.id, { tax_rate: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    className="w-full border border-surface-border rounded px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-text-muted hover:text-negative text-xs px-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="border-t-2 border-surface-border px-5 py-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Tax</span>
                  <span className="font-mono tabular-nums">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-text-primary border-t border-surface-border pt-1.5 mt-1.5">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes + Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-surface-border rounded-lg p-5">
          <label className="block text-xs font-semibold text-text-secondary mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Thank you for your business…"
            className="w-full border border-surface-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="bg-white border border-surface-border rounded-lg p-5">
          <label className="block text-xs font-semibold text-text-secondary mb-2">Payment Terms</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={3}
            placeholder="Payment due within 30 days…"
            className="w-full border border-surface-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Submit */}
      {error && <p className="text-sm text-negative">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : invoiceId ? "Save Changes" : "Create Invoice"}
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
