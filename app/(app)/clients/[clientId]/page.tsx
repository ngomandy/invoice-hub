import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import YearTable from "@/components/client-detail/YearTable";
import ClientNotes from "@/components/client-detail/ClientNotes";
import ClientSummaryStats from "@/components/client-detail/ClientSummaryStats";
import ExportMenu from "@/components/export/ExportMenu";
import {
  getMonthsForYear,
  getCurrentMonthStr,
  formatMonth,
  formatCurrency,
} from "@/lib/utils";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { year?: string };
}) {
  const supabase = createClient();
  const { clientId } = params;

  const { data: { user } } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  const years        = await fetchYears(supabase, clientId);
  const currentYear  = new Date().getFullYear();
  const selectedYear = parseInt(searchParams.year || String(currentYear));
  const priorYear    = selectedYear - 1;

  // Fetch selected year closes + changes
  const [
    { data: allCloses },
    { data: changeCounts },
    { data: billedAmounts },
    { data: priorCloses },
    { data: priorBilled },
  ] = await Promise.all([
    supabase
      .from("revenue_closes")
      .select("*, profiles(full_name)")
      .eq("client_id", clientId)
      .eq("is_current", true)
      .gte("close_month", `${selectedYear}-01-01`)
      .lte("close_month", `${selectedYear}-12-31`)
      .order("close_month"),
    supabase
      .from("close_changes")
      .select("close_month")
      .eq("client_id", clientId),
    supabase
      .from("billed_amounts")
      .select("*")
      .eq("client_id", clientId)
      .gte("close_month", `${selectedYear}-01-01`)
      .lte("close_month", `${selectedYear}-12-31`),
    // Prior year — for month-over-month comparison
    supabase
      .from("revenue_closes")
      .select("close_month, expected_total")
      .eq("client_id", clientId)
      .eq("is_current", true)
      .gte("close_month", `${priorYear}-01-01`)
      .lte("close_month", `${priorYear}-12-31`),
    supabase
      .from("billed_amounts")
      .select("close_month, billed_total")
      .eq("client_id", clientId)
      .gte("close_month", `${priorYear}-01-01`)
      .lte("close_month", `${priorYear}-12-31`),
  ]);

  const closeCountMap: Record<string, number> = {};
  (changeCounts ?? []).forEach((c) => {
    closeCountMap[c.close_month] = (closeCountMap[c.close_month] || 0) + 1;
  });

  const closes = (allCloses ?? []).map((c) => ({
    ...c,
    submitted_by_name: (c.profiles as { full_name: string } | null)?.full_name,
    change_count:      closeCountMap[c.close_month] || 0,
  }));

  const allYears    = years.length > 0 ? years : [currentYear];
  const months      = getMonthsForYear(selectedYear);
  const closeMap    = Object.fromEntries(closes.map((c) => [c.close_month, c]));
  const billedMap   = Object.fromEntries((billedAmounts ?? []).map((b) => [b.close_month, b]));

  const monthData   = months.map((m) => ({ month: m, close: closeMap[m] ?? null, billed: billedMap[m] ?? null }));
  const currentMonth = getCurrentMonthStr();

  // Prior-year lookup: map "YYYY-MM-DD same month" → expected + billed
  // Key: same month but shifted to current year (e.g. prior 2025-05-01 → key "05")
  const priorYearMap: Record<string, { expected: number | null; billed: number | null }> = {};
  (priorCloses ?? []).forEach((c) => {
    const mm = c.close_month.slice(5, 7); // "MM"
    priorYearMap[mm] = { expected: c.expected_total ?? null, billed: null };
  });
  (priorBilled ?? []).forEach((b) => {
    const mm = b.close_month.slice(5, 7);
    if (priorYearMap[mm]) priorYearMap[mm].billed = b.billed_total;
    else priorYearMap[mm] = { expected: null, billed: b.billed_total };
  });

  // Export rows
  const exportRows = monthData.map((m) => {
    const variance = m.close && m.billed ? m.billed.billed_total - m.close.expected_total : null;
    return {
      Month:            formatMonth(m.month),
      "Net Usage":      m.close ? formatCurrency(m.close.net_usage)             : "",
      "Rollover From":  m.close ? formatCurrency(m.close.rollover_from_previous) : "",
      "Rollover To":    m.close ? formatCurrency(m.close.rollover_to_next)       : "",
      Discounts:        m.close ? formatCurrency(m.close.discounts)              : "",
      "Expected Close": m.close ? formatCurrency(m.close.expected_total)        : "",
      "Billed Amount":  m.billed ? formatCurrency(m.billed.billed_total)        : "",
      Variance:         variance !== null ? (variance >= 0 ? "+" : "") + formatCurrency(variance) : "",
      Status:           m.close ? ((m.close.change_count ?? 0) > 0 ? `Changed ×${m.close.change_count}` : "Locked") : "No close",
    };
  });

  const exportTitle    = `${client.name} — ${selectedYear}`;
  const exportSubtitle = `Revenue Close Report · Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-text-muted mb-1">Client</p>
          <h1 className="text-2xl font-bold text-text-primary">{client.name}</h1>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            rows={exportRows}
            filename={`${client.name.toLowerCase().replace(/\s+/g, "-")}-${selectedYear}`}
            title={exportTitle}
            subtitle={exportSubtitle}
          />
          <Link
            href={`/clients/${clientId}/history`}
            className="text-sm font-medium text-text-secondary border border-surface-border px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
          >
            Change History
          </Link>
          <Link
            href={`/clients/${clientId}/edit`}
            className="text-sm font-medium text-text-secondary border border-surface-border px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
          >
            Edit
          </Link>
          <Link
            href={`/clients/${clientId}/close`}
            className="text-sm font-medium bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
          >
            + New Close
          </Link>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex gap-2 mb-6">
        {allYears.map((y) => (
          <Link
            key={y}
            href={`/clients/${clientId}?year=${y}`}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              y === selectedYear
                ? "bg-brand text-white"
                : "bg-white border border-surface-border text-text-secondary hover:bg-surface-muted"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      {/* Year-level summary stats */}
      <ClientSummaryStats monthData={monthData} selectedYear={selectedYear} />

      <YearTable
        monthData={monthData}
        clientId={clientId}
        currentMonth={currentMonth}
        priorYearMap={priorYearMap}
        priorYear={priorYear}
      />

      {/* Internal notes */}
      <div className="mt-6">
        <ClientNotes
          clientId={clientId}
          currentUserId={user?.id ?? ""}
        />
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchYears(supabase: ReturnType<typeof createClient>, clientId: string): Promise<number[]> {
  const { data } = await supabase
    .from("revenue_closes")
    .select("close_month")
    .eq("client_id", clientId)
    .eq("is_current", true)
    .order("close_month");

  const set = new Set<number>([new Date().getFullYear()]);
  (data ?? []).forEach((c) => set.add(new Date(c.close_month).getFullYear()));
  return Array.from(set).sort((a, b) => b - a);
}
