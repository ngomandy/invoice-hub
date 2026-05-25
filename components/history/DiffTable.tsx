import { formatCurrency } from "@/lib/utils";

type DiffRow = {
  label: string;
  prev: number;
  next: number;
};

function Row({ label, prev, next }: DiffRow) {
  const changed = prev !== next;
  const delta = next - prev;
  return (
    <tr className={changed ? "bg-warning-bg" : ""}>
      <td className="px-3 py-2 text-xs text-text-secondary">{label}</td>
      <td className={`px-3 py-2 text-xs font-mono ${changed ? "line-through text-text-muted" : "text-text-primary"}`}>
        {formatCurrency(prev)}
      </td>
      <td className={`px-3 py-2 text-xs font-mono font-bold ${changed ? "text-text-primary" : "text-text-muted"}`}>
        {formatCurrency(next)}
      </td>
      <td className={`px-3 py-2 text-xs font-mono ${delta > 0 ? "text-negative" : delta < 0 ? "text-positive" : "text-text-muted"}`}>
        {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${formatCurrency(delta)}`}
      </td>
    </tr>
  );
}

type DiffTableProps = {
  prevNetUsage: number;
  prevRolloverFrom: number;
  prevRolloverTo: number;
  prevDiscounts: number;
  prevTotal: number;
  newNetUsage: number;
  newRolloverFrom: number;
  newRolloverTo: number;
  newDiscounts: number;
  newTotal: number;
};

export default function DiffTable({
  prevNetUsage, prevRolloverFrom, prevRolloverTo, prevDiscounts, prevTotal,
  newNetUsage, newRolloverFrom, newRolloverTo, newDiscounts, newTotal,
}: DiffTableProps) {
  return (
    <table className="w-full text-left border border-surface-border rounded overflow-hidden text-sm">
      <thead>
        <tr className="bg-surface-muted">
          <th className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Field</th>
          <th className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Before</th>
          <th className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">After</th>
          <th className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Change</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-border">
        <Row label="Net Usage" prev={prevNetUsage} next={newNetUsage} />
        <Row label="Rollover From Previous" prev={prevRolloverFrom} next={newRolloverFrom} />
        <Row label="Rollover To Next" prev={prevRolloverTo} next={newRolloverTo} />
        <Row label="Discounts" prev={prevDiscounts} next={newDiscounts} />
        <Row label="Expected Total" prev={prevTotal} next={newTotal} />
      </tbody>
    </table>
  );
}
