import { formatCurrency } from "@/lib/utils";

type LivePreviewBoxProps = {
  netUsage: number;
  rolloverFrom: number;
  rolloverTo: number;
  discounts: number;
};

export default function LivePreviewBox({
  netUsage,
  rolloverFrom,
  rolloverTo,
  discounts,
}: LivePreviewBoxProps) {
  const total = netUsage + rolloverFrom - rolloverTo - discounts;

  return (
    <div className="bg-surface-muted border border-surface-border rounded-lg p-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        Expected Invoice Total
      </p>
      <p className="text-2xl font-bold font-mono text-text-primary mb-4">
        {formatCurrency(total)}
      </p>
      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex justify-between text-text-secondary">
          <span>Net Usage</span>
          <span>{formatCurrency(netUsage)}</span>
        </div>
        <div className="flex justify-between text-positive">
          <span>+ Rollover from previous</span>
          <span>{formatCurrency(rolloverFrom)}</span>
        </div>
        <div className="flex justify-between text-negative">
          <span>− Rollover to next</span>
          <span>{formatCurrency(rolloverTo)}</span>
        </div>
        <div className="flex justify-between text-negative">
          <span>− Discounts</span>
          <span>{formatCurrency(discounts)}</span>
        </div>
        <div className="border-t border-surface-border pt-1.5 mt-1.5 flex justify-between font-bold text-text-primary">
          <span>= Expected Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
