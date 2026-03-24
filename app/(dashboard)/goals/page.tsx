import { GoalsRealtimeSubscriber } from "@/components/goals/goals-realtime-subscriber";
import { createClient } from "@/lib/supabase/server";
import { GoalSubjectBar } from "./_components/goal-subject-bar";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <GoalsRealtimeSubscriber userId={user?.id ?? null} />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and manage your personal goals. Changes are saved to your goal history automatically.
        </p>
      </header>

      <GoalSubjectBar />
    </div>
  );
}
