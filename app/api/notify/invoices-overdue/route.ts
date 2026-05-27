import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/notify/invoices-overdue
// Sends an overdue invoice summary to all team members
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    { data: openInvoices },
    { data: profiles },
    { data: senderProfile },
  ] = await Promise.all([
    // All sent/viewed invoices that are past due
    supabase
      .from("invoices")
      .select(`
        id, invoice_number, due_date, total,
        client:clients(name),
        payments(amount)
      `)
      .in("status", ["sent", "viewed"])
      .lt("due_date", todayStr)
      .order("due_date", { ascending: true }),
    supabase.from("profiles").select("email, full_name"),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  // Filter to only those with outstanding balance
  type RawInvoice = {
    id: string;
    invoice_number: string;
    due_date: string;
    total: number;
    client: { name: string } | null;
    payments: { amount: number }[];
  };

  const overdue = (openInvoices ?? [] as RawInvoice[]).map((inv) => {
    const paid    = (inv.payments ?? []).reduce((s, p) => s + p.amount, 0);
    const balance = inv.total - paid;
    return { ...inv, balance };
  }).filter((inv) => inv.balance > 0);

  if (overdue.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No overdue invoices with outstanding balances" });
  }

  const recipients = (profiles ?? []).map((p) => p.email).filter(Boolean);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No team members found" }, { status: 400 });
  }

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || "https://invoice-hub-liart.vercel.app";
  const sentBy   = (senderProfile as { full_name?: string } | null)?.full_name ?? "A team member";
  const today    = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const totalOverdue = overdue.reduce((s, inv) => s + inv.balance, 0);

  // Build table rows
  const rows = overdue.map((inv) => {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(inv.due_date + "T00:00:00").getTime()) / 86400000
    );
    const clientName = (inv.client as { name?: string } | null)?.name ?? "Unknown";
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-family:monospace;">
          <a href="${appUrl}/invoices/${inv.id}" style="color:#3b82f6;text-decoration:none;">${inv.invoice_number}</a>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;">${clientName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#ef4444;font-family:monospace;">
          ${formatCurrency(inv.balance)}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#ef4444;font-weight:600;">
          ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue
        </td>
      </tr>`;
  }).join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="background:#f8fafc;font-family:sans-serif;margin:0;padding:32px 0;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#ef4444;padding:20px 28px;">
      <h1 style="color:#fff;font-size:17px;font-weight:700;margin:0;">⚠ Overdue Invoice Report</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0;">
        ${today} &middot; Sent by ${sentBy}
      </p>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:14px;color:#334155;margin:0 0 6px;">
        <strong>${overdue.length} invoice${overdue.length !== 1 ? "s" : ""}</strong> are past due
        with a combined outstanding balance of <strong style="color:#ef4444;">${formatCurrency(totalOverdue)}</strong>.
      </p>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px;">
        Follow up with clients or record any payments already received.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:2px solid #e2e8f0;">Invoice #</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:2px solid #e2e8f0;">Client</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:2px solid #e2e8f0;">Balance Due</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;border-bottom:2px solid #e2e8f0;">Age</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="${appUrl}/invoices?status=overdue"
         style="display:inline-block;background:#ef4444;color:#fff;font-size:13px;font-weight:600;padding:10px 22px;border-radius:6px;text-decoration:none;">
        View Overdue Invoices →
      </a>
    </div>
  </div>
</body>
</html>`;

  try {
    await getResend().emails.send({
      from:    "Invoice Hub <onboarding@resend.dev>",
      to:      recipients,
      subject: `[Invoice Hub] ${overdue.length} overdue invoice${overdue.length !== 1 ? "s" : ""} — ${formatCurrency(totalOverdue)} outstanding`,
      html,
    });
  } catch (err) {
    console.error("invoices-overdue: email failed", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: recipients.length, count: overdue.length });
}
