export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "void";

const CONFIG: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft:   { label: "Draft",   cls: "bg-surface-muted text-text-secondary border-surface-border" },
  sent:    { label: "Sent",    cls: "bg-brand/10 text-brand border-brand/20" },
  viewed:  { label: "Viewed",  cls: "bg-purple-50 text-purple-700 border-purple-200" },
  paid:    { label: "Paid",    cls: "bg-positive-bg text-positive border-positive-border" },
  overdue: { label: "Overdue", cls: "bg-negative-bg text-negative border-negative-border" },
  void:    { label: "Void",    cls: "bg-surface-muted text-text-muted border-surface-border line-through" },
};

export default function InvoiceStatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as InvoiceStatus] ?? CONFIG.draft;
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
