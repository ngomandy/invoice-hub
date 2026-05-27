import { formatCurrency } from "@/lib/utils";

type Props = {
  totalExpected: number;
  totalBilled:   number;
  netVariance:   number;
  closedCount:   number;   // clients with a close this month
  billedCount:   number;   // clients with a billed amount this month
  totalClients:  number;
  hasBilled:     boolean;
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label:   string;
  value:   React.ReactNode;
  sub?:    React.ReactNode;
  accent?: "positive" | "negative" | "warning" | "neutral";
}) {
  const accentClass =
    accent === "positive" ? "text-positive" :
    accent === "negative" ? "text-negative" :
    accent === "warning"  ? "text-warning"  :
    "text-text-primary";

  return (
    <div className="bg-white border border-surface-border rounded-lg px-5 py-4 flex-1 min-w-0">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-tight ${accentClass}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function StatCards({
  totalExpected,
  totalBilled,
  netVariance,
  closedCount,
  billedCount,
  totalClients,
  hasBilled,
}: Props) {
  const closeCompletionPct = totalClients > 0
    ? Math.round((closedCount / totalClients) * 100)
    : 0;

  const billedCompletionPct = totalClients > 0
    ? Math.round((billedCount / totalClients) * 100)
    : 0;

  const varianceAccent = !hasBilled
    ? "neutral"
    : netVariance === 0
    ? "positive"
    : netVariance > 0
    ? "negative"   // overbilled = red
    : "warning";   // underbilled = amber

  const varianceLabel =
    !hasBilled   ? "—" :
    netVariance > 0 ? `+${formatCurrency(netVariance)}` :
    netVariance < 0 ? formatCurrency(netVariance) :
    "On target";

  return (
    <div className="flex gap-3 mb-6">
      <StatCard
        label="Expected Close"
        value={closedCount > 0 ? formatCurrency(totalExpected) : "—"}
        sub={`${closedCount} of ${totalClients} clients closed`}
        accent="neutral"
      />
      <StatCard
        label="Billed Amount"
        value={hasBilled ? formatCurrency(totalBilled) : "—"}
        sub={hasBilled ? `${billedCount} of ${totalClients} clients entered` : "No entries yet"}
        accent="neutral"
      />
      <StatCard
        label="Net Variance"
        value={varianceLabel}
        sub={
          !hasBilled ? "Enter billed amounts to see variance" :
          netVariance > 0 ? "Overbilled vs. expected" :
          netVariance < 0 ? "Underbilled vs. expected" :
          "Billed matches expected"
        }
        accent={varianceAccent}
      />
      <StatCard
        label="Completion"
        value={`${closeCompletionPct}%`}
        sub={
          billedCount > 0
            ? `Closes: ${closedCount}/${totalClients} · Billed: ${billedCount}/${totalClients} (${billedCompletionPct}%)`
            : `${closedCount} of ${totalClients} closes submitted`
        }
        accent={
          closeCompletionPct === 100 ? "positive" :
          closeCompletionPct >= 75   ? "neutral"  :
          "warning"
        }
      />
    </div>
  );
}
