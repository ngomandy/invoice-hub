import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ImportRow = {
  client_name: string;
  close_month: string; // YYYY-MM-DD
  net_usage: number | null;
  rollover_from_previous: number | null;
  rollover_to_next: number | null;
  discounts: number | null;
  billed_total: number | null;
};

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows }: { rows: ImportRow[] } = await request.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  // Fetch all existing clients once
  const { data: existingClients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("is_active", true);

  const clientMap = new Map<string, { id: string; name: string }>(
    (existingClients ?? []).map((c) => [c.name.toLowerCase(), c])
  );

  const results = {
    closes: 0,
    billed: 0,
    clients_created: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = `Row ${i + 1} (${row.client_name}, ${row.close_month})`;

    try {
      // Get or create client
      let client = clientMap.get(row.client_name.toLowerCase());
      if (!client) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({ name: row.client_name, created_by: user.id })
          .select("id, name")
          .single();
        if (clientError || !newClient) {
          results.errors.push(
            `${label}: Failed to create client — ${clientError?.message ?? "unknown error"}`
          );
          continue;
        }
        client = newClient;
        clientMap.set(row.client_name.toLowerCase(), newClient);
        results.clients_created++;
      }

      const clientId = client.id;

      // Handle close data
      const hasClose =
        row.net_usage !== null ||
        row.rollover_from_previous !== null ||
        row.rollover_to_next !== null ||
        row.discounts !== null;

      if (hasClose) {
        const net_usage = row.net_usage ?? 0;
        const rollover_from_previous = row.rollover_from_previous ?? 0;
        const rollover_to_next = row.rollover_to_next ?? 0;
        const discounts = row.discounts ?? 0;

        // Check for existing current version
        const { data: existing } = await supabase
          .from("revenue_closes")
          .select("*")
          .eq("client_id", clientId)
          .eq("close_month", row.close_month)
          .eq("is_current", true)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase.from("revenue_closes").insert({
            client_id: clientId,
            close_month: row.close_month,
            net_usage,
            rollover_from_previous,
            rollover_to_next,
            discounts,
            version: 1,
            is_current: true,
            submitted_by: user.id,
          });
          if (error) {
            results.errors.push(`${label}: Failed to create close — ${error.message}`);
          } else {
            results.closes++;
          }
        } else {
          // Update existing — create new version
          const newVersion = existing.version + 1;
          await supabase
            .from("revenue_closes")
            .update({ is_current: false })
            .eq("id", existing.id);
          const { error } = await supabase.from("revenue_closes").insert({
            client_id: clientId,
            close_month: row.close_month,
            net_usage,
            rollover_from_previous,
            rollover_to_next,
            discounts,
            version: newVersion,
            is_current: true,
            submitted_by: user.id,
          });
          if (error) {
            results.errors.push(`${label}: Failed to update close — ${error.message}`);
          } else {
            results.closes++;
          }
        }
      }

      // Handle billed amount
      if (row.billed_total !== null) {
        const { error } = await supabase.from("billed_amounts").upsert(
          {
            client_id: clientId,
            close_month: row.close_month,
            billed_total: row.billed_total,
            entered_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,close_month" }
        );
        if (error) {
          results.errors.push(`${label}: Failed to save billed amount — ${error.message}`);
        } else {
          results.billed++;
        }
      }
    } catch (err) {
      results.errors.push(`${label}: ${String(err)}`);
    }
  }

  return NextResponse.json(results);
}
