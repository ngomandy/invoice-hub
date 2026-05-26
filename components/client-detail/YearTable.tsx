import MonthRow from "./MonthRow";
import { MonthData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type YearTableProps = {
  monthData: MonthData[];
  clientId: string;
  currentMonth: string;
};

export default function YearTable({ monthData, clientId, currentMonth }: YearTableProps) {
  const totalNetUsage    = monthData.reduce((s, m) => s + (m.close?.net_usage             ?? 0), 0);
  const totalRollFrom    = monthData.reduce((s, m) => s + (m.close?.rollover_from_previous ?? 0), 0);
  const totalRollTo      = monthData.reduce((s, m) => s + (m.close?.rollover_to_next       ?? 0), 0);
  const totalDiscounts   = monthData.reduce((s, m) => s + (m.close?.discounts              ?? 0), 0);
  const totalExpected    = monthData.reduce((s, m) => s + (m.close?.expected_total         ?? 0), 0);
  const totalBilled      = monthData.reduce((s, m) => s + (m.billed?.billed_total          ?? 0), 0);
  const totalVariance    = totalBilled - totalExpected;
  const hasBilled        = monthData.some((m) => m.billed !== null);

  return (
    <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-muted border-b border-surface-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-20">Month</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Net Usage</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Rollover From</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Rollover To</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Discounts</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Expected Close</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Billed</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Variance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="group divide-y divide-surface-border">
            {monthData.map((data) => (
              <MonthRow
                key={data.month}
                data={data}
                clientId={clientId}
                isCurrentMonth={data.month === currentMonth}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-muted border-t-2 border-surface-border">
              <td className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">
                Year Total
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold font-mono text-text-primary tabular-nums">
                {totalNetUsage > 0 ? formatCurrency(totalNetUsage) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold font-mono text-text-primary tabular-nums">
                {totalRollFrom > 0 ? formatCurrency(totalRollFrom) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold font-mono text-text-primary tabular-nums">
                {totalRollTo > 0 ? formatCurrency(totalRollTo) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold font-mono text-text-primary tabular-nums">
                {totalDiscounts > 0 ? formatCurrency(totalDiscounts) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold font-mono text-text-primary tabular-nums">
                {formatCurrency(totalExpected)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold font-mono text-text-primary tabular-nums">
                {hasBilled ? formatCurrency(totalBilled) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold font-mono tabular-nums">
                {hasBilled ? (
                  <span className={totalVariance > 0 ? "text-negative" : totalVariance < 0 ? "text-positive" : "text-positive"}>
                    {totalVariance > 0 ? "+" : ""}{formatCurrency(totalVariance)}
                  </span>
                ) : "—"}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
