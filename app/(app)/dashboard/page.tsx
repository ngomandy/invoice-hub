import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import ExportMenu from "@/components/export/ExportMenu";
import { getCurrentMonthStr, formatMonth, formatCurrency } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string; exclude?: string };
}) {
  const supabase = createClient();
  const currentMonth = getCurrentMonthStr();

  // Resolve selected month and excluded client IDs from URL params
  const selectedMonth = searchParams.month ?? currentMonth;
  const excludedIds = searchParams.exclude
    ? searchParams.exclude.split(",").filter(Boolean)
    : [];

  // Fetch all clients + available months in parallel
  const [{ data: allClients }, { data: monthRows }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("revenue_closes")
      .select("close_month")
      .eq("is_current", true)
      .order("close_month", { ascending: false }),
  ]);

  // Build a deduplicated, sorted list of available months (most recent first)
  // Always include the current month even if no closes exist yet
  const monthSet = new Set<string>([currentMonth]);
  (monthRows ?? []).forEach((r) => monthSet.add(r.close_month));
  const availableMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

  // Fetch close + billed data for the selected month
  const [{ data: currentCloses }, { data: currentBilled }] = await Promise.all([
    supabase
      .from("revenue_closes")
      .select("client_id, expected_total, net_usage, rollover_from_previous, rollover_to_next, discounts")
      .eq("close_month", selectedMonth)
      .eq("is_current", true),
    supabase
      .from("billed_amounts")
      .select("client_id, billed_total")
      .eq("close_month", selectedMonth),
  ]);

  // Apply client exclusion filter
  const visibleClients = (allClients ?? []).filter(
    (c) => !excludedIds.includes(c.id)
  );

  // Build export rows for visible clients only
  const closeMap = Object.fromEntries(
    (currentCloses ?? []).map((c) => [c.client_id, c])
  );
  const billedMap = Object.fromEntries(
    (currentBilled ?? []).map((b) => [b.client_id, b])
  );

  const exportRows = visibleClients.map((client) => {
    const close = closeMap[client.id];
    const billed = billedMap[client.id];
    const variance =
      close && billed ? billed.billed_total - close.expected_total : null;

    return {
      Client: client.name,
      Month: formatMonth(selectedMonth),
      "Net Usage": close ? formatCurrency(close.net_usage ?? 0) : "",
      "Rollover From": close ? formatCurrency(close.rollover_from_previous ?? 0) : "",
      "Rollover To": close ? formatCurrency(close.rollover_to_next ?? 0) : "",
      Discounts: close ? formatCurrency(close.discounts ?? 0) : "",
      "Expected Close": close ? formatCurrency(close.expected_total) : "",
      "Billed Amount": billed ? formatCurrency(billed.billed_total) : "",
      Variance:
        variance !== null
          ? (variance >= 0 ? "+" : "") + formatCurrency(variance)
          : "",
      Status: close ? "Close submitted" : "Awaiting close",
    };
  });

  const exportTitle = `All Clients — ${formatMonth(selectedMonth)}`;
  const exportSubtitle = `Generated ${new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            {formatMonth(selectedMonth)} · {visibleClients.length} client{visibleClients.length !== 1 ? "s" : ""}
            {excludedIds.length > 0 && (
              <span className="ml-1 text-brand">({excludedIds.length} excluded)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            rows={exportRows}
            filename={`invoice-hub-${selectedMonth}`}
            title={exportTitle}
            subtitle={exportSubtitle}
          />
          <Link
            href="/import"
            className="inline-flex items-center gap-2 bg-white border border-surface-border text-text-secondary text-sm font-medium px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Link>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
          >
            + Add Client
          </Link>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters
        months={availableMonths}
        clients={allClients ?? []}
        selectedMonth={selectedMonth}
        excludedIds={excludedIds}
      />

      {/* Table */}
      <DashboardTable
        clients={visibleClients}
        currentCloses={currentCloses ?? []}
        currentBilled={currentBilled ?? []}
      />
    </div>
  );
}
