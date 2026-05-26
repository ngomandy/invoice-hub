import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import ExportMenu from "@/components/export/ExportMenu";
import { getCurrentMonthStr, formatMonth, formatCurrency } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    month?: string;
    exclude?: string;
    status?: string;
    variance?: string;
    billed?: string;
  };
}) {
  const supabase = createClient();
  const currentMonth = getCurrentMonthStr();

  // ── Resolve filter params ───────────────────────────────────────────────────
  const selectedMonth  = searchParams.month    ?? currentMonth;
  const statusFilter   = searchParams.status   ?? "all";
  const varianceFilter = searchParams.variance ?? "all";
  const billedFilter   = searchParams.billed   ?? "all";
  const excludedIds    = searchParams.exclude
    ? searchParams.exclude.split(",").filter(Boolean)
    : [];

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const [
    { data: allClients },
    { data: monthRows },
    { data: currentCloses },
    { data: currentBilled },
  ] = await Promise.all([
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

  // ── Available months list (most-recent first, always include current) ────────
  const monthSet = new Set<string>([currentMonth]);
  (monthRows ?? []).forEach((r) => monthSet.add(r.close_month));
  const availableMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

  // ── Build lookup maps ────────────────────────────────────────────────────────
  const closeMap = Object.fromEntries(
    (currentCloses ?? []).map((c) => [c.client_id, c])
  );
  const billedMap = Object.fromEntries(
    (currentBilled ?? []).map((b) => [b.client_id, b])
  );

  // ── Apply all filters ────────────────────────────────────────────────────────
  let visibleClients = (allClients ?? []);

  // 1. Client exclusion
  if (excludedIds.length > 0) {
    visibleClients = visibleClients.filter((c) => !excludedIds.includes(c.id));
  }

  // 2. Close status
  if (statusFilter !== "all") {
    visibleClients = visibleClients.filter((c) => {
      const hasClose = !!closeMap[c.id];
      return statusFilter === "submitted" ? hasClose : !hasClose;
    });
  }

  // 3. Billed entry
  if (billedFilter !== "all") {
    visibleClients = visibleClients.filter((c) => {
      const hasBilled = !!billedMap[c.id];
      return billedFilter === "entered" ? hasBilled : !hasBilled;
    });
  }

  // 4. Variance direction
  if (varianceFilter !== "all") {
    visibleClients = visibleClients.filter((c) => {
      const close  = closeMap[c.id];
      const billed = billedMap[c.id];
      if (!close || !billed) return false; // no variance computable
      const v = billed.billed_total - close.expected_total;
      if (varianceFilter === "overbilled")   return v > 0;
      if (varianceFilter === "underbilled")  return v < 0;
      if (varianceFilter === "on-target")    return v === 0;
      if (varianceFilter === "has-variance") return v !== 0;
      return true;
    });
  }

  // ── Export rows (respects all active filters) ────────────────────────────────
  const exportRows = visibleClients.map((client) => {
    const close  = closeMap[client.id];
    const billed = billedMap[client.id];
    const variance =
      close && billed ? billed.billed_total - close.expected_total : null;

    return {
      Client:           client.name,
      Month:            formatMonth(selectedMonth),
      "Net Usage":      close  ? formatCurrency(close.net_usage              ?? 0) : "",
      "Rollover From":  close  ? formatCurrency(close.rollover_from_previous ?? 0) : "",
      "Rollover To":    close  ? formatCurrency(close.rollover_to_next       ?? 0) : "",
      Discounts:        close  ? formatCurrency(close.discounts              ?? 0) : "",
      "Expected Close": close  ? formatCurrency(close.expected_total)              : "",
      "Billed Amount":  billed ? formatCurrency(billed.billed_total)              : "",
      Variance:
        variance !== null
          ? (variance >= 0 ? "+" : "") + formatCurrency(variance)
          : "",
      Status: close ? "Close submitted" : "Awaiting close",
    };
  });

  const exportTitle    = `All Clients — ${formatMonth(selectedMonth)}`;
  const exportSubtitle = `Generated ${new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })}`;

  const activeFilterCount =
    (excludedIds.length > 0       ? 1 : 0) +
    (statusFilter   !== "all"     ? 1 : 0) +
    (varianceFilter !== "all"     ? 1 : 0) +
    (billedFilter   !== "all"     ? 1 : 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            {formatMonth(selectedMonth)} · {visibleClients.length} client{visibleClients.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-1 bg-brand/10 text-brand text-xs font-medium px-2 py-0.5 rounded-full">
                {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
              </span>
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
        filters={{
          month:       selectedMonth,
          excludedIds,
          status:      statusFilter,
          variance:    varianceFilter,
          billed:      billedFilter,
        }}
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
