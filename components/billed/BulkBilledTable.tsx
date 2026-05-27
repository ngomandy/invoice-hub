"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatVariance } from "@/lib/utils";

type ClientRow = {
  id:             string;
  name:           string;
  expectedTotal:  number | null;
  currentBilled:  number | null;
  varianceReason: string | null;
};

type Props = {
  clients: ClientRow[];
  month:   string;
};

type RowState = {
  editing:        boolean;
  value:          string;
  saving:         boolean;
  error:          string;
  requiresReason: boolean;
  varianceInfo:   { variance: number } | null;
  varianceReason: string;
  savedBilled:    number | null;
};

export default function BulkBilledTable({ clients, month }: Props) {
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    clients.forEach((c) => {
      init[c.id] = {
        editing:        false,
        value:          c.currentBilled != null ? String(c.currentBilled) : "",
        saving:         false,
        error:          "",
        requiresReason: false,
        varianceInfo:   null,
        varianceReason: "",
        savedBilled:    c.currentBilled,
      };
    });
    return init;
  });

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveBilled(clientId: string, withReason?: string) {
    const row = rows[clientId];
    if (!row.value) return;
    updateRow(clientId, { saving: true, error: "" });

    const res = await fetch("/api/billed", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:    clientId,
        close_month:  month,
        billed_total: parseFloat(row.value),
        ...(withReason ? { variance_reason: withReason } : {}),
      }),
    });

    if (res.status === 422) {
      const data = await res.json().catch(() => ({}));
      if (data.requiresReason) {
        updateRow(clientId, { saving: false, requiresReason: true, varianceInfo: { variance: data.variance } });
        return;
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      updateRow(clientId, { saving: false, error: data.error || "Failed to save" });
      return;
    }

    updateRow(clientId, {
      saving:         false,
      editing:        false,
      requiresReason: false,
      varianceReason: "",
      varianceInfo:   null,
      savedBilled:    parseFloat(row.value),
    });
    router.refresh();
  }

  const totalExpected = clients.reduce((s, c) => s + (c.expectedTotal ?? 0), 0);
  const totalBilled   = Object.values(rows).reduce((s, r) => s + (r.savedBilled ?? 0), 0);
  const totalVariance = totalBilled - totalExpected;
  const hasBilled     = Object.values(rows).some((r) => r.savedBilled != null);

  return (
    <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted border-b border-surface-border">
              <th className="text-left   px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Client</th>
              <th className="text-right  px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Expected Close</th>
              <th className="text-right  px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Billed Amount</th>
              <th className="text-right  px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Variance</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {clients.map((client) => {
              const row       = rows[client.id];
              const variance  = client.expectedTotal != null && row.savedBilled != null
                ? row.savedBilled - client.expectedTotal : null;

              return (
                <tr key={client.id} className="hover:bg-surface-muted/30 transition-colors">
                  {/* Client */}
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium text-text-primary hover:text-brand transition-colors">
                      {client.name}
                    </Link>
                    {client.expectedTotal == null && (
                      <span className="ml-2 text-xs text-warning bg-warning-bg border border-warning-border px-1.5 py-0.5 rounded">
                        No close
                      </span>
                    )}
                  </td>

                  {/* Expected */}
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {client.expectedTotal != null ? formatCurrency(client.expectedTotal) : <span className="text-text-muted">—</span>}
                  </td>

                  {/* Billed — inline editable */}
                  <td className="px-4 py-3 text-right">
                    {row.editing ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={row.value}
                            onChange={(e) => updateRow(client.id, { value: e.target.value, requiresReason: false, error: "" })}
                            className="w-28 border border-surface-border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand"
                            autoFocus
                            step="0.01"
                          />
                          {!row.requiresReason && (
                            <>
                              <button
                                onClick={() => saveBilled(client.id)}
                                disabled={row.saving}
                                className="text-xs bg-brand text-white px-2 py-1 rounded hover:bg-brand-dark disabled:opacity-50"
                              >
                                {row.saving ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() => updateRow(client.id, { editing: false, requiresReason: false, error: "" })}
                                className="text-xs text-text-muted hover:text-text-secondary"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>

                        {/* Variance reason prompt */}
                        {row.requiresReason && row.varianceInfo && (
                          <div className="p-2 border border-warning-border bg-warning-bg rounded text-left mt-1">
                            <p className="text-xs text-warning font-medium mb-1">
                              ⚠ Variance of {row.varianceInfo.variance > 0 ? "+" : ""}{formatCurrency(row.varianceInfo.variance)} — reason required
                            </p>
                            <textarea
                              value={row.varianceReason}
                              onChange={(e) => updateRow(client.id, { varianceReason: e.target.value, error: "" })}
                              rows={2}
                              placeholder="Explain this variance…"
                              className="w-full border border-surface-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                              autoFocus
                            />
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => saveBilled(client.id, row.varianceReason.trim())}
                                disabled={row.saving || !row.varianceReason.trim()}
                                className="text-xs bg-brand text-white px-2 py-1 rounded disabled:opacity-50"
                              >
                                {row.saving ? "…" : "Save with Reason"}
                              </button>
                              <button
                                onClick={() => updateRow(client.id, { editing: false, requiresReason: false, varianceReason: "", error: "" })}
                                className="text-xs text-text-muted hover:text-text-secondary px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                        {row.error && <p className="text-xs text-negative text-right">{row.error}</p>}
                      </div>
                    ) : (
                      <span className="font-mono tabular-nums text-text-secondary">
                        {row.savedBilled != null ? formatCurrency(row.savedBilled) : <span className="text-text-muted">—</span>}
                      </span>
                    )}
                  </td>

                  {/* Variance */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {variance != null ? (
                      <span className={`font-medium ${variance === 0 ? "text-positive" : variance > 0 ? "text-negative" : "text-positive"}`}>
                        {formatVariance(variance)}
                      </span>
                    ) : <span className="text-text-muted">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {!row.editing && (
                      <button
                        onClick={() => updateRow(client.id, { editing: true })}
                        className="text-xs text-brand hover:text-brand-dark whitespace-nowrap"
                      >
                        {row.savedBilled != null ? "Edit" : "Enter"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {clients.length > 1 && (
            <tfoot>
              <tr className="bg-surface-muted border-t-2 border-surface-border">
                <td className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Totals</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-text-primary tabular-nums">{formatCurrency(totalExpected)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-text-primary tabular-nums">{hasBilled ? formatCurrency(totalBilled) : "—"}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">
                  {hasBilled ? (
                    <span className={totalVariance === 0 ? "text-positive" : totalVariance > 0 ? "text-negative" : "text-positive"}>
                      {formatVariance(totalVariance)}
                    </span>
                  ) : "—"}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
