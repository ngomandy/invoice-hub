import { createClient } from "@/lib/supabase/server";
import CompanySettingsForm from "@/components/settings/CompanySettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();

  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .single();

  const defaults = settings ?? {
    name: "",
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    tax_id: "",
    currency: "USD",
    default_payment_terms: 30,
    invoice_prefix: "INV",
    next_invoice_number: 1,
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Company profile and invoice defaults
        </p>
      </div>

      <CompanySettingsForm defaults={defaults} />
    </div>
  );
}
