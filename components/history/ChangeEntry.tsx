import { CloseChange } from "@/lib/types";
import { formatMonth, formatDateTime } from "@/lib/utils";
import DiffTable from "./DiffTable";

export default function ChangeEntry({ change }: { change: CloseChange }) {
  return (
    <div className="bg-white border border-surface-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {formatMonth(change.close_month)}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {change.changed_by_name} · {formatDateTime(change.changed_at)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">Expected total</p>
          <p className="text-sm font-mono font-bold">
            <span className="line-through text-text-muted mr-2">
              ${change.prev_expected_total.toLocaleString()}
            </span>
            <span className={change.new_expected_total > change.prev_expected_total ? "text-negative" : "text-positive"}>
              ${change.new_expected_total.toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      {change.reason && (
        <div className="mb-4 text-xs text-text-secondary bg-surface-muted border-l-2 border-brand px-3 py-2 rounded-r">
          <strong>Reason:</strong> {change.reason}
        </div>
      )}

      <DiffTable
        prevNetUsage={change.prev_net_usage}
        prevRolloverFrom={change.prev_rollover_from_previous}
        prevRolloverTo={change.prev_rollover_to_next}
        prevDiscounts={change.prev_discounts}
        prevTotal={change.prev_expected_total}
        newNetUsage={change.new_net_usage}
        newRolloverFrom={change.new_rollover_from_previous}
        newRolloverTo={change.new_rollover_to_next}
        newDiscounts={change.new_discounts}
        newTotal={change.new_expected_total}
      />
    </div>
  );
}
