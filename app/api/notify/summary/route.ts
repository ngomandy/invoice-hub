import * as React from "react";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { SummaryAlertEmail } from "@/lib/email-templates/summary-alert";
import { formatMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/notify/summary  — body: { month: "YYYY-MM-DD" }
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { month } = await request.json();
  if (!month) return NextResponse.json({ error: "month is required" }, { status: 400 });

  // ── Fetch data ────────────────────────────────────────────────────────────
  const [
    { data: clients },
    { data: closes },
    { data: billed },
    { data: profiles },
    { data: senderProfile },
  ] = await Promise.all([
    supabase.from("clients").select("id, name").eq("is_active", true).order("name"),
    supabase.from("revenue_closes").select("client_id, expected_total").eq("close_month", month).eq("is_current", true),
    supabase.from("billed_amounts").select("client_id, billed_total").eq("close_month", month),
    supabase.from("profiles").select("email, full_name"),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  const closeMap  = new Map((closes  ?? []).map((c) => [c.client_id, c.expected_total]));
  const billedMap = new Map((billed  ?? []).map((b) => [b.client_id, b.billed_total]));

  const totalExpected = (closes ?? []).reduce((s, c) => s + c.expected_total, 0);
  const totalBilled   = (billed ?? []).reduce((s, b) => s + b.billed_total,   0);
  const netVariance   = totalBilled - totalExpected;
  const closedCount   = (closes  ?? []).length;
  const totalClients  = (clients ?? []).length;

  const missingClose  = (clients ?? []).filter((c) => !closeMap.has(c.id)).map((c) => c.name);
  const missingBilled = (clients ?? []).filter((c) => closeMap.has(c.id) && !billedMap.has(c.id)).map((c) => c.name);

  // Top 5 variances by magnitude
  type ClientSummary = { name: string; expected: number | null; billed: number | null; variance: number | null; hasClose: boolean; hasBilled: boolean };
  const allWithVariance: ClientSummary[] = (clients ?? []).map((c) => {
    const exp = closeMap.get(c.id) ?? null;
    const bil = billedMap.get(c.id) ?? null;
    return { name: c.name, expected: exp, billed: bil, variance: exp != null && bil != null ? bil - exp : null, hasClose: !!exp, hasBilled: !!bil };
  });
  const topVariances = allWithVariance
    .filter((c) => c.variance !== null)
    .sort((a, b) => Math.abs(b.variance!) - Math.abs(a.variance!))
    .slice(0, 5);

  // ── Send email ────────────────────────────────────────────────────────────
  const recipients = (profiles ?? []).map((p) => p.email).filter(Boolean);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No team members found to notify" }, { status: 400 });
  }

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || "https://invoice-hub-liart.vercel.app";
  const sentBy   = (senderProfile as { full_name: string } | null)?.full_name ?? "A team member";
  const monthStr = formatMonth(month);

  try {
    await getResend().emails.send({
      from:    "Invoice Hub <onboarding@resend.dev>",
      to:      recipients,
      subject: `[Invoice Hub] Monthly Summary — ${monthStr}`,
      react:   React.createElement(SummaryAlertEmail, {
        month: monthStr,
        totalExpected,
        totalBilled,
        netVariance,
        closedCount,
        totalClients,
        missingClose,
        missingBilled,
        topVariances,
        sentBy,
        appUrl,
      }),
    });
  } catch (err) {
    console.error("sendSummary: email failed", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recipients: recipients.length });
}
