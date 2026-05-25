import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CloseForm from "@/components/close-form/CloseForm";

export default async function ClosePage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { month?: string };
}) {
  const supabase = createClient();
  const { clientId } = params;

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  // If a month is specified, load the existing close for editing
  let existingClose = null;
  if (searchParams.month) {
    const { data } = await supabase
      .from("revenue_closes")
      .select("*")
      .eq("client_id", clientId)
      .eq("close_month", searchParams.month)
      .eq("is_current", true)
      .single();
    existingClose = data;
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <p className="text-sm text-text-muted mb-1">{client.name}</p>
        <h1 className="text-2xl font-bold text-text-primary">
          {existingClose ? "Edit Revenue Close" : "New Revenue Close"}
        </h1>
      </div>
      <CloseForm
        clientId={clientId}
        clientName={client.name}
        existingClose={existingClose}
        defaultMonth={searchParams.month ?? ""}
      />
    </div>
  );
}
