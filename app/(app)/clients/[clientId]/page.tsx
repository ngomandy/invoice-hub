import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import YearTable from "@/components/client-detail/YearTable";
import { getYearsFromData, getMonthsForYear, getCurrentMonthStr } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { year?: string };
}) {
  const supabase = createClient();
  const { clientId } = params;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  const { data: allCloses } = await supabase
    .from("revenue_closes")
    .select("*, profiles(full_name)")
    .eq("client_id", clientId)
    .eq("is_current", true)
    .order("close_month");

  const { data: changeCounts } = await supabase
    .from("close_changes")
    .select("close_month")
    .eq("client_id", clientId);

  const closeCountMap: Record<string, number> = {};
  (changeCounts ?? []).forEach((c) => {
    closeCountMap[c.close_month] = (closeCountMap[c.close_month] || 0) + 1;
  });

  const closes = (allCloses ?? []).map((c) => ({
    ...c,
    submitted_by_name: (c.profiles as { full_name: string } | null)?.full_name,
    change_count: closeCountMap[c.close_month] || 0,
  }));

  const years = getYearsFromData(closes);
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(searchParams.year || String(currentYear));

  const { data: billedAmounts } = await supabase
    .from("billed_amounts")
    .select("*")
    .eq("client_id", clientId);

  const months = getMonthsForYear(selectedYear);
  const closeMap = Object.fromEntries(closes.map((c) => [c.close_month, c]));
  const billedMap = Object.fromEntries(
    (billedAmounts ?? []).map((b) => [b.close_month, b])
  );

  const monthData = months.map((m) => ({
    month: m,
    close: closeMap[m] ?? null,
    billed: billedMap[m] ?? null,
  }));

  const currentMonth = getCurrentMonthStr();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-text-muted mb-1">Client</p>
          <h1 className="text-2xl font-bold text-text-primary">{client.name}</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/clients/${clientId}/history`}
            className="text-sm font-medium text-text-secondary border border-surface-border px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
          >
            Change History
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
        {years.map((y) => (
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

      <YearTable
        monthData={monthData}
        clientId={clientId}
        currentMonth={currentMonth}
      />
    </div>
  );
}
