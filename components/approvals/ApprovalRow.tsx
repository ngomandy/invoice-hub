"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { RevenueClose } from "@/lib/types";

type EnrichedClose = RevenueClose & {
  client_name:        string;
  submitted_by_name?: string;
};

type Props = {
  close: EnrichedClose;
};

export default function ApprovalRow({ close }: Props) {
  const router = useRouter();
  const [loading,         setLoading]         = useState(false);
  const [rejectMode,      setRejectMode]      = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error,           setError]           = useState("");

  async function act(action: "review" | "approve" | "reject") {
    setLoading(true);
    setError("");

    const res = await fetch("/api/closes/approve", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revenue_close_id: close.id,
        action,
        ...(action === "reject" ? { rejection_reason: rejectionReason } : {}),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Action failed");
      setLoading(false);
      return;
    }

    setLoading(false);
    setRejectMode(false);
    setRejectionReason("");
    router.refresh();
  }

  const status = close.approval_status;

  return (
    <tr className="border-b border-surface-border hover:bg-surface-muted/50 transition-colors">
      {/* Client */}
      <td className="px-4 py-3 font-medium text-text-primary">
        <Link
          href={`/clients/${close.client_id}`}
          className="hover:text-brand transition-colors"
        >
          {close.client_name}
        </Link>
      </td>

      {/* Month */}
      <td className="px-4 py-3 text-text-secondary">
        {formatMonth(close.close_month)}
      </td>

      {/* Expected Total */}
      <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary font-semibold">
        {formatCurrency(close.expected_total)}
      </td>

      {/* Submitted By */}
      <td className="px-4 py-3 text-text-secondary text-sm">
        {close.submitted_by_name ?? "—"}
      </td>

      {/* Submitted At */}
      <td className="px-4 py-3 text-text-secondary text-sm whitespace-nowrap">
        {new Date(close.submitted_at).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        })}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        {rejectMode ? (
          <div className="flex flex-col items-end gap-1.5">
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-48 border border-negative-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-negative"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => act("reject")}
                disabled={loading || !rejectionReason.trim()}
                className="text-xs bg-negative text-white px-2.5 py-1 rounded hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "…" : "Confirm Reject"}
              </button>
              <button
                onClick={() => { setRejectMode(false); setRejectionReason(""); }}
                className="text-xs text-text-muted hover:text-text-secondary px-2 py-1"
              >
                Cancel
              </button>
            </div>
            {error && <p className="text-xs text-negative">{error}</p>}
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            {status === "submitted" && (
              <button
                onClick={() => act("review")}
                disabled={loading}
                className="text-xs bg-brand/10 text-brand border border-brand/30 px-3 py-1.5 rounded-md hover:bg-brand/20 disabled:opacity-50 font-medium whitespace-nowrap"
              >
                {loading ? "…" : "Start Review"}
              </button>
            )}
            {status === "under_review" && (
              <>
                <button
                  onClick={() => act("approve")}
                  disabled={loading}
                  className="text-xs bg-positive-bg text-positive border border-positive-border px-3 py-1.5 rounded-md hover:bg-positive/10 disabled:opacity-50 font-medium"
                >
                  {loading ? "…" : "✓ Approve"}
                </button>
                <button
                  onClick={() => setRejectMode(true)}
                  disabled={loading}
                  className="text-xs bg-negative-bg text-negative border border-negative-border px-3 py-1.5 rounded-md hover:bg-negative/10 disabled:opacity-50 font-medium"
                >
                  ✕ Reject
                </button>
              </>
            )}
            {error && !rejectMode && <p className="text-xs text-negative ml-2">{error}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
