import Link from "next/link";
import { formatCurrency, formatVariance } from "@/lib/utils";
import HealthBadge, { type HealthGrade } from "@/components/dashboard/HealthBadge";
import Sparkline from "@/components/dashboard/Sparkline";

type CloseRow = {
  client_id: string;
  net_usage: number | null;
  rollover_from_previous: number | null;
  rollover_to_next: number | null;
  discounts: number | null;
  expected_total: number;
};

type BilledRow = {
  client_id: string;
  billed_total: number;
};

type DashboardTableProps = {
  clients:       { id: string; name: string }[];
  currentCloses: CloseRow[];
  currentBilled: BilledRow[];
  healthGrades:  Record<string, HealthGrade>;
  sparklineData: Record<string, (number | null)[]>;
};

export default function DashboardTable({
  clients,
  currentCloses,
  currentBilled,
  healthGrades,
  sparklineData,
}: DashboardTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-surface-border rounded-lg">
        <p className="text-text-muted text-sm mb-4">No clients yet.</p>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
        >
          + Add your first client
        </Link>
      </div>
    );
  }

  const closeMap  = Object.fromEntries(currentCloses.map((c) => [c.client_id, c]));
  const billedMap = Object.fromEntries(currentBilled.map((b) => [b.client_id, b]));

  return (
    <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted">
              <th className="text-left  px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Client</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Net Usage</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Rollover From</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Rollover To</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Discounts</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Expected Close</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Billed</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Variance</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Health</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">6m Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {clients.map((client) => {
              const close    = closeMap[client.id]  ?? null;
              const billed   = billedMap[client.id] ?? null;
              const variance = close && billed ? billed.billed_total - close.expected_total : null;
              const grade    = healthGrades[client.id]  ?? "new";
              const points   = sparklineData[client.id] ?? Array(6).fill(null);

              return (
                <tr key={client.id} className="hover:bg-surface-muted/50 transition-colors">
                  {/* Client name */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-text-primary hover:text-brand transition-colors"
                    >
                      {client.name}
                    </Link>
                  </td>

                  {/* Net Usage */}
                  <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                    {close?.net_usage != null ? formatCurrency(close.net_usage) : <span className="text-text-muted">—</span>}
                  </td>

                  {/* Rollover From Previous */}
                  <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                    {close?.rollover_from_previous != null ? formatCurrency(close.rollover_from_previous) : <span className="text-text-muted">—</span>}
                  </td>

                  {/* Rollover To Next */}
                  <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                    {close?.rollover_to_next != null ? formatCurrency(close.rollover_to_next) : <span className="text-text-muted">—</span>}
                  </td>

                  {/* Discounts */}
                  <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                    {close?.discounts != null ? formatCurrency(close.discounts) : <span className="text-text-muted">—</span>}
                  </td>

                  {/* Expected Close */}
                  <td className="px-4 py-3 text-right font-medium text-text-primary tabular-nums">
                    {close ? formatCurrency(close.expected_total) : <span className="text-text-muted">—</span>}
                  </td>

                  {/* Billed */}
                  <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                    {billed ? formatCurrency(billed.billed_total) : <span className="text-text-muted">—</span>}
                  </td>

                  {/* Variance */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {variance !== null ? (
                      <span className={`font-medium ${
                        variance === 0 ? "text-positive" : variance > 0 ? "text-negative" : "text-positive"
                      }`}>
                        {formatVariance(variance)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                      close
                        ? "bg-positive-bg text-positive border border-positive-border"
                        : "bg-warning-bg text-warning border border-warning-border"
                    }`}>
                      {close ? "Submitted" : "Awaiting"}
                    </span>
                  </td>

                  {/* Health */}
                  <td className="px-4 py-3 text-center">
                    <HealthBadge grade={grade} />
                  </td>

                  {/* 6-month Sparkline */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Sparkline points={points} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          {clients.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-surface-border bg-surface-muted">
                <td className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Totals
                </td>
                <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums text-sm">
                  {formatCurrency(currentCloses.reduce((s, c) => s + (c.net_usage ?? 0), 0))}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums text-sm">
                  {formatCurrency(currentCloses.reduce((s, c) => s + (c.rollover_from_previous ?? 0), 0))}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums text-sm">
                  {formatCurrency(currentCloses.reduce((s, c) => s + (c.rollover_to_next ?? 0), 0))}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums text-sm">
                  {formatCurrency(currentCloses.reduce((s, c) => s + (c.discounts ?? 0), 0))}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums text-sm">
                  {formatCurrency(currentCloses.reduce((s, c) => s + c.expected_total, 0))}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums text-sm">
                  {formatCurrency(currentBilled.reduce((s, b) => s + b.billed_total, 0))}
                </td>
                {(() => {
                  const totalExpected = currentCloses.reduce((s, c) => s + c.expected_total, 0);
                  const totalBilled   = currentBilled.reduce((s, b) => s + b.billed_total, 0);
                  const totalVariance = totalBilled - totalExpected;
                  return (
                    <td className="px-4 py-3 text-right tabular-nums text-sm">
                      {currentBilled.length > 0 ? (
                        <span className={`font-semibold ${
                          totalVariance === 0 ? "text-positive" : totalVariance > 0 ? "text-negative" : "text-positive"
                        }`}>
                          {formatVariance(totalVariance)}
                        </span>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                  );
                })()}
                {/* Status, Health, Trend — no totals */}
                <td /><td /><td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
