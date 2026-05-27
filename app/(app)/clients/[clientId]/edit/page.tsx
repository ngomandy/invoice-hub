import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientEditForm from "@/components/client-detail/ClientEditForm";

export default async function ClientEditPage({
  params,
}: {
  params: { clientId: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, is_active, created_at")
    .eq("id", params.clientId)
    .single();

  if (!client) notFound();

  return (
    <div className="max-w-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link href={`/clients/${client.id}`} className="hover:text-brand transition-colors">
          {client.name}
        </Link>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-text-primary font-medium">Edit</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Edit Client</h1>
        <p className="text-sm text-text-muted mt-1">Update client name or archive status</p>
      </div>

      <ClientEditForm
        clientId={client.id}
        initialName={client.name}
        isActive={client.is_active ?? true}
      />

      {/* Info note */}
      <p className="mt-4 text-xs text-text-muted">
        Deactivating a client removes them from the dashboard and bulk entry views.
        Their historical close and billed data is fully preserved and accessible via direct link.
      </p>
    </div>
  );
}
