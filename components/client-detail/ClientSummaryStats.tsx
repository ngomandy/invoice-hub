import { formatCurrency, formatVariance } from "@/lib/utils";

type CloseData = {
  expected_total: number;
};

type BilledData = {
  billed_total: number;
};

type MonthEntry = {
  month:  string;
  close:  CloseData | null;
  billed: BilledData | null;
};

type Props = {
  monthData:    MonthEntry[];
  selectedYear: number;
};

export default function ClientSummaryStats({ monthData, selectedYear }: Props) {
  const withClose  = monthData.filter((m) => m.close  != null);
  const withBilled = monthData.filter((m) => m.billed != null);
  const withBoth   = monthData.filter((m) => m.close != null && m.billed != null);

  const totalExpected = withClose.reduce((s, m) => s + (m.close!.expected_total), 0);
  const totalBilled   = withBilled.reduce((s, m) => s + (m.billed!.billed_total), 0);
  const netVariance   = withBoth.length > 0 ? totalBilled - totalExpected : null;

  const avgVariancePct =
    withBoth.length > 0
      ? (withBoth.reduce((s, m) => {
          const v = m.billed!.billed_total - m.close!.expected_total;
          const pct = m.close!.expected_total > 0 ? (v / m.close!.expected_total) * 100 : 0;
          return s + pct;
        }, 0) / withBoth.length)
      : null;

  // Best month (most positive variance) and worst (most negative)
  const variances = withBoth.map((m) => ({
    month:    m.month,
    variance: m.billed!.billed_total - m.close!.expected_total,
  }));

  const completionPct = Math.round((withClose.length / 12) * 100);

  if (withClose.length === 0 && withBilled.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Total Expected */}
      <div className="bg-white border border-surface-border rounded-lg px-4 py-3">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
          {selectedYear} Expected
        </p>
        <p className="text-xl font-bold text-text-primary tabular-nums">
          {withClose.length > 0 ? formatCurrency(totalExpected) : "—"}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5">
          {withClose.length} month{withClose.length !== 1 ? "s" : ""} closed
        </p>
      </div>

      {/* Total Billed */}
      <div className="bg-white border border-surface-border rounded-lg px-4 py-3">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
          {selectedYear} Billed
        </p>
        <p className="text-xl font-bold text-text-primary tabular-nums">
          {withBilled.length > 0 ? formatCurrency(totalBilled) : "—"}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5">
          {withBilled.length} month{withBilled.length !== 1 ? "s" : ""} entered
        </p>
      </div>

      {/* Net Variance */}
      <div className="bg-white border border-surface-border rounded-lg px-4 py-3">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
          Net Variance
        </p>
        {netVariance != null ? (
          <>
            <p className={`text-xl font-bold tabular-nums ${
              netVariance === 0 ? "text-positive" : netVariance > 0 ? "text-negative" : "text-positive"
            }`}>
              {formatVariance(netVariance)}
            </p>
            <p className={`text-[11px] mt-0.5 ${
              avgVariancePct != null && Math.abs(avgVariancePct) > 5 ? "text-warning" : "text-text-muted"
            }`}>
              {avgVariancePct != null
                ? `Avg ${avgVariancePct > 0 ? "+" : ""}${avgVariancePct.toFixed(1)}% / month`
                : ""}
            </p>
          </>
        ) : (
          <p className="text-xl font-bold text-text-muted">—</p>
        )}
      </div>

      {/* Close Completion */}
      <div className="bg-white border border-surface-border rounded-lg px-4 py-3">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
          Completion
        </p>
        <p className={`text-xl font-bold ${
          completionPct === 100 ? "text-positive" :
          completionPct >= 75  ? "text-text-primary" :
          "text-warning"
        }`}>
          {completionPct}%
        </p>
        <p className="text-[11px] text-text-muted mt-0.5">
          {withClose.length}/12 months closed
          {variances.length > 0 && (() => {
            const best  = variances.reduce((a, b) => b.variance > a.variance ? b : a);
            const worst = variances.reduce((a, b) => b.variance < a.variance ? b : a);
            if (best.variance === worst.variance) return null;
            return null; // too verbose for the sub-label
          })()}
        </p>
      </div>
    </div>
  );
}
