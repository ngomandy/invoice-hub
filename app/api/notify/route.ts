import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";

export const dynamic = "force-dynamic";
import { ChangeAlertEmail } from "@/lib/email-templates/change-alert";
import { formatMonth } from "@/lib/utils";
import * as React from "react";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { changeId } = await request.json();

  if (!changeId) {
    return NextResponse.json({ error: "changeId required" }, { status: 400 });
  }

  // Fetch change record with client name
  const { data: change } = await supabase
    .from("close_changes")
    .select("*, profiles(full_name), clients(name)")
    .eq("id", changeId)
    .single();

  if (!change) {
    return NextResponse.json({ error: "Change not found" }, { status: 404 });
  }

  const clientName = (change.clients as { name: string } | null)?.name ?? "Unknown Client";
  const authorName = (change.profiles as { full_name: string } | null)?.full_name ?? "A team member";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const historyUrl = `${appUrl}/clients/${change.client_id}/history`;

  const enrichedChange = { ...change, changed_by_name: authorName, client_name: clientName };

  // Fetch all team emails
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, full_name");

  const recipients = (profiles ?? []).map((p) => p.email);

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const subject = `[Invoice Hub] Close Updated: ${clientName} — ${formatMonth(change.close_month)}`;

  try {
    await getResend().emails.send({
      from: "Invoice Hub <onboarding@resend.dev>",
      to: recipients,
      subject,
      react: React.createElement(ChangeAlertEmail, {
        change: enrichedChange,
        clientName,
        historyUrl,
      }),
    });
  } catch (err) {
    console.error("Email send failed:", err);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }

  return NextResponse.json({ sent: recipients.length });
}
