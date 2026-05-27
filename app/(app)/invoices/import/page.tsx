import Link from "next/link";
import NetSuiteCSVImport from "@/components/invoices/NetSuiteCSVImport";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvoiceImportPage() {
  const supabase = createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href="/invoices" className="hover:text-brand transition-colors">Invoices</Link>
        <span>/</span>
        <span className="text-text-primary font-medium">Bulk CSV Import</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Import from NetSuite CSV</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Upload a NetSuite invoice export to bulk-register invoices for tracking.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-brand/5 border border-brand/20 rounded-lg p-4 mb-6 text-sm">
        <p className="font-semibold text-text-primary mb-2">How to export from NetSuite:</p>
        <ol className="list-decimal list-inside space-y-1 text-text-secondary">
          <li>Go to <strong>Transactions → Sales → Invoices</strong></li>
          <li>Set your date range filter, then click <strong>Export → CSV</strong></li>
          <li>Upload the downloaded CSV file below</li>
        </ol>
        <p className="text-text-muted text-xs mt-3">
          Supported columns: <span className="font-mono">Internal ID, Document Number, Name, Date, Due Date, Amount, Status, Memo</span>
          <br />Client names in the CSV must match your existing clients exactly (case-insensitive).
        </p>
      </div>

      <NetSuiteCSVImport clients={clients ?? []} />
    </div>
  );
}
