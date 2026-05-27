import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/invoices?status=&clientId=&limit=&offset=
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status   = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const limit    = parseInt(searchParams.get("limit")  ?? "100");
  const offset   = parseInt(searchParams.get("offset") ?? "0");

  let query = supabase
    .from("invoices")
    .select(`
      id, invoice_number, invoice_seq, status, issue_date, due_date,
      subtotal, tax_amount, total, notes,
      sent_at, void_reason, created_at, updated_at,
      client:clients(id, name, email),
      payments(amount)
    `)
    .order("invoice_seq", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status)   query = query.eq("status", status);
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute derived fields
  const invoices = (data ?? []).map((inv) => {
    const amountPaid = (inv.payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
    const amountDue  = inv.total - amountPaid;
    const isOverdue  = ["sent", "viewed"].includes(inv.status) && new Date(inv.due_date) < new Date();
    return {
      ...inv,
      payments:    undefined,
      amount_paid: amountPaid,
      amount_due:  amountDue,
      is_overdue:  isOverdue,
      effective_status: isOverdue ? "overdue" : inv.status,
    };
  });

  return NextResponse.json(invoices);
}

// POST /api/invoices — create invoice with line items
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { client_id, issue_date, due_date, notes, terms, items } = body;
  if (!client_id)  return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  if (!due_date)   return NextResponse.json({ error: "due_date is required" }, { status: 400 });
  if (!items?.length) return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });

  // Get company settings for invoice prefix + next number
  const { data: settings } = await supabase
    .from("company_settings")
    .select("invoice_prefix, next_invoice_number")
    .limit(1)
    .single();

  const prefix = settings?.invoice_prefix ?? "INV";
  const seq    = settings?.next_invoice_number ?? 1;
  const invoiceNumber = `${prefix}-${String(seq).padStart(4, "0")}`;

  // Compute totals from line items
  const subtotal = items.reduce((s: number, it: { quantity: number; unit_price: number }) =>
    s + (it.quantity ?? 0) * (it.unit_price ?? 0), 0);
  const taxAmount = items.reduce((s: number, it: { quantity: number; unit_price: number; tax_rate: number }) =>
    s + (it.quantity ?? 0) * (it.unit_price ?? 0) * (it.tax_rate ?? 0), 0);
  const total = subtotal + taxAmount;

  // Insert invoice
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      invoice_seq:    seq,
      client_id,
      status:         "draft",
      issue_date:     issue_date ?? new Date().toISOString().slice(0, 10),
      due_date,
      subtotal:       Math.round(subtotal   * 100) / 100,
      tax_amount:     Math.round(taxAmount  * 100) / 100,
      total:          Math.round(total      * 100) / 100,
      notes:          notes ?? null,
      terms:          terms ?? null,
      created_by:     user.id,
    })
    .select()
    .single();

  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 });

  // Insert line items
  const lineItems = items.map((it: {
    description: string; quantity: number; unit_price: number; tax_rate?: number; sort_order?: number;
  }, idx: number) => ({
    invoice_id:   invoice.id,
    description:  it.description,
    quantity:     it.quantity,
    unit_price:   it.unit_price,
    tax_rate:     it.tax_rate ?? 0,
    sort_order:   it.sort_order ?? idx,
  }));

  const { error: itemsError } = await supabase.from("invoice_line_items").insert(lineItems);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  // Bump next invoice number
  await supabase
    .from("company_settings")
    .update({ next_invoice_number: seq + 1, updated_at: new Date().toISOString() })
    .eq("next_invoice_number", seq); // optimistic check

  return NextResponse.json(invoice, { status: 201 });
}
