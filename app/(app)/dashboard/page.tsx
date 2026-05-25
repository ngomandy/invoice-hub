import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClientGrid from "@/components/dashboard/ClientGrid";
import ExportMenu from "@/components/export/ExportMenu";
import { getCurrentMonthStr, formatMonth, formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = createClient();
  const currentMonth = getCurrentMonthStr();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const { data: currentCloses } = await supabase
    .from("revenue_closes")
    .select("client_id, expected_total")
    .eq("close_month", currentMonth)
    .eq("is_current", true);

  const { data: billedAmounts } = await supabase
    .from("billed_amounts")
    .select("client_id, close_month, billed_total")
    .order("close_month", { ascending: false });

  // Build export rows — one per client, current month snapshot
  const closeMap = Object.fromEntries(
    (currentCloses ?? []).map((c) => [c.client_id, c])
  );
  const billedCurrentMap = Object.fromEntries(
    (billedAmounts ?? [])
      .filter((b) => b.close_month === currentMonth)
      .map((b) => [b.client_id, b])
  );

  const exportRows = (clients ?? []).map((client) => {
    const close = closeMap[client.id];
    const billed = billedCurrentMap[client.id];
    const variance =
      close && billed ? billed.billed_total - close.expected_total : null;

    return {
      Client: client.name,
      Month: formatMonth(currentMonth),
      "Expected Close": close ? formatCurrency(close.expected_total) : "",
      "Billed Amount": billed ? formatCurrency(billed.billed_total) : "",
      "Variance": variance !== null
        ? (variance >= 0 ? "+" : "") + formatCurrency(variance)
        : "",
      Status: close ? "Close submitted" : "Awaiting close",
    };
  });

  const exportTitle = `All Clients — ${formatMonth(currentMonth)}`;
  const exportSubtitle = `Generated ${new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">All Clients</h1>
          <p className="text-sm text-text-muted mt-1">Revenue close tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            rows={exportRows}
            filename={`invoice-hub-dashboard-${currentMonth}`}
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
            Import CSV
          </Link>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
          >
            + Add Client
          </Link>
        </div>
      </div>

      <ClientGrid
        clients={clients ?? []}
        currentCloses={currentCloses ?? []}
        billedAmounts={billedAmounts ?? []}
        currentMonth={currentMonth}
      />
    </div>
  );
}
