import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { formatMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/notify/reminder
// body: { type: "close" | "billed", month: "YYYY-MM-DD" }
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { type, month } = body as { type?: string; month?: string };

  if (!type || !["close", "billed"].includes(type)) {
    return NextResponse.json({ error: "type must be 'close' or 'billed'" }, { status: 400 });
  }
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const [
    { data: clients },
    { data: closes },
    { data: billed },
    { data: profiles },
    { data: senderProfile },
  ] = await Promise.all([
    supabase.from("clients").select("id, name").eq("is_active", true).order("name"),
    supabase.from("revenue_closes").select("client_id").eq("close_month", month).eq("is_current", true),
    supabase.from("billed_amounts").select("client_id").eq("close_month", month),
    supabase.from("profiles").select("email, full_name"),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  const closedIds  = new Set((closes  ?? []).map((c) => c.client_id));
  const billedIds  = new Set((billed  ?? []).map((b) => b.client_id));
  const allClients = clients ?? [];

  const missingClose  = allClients.filter((c) => !closedIds.has(c.id)).map((c) => c.name);
  const missingBilled = allClients.filter((c) =>  closedIds.has(c.id) && !billedIds.has(c.id)).map((c) => c.name);

  const targetList = type === "close" ? missingClose : missingBilled;

  if (targetList.length === 0) {
    return NextResponse.json({
      ok:         true,
      recipients: 0,
      message:    "Nothing to remind — all entries are complete",
    });
  }

  const recipients = (profiles ?? []).map((p) => p.email).filter(Boolean);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No team members found" }, { status: 400 });
  }

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || "https://invoice-hub-liart.vercel.app";
  const sentBy   = (senderProfile as { full_name: string } | null)?.full_name ?? "A team member";
  const monthStr = formatMonth(month);

  const isClose  = type === "close";
  const actionLink = isClose
    ? `${appUrl}/dashboard?status=pending&month=${month}`
    : `${appUrl}/billed?month=${month}`;

  const subject = isClose
    ? `[Invoice Hub] Reminder: ${missingClose.length} clients need a close — ${monthStr}`
    : `[Invoice Hub] Reminder: ${missingBilled.length} clients need billed amounts — ${monthStr}`;

  const listItems = targetList
    .map((name) => `<li style="margin:4px 0; color:#0f172a;">${name}</li>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="background:#f8fafc;font-family:sans-serif;margin:0;padding:32px 0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:${isClose ? "#f59e0b" : "#ef4444"};padding:20px 28px;">
      <h1 style="color:#fff;font-size:17px;font-weight:700;margin:0;">
        ${isClose ? "⚠ Missing Revenue Closes" : "✕ Missing Billed Amounts"}
      </h1>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0;">
        ${monthStr} &middot; Sent by ${sentBy}
      </p>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:14px;color:#334155;margin:0 0 16px;">
        The following <strong>${targetList.length} client${targetList.length !== 1 ? "s" : ""}</strong>
        ${isClose
          ? "still need a revenue close submitted for " + monthStr + ":"
          : "have a close but are missing a billed amount for " + monthStr + ":"}
      </p>
      <ul style="margin:0 0 20px;padding-left:20px;font-size:13px;">
        ${listItems}
      </ul>
      <a href="${actionLink}"
         style="display:inline-block;background:${isClose ? "#f59e0b" : "#ef4444"};color:#fff;font-size:13px;font-weight:600;padding:10px 22px;border-radius:6px;text-decoration:none;">
        ${isClose ? "View Missing Closes →" : "Enter Billed Amounts →"}
      </a>
    </div>
  </div>
</body>
</html>`;

  try {
    await getResend().emails.send({
      from:    "Invoice Hub <onboarding@resend.dev>",
      to:      recipients,
      subject,
      html,
    });
  } catch (err) {
    console.error("sendReminder: email failed", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recipients: recipients.length });
}
