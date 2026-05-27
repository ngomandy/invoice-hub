"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatMonthAbbr } from "@/lib/utils";
import VarianceBadge from "./VarianceBadge";
import { MonthData, ApprovalStatus } from "@/lib/types";

type PriorYearData = { expected: number | null; billed: number | null } | null;

type MonthRowProps = {
  data:          MonthData;
  clientId:      string;
  isCurrentMonth: boolean;
  priorYear?:    PriorYearData;
  showPriorYear?: boolean;
};

function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { label: string; cls: string }> = {
    submitted:    { label: "Submitted",  cls: "text-text-muted bg-surface-muted border-surface-border" },
    under_review: { label: "In Review",  cls: "text-brand bg-brand/10 border-brand/30" },
    approved:     { label: "Approved",   cls: "text-positive bg-positive-bg border-positive-border" },
    rejected:     { label: "Rejected",   cls: "text-negative bg-negative-bg border-negative-border" },
  };
  const { label, cls } = map[status] ?? map.submitted;
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function MonthRow({ data, clientId, isCurrentMonth, priorYear, showPriorYear = false }: MonthRowProps) {
  const { month, close, billed } = data;
  const router = useRouter();

  // ── Billed editing state ────────────────────────────────────────────────────
  const [editingBilled, setEditingBilled] = useState(false);
  const [billedValue,   setBilledValue]   = useState(billed ? String(billed.billed_total) : "");
  const [saving,        setSaving]        = useState(false);
  const [billedError,   setBilledError]   = useState("");

  // ── Variance commentary state ───────────────────────────────────────────────
  const [requiresReason, setRequiresReason] = useState(false);
  const [varianceInfo,   setVarianceInfo]   = useState<{ variance: number } | null>(null);
  const [varianceReason, setVarianceReason] = useState("");

  // ── Approval workflow state ─────────────────────────────────────────────────
  const [approving,        setApproving]        = useState(false);
  const [rejectMode,       setRejectMode]        = useState(false);
  const [rejectionReason,  setRejectionReason]   = useState("");
  const [approvalError,    setApprovalError]     = useState("");

  const variance =
    close && billed ? billed.billed_total - close.expected_total : null;

  // ── Save billed (optionally with variance reason) ───────────────────────────
  async function saveBilled(withReason?: string) {
    if (!billedValue) return;
    setSaving(true);
    setBilledError("");

    const res = await fetch("/api/billed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:    clientId,
        close_month:  month,
        billed_total: parseFloat(billedValue),
        ...(withReason ? { variance_reason: withReason } : {}),
      }),
    });

    if (res.status === 422) {
      const data = await res.json().catch(() => ({}));
      if (data.requiresReason) {
        setRequiresReason(true);
        setVarianceInfo({ variance: data.variance });
        setSaving(false);
        return;
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBilledError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditingBilled(false);
    setRequiresReason(false);
    setVarianceReason("");
    setVarianceInfo(null);
    router.refresh();
  }

  async function saveWithReason() {
    if (!varianceReason.trim()) {
      setBilledError("Please explain the variance before saving.");
      return;
    }
    await saveBilled(varianceReason.trim());
  }

  // ── Approval action ─────────────────────────────────────────────────────────
  async function handleApproval(action: "review" | "approve" | "reject") {
    if (!close?.id) return;
    setApproving(true);
    setApprovalError("");

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
      setApprovalError(data.error || "Action failed");
      setApproving(false);
      return;
    }

    setApproving(false);
    setRejectMode(false);
    setRejectionReason("");
    router.refresh();
  }

  // ── Status badge ────────────────────────────────────────────────────────────
  function StatusCell() {
    if (!close) {
      return (
        <span className="text-xs text-text-muted bg-surface-muted px-2 py-0.5 rounded border border-surface-border">
          No close
        </span>
      );
    }

    const approvalStatus = (close.approval_status ?? "submitted") as ApprovalStatus;

    return (
      <div className="space-y-1.5">
        {/* Approval status badge */}
        <ApprovalBadge status={approvalStatus} />

        {/* Change count badge */}
        {(close.change_count ?? 0) > 0 && (
          <span className="block text-xs text-warning bg-warning-bg px-2 py-0.5 rounded border border-warning-border">
            Changed ×{close.change_count}
          </span>
        )}

        {/* Approval actions */}
        {rejectMode ? (
          <div className="space-y-1 mt-1">
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={2}
              placeholder="Reason for rejection..."
              className="w-full border border-negative-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-negative resize-none"
            />
            <div className="flex gap-1">
              <button
                onClick={() => handleApproval("reject")}
                disabled={approving || !rejectionReason.trim()}
                className="text-xs bg-negative text-white px-2 py-1 rounded hover:opacity-90 disabled:opacity-50"
              >
                {approving ? "..." : "Confirm Reject"}
              </button>
              <button
                onClick={() => { setRejectMode(false); setRejectionReason(""); }}
                className="text-xs text-text-muted hover:text-text-secondary px-2 py-1"
              >
                Cancel
              </button>
            </div>
            {approvalError && <p className="text-xs text-negative">{approvalError}</p>}
          </div>
        ) : approvalStatus === "submitted" ? (
          <button
            onClick={() => handleApproval("review")}
            disabled={approving}
            className="block text-xs text-brand hover:text-brand-dark disabled:opacity-50 whitespace-nowrap"
          >
            {approving ? "..." : "→ Start Review"}
          </button>
        ) : approvalStatus === "under_review" ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleApproval("approve")}
              disabled={approving}
              className="text-xs text-positive hover:opacity-80 disabled:opacity-50 font-medium whitespace-nowrap"
            >
              {approving ? "..." : "✓ Approve"}
            </button>
            <button
              onClick={() => setRejectMode(true)}
              disabled={approving}
              className="text-xs text-negative hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
            >
              ✕ Reject
            </button>
          </div>
        ) : approvalStatus === "rejected" ? (
          <div>
            <button
              onClick={() => handleApproval("review")}
              disabled={approving}
              className="block text-xs text-brand hover:text-brand-dark disabled:opacity-50"
            >
              {approving ? "..." : "↺ Re-review"}
            </button>
            {close.rejection_reason && (
              <p
                className="text-xs text-negative mt-0.5 max-w-[160px] truncate"
                title={close.rejection_reason}
              >
                &ldquo;{close.rejection_reason}&rdquo;
              </p>
            )}
          </div>
        ) : null}

        {approvalError && !rejectMode && (
          <p className="text-xs text-negative">{approvalError}</p>
        )}
      </div>
    );
  }

  const dash = <span className="text-text-muted">—</span>;

  return (
    <tr
      className={`border-b border-surface-border hover:bg-surface-muted/50 transition-colors ${
        isCurrentMonth ? "bg-brand/5" : ""
      }`}
    >
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
        {close?.rollover_from_previous != null
          ? formatCurrency(close.rollover_from_previous)
          : dash}
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

      {/* Prior Year Expected — only rendered when the column is active */}
      {showPriorYear && (
        <td className="px-4 py-3 text-sm text-right tabular-nums">
          {priorYear?.expected != null ? (
            <div>
              <span className="font-mono text-text-muted">{formatCurrency(priorYear.expected)}</span>
              {close?.expected_total != null && priorYear.expected > 0 && (
                <div className="text-[10px] mt-0.5">
                  {(() => {
                    const pct = ((close.expected_total - priorYear.expected) / priorYear.expected) * 100;
                    const color = pct > 5 ? "text-positive" : pct < -5 ? "text-negative" : "text-text-muted";
                    return (
                      <span className={`font-medium ${color}`}>
                        {pct > 0 ? "+" : ""}{pct.toFixed(1)}% YoY
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : dash}
        </td>
      )}

      {/* Billed Amount — inline editable + variance commentary */}
      <td className="px-4 py-3 text-sm text-right">
        {editingBilled ? (
          <div className="space-y-1.5">
            {/* Input row */}
            <div className="flex items-center justify-end gap-2">
              <input
                type="number"
                value={billedValue}
                onChange={(e) => {
                  setBilledValue(e.target.value);
                  setRequiresReason(false);
                  setBilledError("");
                }}
                className="w-28 border border-surface-border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                autoFocus
                step="0.01"
              />
              {!requiresReason && (
                <>
                  <button
                    onClick={() => saveBilled()}
                    disabled={saving}
                    className="text-xs bg-brand text-white px-2 py-1 rounded hover:bg-brand-dark disabled:opacity-50"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingBilled(false);
                      setRequiresReason(false);
                      setBilledError("");
                    }}
                    className="text-xs text-text-muted hover:text-text-secondary"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>

            {/* Variance reason prompt (appears after 422) */}
            {requiresReason && varianceInfo && (
              <div className="mt-1 p-2 border border-warning-border bg-warning-bg rounded text-left">
                <p className="text-xs text-warning font-medium mb-1">
                  ⚠ Variance of{" "}
                  {varianceInfo.variance > 0 ? "+" : ""}
                  {formatCurrency(varianceInfo.variance)} — a reason is required
                </p>
                <textarea
                  value={varianceReason}
                  onChange={(e) => {
                    setVarianceReason(e.target.value);
                    setBilledError("");
                  }}
                  rows={2}
                  placeholder="Explain this variance..."
                  className="w-full border border-surface-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  autoFocus
                />
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={saveWithReason}
                    disabled={saving}
                    className="text-xs bg-brand text-white px-2 py-1 rounded hover:bg-brand-dark disabled:opacity-50"
                  >
                    {saving ? "..." : "Save with Reason"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingBilled(false);
                      setRequiresReason(false);
                      setBilledError("");
                      setVarianceReason("");
                    }}
                    className="text-xs text-text-muted hover:text-text-secondary px-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {billedError && (
              <p className="text-xs text-negative text-right">{billedError}</p>
            )}
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

      {/* Status + Approval */}
      <td className="px-4 py-3">
        {StatusCell()}
      </td>

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
