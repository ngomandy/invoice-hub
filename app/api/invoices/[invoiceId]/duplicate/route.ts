import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/invoices/[invoiceId]/duplicate — creates a draft copy
export async function POST(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: source, error: fetchError } = await supabase
    .from("invoices")
    .select("*, line_items:invoice_line_items(*)")
    .eq("id", params.invoiceId)
    .single();

  if (fetchError || !source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get next invoice number
  const { data: settings } = await supabase
    .from("company_settings")
    .select("invoice_prefix, next_invoice_number")
    .limit(1)
    .single();

  const prefix = settings?.invoice_prefix ?? "INV";
  const seq    = settings?.next_invoice_number ?? 1;

  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);

  const { data: newInvoice, error: createError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: `${prefix}-${String(seq).padStart(4, "0")}`,
      invoice_seq:    seq,
      client_id:      source.client_id,
      status:         "draft",
      issue_date:     today.toISOString().slice(0, 10),
      due_date:       dueDate.toISOString().slice(0, 10),
      subtotal:       source.subtotal,
      tax_amount:     source.tax_amount,
      total:          source.total,
      notes:          source.notes,
      terms:          source.terms,
      created_by:     user.id,
    })
    .select()
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

  // Duplicate line items
  const items = (source.line_items ?? []).map((item: {
    description: string; quantity: number; unit_price: number; tax_rate: number; sort_order: number;
  }) => ({
    invoice_id:  newInvoice.id,
    description: item.description,
    quantity:    item.quantity,
    unit_price:  item.unit_price,
    tax_rate:    item.tax_rate,
    sort_order:  item.sort_order,
  }));

  if (items.length > 0) {
    await supabase.from("invoice_line_items").insert(items);
  }

  // Bump invoice number
  await supabase
    .from("company_settings")
    .update({ next_invoice_number: seq + 1, updated_at: new Date().toISOString() })
    .eq("next_invoice_number", seq);

  return NextResponse.json(newInvoice, { status: 201 });
}
