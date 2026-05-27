import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/settings
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .single();

  // Return defaults if no row yet
  return NextResponse.json(data ?? {
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
  });
}

// PATCH /api/settings
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const allowed = [
    "name", "email", "phone", "address_line1", "address_line2",
    "city", "state", "zip", "country", "tax_id", "currency",
    "default_payment_terms", "invoice_prefix",
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  // Upsert (create row if none exists)
  const { data: existing } = await supabase.from("company_settings").select("id").limit(1).single();

  let result;
  if (existing?.id) {
    const { data } = await supabase
      .from("company_settings")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();
    result = data;
  } else {
    const { data } = await supabase
      .from("company_settings")
      .insert({ ...updates, next_invoice_number: 1 })
      .select()
      .single();
    result = data;
  }

  return NextResponse.json(result);
}
