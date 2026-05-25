import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendChangeAlert } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const year = searchParams.get("year");

  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  let query = supabase
    .from("revenue_closes")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_current", true);

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

  const body = await request.json();
  const { client_id, close_month, net_usage, rollover_from_previous, rollover_to_next, discounts, reason } = body;

  if (!client_id || !close_month) {
    return NextResponse.json({ error: "client_id and close_month are required" }, { status: 400 });
  }

  // Check for existing current version
  const { data: existing } = await supabase
    .from("revenue_closes")
    .select("*")
    .eq("client_id", client_id)
    .eq("close_month", close_month)
    .eq("is_current", true)
    .single();

  if (!existing) {
    // NEW close
    const { data, error } = await supabase
      .from("revenue_closes")
      .insert({
        client_id,
        close_month,
        net_usage: Number(net_usage) || 0,
        rollover_from_previous: Number(rollover_from_previous) || 0,
        rollover_to_next: Number(rollover_to_next) || 0,
        discounts: Number(discounts) || 0,
        version: 1,
        is_current: true,
        submitted_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // UPDATE existing close — create new version
  const newVersion = existing.version + 1;

  // Mark old row as not current
  await supabase
    .from("revenue_closes")
    .update({ is_current: false })
    .eq("id", existing.id);

  // Insert new version
  const { data: newClose, error: insertError } = await supabase
    .from("revenue_closes")
    .insert({
      client_id,
      close_month,
      net_usage: Number(net_usage) || 0,
      rollover_from_previous: Number(rollover_from_previous) || 0,
      rollover_to_next: Number(rollover_to_next) || 0,
      discounts: Number(discounts) || 0,
      version: newVersion,
      is_current: true,
      submitted_by: user.id,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Record change
  const { data: changeRecord } = await supabase
    .from("close_changes")
    .insert({
      revenue_close_id: newClose.id,
      client_id,
      close_month,
      changed_by: user.id,
      prev_rollover_from_previous: existing.rollover_from_previous,
      prev_rollover_to_next: existing.rollover_to_next,
      prev_discounts: existing.discounts,
      prev_net_usage: existing.net_usage,
      prev_expected_total: existing.expected_total,
      new_rollover_from_previous: newClose.rollover_from_previous,
      new_rollover_to_next: newClose.rollover_to_next,
      new_discounts: newClose.discounts,
      new_net_usage: newClose.net_usage,
      new_expected_total: newClose.expected_total,
      reason: reason || null,
    })
    .select()
    .single();

  // Send email notification directly (no fetch, no port dependency)
  if (changeRecord) {
    sendChangeAlert(changeRecord.id).catch((err) =>
      console.error("Change alert failed:", err)
    );
  }

  return NextResponse.json(newClose, { status: 200 });
}
