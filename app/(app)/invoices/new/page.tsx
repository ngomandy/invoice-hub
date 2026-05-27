import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Manual invoice creation is disabled — redirect to the NetSuite CSV upload page
export default function NewInvoicePage() {
  redirect("/invoices/import");
}
