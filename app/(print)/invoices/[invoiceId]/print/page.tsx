import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import PrintButton from "@/components/invoices/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const supabase = createClient();

  const [{ data: inv }, { data: settings }] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        *,
        client:clients(id, name, email, phone, billing_address),
        line_items:invoice_line_items(*),
        payments(amount)
      `)
      .eq("id", params.invoiceId)
      .order("sort_order", { referencedTable: "invoice_line_items" })
      .single(),
    supabase
      .from("company_settings")
      .select("name, email, phone, address_line1, address_line2, city, state, zip, country, tax_id, invoice_prefix")
      .limit(1)
      .single(),
  ]);

  if (!inv) notFound();

  const amountPaid = (inv.payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const amountDue  = inv.total - amountPaid;

  const client = inv.client as {
    name?: string; email?: string; phone?: string; billing_address?: string;
  } | null;

  type LineItem = {
    id: string; description: string;
    quantity: number; unit_price: number; tax_rate: number;
  };
  const lineItems: LineItem[] = inv.line_items ?? [];

  const companyName    = settings?.name    || "Your Company";
  const companyEmail   = settings?.email   || "";
  const companyPhone   = settings?.phone   || "";
  const companyAddr1   = settings?.address_line1 || "";
  const companyAddr2   = settings?.address_line2 || "";
  const companyCity    = settings?.city    || "";
  const companyState   = settings?.state   || "";
  const companyZip     = settings?.zip     || "";
  const companyTaxId   = settings?.tax_id  || "";

  const companyAddrLine = [companyCity, companyState, companyZip].filter(Boolean).join(", ");

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="print:hidden bg-surface-muted border-b border-surface-border px-6 py-3 flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Invoice preview — click &quot;Print / Save PDF&quot; to download or print
        </p>
        <div className="flex items-center gap-3">
          <a
            href={`/invoices/${params.invoiceId}`}
            className="text-sm text-text-secondary hover:text-brand transition-colors"
          >
            ← Back to Invoice
          </a>
          <PrintButton />
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-[800px] mx-auto p-10 print:p-0 print:max-w-none">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{companyName}</h1>
            {companyAddr1 && <p className="text-sm text-text-secondary mt-1">{companyAddr1}</p>}
            {companyAddr2 && <p className="text-sm text-text-secondary">{companyAddr2}</p>}
            {companyAddrLine && <p className="text-sm text-text-secondary">{companyAddrLine}</p>}
            {companyEmail && <p className="text-sm text-text-secondary">{companyEmail}</p>}
            {companyPhone && <p className="text-sm text-text-secondary">{companyPhone}</p>}
            {companyTaxId && <p className="text-xs text-text-muted mt-1">Tax ID: {companyTaxId}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-brand">INVOICE</h2>
            <p className="text-lg font-mono font-semibold text-text-primary mt-1">{inv.invoice_number}</p>
            <p className={`text-xs font-semibold uppercase tracking-wide mt-2 px-2 py-1 rounded inline-block ${
              inv.status === "paid"
                ? "bg-positive/10 text-positive"
                : inv.status === "void"
                ? "bg-neutral-100 text-text-muted"
                : "bg-brand/10 text-brand"
            }`}>
              {inv.status.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-6 mb-8 pb-8 border-b border-surface-border">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Bill To</p>
            <p className="text-sm font-semibold text-text-primary">{client?.name ?? "—"}</p>
            {client?.email && <p className="text-sm text-text-secondary">{client.email}</p>}
            {client?.phone && <p className="text-sm text-text-secondary">{client.phone}</p>}
            {client?.billing_address && (
              <p className="text-sm text-text-secondary whitespace-pre-line mt-1">{client.billing_address}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Issue Date</p>
            <p className="text-sm text-text-primary">{formatDate(inv.issue_date)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Due Date</p>
            <p className="text-sm font-semibold text-text-primary">{formatDate(inv.due_date)}</p>
          </div>
        </div>

        {/* Line items table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-surface-border">
              <th className="text-left pb-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Description</th>
              <th className="text-right pb-3 text-xs font-semibold text-text-muted uppercase tracking-wide w-16">Qty</th>
              <th className="text-right pb-3 text-xs font-semibold text-text-muted uppercase tracking-wide w-28">Unit Price</th>
              <th className="text-right pb-3 text-xs font-semibold text-text-muted uppercase tracking-wide w-20">Tax</th>
              <th className="text-right pb-3 text-xs font-semibold text-text-muted uppercase tracking-wide w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => {
              const lineAmount = item.quantity * item.unit_price * (1 + item.tax_rate);
              return (
                <tr key={item.id} className={i > 0 ? "border-t border-surface-border" : ""}>
                  <td className="py-3 text-sm text-text-primary">{item.description}</td>
                  <td className="py-3 text-right text-sm font-mono text-text-secondary">{item.quantity}</td>
                  <td className="py-3 text-right text-sm font-mono text-text-secondary">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 text-right text-sm font-mono text-text-secondary">
                    {item.tax_rate > 0 ? `${(item.tax_rate * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-3 text-right text-sm font-mono font-medium text-text-primary">{formatCurrency(lineAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            {inv.tax_amount > 0 && (
              <>
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(inv.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Tax</span>
                  <span className="font-mono">{formatCurrency(inv.tax_amount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-base font-bold text-text-primary border-t-2 border-surface-border pt-2">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(inv.total)}</span>
            </div>
            {amountPaid > 0 && (
              <>
                <div className="flex justify-between text-sm text-positive">
                  <span>Payments Received</span>
                  <span className="font-mono">−{formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-surface-border pt-2">
                  <span className={amountDue > 0 ? "text-text-primary" : "text-positive"}>Balance Due</span>
                  <span className={`font-mono ${amountDue > 0 ? "text-text-primary" : "text-positive"}`}>
                    {formatCurrency(Math.max(0, amountDue))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="border-t border-surface-border pt-6 mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{inv.notes}</p>
          </div>
        )}

        {/* Terms */}
        {inv.terms && (
          <div className="border-t border-surface-border pt-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Payment Terms</p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{inv.terms}</p>
          </div>
        )}
      </div>
    </>
  );
}
