import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import StatCards from "@/components/dashboard/StatCards";
import InvoiceKPICards from "@/components/dashboard/InvoiceKPICards";
import ExportMenu from "@/components/export/ExportMenu";
import SendSummaryButton from "@/components/dashboard/SendSummaryButton";
import { getCurrentMonthStr, formatMonth, formatCurrency, toFirstOfMonth } from "@/lib/utils";
import type { HealthGrade } from "@/components/dashboard/HealthBadge";

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
  const now          = new Date();
  const todayDay     = now.getDate();
  const currentMonth = getCurrentMonthStr();

  // ── Resolve filter params ───────────────────────────────────────────────────
  const selectedMonth  = searchParams.month    ?? currentMonth;
  const statusFilter   = searchParams.status   ?? "all";
  const varianceFilter = searchParams.variance ?? "all";
  const billedFilter   = searchParams.billed   ?? "all";
  const excludedIds    = searchParams.exclude
    ? searchParams.exclude.split(",").filter(Boolean)
    : [];

  // ── 6-month range for sparklines + health grades (oldest → newest) ──────────
  const sixMonthDates: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    sixMonthDates.push(toFirstOfMonth(d.getFullYear(), d.getMonth() + 1));
  }
  const sixMonthStart = sixMonthDates[0];
  const sixMonthEnd   = sixMonthDates[5]; // same as currentMonth

  // ── Previous month string (for missing-billed alert) ───────────────────────
  const prevDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = toFirstOfMonth(prevDate.getFullYear(), prevDate.getMonth() + 1);

  const [
    { data: allClients },
    { data: monthRows },
    { data: currentCloses },
    { data: currentBilled },
    { data: prevMonthBilled },
    { data: sixMonthCloses },
    { data: sixMonthBilled },
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
    // Previous month billed for the "missing billed" alert
    supabase
      .from("billed_amounts")
      .select("client_id")
      .eq("close_month", prevMonth),
    // Last 6 months of closes for sparklines + health
    supabase
      .from("revenue_closes")
      .select("client_id, close_month, expected_total")
      .eq("is_current", true)
      .gte("close_month", sixMonthStart)
      .lte("close_month", sixMonthEnd),
    // Last 6 months of billed for sparklines + health
    supabase
      .from("billed_amounts")
      .select("client_id, close_month, billed_total")
      .gte("close_month", sixMonthStart)
      .lte("close_month", sixMonthEnd),
  ]);

  // ── Build sparkline data + health grades ─────────────────────────────────────
  // Index 6-month closes and billed: clientId → month → value
  type MonthVal = { expected: number; billed: number | null };
  const sixMonthMap: Record<string, Record<string, MonthVal>> = {};

  (sixMonthCloses ?? []).forEach((c) => {
    if (!sixMonthMap[c.client_id]) sixMonthMap[c.client_id] = {};
    sixMonthMap[c.client_id][c.close_month] = { expected: c.expected_total, billed: null };
  });
  (sixMonthBilled ?? []).forEach((b) => {
    if (sixMonthMap[b.client_id]?.[b.close_month]) {
      sixMonthMap[b.client_id][b.close_month].billed = b.billed_total;
    }
  });

  const sparklineData: Record<string, (number | null)[]> = {};
  const healthGrades:  Record<string, HealthGrade>        = {};

  (allClients ?? []).forEach((client) => {
    const monthData = sixMonthMap[client.id] ?? {};

    // Sparkline: 6 variance values oldest → newest (null = no data for that month)
    const points: (number | null)[] = sixMonthDates.map((m) => {
      const mv = monthData[m];
      if (!mv || mv.billed == null) return null;
      return mv.billed - mv.expected;
    });
    sparklineData[client.id] = points;

    // Health grade
    const withBoth = Object.values(monthData).filter(
      (mv) => mv.billed != null && mv.expected > 0
    );
    const monthsWithData = withBoth.length;

    if (monthsWithData < 2) {
      healthGrades[client.id] = "new";
    } else {
      const avgVarRatio =
        withBoth.reduce((s, mv) => s + Math.abs((mv.billed! - mv.expected) / mv.expected), 0) /
        monthsWithData;

      const completeness = monthsWithData / 6; // fraction of last 6 months

      if (completeness >= 5 / 6 && avgVarRatio <= 0.05) {
        healthGrades[client.id] = "healthy";
      } else if (completeness >= 3 / 6 && avgVarRatio <= 0.15) {
        healthGrades[client.id] = "fair";
      } else {
        healthGrades[client.id] = "at-risk";
      }
    }
  });

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

  if (excludedIds.length > 0) {
    visibleClients = visibleClients.filter((c) => !excludedIds.includes(c.id));
  }
  if (statusFilter !== "all") {
    visibleClients = visibleClients.filter((c) => {
      const hasClose = !!closeMap[c.id];
      return statusFilter === "submitted" ? hasClose : !hasClose;
    });
  }
  if (billedFilter !== "all") {
    visibleClients = visibleClients.filter((c) => {
      const hasBilled = !!billedMap[c.id];
      return billedFilter === "entered" ? hasBilled : !hasBilled;
    });
  }
  if (varianceFilter !== "all") {
    visibleClients = visibleClients.filter((c) => {
      const close  = closeMap[c.id];
      const billed = billedMap[c.id];
      if (!close || !billed) return false;
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
    const close    = closeMap[client.id];
    const billed   = billedMap[client.id];
    const variance = close && billed ? billed.billed_total - close.expected_total : null;

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
    (excludedIds.length > 0   ? 1 : 0) +
    (statusFilter   !== "all" ? 1 : 0) +
    (varianceFilter !== "all" ? 1 : 0) +
    (billedFilter   !== "all" ? 1 : 0);

  // ── Smart alert computation ──────────────────────────────────────────────────
  const isViewingCurrentMonth = selectedMonth === currentMonth;
  const totalActiveClients    = (allClients ?? []).length;

  const closedClientIds   = new Set((currentCloses ?? []).map((c) => c.client_id));
  const missingCloseCount = isViewingCurrentMonth && todayDay >= 25
    ? (allClients ?? []).filter((c) => !closedClientIds.has(c.id)).length
    : 0;

  const billedPrevIds          = new Set((prevMonthBilled ?? []).map((b) => b.client_id));
  const missingPrevBilledCount = isViewingCurrentMonth && todayDay >= 5
    ? (allClients ?? []).filter((c) => !billedPrevIds.has(c.id)).length
    : 0;

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
          <SendSummaryButton month={selectedMonth} />
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

      {/* Smart alert banners */}
      <DashboardAlerts
        missingCloseCount={missingCloseCount}
        missingPrevBilledCount={missingPrevBilledCount}
        totalClients={totalActiveClients}
        currentMonth={currentMonth}
        prevMonth={prevMonth}
      />

      {/* Invoice KPI strip */}
      <InvoiceKPICards />

      {/* Stat summary cards */}
      <StatCards
        totalExpected={currentCloses?.reduce((s, c) => s + c.expected_total, 0) ?? 0}
        totalBilled={currentBilled?.reduce((s, b) => s + b.billed_total, 0) ?? 0}
        netVariance={
          (currentBilled?.reduce((s, b) => s + b.billed_total, 0) ?? 0) -
          (currentCloses?.reduce((s, c) => s + c.expected_total, 0) ?? 0)
        }
        closedCount={(currentCloses ?? []).filter((c) =>
          visibleClients.some((v) => v.id === c.client_id)
        ).length}
        billedCount={(currentBilled ?? []).filter((b) =>
          visibleClients.some((v) => v.id === b.client_id)
        ).length}
        totalClients={visibleClients.length}
        hasBilled={(currentBilled ?? []).length > 0}
      />

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
        healthGrades={healthGrades}
        sparklineData={sparklineData}
      />
    </div>
  );
}
