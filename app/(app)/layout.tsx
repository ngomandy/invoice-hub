import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import AssistantPanel from "@/components/assistant/AssistantPanel";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: clients }, { count: pendingApprovals }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("revenue_closes")
      .select("id", { count: "exact", head: true })
      .in("approval_status", ["submitted", "under_review"])
      .eq("is_current", true),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        clients={clients ?? []}
        pendingApprovals={pendingApprovals ?? 0}
      />
      <main className="flex-1 ml-56 p-8">
        {children}
      </main>
      {/* Floating Claude assistant — available on every page */}
      <AssistantPanel />
    </div>
  );
}
