import Link from "next/link";
import { formatCurrency, formatVariance } from "@/lib/utils";

type ClientCardProps = {
  id: string;
  name: string;
  hasCurrentMonthClose: boolean;
  lastVariance: number | null;
};

export default function ClientCard({
  id,
  name,
  hasCurrentMonthClose,
  lastVariance,
}: ClientCardProps) {
  return (
    <div className="bg-white border border-surface-border rounded-lg p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h2 className="font-semibold text-text-primary text-sm">{name}</h2>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            hasCurrentMonthClose
              ? "bg-positive-bg text-positive border border-positive-border"
              : "bg-warning-bg text-warning border border-warning-border"
          }`}
        >
          {hasCurrentMonthClose ? "Close submitted" : "Awaiting close"}
        </span>
      </div>

      {lastVariance !== null && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-0.5">Last variance</p>
          <p
            className={`text-sm font-medium ${
              lastVariance === 0
                ? "text-positive"
                : lastVariance > 0
                ? "text-negative"
                : "text-positive"
            }`}
          >
            {formatVariance(lastVariance)}
          </p>
        </div>
      )}

      <Link
        href={`/clients/${id}`}
        className="text-xs font-medium text-brand hover:text-brand-dark transition-colors"
      >
        View dashboard →
      </Link>
    </div>
  );
}
