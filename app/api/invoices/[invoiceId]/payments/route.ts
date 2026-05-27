import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/invoices/[invoiceId]/payments
export async function GET(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("payments")
    .select("*, recorder:profiles!payments_recorded_by_fkey(full_name)")
    .eq("invoice_id", params.invoiceId)
    .order("payment_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/invoices/[invoiceId]/payments
// body: { amount, payment_date?, method?, reference?, notes? }
export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.amount || isNaN(parseFloat(body.amount))) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, total, status, payments(amount)")
    .eq("id", params.invoiceId)
    .single();

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status === "void") return NextResponse.json({ error: "Cannot record payment on voided invoice" }, { status: 400 });

  const amount = Math.round(parseFloat(body.amount) * 100) / 100;

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      invoice_id:   params.invoiceId,
      amount,
      payment_date: body.payment_date ?? new Date().toISOString().slice(0, 10),
      method:       body.method       ?? "bank_transfer",
      reference:    body.reference    ?? null,
      notes:        body.notes        ?? null,
      recorded_by:  user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if fully paid and update status
  const existingPaid = ((invoice.payments as { amount: number }[]) ?? []).reduce((s, p) => s + p.amount, 0);
  const totalPaid    = existingPaid + amount;
  if (totalPaid >= invoice.total) {
    await supabase
      .from("invoices")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", params.invoiceId);
  }

  return NextResponse.json(payment, { status: 201 });
}
