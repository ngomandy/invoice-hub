import * as React from "react";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { InvoiceEmail } from "@/lib/email-templates/invoice-email";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/invoices/[invoiceId]/send
export async function POST(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(id, name, email),
      line_items:invoice_line_items(description, quantity, unit_price, tax_rate, sort_order)
    `)
    .eq("id", params.invoiceId)
    .order("sort_order", { referencedTable: "invoice_line_items" })
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "void") return NextResponse.json({ error: "Cannot send a voided invoice" }, { status: 400 });
  if (invoice.status === "paid") return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });

  const clientEmail = (invoice.client as { email?: string })?.email;
  if (!clientEmail) {
    return NextResponse.json({ error: "Client has no email address — add one in the client edit page" }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("company_settings")
    .select("name, email")
    .limit(1)
    .single();

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "https://invoice-hub-liart.vercel.app";
  const companyName = (settings as { name?: string } | null)?.name ?? "Invoice Hub";

  try {
    await getResend().emails.send({
      from:    `${companyName} <onboarding@resend.dev>`,
      to:      [clientEmail],
      subject: `Invoice ${invoice.invoice_number} from ${companyName} — due ${formatDate(invoice.due_date)}`,
      react:   React.createElement(InvoiceEmail, {
        invoiceNumber: invoice.invoice_number,
        companyName,
        clientName:    (invoice.client as { name: string }).name,
        issueDate:     formatDate(invoice.issue_date),
        dueDate:       formatDate(invoice.due_date),
        lineItems:     invoice.line_items as { description: string; quantity: number; unit_price: number; tax_rate: number }[],
        subtotal:      invoice.subtotal,
        taxAmount:     invoice.tax_amount,
        total:         invoice.total,
        notes:         invoice.notes,
        viewUrl:       `${appUrl}/invoices/${invoice.id}/print`,
      }),
    });
  } catch (err) {
    console.error("send invoice email failed", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Update status to sent
  await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", params.invoiceId);

  return NextResponse.json({ ok: true, sent_to: clientEmail });
}
