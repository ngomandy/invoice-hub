import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ChangeList from "@/components/history/ChangeList";
import Link from "next/link";

export default async function HistoryPage({
  params,
}: {
  params: { clientId: string };
}) {
  const supabase = createClient();
  const { clientId } = params;

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  const { data: changes } = await supabase
    .from("close_changes")
    .select("*, profiles(full_name)")
    .eq("client_id", clientId)
    .order("changed_at", { ascending: false });

  const enriched = (changes ?? []).map((c) => ({
    ...c,
    changed_by_name: (c.profiles as { full_name: string } | null)?.full_name ?? "Unknown",
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-text-muted mb-1">{client.name}</p>
          <h1 className="text-2xl font-bold text-text-primary">Change History</h1>
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="text-sm font-medium text-text-secondary border border-surface-border px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-lg p-10 text-center">
          <p className="text-text-muted text-sm">No changes recorded yet.</p>
          <p className="text-text-muted text-xs mt-1">Changes appear here when a locked close is modified.</p>
        </div>
      ) : (
        <ChangeList changes={enriched} />
      )}
    </div>
  );
}
