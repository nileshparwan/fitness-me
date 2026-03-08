import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/settings/profile-form"; 
import { ProfileFormValues } from "@/lib/validations/settings";
// Make sure this imports the SAME type used in the form component

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Safely cast metadata to avoid 'any' issues, or just access properties loosely
  const meta = user.user_metadata || {};

  // Construct the full object required by the form
  const initialData: ProfileFormValues = {
    // Basic Info
    full_name: meta.full_name ?? meta.display_name ?? "",
    username: meta.username ?? "",
    bio: meta.bio ?? "",
    avatar_url: meta.avatar_url ?? undefined, // Optional in schema

    // REQUIRED FIELDS (These caused the error because they were missing)
    // We provide fallbacks here so the form always has a valid string
    activity_level: meta.activity_level ?? "moderately_active",
    preferred_units: meta.preferred_units ?? "metric",
    timezone: meta.timezone ?? "UTC",

    // Optional Fields (Can be undefined)
    height: meta.height ? Number(meta.height) : undefined,
    birth_date: meta.birth_date ?? undefined,
    gender: meta.gender ?? undefined,
  };

  return (
    <div className="stack-gap">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight">Profile</h3>
        <p className="text-muted-foreground text-sm">
          This is how others will see you on the site.
        </p>
      </div>
      
      <ProfileForm 
        initialData={initialData} 
        email={user.email ?? ""}
      />
    </div>
  );
}
