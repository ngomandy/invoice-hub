import * as React from "react";
import { getResend } from "@/lib/resend";
import { ChangeAlertEmail } from "@/lib/email-templates/change-alert";
import { VarianceAlertEmail } from "@/lib/email-templates/variance-alert";
import { formatMonth } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getTeamEmails(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const { data: profiles } = await supabase.from("profiles").select("email");
  return (profiles ?? []).map((p) => p.email).filter(Boolean);
}

// ── Change alert (close edit) ─────────────────────────────────────────────────

export async function sendChangeAlert(changeId: string) {
  const supabase = createClient();

  const { data: change, error: changeError } = await supabase
    .from("close_changes")
    .select("*, profiles(full_name), clients(name)")
    .eq("id", changeId)
    .single();

  if (changeError || !change) {
    console.error("sendChangeAlert: change not found", changeError);
    return;
  }

  const clientName  = (change.clients  as { name: string }       | null)?.name       ?? "Unknown Client";
  const authorName  = (change.profiles as { full_name: string }  | null)?.full_name  ?? "A team member";
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const historyUrl  = `${appUrl}/clients/${change.client_id}/history`;

  const enrichedChange = { ...change, changed_by_name: authorName, client_name: clientName };
  const recipients = await getTeamEmails(supabase);

  if (recipients.length === 0) {
    console.warn("sendChangeAlert: no recipients found");
    return;
  }

  try {
    await getResend().emails.send({
      from:    "Invoice Hub <onboarding@resend.dev>",
      to:      recipients,
      subject: `[Invoice Hub] Close Updated: ${clientName} — ${formatMonth(change.close_month)}`,
      react:   React.createElement(ChangeAlertEmail, { change: enrichedChange, clientName, historyUrl }),
    });
  } catch (err) {
    console.error("sendChangeAlert: email failed", err);
  }
}

// ── Variance alert (billed amount saved with large variance) ──────────────────

export const VARIANCE_ALERT_THRESHOLD = 500; // USD — flag variances above this

export async function sendVarianceAlert({
  clientId,
  clientName,
  month,
  expectedTotal,
  billedTotal,
  variance,
  varianceReason,
  enteredByName,
}: {
  clientId: string;
  clientName: string;
  month: string;
  expectedTotal: number;
  billedTotal: number;
  variance: number;
  varianceReason: string | null;
  enteredByName: string;
}) {
  const supabase   = createClient();
  const recipients = await getTeamEmails(supabase);

  if (recipients.length === 0) {
    console.warn("sendVarianceAlert: no recipients found");
    return;
  }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const clientUrl = `${appUrl}/clients/${clientId}`;
  const direction = variance > 0 ? "Overbilled" : "Underbilled";
  const subject   = `[Invoice Hub] ${direction} Alert: ${clientName} — ${formatMonth(month)} ($${Math.abs(variance).toFixed(0)})`;

  try {
    await getResend().emails.send({
      from:    "Invoice Hub <onboarding@resend.dev>",
      to:      recipients,
      subject,
      react:   React.createElement(VarianceAlertEmail, {
        clientName,
        month,
        expectedTotal,
        billedTotal,
        variance,
        varianceReason,
        enteredBy: enteredByName,
        clientUrl,
      }),
    });
  } catch (err) {
    console.error("sendVarianceAlert: email failed", err);
  }
}
