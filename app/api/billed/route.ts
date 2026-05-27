import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendVarianceAlert, VARIANCE_ALERT_THRESHOLD } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const year     = searchParams.get("year");

  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  let query = supabase.from("billed_amounts").select("*").eq("client_id", clientId);
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

  const { client_id, close_month, billed_total, variance_reason } = await request.json();

  if (!client_id || !close_month || billed_total === undefined) {
    return NextResponse.json(
      { error: "client_id, close_month, and billed_total are required" },
      { status: 400 }
    );
  }

  // Fetch the current close to compute variance
  const { data: close } = await supabase
    .from("revenue_closes")
    .select("expected_total")
    .eq("client_id", client_id)
    .eq("close_month", close_month)
    .eq("is_current", true)
    .single();

  const billedNum  = Number(billed_total);
  const variance   = close ? billedNum - close.expected_total : null;
  const isLarge    = variance !== null && Math.abs(variance) >= VARIANCE_ALERT_THRESHOLD;

  // Require variance reason if variance is large
  if (isLarge && !variance_reason?.trim()) {
    return NextResponse.json(
      {
        error: `A reason is required when variance exceeds $${VARIANCE_ALERT_THRESHOLD.toLocaleString()}.`,
        requiresReason: true,
        variance,
      },
      { status: 422 }
    );
  }

  // Upsert billed amount
  const { data, error } = await supabase
    .from("billed_amounts")
    .upsert(
      {
        client_id,
        close_month,
        billed_total: billedNum,
        entered_by:   user.id,
        updated_at:   new Date().toISOString(),
        ...(variance_reason ? { variance_reason: variance_reason.trim() } : {}),
      },
      { onConflict: "client_id,close_month" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire variance alert email asynchronously (don't block the response)
  if (isLarge && close && variance !== null) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const { data: clientRow } = await supabase
      .from("clients")
      .select("name")
      .eq("id", client_id)
      .single();

    sendVarianceAlert({
      clientId:       client_id,
      clientName:     clientRow?.name ?? "Unknown Client",
      month:          close_month,
      expectedTotal:  close.expected_total,
      billedTotal:    billedNum,
      variance,
      varianceReason: variance_reason ?? null,
      enteredByName:  profile?.full_name ?? "A team member",
    }).catch((err) => console.error("sendVarianceAlert failed:", err));
  }

  return NextResponse.json(data);
}
