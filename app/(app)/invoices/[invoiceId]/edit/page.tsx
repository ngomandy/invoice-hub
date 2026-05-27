import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "@/components/invoices/InvoiceForm";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const supabase = createClient();

  const [{ data: inv }, { data: clients }, { data: settings }] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        id, invoice_number, status, client_id,
        issue_date, due_date, notes, terms,
        line_items:invoice_line_items(id, description, quantity, unit_price, tax_rate, sort_order)
      `)
      .eq("id", params.invoiceId)
      .order("sort_order", { referencedTable: "invoice_line_items" })
      .single(),
    supabase
      .from("clients")
      .select("id, name, payment_terms")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("company_settings")
      .select("default_payment_terms")
      .limit(1)
      .single(),
  ]);

  if (!inv) notFound();

  // Void invoices cannot be edited
  if (inv.status === "void") {
    redirect(`/invoices/${params.invoiceId}`);
  }

  type RawItem = {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    sort_order: number;
  };

  const lineItems: RawItem[] = (inv.line_items ?? []) as RawItem[];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/invoices" className="hover:text-brand transition-colors">Invoices</Link>
        <span>/</span>
        <Link href={`/invoices/${inv.id}`} className="hover:text-brand transition-colors font-mono">
          {inv.invoice_number}
        </Link>
        <span>/</span>
        <span className="text-text-primary font-medium">Edit</span>
      </nav>

      <h1 className="text-2xl font-bold text-text-primary mb-6">Edit Invoice</h1>

      <InvoiceForm
        invoiceId={inv.id}
        clients={clients ?? []}
        defaultPaymentTerms={settings?.default_payment_terms ?? 30}
        defaults={{
          client_id:  inv.client_id,
          issue_date: inv.issue_date,
          due_date:   inv.due_date,
          notes:      inv.notes ?? "",
          terms:      inv.terms ?? "",
          items:      lineItems.map((it) => ({
            id:          it.id,
            description: it.description,
            quantity:    it.quantity,
            unit_price:  it.unit_price,
            tax_rate:    it.tax_rate,
          })),
        }}
      />
    </div>
  );
}
