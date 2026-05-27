"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  invoiceId:       string;
  invoiceNumber:   string;
  status:          string;
  effectiveStatus: string;
};

export default function InvoiceActions({ invoiceId, invoiceNumber, status }: Props) {
  const router = useRouter();
  const [sending,     setSending]     = useState(false);
  const [voiding,     setVoiding]     = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showVoid,    setShowVoid]    = useState(false);
  const [voidReason,  setVoidReason]  = useState("");
  const [error,       setError]       = useState("");

  async function send() {
    setSending(true); setError("");
    const res  = await fetch(`/api/invoices/${invoiceId}/send`, { method: "POST" });
    const data = await res.json();
    setSending(false);
    if (!res.ok) setError(data.error || "Failed to send");
    else { router.refresh(); }
  }

  async function voidInvoice() {
    setVoiding(true); setError("");
    const res  = await fetch(`/api/invoices/${invoiceId}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ reason: voidReason.trim() || null }),
    });
    const data = await res.json();
    setVoiding(false);
    if (!res.ok) setError(data.error || "Failed to void");
    else { setShowVoid(false); router.refresh(); }
  }

  async function duplicate() {
    setDuplicating(true); setError("");
    const res  = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: "POST" });
    const data = await res.json();
    setDuplicating(false);
    if (!res.ok) setError(data.error || "Failed to duplicate");
    else router.push(`/invoices/${data.id}`);
  }

  const isVoid = status === "void";
  const isPaid = status === "paid";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {/* Edit — only for draft */}
        {status === "draft" && (
          <Link
            href={`/invoices/${invoiceId}/edit`}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-surface-border bg-white text-text-secondary hover:bg-surface-muted transition-colors"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
        )}

        {/* Send — not for void/paid */}
        {!isVoid && !isPaid && (
          <button
            onClick={send}
            disabled={sending}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-dark disabled:opacity-60 transition-colors"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {sending ? "Sending…" : status === "draft" ? "Send Invoice" : "Resend"}
          </button>
        )}

        {/* Print / Download PDF */}
        <a
          href={`/invoices/${invoiceId}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-surface-border bg-white text-text-secondary hover:bg-surface-muted transition-colors"
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / PDF
        </a>

        {/* Duplicate */}
        <button
          onClick={duplicate}
          disabled={duplicating}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-surface-border bg-white text-text-secondary hover:bg-surface-muted disabled:opacity-60 transition-colors"
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {duplicating ? "Duplicating…" : "Duplicate"}
        </button>

        {/* Void */}
        {!isVoid && !isPaid && (
          <button
            onClick={() => setShowVoid(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-negative-border bg-negative-bg text-negative hover:opacity-80 transition-colors"
          >
            Void
          </button>
        )}
      </div>

      {/* Void confirmation */}
      {showVoid && (
        <div className="p-3 border border-negative-border bg-negative-bg rounded-lg space-y-2">
          <p className="text-sm font-medium text-negative">Void {invoiceNumber}?</p>
          <textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Reason (optional)…"
            rows={2}
            className="w-full border border-surface-border rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="flex gap-2">
            <button
              onClick={voidInvoice}
              disabled={voiding}
              className="text-xs font-medium bg-negative text-white px-3 py-1.5 rounded disabled:opacity-60"
            >
              {voiding ? "Voiding…" : "Confirm Void"}
            </button>
            <button
              onClick={() => { setShowVoid(false); setVoidReason(""); }}
              className="text-xs text-text-muted hover:text-text-secondary px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
