import { createClient } from "@/lib/supabase/server";
import BulkBilledTable from "@/components/billed/BulkBilledTable";
import { getCurrentMonthStr, formatMonth, toFirstOfMonth } from "@/lib/utils";

export default async function BulkBilledPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase     = createClient();
  const currentMonth = getCurrentMonthStr();
  const selectedMonth = searchParams.month ?? currentMonth;

  // Build available months list (last 24 months + current)
  const now = new Date();
  const monthOptions: string[] = [];
  for (let i = 0; i <= 23; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(toFirstOfMonth(d.getFullYear(), d.getMonth() + 1));
  }

  const [
    { data: clients },
    { data: closes },
    { data: billed },
  ] = await Promise.all([
    supabase.from("clients").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("revenue_closes")
      .select("client_id, expected_total")
      .eq("close_month", selectedMonth)
      .eq("is_current", true),
    supabase
      .from("billed_amounts")
      .select("client_id, billed_total, variance_reason")
      .eq("close_month", selectedMonth),
  ]);

  const closeMap  = new Map((closes  ?? []).map((c) => [c.client_id, c.expected_total]));
  const billedMap = new Map((billed  ?? []).map((b) => [b.client_id, b]));

  const tableClients = (clients ?? []).map((c) => ({
    id:             c.id,
    name:           c.name,
    expectedTotal:  closeMap.get(c.id) ?? null,
    currentBilled:  billedMap.get(c.id)?.billed_total ?? null,
    varianceReason: billedMap.get(c.id)?.variance_reason ?? null,
  }));

  const enteredCount = tableClients.filter((c) => c.currentBilled != null).length;
  const missingCount = tableClients.filter((c) => c.expectedTotal != null && c.currentBilled == null).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Bulk Billed Entry</h1>
          <p className="text-sm text-text-muted mt-1">
            {formatMonth(selectedMonth)} · {enteredCount} of {tableClients.length} entered
            {missingCount > 0 && (
              <span className="ml-1.5 text-warning font-medium">· {missingCount} missing</span>
            )}
          </p>
        </div>

        {/* Month selector */}
        <select
          defaultValue={selectedMonth}
          onChange={(e) => {
            if (typeof window !== "undefined") {
              window.location.href = `/billed?month=${e.target.value}`;
            }
          }}
          className="text-sm border border-surface-border rounded-md px-3 py-2 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>
      </div>

      {/* Progress bar */}
      {tableClients.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>{enteredCount} entered</span>
            <span>{tableClients.length} total clients</span>
          </div>
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${tableClients.length > 0 ? (enteredCount / tableClients.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <BulkBilledTable clients={tableClients} month={selectedMonth} />
    </div>
  );
}
