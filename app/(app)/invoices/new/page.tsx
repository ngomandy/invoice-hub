import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "@/components/invoices/InvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = createClient();

  const [{ data: clients }, { data: settings }] = await Promise.all([
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

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/invoices" className="hover:text-brand transition-colors">Invoices</Link>
        <span>/</span>
        <span className="text-text-primary font-medium">New Invoice</span>
      </nav>

      <h1 className="text-2xl font-bold text-text-primary mb-6">Create Invoice</h1>

      <InvoiceForm
        clients={clients ?? []}
        defaultPaymentTerms={settings?.default_payment_terms ?? 30}
      />
    </div>
  );
}
