import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoalsForm } from "@/components/settings/goals-form";
import { Database } from "@/types/database";

type GoalRow = Database['public']['Tables']['goals']['Row'];

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const userGoals = goals as GoalRow;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight">Fitness Goals</h3>
        <p className="text-muted-foreground text-sm">
          Set your targets to help the AI Coach build your plan.
        </p>
      </div>
      <GoalsForm 
        initialData={{
          // Use DB values or intelligent defaults
          current_weight: userGoals?.current_weight ?? 0,
          target_weight: userGoals?.target_weight ?? 0,
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