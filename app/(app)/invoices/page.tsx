import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";
import SendOverdueRemindersButton from "@/components/invoices/SendOverdueRemindersButton";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { label: "All",     value: "" },
  { label: "Sent",    value: "sent" },
  { label: "Overdue", value: "overdue" },
  { label: "Paid",    value: "paid" },
  { label: "Draft",   value: "draft" },
  { label: "Void",    value: "void" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const supabase     = createClient();
  const statusFilter = searchParams.status ?? "";
  const q            = (searchParams.q ?? "").toLowerCase().trim();

  let query = supabase
    .from("invoices")
    .select(`
      id, invoice_number, status, issue_date, due_date,
      total, netsuite_id, source,
      client:clients(id, name),
      payments(amount)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "overdue") {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;

  const today = new Date();
  const invoices = (data ?? [])
    .map((inv) => {
      const amountPaid = (inv.payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
      const amountDue  = inv.total - amountPaid;
      const isOverdue  = ["sent", "viewed"].includes(inv.status) && new Date(inv.due_date) < today;
      return {
        ...inv,
        payments:         undefined,
        amount_paid:      amountPaid,
        amount_due:       amountDue,
        effective_status: isOverdue ? "overdue" : inv.status,
      };
    })
    .filter((inv) => {
      if (statusFilter === "overdue") return inv.effective_status === "overdue";
      return true;
    })
    .filter((inv) => {
      if (!q) return true;
      const clientName = (inv.client as { name?: string })?.name ?? "";
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q) ||
        (inv.netsuite_id ?? "").toLowerCase().includes(q)
      );
    });

  // Count overdue for the reminder button (always computed from all invoices)
  const overdueCount = statusFilter
    ? invoices.filter((i) => i.effective_status === "overdue").length
    : invoices.filter((i) => i.effective_status === "overdue").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Invoices</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            {statusFilter ? ` · ${statusFilter}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SendOverdueRemindersButton overdueCount={overdueCount} />
          <Link
            href="/invoices/import"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-surface-border bg-white text-text-secondary hover:bg-surface-muted transition-colors"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Bulk CSV Import
          </Link>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-5-6zm0 0v6h6M9 13h6m-6 4h4" />
            </svg>
            Upload NetSuite Invoice
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-surface-border rounded-lg p-1">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            const href     = tab.value ? `/invoices?status=${tab.value}` : "/invoices";
            return (
              <Link
                key={tab.value}
                href={href}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-brand text-white"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <form method="GET" action="/invoices" className="flex items-center gap-2">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search invoice #, client, NetSuite ID…"
            className="border border-surface-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand bg-white w-64"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-white border border-surface-border rounded-md text-sm text-text-secondary hover:bg-surface-muted transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="text-center py-16 bg-white border border-surface-border rounded-lg">
          <svg className="mx-auto mb-3 text-text-muted" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-muted text-sm mb-4">
            {statusFilter || q ? "No invoices match your filters." : "No invoices yet."}
          </p>
          {!statusFilter && !q && (
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
              >
                Upload NetSuite Invoice
              </Link>
              <Link
                href="/invoices/import"
                className="inline-flex items-center gap-2 border border-surface-border bg-white text-text-secondary text-sm font-medium px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
              >
                Bulk CSV Import
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Issued</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Due</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Balance</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-mono font-medium text-brand hover:underline">
                        {inv.invoice_number}
                      </Link>
                      {inv.netsuite_id && (
                        <p className="text-[10px] text-text-muted font-mono">NS: {inv.netsuite_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {(inv.client as { name?: string })?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3">
                      <span className={inv.effective_status === "overdue" ? "text-negative font-medium" : "text-text-secondary"}>
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {inv.amount_due > 0
                        ? <span className={inv.effective_status === "overdue" ? "text-negative font-medium" : "text-text-secondary"}>{formatCurrency(inv.amount_due)}</span>
                        : <span className="text-positive font-medium">Paid</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <InvoiceStatusBadge status={inv.effective_status} />
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
