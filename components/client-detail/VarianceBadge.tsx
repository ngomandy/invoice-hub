import { formatVariance } from "@/lib/utils";

export default function VarianceBadge({ variance }: { variance: number | null }) {
  if (variance === null) {
    return <span className="text-text-muted text-sm">—</span>;
  }
  if (variance === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-positive-bg text-positive border border-positive-border">
        On target
      </span>
    );
  }
  if (variance > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-negative-bg text-negative border border-negative-border">
        +{formatVariance(variance).replace("+", "")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-positive-bg text-positive border border-positive-border">
      {formatVariance(variance)}
    </span>
  );
}
