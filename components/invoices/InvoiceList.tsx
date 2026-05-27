import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

type Invoice = {
  id:               string;
  invoice_number:   string;
  effective_status: string;
  issue_date:       string;
  due_date:         string;
  total:            number;
  amount_paid:      number;
  amount_due:       number;
  client:           { id: string; name: string };
};

type Props = { invoices: Invoice[] };

export default function InvoiceList({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-surface-border rounded-lg">
        <p className="text-text-muted text-sm mb-4">No invoices yet.</p>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
        >
          + Create Invoice
        </Link>
      </div>
    );
  }

  return (
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
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Balance Due</th>
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
                </td>
                <td className="px-4 py-3">
                  <Link href={`/clients/${inv.client?.id}`} className="text-text-primary hover:text-brand transition-colors">
                    {inv.client?.name ?? "—"}
                  </Link>
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
                    : <span className="text-positive">Paid</span>
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
  );
}
