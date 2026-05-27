import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthStr,
  formatMonth,
  formatCurrency,
  formatVariance,
  getMonthsForYear,
} from "@/lib/utils";
import MonthlyVarianceChart from "@/components/analytics/MonthlyVarianceChart";
import ClientVarianceChart  from "@/components/analytics/ClientVarianceChart";
import ForecastTable, { type ForecastEntry } from "@/components/analytics/ForecastTable";
import YearSelector from "@/components/analytics/YearSelector";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const supabase     = createClient();
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = getCurrentMonthStr();

  // ── Year selection ──────────────────────────────────────────────────────────
  const selectedYear = Math.max(
    2020,
    Math.min(currentYear + 1, parseInt(searchParams.year ?? String(currentYear)))
  );
  const months    = getMonthsForYear(selectedYear);
  const rangeStart = `${selectedYear}-01-01`;
  const rangeEnd   = `${selectedYear}-12-31`;

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const [
    { data: clients },
    { data: closes },
    { data: billed },
    { data: allCloseYears },
  ] = await Promise.all([
    supabase.from("clients").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("revenue_closes")
      .select("client_id, close_month, net_usage, rollover_from_previous, rollover_to_next, discounts, expected_total")
      .eq("is_current", true)
      .gte("close_month", rangeStart)
      .lte("close_month", rangeEnd)
      .order("close_month"),
    supabase
      .from("billed_amounts")
      .select("client_id, close_month, billed_total")
      .gte("close_month", rangeStart)
      .lte("close_month", rangeEnd),
    // To build the year selector, get the distinct years that have close data
    supabase
      .from("revenue_closes")
      .select("close_month")
      .eq("is_current", true)
      .order("close_month"),
  ]);

  // Build available year list from actual data + current year
  const yearSet = new Set<number>([currentYear]);
  (allCloseYears ?? []).forEach((c) => {
    yearSet.add(new Date(c.close_month).getFullYear());
  });
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const billedIndex = new Map(
    (billed ?? []).map((b) => [`${b.client_id}::${b.close_month}`, b.billed_total])
  );

  type VarianceEntry = {
    clientId:    string;
    clientName:  string;
    month:       string;
    expected:    number;
    billedTotal: number;
    variance:    number;
  };

  const variances: VarianceEntry[] = (closes ?? []).flatMap((c) => {
    const billedTotal = billedIndex.get(`${c.client_id}::${c.close_month}`);
    if (billedTotal === undefined) return [];
    return [{ clientId: c.client_id, clientName: clientMap.get(c.client_id) ?? c.client_id, month: c.close_month, expected: c.expected_total, billedTotal, variance: billedTotal - c.expected_total }];
  });

  // ── Headline metrics ────────────────────────────────────────────────────────
  const totalExpected = (closes ?? []).reduce((s, c) => s + (c.expected_total ?? 0), 0);
  const totalBilled   = (billed  ?? []).reduce((s, b) => s + (b.billed_total  ?? 0), 0);
  const netVariance   = totalBilled - totalExpected;
  const overbilled    = variances.filter((v) => v.variance  > 0);
  const underbilled   = variances.filter((v) => v.variance  < 0);
  const onTarget      = variances.filter((v) => v.variance === 0);

  // ── Per-client rollup ───────────────────────────────────────────────────────
  type ClientRollup = {
    id: string; name: string;
    totalExpected: number; totalBilled: number; netVariance: number;
    closedMonths: number; billedMonths: number;
    overbilledCount: number; underbilledCount: number;
  };
  const clientRollup = new Map<string, ClientRollup>();
  (clients ?? []).forEach((c) => {
    clientRollup.set(c.id, { id: c.id, name: c.name, totalExpected: 0, totalBilled: 0, netVariance: 0, closedMonths: 0, billedMonths: 0, overbilledCount: 0, underbilledCount: 0 });
  });
  (closes ?? []).forEach((c) => {
    const r = clientRollup.get(c.client_id);
    if (r) { r.totalExpected += c.expected_total ?? 0; r.closedMonths++; }
  });
  variances.forEach((v) => {
    const r = clientRollup.get(v.clientId);
    if (r) { r.totalBilled += v.billedTotal; r.netVariance += v.variance; r.billedMonths++; if (v.variance > 0) r.overbilledCount++; if (v.variance < 0) r.underbilledCount++; }
  });
  const clientRows = Array.from(clientRollup.values())
    .filter((r) => r.closedMonths > 0 || r.billedMonths > 0)
    .sort((a, b) => Math.abs(b.netVariance) - Math.abs(a.netVariance));

  // ── Monthly trend ───────────────────────────────────────────────────────────
  const monthlyTrend = months.map((m) => {
    const mc = (closes ?? []).filter((c) => c.close_month === m);
    const mb = (billed  ?? []).filter((b) => b.close_month === m);
    const exp = mc.reduce((s, c) => s + (c.expected_total ?? 0), 0);
    const bil = mb.reduce((s, b) => s + (b.billed_total   ?? 0), 0);
    return { month: m, totalExpected: exp, totalBilled: bil, variance: bil - exp, hasBilled: mb.length > 0 };
  });
  const pastMonths = monthlyTrend.filter((m) => m.month <= currentMonth || selectedYear < currentYear);

  // ── Revenue forecast (trailing 3-month average per client) ──────────────────
  const clientMonthly = new Map<string, { month: string; expected: number }[]>();
  (closes ?? []).forEach((c) => {
    if (!clientMonthly.has(c.client_id)) clientMonthly.set(c.client_id, []);
    clientMonthly.get(c.client_id)!.push({ month: c.close_month, expected: c.expected_total ?? 0 });
  });

  const forecasts: ForecastEntry[] = Array.from(clientMonthly.entries())
    .map(([clientId, months]) => {
      const sorted = [...months].sort((a, b) => b.month.localeCompare(a.month));
      const last3  = sorted.slice(0, 3);
      const avg    = last3.reduce((s, m) => s + m.expected, 0) / last3.length;
      let trend: "up" | "down" | "flat" = "flat";
      if (last3.length >= 2) {
        const change = (last3[0].expected - last3[last3.length - 1].expected) / (last3[last3.length - 1].expected || 1);
        if (change > 0.05) trend = "up";
        else if (change < -0.05) trend = "down";
      }
      return { clientId, clientName: clientMap.get(clientId) ?? clientId, trailing3Avg: avg, monthsUsed: last3.length, trend, lastMonthExpected: sorted[0]?.expected ?? 0 };
    })
    .filter((f) => f.monthsUsed > 0)
    .sort((a, b) => b.trailing3Avg - a.trailing3Avg);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartTrendData  = pastMonths.map((m) => ({ month: m.month, variance: m.variance, hasBilled: m.hasBilled }));
  const chartClientData = clientRows.map((r) => ({ id: r.id, name: r.name, netVariance: r.netVariance, billedMonths: r.billedMonths }));

  const yearLabel = selectedYear === currentYear ? `${selectedYear} year-to-date` : String(selectedYear);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-sm text-text-muted mt-1">Revenue intelligence · {yearLabel}</p>
        </div>
        <YearSelector years={availableYears} selectedYear={selectedYear} />
      </div>

      {/* ── Headline metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Expected", value: formatCurrency(totalExpected), sub: `${(closes ?? []).length} closes locked` },
          { label: "Total Billed",   value: formatCurrency(totalBilled),   sub: `${(billed  ?? []).length} billed entries` },
          {
            label: "Net Variance",
            value: variances.length > 0 ? formatVariance(netVariance) : "—",
            sub: netVariance > 0 ? "Overbilled overall" : netVariance < 0 ? "Underbilled overall" : "On target",
            color: variances.length > 0 ? (netVariance > 0 ? "text-negative" : "text-positive") : "text-text-primary",
          },
          { label: "Active Clients", value: String((clients ?? []).length), sub: `${overbilled.length} overbilled · ${underbilled.length} underbilled` },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white border border-surface-border rounded-lg p-5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{label}</p>
            <p className={`text-2xl font-bold ${color ?? "text-text-primary"}`}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Variance breakdown ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-negative-bg border border-negative-border rounded-lg p-4 text-center">
          <p className="text-xs font-semibold text-negative uppercase tracking-wider mb-1">Overbilled Months</p>
          <p className="text-3xl font-bold text-negative">{overbilled.length}</p>
          <p className="text-sm text-negative mt-1">{overbilled.length > 0 ? `+${formatCurrency(overbilled.reduce((s, v) => s + v.variance, 0))}` : "None"}</p>
        </div>
        <div className="bg-positive-bg border border-positive-border rounded-lg p-4 text-center">
          <p className="text-xs font-semibold text-positive uppercase tracking-wider mb-1">On Target</p>
          <p className="text-3xl font-bold text-positive">{onTarget.length}</p>
          <p className="text-sm text-positive mt-1">Perfect matches</p>
        </div>
        <div className="bg-warning-bg border border-warning-border rounded-lg p-4 text-center">
          <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-1">Underbilled Months</p>
          <p className="text-3xl font-bold text-warning">{underbilled.length}</p>
          <p className="text-sm text-warning mt-1">{underbilled.length > 0 ? formatVariance(underbilled.reduce((s, v) => s + v.variance, 0)) : "None"}</p>
        </div>
      </div>

      {/* ── Visual charts ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-text-primary">Monthly Variance ({selectedYear})</h2>
            <p className="text-xs text-text-muted mt-0.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-negative/70 mr-1 align-middle" />Overbilled&nbsp;&nbsp;
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-positive/70 mr-1 align-middle" />Underbilled
            </p>
          </div>
          <div className="px-4 py-4"><MonthlyVarianceChart data={chartTrendData} height={220} /></div>
        </div>
        <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-text-primary">Client Variance ({selectedYear})</h2>
            <p className="text-xs text-text-muted mt-0.5">Net YTD variance per client, sorted by magnitude</p>
          </div>
          <div className="px-4 py-4"><ClientVarianceChart data={chartClientData} maxRows={10} /></div>
        </div>
      </div>

      {/* ── Revenue Forecast ─────────────────────────────────────────────────── */}
      {forecasts.length > 0 && (
        <div className="bg-white border border-surface-border rounded-lg overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-text-primary">Revenue Forecast</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Projected next close per client · based on trailing {selectedYear === currentYear ? "3-month" : "full-year"} average
            </p>
          </div>
          <div className="overflow-x-auto">
            <ForecastTable forecasts={forecasts} />
          </div>
        </div>
      )}

      {/* ── Data tables ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Per-client summary */}
        <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-text-primary">Client Summary ({selectedYear})</h2>
            <p className="text-xs text-text-muted mt-0.5">Sorted by absolute variance</p>
          </div>
          <div className="overflow-x-auto">
            {clientRows.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">No data for {selectedYear}.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted">
                    <th className="text-left   px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Client</th>
                    <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Expected</th>
                    <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Billed</th>
                    <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Variance</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Over/Under</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {clientRows.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{r.name}</td>
                      <td className="px-4 py-3 text-right text-text-secondary tabular-nums">{formatCurrency(r.totalExpected)}</td>
                      <td className="px-4 py-3 text-right text-text-secondary tabular-nums">{r.billedMonths > 0 ? formatCurrency(r.totalBilled) : <span className="text-text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.billedMonths > 0
                          ? <span className={`font-medium ${r.netVariance === 0 ? "text-positive" : r.netVariance > 0 ? "text-negative" : "text-positive"}`}>{formatVariance(r.netVariance)}</span>
                          : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.overbilledCount  > 0 && <span className="text-xs text-negative font-medium">↑{r.overbilledCount}</span>}
                        {r.overbilledCount  > 0 && r.underbilledCount > 0 && <span className="text-text-muted mx-1">·</span>}
                        {r.underbilledCount > 0 && <span className="text-xs text-warning  font-medium">↓{r.underbilledCount}</span>}
                        {r.overbilledCount === 0 && r.underbilledCount === 0 && r.billedMonths > 0 && <span className="text-xs text-positive font-medium">✓</span>}
                        {r.billedMonths === 0 && <span className="text-text-muted text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Monthly trend table */}
        <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-text-primary">Monthly Trend ({selectedYear})</h2>
            <p className="text-xs text-text-muted mt-0.5">Expected vs billed per month</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted">
                  <th className="text-left  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Month</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Expected</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Billed</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {pastMonths.map((m) => (
                  <tr key={m.month} className={`hover:bg-surface-muted/50 transition-colors ${m.month === currentMonth ? "bg-brand/5" : ""}`}>
                    <td className="px-4 py-2.5 text-text-primary font-medium">
                      {formatMonth(m.month)}
                      {m.month === currentMonth && <span className="ml-2 text-xs text-brand font-medium">current</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{m.totalExpected > 0 ? formatCurrency(m.totalExpected) : <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{m.hasBilled ? formatCurrency(m.totalBilled) : <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {m.hasBilled && m.totalExpected > 0
                        ? <span className={`font-medium ${m.variance === 0 ? "text-positive" : m.variance > 0 ? "text-negative" : "text-positive"}`}>{formatVariance(m.variance)}</span>
                        : <span className="text-text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Top variances ────────────────────────────────────────────────────── */}
      {variances.length > 0 && (
        <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-text-primary">Largest Variances ({selectedYear})</h2>
            <p className="text-xs text-text-muted mt-0.5">Top 10 individual month-client variances by magnitude</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted">
                  <th className="text-left   px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Client</th>
                  <th className="text-left   px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Month</th>
                  <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Expected</th>
                  <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Billed</th>
                  <th className="text-right  px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Variance</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {[...variances].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 10).map((v, i) => (
                  <tr key={i} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-text-primary">{v.clientName}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{formatMonth(v.month)}</td>
                    <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{formatCurrency(v.expected)}</td>
                    <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{formatCurrency(v.billedTotal)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={`font-medium ${v.variance === 0 ? "text-positive" : v.variance > 0 ? "text-negative" : "text-positive"}`}>{formatVariance(v.variance)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${v.variance > 0 ? "bg-negative-bg text-negative border-negative-border" : v.variance < 0 ? "bg-warning-bg text-warning border-warning-border" : "bg-positive-bg text-positive border-positive-border"}`}>
                        {v.variance > 0 ? "Overbilled" : v.variance < 0 ? "Underbilled" : "On target"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
