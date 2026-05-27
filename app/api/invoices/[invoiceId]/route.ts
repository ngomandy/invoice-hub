import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/invoices/[invoiceId]
export async function GET(
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
      client:clients(id, name, email, phone, billing_address, payment_terms),
      line_items:invoice_line_items(* ) ,
      payments(id, amount, payment_date, method, reference, notes, created_at,
               recorder:profiles!payments_recorded_by_fkey(full_name))
    `)
    .eq("id", params.invoiceId)
    .order("sort_order", { referencedTable: "invoice_line_items" })
    .order("payment_date", { referencedTable: "payments" })
    .single();

  if (error || !invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const amountPaid = (invoice.payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const isOverdue  = ["sent", "viewed"].includes(invoice.status) && new Date(invoice.due_date) < new Date();

  return NextResponse.json({
    ...invoice,
    amount_paid:      amountPaid,
    amount_due:       invoice.total - amountPaid,
    is_overdue:       isOverdue,
    effective_status: isOverdue ? "overdue" : invoice.status,
  });
}

// PATCH /api/invoices/[invoiceId]
// Body: { client_id?, issue_date?, due_date?, notes?, terms?, items?, status? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // Fetch existing invoice
  const { data: existing } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", params.invoiceId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "void") return NextResponse.json({ error: "Cannot edit a voided invoice" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.client_id)  updates.client_id  = body.client_id;
  if (body.issue_date) updates.issue_date = body.issue_date;
  if (body.due_date)   updates.due_date   = body.due_date;
  if (body.notes  !== undefined) updates.notes  = body.notes;
  if (body.terms  !== undefined) updates.terms  = body.terms;
  if (body.status !== undefined) updates.status = body.status;

  // If line items provided, recompute totals
  if (body.items?.length) {
    const subtotal  = body.items.reduce((s: number, it: { quantity: number; unit_price: number }) =>
      s + (it.quantity ?? 0) * (it.unit_price ?? 0), 0);
    const taxAmount = body.items.reduce((s: number, it: { quantity: number; unit_price: number; tax_rate: number }) =>
      s + (it.quantity ?? 0) * (it.unit_price ?? 0) * (it.tax_rate ?? 0), 0);

    updates.subtotal   = Math.round(subtotal  * 100) / 100;
    updates.tax_amount = Math.round(taxAmount * 100) / 100;
    updates.total      = Math.round((subtotal + taxAmount) * 100) / 100;

    // Replace line items
    await supabase.from("invoice_line_items").delete().eq("invoice_id", params.invoiceId);
    await supabase.from("invoice_line_items").insert(
      body.items.map((it: {
        description: string; quantity: number; unit_price: number; tax_rate?: number; sort_order?: number;
      }, idx: number) => ({
        invoice_id:  params.invoiceId,
        description: it.description,
        quantity:    it.quantity,
        unit_price:  it.unit_price,
        tax_rate:    it.tax_rate ?? 0,
        sort_order:  it.sort_order ?? idx,
      }))
    );
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", params.invoiceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
