import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NetSuiteImportForm from "@/components/invoices/NetSuiteImportForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const supabase = createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, payment_terms")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/invoices" className="hover:text-brand transition-colors">Invoices</Link>
        <span>/</span>
        <span className="text-text-primary font-medium">Record NetSuite Invoice</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Record NetSuite Invoice</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Register a NetSuite invoice in Invoice Hub for payment tracking and reporting.
          </p>
        </div>
        <Link
          href="/invoices/import"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md border border-surface-border bg-white text-text-secondary hover:bg-surface-muted transition-colors whitespace-nowrap"
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Bulk CSV Import
        </Link>
      </div>

      <NetSuiteImportForm clients={clients ?? []} />
    </div>
  );
}
