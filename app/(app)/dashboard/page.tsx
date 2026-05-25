import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClientGrid from "@/components/dashboard/ClientGrid";
import { getCurrentMonthStr } from "@/lib/utils";

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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">All Clients</h1>
          <p className="text-sm text-text-muted mt-1">Revenue close tracking</p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
        >
          + Add Client
        </Link>
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
