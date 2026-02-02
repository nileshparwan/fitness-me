import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/settings/profile-form";
import { Database } from "@/types/database";

type Profile = Database['public']['Tables']['profiles']['Row'];

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Type assertion is safer now that columns exist
  const userProfile = profile as Profile;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight">Profile</h3>
        <p className="text-muted-foreground text-sm">
          This is how others will see you on the site.
        </p>
      </div>
      <ProfileForm 
        initialData={{
          full_name: userProfile?.full_name ?? userProfile?.display_name ?? "", // Fallback logic
          username: userProfile?.username ?? "",
          bio: userProfile?.bio ?? "",
          website: userProfile?.website ?? "",
        }} 
        avatarUrl={userProfile?.avatar_url}
        email={user.email ?? ""}
      />
    </div>
  );
}