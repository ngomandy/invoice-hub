import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";
import InvoiceActions from "@/components/invoices/InvoiceActions";
import RecordPaymentForm from "@/components/invoices/RecordPaymentForm";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const supabase = createClient();

  const { data: inv } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(id, name, email, phone, billing_address, payment_terms),
      line_items:invoice_line_items(*),
      payments(id, amount, payment_date, method, reference, notes, created_at)
    `)
    .eq("id", params.invoiceId)
    .order("sort_order", { referencedTable: "invoice_line_items" })
    .order("payment_date", { referencedTable: "payments" })
    .single();

  if (!inv) notFound();

  const amountPaid = (inv.payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const amountDue  = inv.total - amountPaid;
  const isOverdue  = ["sent", "viewed"].includes(inv.status) && new Date(inv.due_date) < new Date();
  const effectiveStatus = isOverdue ? "overdue" : inv.status;

  const client = inv.client as {
    id: string; name: string; email?: string; phone?: string; billing_address?: string;
  } | null;

  type LineItem = {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    sort_order: number;
  };

  type Payment = {
    id: string;
    amount: number;
    payment_date: string;
    method: string;
    reference?: string;
    notes?: string;
    created_at: string;
  };

  const lineItems: LineItem[] = inv.line_items ?? [];
  const payments:  Payment[]  = inv.payments   ?? [];

  const METHOD_LABELS: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    check:         "Check",
    cash:          "Cash",
    stripe:        "Stripe",
    paypal:        "PayPal",
    other:         "Other",
  };

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/invoices" className="hover:text-brand transition-colors">Invoices</Link>
        <span>/</span>
        <span className="text-text-primary font-medium font-mono">{inv.invoice_number}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-primary font-mono">{inv.invoice_number}</h1>
            <InvoiceStatusBadge status={effectiveStatus} />
          </div>
          <p className="text-sm text-text-muted">
            {client?.name ?? "Unknown client"} · Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}
          </p>
        </div>

        {/* Actions */}
        <InvoiceActions
          invoiceId={inv.id}
          invoiceNumber={inv.invoice_number}
          status={inv.status}
          effectiveStatus={effectiveStatus}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Client + Date meta */}
          <div className="bg-white border border-surface-border rounded-lg p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Bill To</p>
                <p className="text-sm font-semibold text-text-primary">{client?.name ?? "—"}</p>
                {client?.email && <p className="text-xs text-text-muted">{client.email}</p>}
                {client?.phone && <p className="text-xs text-text-muted">{client.phone}</p>}
                {client?.billing_address && (
                  <p className="text-xs text-text-muted whitespace-pre-line mt-1">{client.billing_address}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Issue Date</p>
                <p className="text-sm text-text-primary">{formatDate(inv.issue_date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Due Date</p>
                <p className={`text-sm font-medium ${isOverdue ? "text-negative" : "text-text-primary"}`}>
                  {formatDate(inv.due_date)}
                  {isOverdue && " (Overdue)"}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-border">
              <h2 className="text-sm font-semibold text-text-primary">Line Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted border-b border-surface-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Qty</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Unit Price</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Tax</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {lineItems.map((item) => {
                  const lineAmount = item.quantity * item.unit_price * (1 + item.tax_rate);
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-text-primary">{item.description}</td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">
                        {item.tax_rate > 0 ? `${(item.tax_rate * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-primary font-medium">{formatCurrency(lineAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t-2 border-surface-border px-5 py-4">
              <div className="flex justify-end">
                <div className="w-56 space-y-1.5">
                  {inv.tax_amount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-text-secondary">
                        <span>Subtotal</span>
                        <span className="font-mono tabular-nums">{formatCurrency(inv.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-text-secondary">
                        <span>Tax</span>
                        <span className="font-mono tabular-nums">{formatCurrency(inv.tax_amount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-base font-bold text-text-primary border-t border-surface-border pt-1.5">
                    <span>Total</span>
                    <span className="font-mono tabular-nums">{formatCurrency(inv.total)}</span>
                  </div>
                  {amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-positive">
                        <span>Paid</span>
                        <span className="font-mono tabular-nums">−{formatCurrency(amountPaid)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-text-primary border-t border-surface-border pt-1.5">
                        <span>Balance Due</span>
                        <span className="font-mono tabular-nums">{formatCurrency(Math.max(0, amountDue))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {inv.notes && (
            <div className="bg-white border border-surface-border rounded-lg p-5">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Notes</h2>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{inv.notes}</p>
            </div>
          )}

          {/* Terms */}
          {inv.terms && (
            <div className="bg-white border border-surface-border rounded-lg p-5">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Payment Terms</h2>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{inv.terms}</p>
            </div>
          )}
        </div>

        {/* Right: Payments sidebar */}
        <div className="space-y-4">

          {/* Payment summary card */}
          <div className="bg-white border border-surface-border rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Payment Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Invoice Total</span>
                <span className="font-mono font-medium text-text-primary">{formatCurrency(inv.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Amount Paid</span>
                <span className="font-mono text-positive">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-2 font-semibold">
                <span className="text-text-primary">Balance Due</span>
                <span className={`font-mono ${amountDue > 0 ? (isOverdue ? "text-negative" : "text-text-primary") : "text-positive"}`}>
                  {formatCurrency(Math.max(0, amountDue))}
                </span>
              </div>
            </div>

            {inv.status !== "void" && amountDue > 0 && (
              <div className="pt-2">
                <RecordPaymentForm invoiceId={inv.id} amountDue={amountDue} />
              </div>
            )}
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="bg-white border border-surface-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-3">Payment History</h2>
              <div className="space-y-3">
                {payments.map((pmt) => (
                  <div key={pmt.id} className="text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-text-primary">{formatCurrency(pmt.amount)}</span>
                        <span className="text-text-muted ml-2">{formatDate(pmt.payment_date)}</span>
                      </div>
                      <span className="text-xs text-text-muted bg-surface-muted px-2 py-0.5 rounded-full">
                        {METHOD_LABELS[pmt.method] ?? pmt.method}
                      </span>
                    </div>
                    {pmt.reference && (
                      <p className="text-xs text-text-muted mt-0.5">Ref: {pmt.reference}</p>
                    )}
                    {pmt.notes && (
                      <p className="text-xs text-text-muted mt-0.5 italic">{pmt.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white border border-surface-border rounded-lg p-5 space-y-2 text-xs text-text-muted">
            <p><span className="font-medium text-text-secondary">Created:</span> {new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            {inv.sent_at && <p><span className="font-medium text-text-secondary">Sent:</span> {new Date(inv.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
            {inv.viewed_at && <p><span className="font-medium text-text-secondary">Viewed:</span> {new Date(inv.viewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
            {inv.void_reason && <p><span className="font-medium text-negative">Void reason:</span> {inv.void_reason}</p>}
            <p className="font-mono text-[10px] text-text-muted pt-1">{inv.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
