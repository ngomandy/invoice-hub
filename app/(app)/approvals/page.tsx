import { createClient } from "@/lib/supabase/server";
import ApprovalRow from "@/components/approvals/ApprovalRow";
import { formatCurrency } from "@/lib/utils";

export default async function ApprovalsPage() {
  const supabase = createClient();

  const { data: rawCloses } = await supabase
    .from("revenue_closes")
    .select("*, profiles(full_name), clients(name)")
    .in("approval_status", ["submitted", "under_review"])
    .eq("is_current", true)
    .order("close_month", { ascending: false });

  // Flatten joins
  const closes = (rawCloses ?? []).map((c) => ({
    ...c,
    client_name:        (c.clients  as { name: string }       | null)?.name       ?? "Unknown",
    submitted_by_name:  (c.profiles as { full_name: string }  | null)?.full_name  ?? undefined,
  }));

  const needsReview  = closes.filter((c) => c.approval_status === "submitted");
  const underReview  = closes.filter((c) => c.approval_status === "under_review");

  const totalPending  = needsReview.length + underReview.length;
  const totalValue    = closes.reduce((s, c) => s + (c.expected_total ?? 0), 0);

  const TABLE_HEADER = (
    <tr className="border-b border-surface-border bg-surface-muted">
      <th className="text-left   px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Client</th>
      <th className="text-left   px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Month</th>
      <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Expected Close</th>
      <th className="text-left   px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">Submitted By</th>
      <th className="text-left   px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
      <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
    </tr>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pending Approvals</h1>
          <p className="text-sm text-text-muted mt-1">
            {totalPending === 0
              ? "All closes are approved — nothing to action."
              : `${totalPending} close${totalPending !== 1 ? "s" : ""} awaiting action · ${formatCurrency(totalValue)} in value`}
          </p>
        </div>
      </div>

      {totalPending === 0 ? (
        <div className="bg-positive-bg border border-positive-border rounded-lg p-8 text-center">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-sm font-semibold text-positive">All caught up!</p>
          <p className="text-xs text-positive/80 mt-1">No closes are waiting for review or approval.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Needs Review ─────────────────────────────────────────────────── */}
          {needsReview.length > 0 && (
            <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand/10 text-brand text-xs font-bold">
                  {needsReview.length}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">Needs Review</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Submitted closes not yet picked up for review
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>{TABLE_HEADER}</thead>
                  <tbody className="divide-y divide-surface-border">
                    {needsReview.map((c) => (
                      <ApprovalRow key={c.id} close={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Under Review ──────────────────────────────────────────────────── */}
          {underReview.length > 0 && (
            <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning-bg border border-warning-border text-warning text-xs font-bold">
                  {underReview.length}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">Under Review</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    In-progress reviews — approve or reject to close out
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>{TABLE_HEADER}</thead>
                  <tbody className="divide-y divide-surface-border">
                    {underReview.map((c) => (
                      <ApprovalRow key={c.id} close={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
