import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtMonth(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Build context ─────────────────────────────────────────────────────────────
async function buildSystemPrompt(supabase: ReturnType<typeof createClient>): Promise<string> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;
  const rangeStart = `${prevYear}-01-01`;
  const rangeEnd = `${currentYear}-12-31`;
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: clients },
    { data: closes },
    { data: billed },
    { data: changes },
  ] = await Promise.all([
    supabase.from("clients").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("revenue_closes")
      .select("client_id, close_month, net_usage, rollover_from_previous, rollover_to_next, discounts, expected_total, version")
      .eq("is_current", true)
      .gte("close_month", rangeStart)
      .lte("close_month", rangeEnd)
      .order("close_month"),
    supabase
      .from("billed_amounts")
      .select("client_id, close_month, billed_total")
      .gte("close_month", rangeStart)
      .lte("close_month", rangeEnd),
    supabase
      .from("close_changes")
      .select("client_id, close_month, changed_at, reason, prev_expected_total, new_expected_total, profiles(full_name), clients(name)")
      .gte("changed_at", ninetyDaysAgo)
      .order("changed_at", { ascending: false })
      .limit(50),
  ]);

  // Build lookup maps
  const clientNameMap = new Map((clients ?? []).map((c) => [c.id, c.name]));

  // Enrich closes with client names + billed data
  const billedMap = new Map(
    (billed ?? []).map((b) => [`${b.client_id}::${b.close_month}`, b.billed_total])
  );

  // ── Section: clients ──
  const clientsSection = (clients ?? []).length === 0
    ? "No active clients."
    : (clients ?? []).map((c) => `- ${c.name}`).join("\n");

  // ── Section: closes + variances ──
  const closesSection = (closes ?? []).length === 0
    ? "No revenue closes on record."
    : (closes ?? []).map((c) => {
        const name = clientNameMap.get(c.client_id) ?? c.client_id;
        const billedTotal = billedMap.get(`${c.client_id}::${c.close_month}`) ?? null;
        const variance = billedTotal !== null ? billedTotal - c.expected_total : null;
        const varianceStr = variance !== null
          ? `${variance >= 0 ? "+" : ""}${fmt(variance)}`
          : "no billed entry";
        return `${name} | ${fmtMonth(c.close_month)} | Net Usage: ${fmt(c.net_usage)} | Rollover From: ${fmt(c.rollover_from_previous)} | Rollover To: ${fmt(c.rollover_to_next)} | Discounts: ${fmt(c.discounts)} | Expected Close: ${fmt(c.expected_total)} | Billed: ${billedTotal !== null ? fmt(billedTotal) : "—"} | Variance: ${varianceStr} | Version: v${c.version}`;
      }).join("\n");

  // ── Section: recent changes ──
  const changesSection = (changes ?? []).length === 0
    ? "No close changes in the last 90 days."
    : (changes ?? []).map((ch) => {
        const clientName = (ch.clients as unknown as { name: string } | null)?.name ?? clientNameMap.get(ch.client_id) ?? ch.client_id;
        const changedBy = (ch.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
        const delta = ch.new_expected_total - ch.prev_expected_total;
        const deltaStr = `${delta >= 0 ? "+" : ""}${fmt(delta)}`;
        return `${clientName} | ${fmtMonth(ch.close_month)} | Changed by: ${changedBy} on ${fmtDate(ch.changed_at)} | Previous: ${fmt(ch.prev_expected_total)} → New: ${fmt(ch.new_expected_total)} (${deltaStr}) | Reason: ${ch.reason ?? "none given"}`;
      }).join("\n");

  // ── Aggregate metrics ──
  const allVariances = (closes ?? []).flatMap((c) => {
    const billedTotal = billedMap.get(`${c.client_id}::${c.close_month}`);
    if (billedTotal === undefined) return [];
    return [{ client: clientNameMap.get(c.client_id) ?? c.client_id, month: c.close_month, variance: billedTotal - c.expected_total, expected: c.expected_total, billed: billedTotal }];
  });

  const totalExpected = (closes ?? []).reduce((s, c) => s + (c.expected_total ?? 0), 0);
  const totalBilled = (billed ?? []).reduce((s, b) => s + (b.billed_total ?? 0), 0);
  const overBilled = allVariances.filter((v) => v.variance > 0);
  const underBilled = allVariances.filter((v) => v.variance < 0);
  const largestVariance = allVariances.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))[0];

  const metricsSection = [
    `Total closes locked (${prevYear}-${currentYear}): ${(closes ?? []).length}`,
    `Total expected close amount: ${fmt(totalExpected)}`,
    `Total billed amount: ${fmt(totalBilled)}`,
    `Net variance (billed - expected): ${fmt(totalBilled - totalExpected)}`,
    `Months where client was overbilled (variance > 0): ${overBilled.length}`,
    `Months where client was underbilled (variance < 0): ${underBilled.length}`,
    largestVariance
      ? `Largest single variance: ${largestVariance.client} in ${fmtMonth(largestVariance.month)} — ${largestVariance.variance >= 0 ? "+" : ""}${fmt(largestVariance.variance)}`
      : "No variances computed yet.",
  ].join("\n");

  return `You are a billing intelligence assistant embedded in Invoice Hub, a revenue reconciliation tool used by a finance team.

Today's date: ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
Data range available: ${prevYear}–${currentYear}

Your job is to help the team understand their billing data. Answer questions accurately using the data below. When computing variances, remember: Variance = Billed Amount − Expected Close. A positive variance means the client was overbilled; negative means underbilled.

Format currency values clearly (e.g., $12,345.67). Use tables or bullet points when showing multiple items. Keep answers concise but complete. If the data doesn't contain what's needed to answer a question, say so clearly.

---

## ACTIVE CLIENTS
${clientsSection}

---

## REVENUE CLOSES & BILLED AMOUNTS (${prevYear}–${currentYear})
Format: Client | Month | Net Usage | Rollover From | Rollover To | Discounts | Expected Close | Billed | Variance | Version

${closesSection}

---

## RECENT CLOSE CHANGES (last 90 days)
Format: Client | Month | Changed By | Date | Previous → New (Delta) | Reason

${changesSection}

---

## AGGREGATE METRICS
${metricsSection}`;
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, history } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Build context from live DB data
    const systemPrompt = await buildSystemPrompt(supabase);

    // Reconstruct conversation history (max last 10 turns to stay within context)
    const messages: Anthropic.MessageParam[] = [
      ...((history ?? []) as { role: "user" | "assistant"; content: string }[])
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const anthropic = new Anthropic({ apiKey });

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: systemPrompt,
            messages,
            stream: true,
          });

          for await (const chunk of response) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                new TextEncoder().encode(chunk.delta.text)
              );
            }
          }
          controller.close();
        } catch (err) {
          // Send the error message through the stream so the frontend can display it
          const errMsg = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            new TextEncoder().encode(`\n\n⚠️ Error from Claude API: ${errMsg}`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    // Top-level catch — something failed before the stream started
    console.error("[/api/assistant] Unhandled error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Server error: ${errMsg}` },
      { status: 500 }
    );
  }
}
