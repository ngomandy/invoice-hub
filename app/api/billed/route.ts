import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const year = searchParams.get("year");

  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  let query = supabase
    .from("billed_amounts")
    .select("*")
    .eq("client_id", clientId);

  if (year) {
    query = query
      .gte("close_month", `${year}-01-01`)
      .lte("close_month", `${year}-12-31`);
  }

  const { data, error } = await query.order("close_month");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { client_id, close_month, billed_total } = await request.json();

  if (!client_id || !close_month || billed_total === undefined) {
    return NextResponse.json({ error: "client_id, close_month, and billed_total are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("billed_amounts")
    .upsert(
      {
        client_id,
        close_month,
        billed_total: Number(billed_total),
        entered_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,close_month" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
