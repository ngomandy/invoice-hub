import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { label: "All",     value: "" },
  { label: "Draft",   value: "draft" },
  { label: "Sent",    value: "sent" },
  { label: "Overdue", value: "overdue" },
  { label: "Paid",    value: "paid" },
  { label: "Void",    value: "void" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const supabase   = createClient();
  const statusFilter = searchParams.status ?? "";
  const q          = (searchParams.q ?? "").toLowerCase().trim();

  // Fetch invoices with client + payments
  let query = supabase
    .from("invoices")
    .select(`
      id, invoice_number, invoice_seq, status, issue_date, due_date,
      subtotal, tax_amount, total,
      client:clients(id, name),
      payments(amount)
    `)
    .order("invoice_seq", { ascending: false });

  // Status filter — "overdue" is computed, so fetch sent+viewed and filter below
  if (statusFilter && statusFilter !== "overdue") {
    query = query.eq("status", statusFilter);
  } else if (!statusFilter) {
    // All statuses — no filter
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
    // Apply overdue filter post-compute
    .filter((inv) => {
      if (statusFilter === "overdue") return inv.effective_status === "overdue";
      return true;
    })
    // Apply search filter
    .filter((inv) => {
      if (!q) return true;
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.client as { name?: string })?.name?.toLowerCase().includes(q)
      );
    });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Invoices</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            {statusFilter ? ` · ${statusFilter}` : ""}
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-white border border-surface-border rounded-lg p-1">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            const href = tab.value ? `/invoices?status=${tab.value}` : "/invoices";
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

        {/* Search */}
        <form method="GET" action="/invoices" className="flex items-center gap-2">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search invoice # or client…"
            className="border border-surface-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand bg-white w-56"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-white border border-surface-border rounded-md text-sm text-text-secondary hover:bg-surface-muted transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Invoice table */}
      {invoices.length === 0 ? (
        <div className="text-center py-16 bg-white border border-surface-border rounded-lg">
          <svg
            className="mx-auto mb-3 text-text-muted"
            width="40" height="40" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth="1.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-muted text-sm mb-4">
            {statusFilter || q ? "No invoices match your filters." : "No invoices yet."}
          </p>
          {!statusFilter && !q && (
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
            >
              + Create Invoice
            </Link>
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
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono font-medium text-brand hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
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
