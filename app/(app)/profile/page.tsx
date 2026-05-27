import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
        <p className="text-sm text-text-muted mt-1">Manage your account details</p>
      </div>

      {/* Avatar + name banner */}
      <div className="bg-white border border-surface-border rounded-lg p-6 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-brand">
            {(profile?.full_name ?? user.email ?? "?")[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-text-primary text-base">
            {profile?.full_name ?? "—"}
          </p>
          <p className="text-sm text-text-muted">{profile?.email ?? user.email}</p>
        </div>
      </div>

      {/* Edit form */}
      <ProfileForm
        initialName={profile?.full_name ?? ""}
        email={profile?.email ?? user.email ?? ""}
      />
    </div>
  );
}
