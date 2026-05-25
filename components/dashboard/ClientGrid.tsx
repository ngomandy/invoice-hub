import ClientCard from "./ClientCard";
import Link from "next/link";

type ClientGridProps = {
  clients: { id: string; name: string }[];
  currentCloses: { client_id: string; expected_total: number }[];
  billedAmounts: { client_id: string; close_month: string; billed_total: number }[];
  currentMonth: string;
};

export default function ClientGrid({
  clients,
  currentCloses,
  billedAmounts,
  currentMonth,
}: ClientGridProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-surface-border rounded-lg">
        <p className="text-text-muted text-sm mb-4">No clients yet.</p>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
        >
          + Add your first client
        </Link>
      </div>
    );
  }

  const currentCloseMap = Object.fromEntries(
    currentCloses.map((c) => [c.client_id, c])
  );

  // Find last billed variance per client
  const lastVarianceMap: Record<string, number | null> = {};
  clients.forEach((client) => {
    const clientBilled = billedAmounts
      .filter((b) => b.client_id === client.id)
      .sort((a, b) => b.close_month.localeCompare(a.close_month));

    if (clientBilled.length > 0) {
      const latest = clientBilled[0];
      const matchingClose = currentCloses.find(
        (c) => c.client_id === client.id
      );
      if (matchingClose) {
        lastVarianceMap[client.id] = latest.billed_total - matchingClose.expected_total;
      } else {
        lastVarianceMap[client.id] = null;
      }
    } else {
      lastVarianceMap[client.id] = null;
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          id={client.id}
          name={client.name}
          hasCurrentMonthClose={!!currentCloseMap[client.id]}
          lastVariance={lastVarianceMap[client.id]}
        />
      ))}
    </div>
  );
}
