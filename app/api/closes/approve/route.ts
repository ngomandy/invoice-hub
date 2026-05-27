import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/closes/approve
// Body: { revenue_close_id, action: "review" | "approve" | "reject", rejection_reason? }
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { revenue_close_id, action, rejection_reason } = await request.json();

  if (!revenue_close_id || !action) {
    return NextResponse.json({ error: "revenue_close_id and action are required" }, { status: 400 });
  }

  const validActions = ["review", "approve", "reject"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${validActions.join(", ")}` }, { status: 400 });
  }

  if (action === "reject" && !rejection_reason?.trim()) {
    return NextResponse.json({ error: "rejection_reason is required when rejecting" }, { status: 400 });
  }

  const statusMap: Record<string, string> = {
    review:  "under_review",
    approve: "approved",
    reject:  "rejected",
  };

  const updatePayload: Record<string, unknown> = {
    approval_status: statusMap[action],
    reviewed_by:     user.id,
    reviewed_at:     new Date().toISOString(),
  };

  if (action === "reject") {
    updatePayload.rejection_reason = rejection_reason.trim();
  } else {
    updatePayload.rejection_reason = null;
  }

  const { data, error } = await supabase
    .from("revenue_closes")
    .update(updatePayload)
    .eq("id", revenue_close_id)
    .eq("is_current", true)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
