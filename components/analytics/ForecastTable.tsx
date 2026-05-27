/**
 * ForecastTable — Revenue forecast based on trailing 3-month averages per client.
 * Server component (pure data → render).
 */

import { formatCurrency } from "@/lib/utils";

export type ForecastEntry = {
  clientId:           string;
  clientName:         string;
  trailing3Avg:       number;   // average expected_total over last 3 months
  monthsUsed:         number;   // how many months fed into the average (1–3)
  trend:              "up" | "down" | "flat";
  lastMonthExpected:  number;
};

type Props = {
  forecasts: ForecastEntry[];
};

const TREND_META = {
  up:   { icon: "↑", label: "Growing",  cls: "text-positive" },
  down: { icon: "↓", label: "Declining", cls: "text-negative" },
  flat: { icon: "→", label: "Stable",   cls: "text-text-muted" },
};

export default function ForecastTable({ forecasts }: Props) {
  if (forecasts.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-8">
        Not enough data yet to generate forecasts.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-surface-border bg-surface-muted">
          <th className="text-left   px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Client</th>
          <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Last Month</th>
          <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">3-Mo Avg</th>
          <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Projected</th>
          <th className="text-center px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Trend</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-border">
        {forecasts.map((f) => {
          const { icon, label, cls } = TREND_META[f.trend];
          return (
            <tr key={f.clientId} className="hover:bg-surface-muted/50 transition-colors">
              <td className="px-4 py-3 font-medium text-text-primary">{f.clientName}</td>
              <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                {f.lastMonthExpected > 0 ? formatCurrency(f.lastMonthExpected) : <span className="text-text-muted">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                {formatCurrency(f.trailing3Avg)}
                {f.monthsUsed < 3 && (
                  <span className="ml-1 text-xs text-text-muted">({f.monthsUsed}mo)</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-text-primary tabular-nums">
                {formatCurrency(f.trailing3Avg)}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-sm font-medium ${cls}`}>
                  {icon} {label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-surface-border bg-surface-muted">
          <td className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">
            Portfolio Total
          </td>
          <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-text-primary">
            {formatCurrency(forecasts.reduce((s, f) => s + f.lastMonthExpected, 0))}
          </td>
          <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-text-primary">
            {formatCurrency(forecasts.reduce((s, f) => s + f.trailing3Avg, 0))}
          </td>
          <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-text-primary">
            {formatCurrency(forecasts.reduce((s, f) => s + f.trailing3Avg, 0))}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}
