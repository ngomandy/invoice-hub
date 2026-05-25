import MonthRow from "./MonthRow";
import { MonthData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type YearTableProps = {
  monthData: MonthData[];
  clientId: string;
  currentMonth: string;
};

export default function YearTable({ monthData, clientId, currentMonth }: YearTableProps) {
  const totalClose = monthData.reduce(
    (sum, m) => sum + (m.close?.expected_total ?? 0),
    0
  );
  const totalBilled = monthData.reduce(
    (sum, m) => sum + (m.billed?.billed_total ?? 0),
    0
  );
  const totalVariance = totalBilled - totalClose;

  return (
    <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-muted border-b border-surface-border">
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-24">Month</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Close Amount</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Billed Amount</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Variance</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="group">
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
            <td className="px-4 py-3 text-sm font-bold font-mono text-text-primary">
              {formatCurrency(totalClose)}
            </td>
            <td className="px-4 py-3 text-sm font-bold font-mono text-text-primary">
              {totalBilled > 0 ? formatCurrency(totalBilled) : "—"}
            </td>
            <td className="px-4 py-3 text-sm font-bold font-mono">
              {totalBilled > 0 ? (
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
  );
}
