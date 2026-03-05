import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoalsForm } from "@/components/settings/goals-form";
import { Database } from "@/types/database";

type GoalRow = Database['public']['Tables']['fitness_goals']['Row'];
type GoalStatus = "active" | "paused" | "completed" | "cancelled";

const normalizeGoalStatus = (status: string | null): GoalStatus | null => {
  if (status === "active" || status === "paused" || status === "completed" || status === "cancelled") {
    return status;
  }
  return null;
};

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: goals } = await supabase
    .from("fitness_goals")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const userGoals = goals as GoalRow;

  return (
    <div className="stack-gap">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight">Fitness Goals</h3>
        <p className="text-muted-foreground text-sm">
          Set your targets to help the AI guidance engine build your plan.
        </p>
      </div>
      <GoalsForm 
        initialData={{
          // Use DB values or intelligent defaults
          current_weight: userGoals?.current_weight ?? 0,
          target_weight: userGoals?.target_weight ?? 0,
          target_body_fat_percent: userGoals?.target_body_fat_percent ?? null,
          target_date: userGoals?.target_date ?? null,
          custom_description: userGoals?.custom_description ?? null,
          status: normalizeGoalStatus(userGoals?.status ?? null),
          weekly_workouts: userGoals?.weekly_workouts ?? 3,
          daily_calories: userGoals?.daily_calories ?? 2000,
          protein_target: userGoals?.protein_target ?? 150,
          carbs_target: userGoals?.carbs_target ?? 200,
          fat_target: userGoals?.fat_target ?? 60,
        }} 
      />
    </div>
  );
}
