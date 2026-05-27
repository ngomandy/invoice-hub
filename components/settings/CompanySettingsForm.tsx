"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  name:                   string;
  email:                  string;
  phone:                  string;
  address_line1:          string;
  address_line2:          string;
  city:                   string;
  state:                  string;
  zip:                    string;
  country:                string;
  tax_id:                 string;
  currency:               string;
  default_payment_terms:  number;
  invoice_prefix:         string;
  next_invoice_number:    number;
};

type Props = { defaults: Settings };

export default function CompanySettingsForm({ defaults }: Props) {
  const router = useRouter();

  const [name,                 setName]                = useState(defaults.name);
  const [email,                setEmail]               = useState(defaults.email);
  const [phone,                setPhone]               = useState(defaults.phone);
  const [addressLine1,         setAddressLine1]        = useState(defaults.address_line1);
  const [addressLine2,         setAddressLine2]        = useState(defaults.address_line2);
  const [city,                 setCity]                = useState(defaults.city);
  const [state,                setState]               = useState(defaults.state);
  const [zip,                  setZip]                 = useState(defaults.zip);
  const [country,              setCountry]             = useState(defaults.country);
  const [taxId,                setTaxId]               = useState(defaults.tax_id);
  const [currency,             setCurrency]            = useState(defaults.currency);
  const [paymentTerms,         setPaymentTerms]        = useState(String(defaults.default_payment_terms));
  const [invoicePrefix,        setInvoicePrefix]       = useState(defaults.invoice_prefix);

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess(false);

    const res = await fetch("/api/settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:                  name.trim(),
        email:                 email.trim(),
        phone:                 phone.trim(),
        address_line1:         addressLine1.trim(),
        address_line2:         addressLine2.trim(),
        city:                  city.trim(),
        state:                 state.trim(),
        zip:                   zip.trim(),
        country:               country.trim(),
        tax_id:                taxId.trim(),
        currency:              currency.trim(),
        default_payment_terms: parseInt(paymentTerms) || 30,
        invoice_prefix:        invoicePrefix.trim() || "INV",
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to save settings");
    } else {
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  const inputCls = "w-full border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white";
  const labelCls = "block text-xs font-medium text-text-secondary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Company Info */}
      <div className="bg-white border border-surface-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Company Information</h2>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Company Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Acme Inc." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="billing@acme.com" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tax ID / EIN</label>
            <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className={inputCls} placeholder="12-3456789" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white border border-surface-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Billing Address</h2>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Address Line 1</label>
            <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputCls} placeholder="123 Main St" />
          </div>
          <div>
            <label className={labelCls}>Address Line 2</label>
            <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputCls} placeholder="Suite 400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={labelCls}>City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="New York" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input type="text" value={state} onChange={(e) => setState(e.target.value)} className={inputCls} placeholder="NY" />
            </div>
            <div>
              <label className={labelCls}>ZIP</label>
              <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className={inputCls} placeholder="10001" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} placeholder="US" />
          </div>
        </div>
      </div>

      {/* Invoice Defaults */}
      <div className="bg-white border border-surface-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Invoice Defaults</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Invoice Prefix</label>
            <input
              type="text"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
              maxLength={10}
              className={inputCls + " font-mono uppercase"}
              placeholder="INV"
            />
            <p className="text-[10px] text-text-muted mt-1">e.g. INV → INV-0001</p>
          </div>
          <div>
            <label className={labelCls}>Default Payment Terms</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                min="0"
                max="365"
                className={inputCls}
              />
              <span className="text-sm text-text-muted whitespace-nowrap">days</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputCls}
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="AUD">AUD — Australian Dollar</option>
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-surface-muted rounded-md">
          <p className="text-xs text-text-muted">
            <span className="font-medium text-text-secondary">Next invoice number:</span>{" "}
            <span className="font-mono">{defaults.invoice_prefix || invoicePrefix}-{String(defaults.next_invoice_number).padStart(4, "0")}</span>
            {" "}— managed automatically; increments after each new invoice.
          </p>
        </div>
      </div>

      {/* Submit */}
      {error   && <p className="text-sm text-negative">{error}</p>}
      {success && <p className="text-sm text-positive font-medium">✓ Settings saved successfully</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
