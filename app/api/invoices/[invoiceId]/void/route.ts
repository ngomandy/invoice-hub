import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/invoices/[invoiceId]/void  body: { reason?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const reason = body.reason ?? null;

  const { data: existing } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", params.invoiceId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "void") return NextResponse.json({ error: "Already voided" }, { status: 400 });
  if (existing.status === "paid") return NextResponse.json({ error: "Cannot void a paid invoice" }, { status: 400 });

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "void", void_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", params.invoiceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
