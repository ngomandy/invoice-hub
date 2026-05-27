import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function InvoiceKPICards() {
  const supabase = createClient();
  const today        = new Date();
  const todayStr     = today.toISOString().slice(0, 10);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().slice(0, 10);

  const [
    { data: openInvoices },
    { data: paymentsThisMonth },
    { data: totalCount },
  ] = await Promise.all([
    // All sent/viewed invoices (need to compute outstanding + overdue)
    supabase
      .from("invoices")
      .select("id, total, due_date, payments(amount)")
      .in("status", ["sent", "viewed"]),
    // Payments recorded this calendar month
    supabase
      .from("payments")
      .select("amount")
      .gte("payment_date", firstOfMonth),
    // Count of all non-void invoices
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .neq("status", "void"),
  ]);

  // Compute outstanding + overdue from open invoices
  let outstanding   = 0;
  let overdueAmount = 0;
  let overdueCount  = 0;

  for (const inv of openInvoices ?? []) {
    const paid = ((inv.payments ?? []) as { amount: number }[])
      .reduce((s, p) => s + p.amount, 0);
    const balance = inv.total - paid;
    if (balance > 0) {
      outstanding += balance;
      if (inv.due_date < todayStr) {
        overdueAmount += balance;
        overdueCount++;
      }
    }
  }

  const paidThisMonth = (paymentsThisMonth ?? []).reduce((s, p) => s + p.amount, 0);
  const invoiceTotal: number = typeof totalCount === "number" ? totalCount : 0;

  const monthLabel = today.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Invoice Overview</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Outstanding */}
        <Link
          href="/invoices?status=sent"
          className="bg-white border border-surface-border rounded-lg p-4 hover:border-brand/40 hover:shadow-sm transition-all group"
        >
          <p className="text-xs text-text-muted mb-2">Outstanding</p>
          <p className={`text-xl font-bold font-mono tabular-nums ${outstanding > 0 ? "text-warning" : "text-positive"}`}>
            {formatCurrency(outstanding)}
          </p>
          <p className="text-xs text-text-muted mt-1">Unpaid sent invoices</p>
        </Link>

        {/* Overdue */}
        <Link
          href="/invoices?status=overdue"
          className="bg-white border border-surface-border rounded-lg p-4 hover:border-negative/40 hover:shadow-sm transition-all group"
        >
          <p className="text-xs text-text-muted mb-2">Overdue</p>
          <p className={`text-xl font-bold font-mono tabular-nums ${overdueCount > 0 ? "text-negative" : "text-positive"}`}>
            {overdueCount > 0 ? formatCurrency(overdueAmount) : "None"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {overdueCount > 0
              ? `${overdueCount} invoice${overdueCount !== 1 ? "s" : ""} past due`
              : "All invoices current"}
          </p>
        </Link>

        {/* Collected this month */}
        <Link
          href="/invoices?status=paid"
          className="bg-white border border-surface-border rounded-lg p-4 hover:border-brand/40 hover:shadow-sm transition-all"
        >
          <p className="text-xs text-text-muted mb-2">Collected</p>
          <p className="text-xl font-bold font-mono tabular-nums text-positive">
            {formatCurrency(paidThisMonth)}
          </p>
          <p className="text-xs text-text-muted mt-1">{monthLabel}</p>
        </Link>

        {/* Total tracked */}
        <Link
          href="/invoices"
          className="bg-white border border-surface-border rounded-lg p-4 hover:border-brand/40 hover:shadow-sm transition-all"
        >
          <p className="text-xs text-text-muted mb-2">Tracked Invoices</p>
          <p className="text-xl font-bold font-mono tabular-nums text-brand">
            {invoiceTotal}
          </p>
          <p className="text-xs text-text-muted mt-1">All time (excl. voided)</p>
        </Link>
      </div>
    </div>
  );
}
