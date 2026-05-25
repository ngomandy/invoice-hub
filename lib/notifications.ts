import * as React from "react";
import { resend } from "@/lib/resend";
import { ChangeAlertEmail } from "@/lib/email-templates/change-alert";
import { formatMonth } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function sendChangeAlert(changeId: string) {
  const supabase = createClient();

  // Fetch change with client name and author name
  const { data: change, error: changeError } = await supabase
    .from("close_changes")
    .select("*, profiles(full_name), clients(name)")
    .eq("id", changeId)
    .single();

  if (changeError || !change) {
    console.error("sendChangeAlert: change not found", changeError);
    return;
  }

  const clientName =
    (change.clients as { name: string } | null)?.name ?? "Unknown Client";
  const authorName =
    (change.profiles as { full_name: string } | null)?.full_name ??
    "A team member";

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const historyUrl = `${appUrl}/clients/${change.client_id}/history`;

  const enrichedChange = {
    ...change,
    changed_by_name: authorName,
    client_name: clientName,
  };

  // Fetch all team emails
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email");

  const recipients = (profiles ?? []).map((p) => p.email).filter(Boolean);

  if (recipients.length === 0) {
    console.warn("sendChangeAlert: no recipients found");
    return;
  }

  const subject = `[Invoice Hub] Close Updated: ${clientName} — ${formatMonth(change.close_month)}`;

  try {
    const result = await resend.emails.send({
      from: "Invoice Hub <onboarding@resend.dev>",
      to: recipients,
      subject,
      react: React.createElement(ChangeAlertEmail, {
        change: enrichedChange,
        clientName,
        historyUrl,
      }),
    });
    console.log("Email sent:", result);
  } catch (err) {
    console.error("sendChangeAlert: email failed", err);
  }
}
