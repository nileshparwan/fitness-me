import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { inngest } from "../client";

type GoalRow = Pick<
  Database["public"]["Tables"]["goals"]["Row"],
  | "id"
  | "created_by_user_id"
  | "linked_exercise_id"
  | "custom_description"
  | "goal_type"
  | "current_value"
  | "target_value"
  | "start_value"
  | "unit"
  | "goal_direction"
  | "status"
>;

type StrengthSetRow = Pick<
  Database["public"]["Tables"]["workout_sets"]["Row"],
  "exercise_id" | "weight"
>;

const ACTIVE_SYNC_GOAL_STATUSES = ["active", "on_track", "at_risk"] as const;
const NON_AUTO_COMPLETE_GOAL_STATUSES = ["paused", "archived", "completed"] as const;
const GOAL_STATUS_VALUES = [
  "active",
  "on_track",
  "at_risk",
  "completed",
  "paused",
  "archived",
] as const;

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeGoalDirection(value: string | null | undefined): "increase" | "decrease" {
  return value === "decrease" ? "decrease" : "increase";
}

function normalizeHistoryStatus(value: string | null | undefined): (typeof GOAL_STATUS_VALUES)[number] {
  const normalized = (value || "").trim().toLowerCase();
  return (GOAL_STATUS_VALUES as readonly string[]).includes(normalized) ? (normalized as (typeof GOAL_STATUS_VALUES)[number]) : "active";
}

function canAutoCompleteFromStatus(status: string | null | undefined) {
  const normalized = normalizeHistoryStatus(status);
  return !(NON_AUTO_COMPLETE_GOAL_STATUSES as readonly string[]).includes(normalized);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function computeAutoSyncProgressPercent(input: {
  direction: "increase" | "decrease";
  maxWeight: number;
  targetValue: number | null;
  startValue: number | null;
}): number | null {
  if (!isFiniteNumber(input.targetValue)) return null;
  if (input.direction === "increase") {
    if (input.targetValue <= 0) return null;
    return clampPercent((input.maxWeight / input.targetValue) * 100);
  }

  if (!isFiniteNumber(input.startValue)) return null;
  const denominator = input.startValue - input.targetValue;
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  return clampPercent(((input.startValue - input.maxWeight) / denominator) * 100);
}

function resolveGoalTitle(goal: GoalRow) {
  const description = goal.custom_description?.trim();
  if (description) return description;
  const category = goal.goal_type?.trim().replaceAll("_", " ");
  return category ? `${category} goal` : "Goal";
}

export const syncGoalFromWorkout = inngest.createFunction(
  {
    id: "sync-goal-from-workout",
    concurrency: {
      limit: 5,
      key: "event.data.user_id",
    },
  },
  { event: "training/workout.completed" },
  async ({ event, step }) => {
    const admin = createAdminClient();

    const setsWithMaxWeightByExercise = await step.run("fetch-sets", async () => {
      const executionId = (event.data as { execution_id?: string | null }).execution_id;
      let setsQuery = admin.from("workout_sets").select("exercise_id, weight");
      setsQuery = executionId ? setsQuery.eq("execution_id", executionId) : setsQuery.eq("workout_id", event.data.workout_id);
      const { data, error } = await setsQuery;
      if (error) throw new Error(error.message);

      const byExercise = new Map<string, number>();
      for (const row of (data || []) as StrengthSetRow[]) {
        if (!row.exercise_id || !isFiniteNumber(row.weight)) continue;
        const currentMax = byExercise.get(row.exercise_id);
        if (currentMax === undefined || row.weight > currentMax) {
          byExercise.set(row.exercise_id, row.weight);
        }
      }

      return Array.from(byExercise.entries()).map(([exercise_id, max_weight]) => ({
        exercise_id,
        max_weight,
      }));
    });

    if (setsWithMaxWeightByExercise.length === 0) {
      return {
        updated_goals: 0,
        inserted_history_rows: 0,
        message: "No named strength sets found for this workout.",
      };
    }

    const exerciseMaxWeightMap = new Map(
      setsWithMaxWeightByExercise.map((item) => [item.exercise_id, item.max_weight] as const)
    );
    const exerciseIds = Array.from(exerciseMaxWeightMap.keys());
    const effectiveUserId = await step.run("resolve-effective-user", async () => {
      if (event.data.subject_user_id) return event.data.subject_user_id;

      if (event.data.subject_client_id) {
        const { data: client, error: clientError } = await admin
          .from("clients")
          .select("linked_user_id")
          .eq("id", event.data.subject_client_id)
          .maybeSingle();
        if (clientError) throw new Error(clientError.message);
        if (client?.linked_user_id) return client.linked_user_id;
      }

      return event.data.user_id;
    });

    const matchingGoals = await step.run("find-matching-goals", async () => {
      const { data, error } = await admin
        .from("goals")
        .select(
          "id, created_by_user_id, linked_exercise_id, custom_description, goal_type, current_value, target_value, start_value, unit, goal_direction, status"
        )
        .eq("created_by_user_id", effectiveUserId)
        .in("linked_exercise_id", exerciseIds)
        .in("status", [...ACTIVE_SYNC_GOAL_STATUSES]);
      if (error) throw new Error(error.message);
      return (data || []) as GoalRow[];
    });

    if (matchingGoals.length === 0) {
      return {
        updated_goals: 0,
        inserted_history_rows: 0,
        message: "No linked active goals matched workout exercises.",
      };
    }

    let updatedGoals = 0;
    let insertedHistoryRows = 0;
    let completedGoals = 0;

    for (const goal of matchingGoals) {
      const result = await step.run(`update-goal-${goal.id}`, async () => {
        if (!goal.linked_exercise_id) {
          return {
            updated: false,
            historyInserted: false,
            goalAchieved: false,
            newValue: null as number | null,
            canAutoComplete: false,
          };
        }

        const maxWeight = exerciseMaxWeightMap.get(goal.linked_exercise_id);
        if (!isFiniteNumber(maxWeight)) {
          return {
            updated: false,
            historyInserted: false,
            goalAchieved: false,
            newValue: null as number | null,
            canAutoComplete: false,
          };
        }

        const direction = normalizeGoalDirection(goal.goal_direction);
        const currentValue = isFiniteNumber(goal.current_value)
          ? goal.current_value
          : direction === "decrease"
          ? Number.POSITIVE_INFINITY
          : 0;
        const shouldUpdate =
          direction === "increase" ? maxWeight > currentValue : maxWeight < currentValue;

        if (!shouldUpdate) {
          return {
            updated: false,
            historyInserted: false,
            goalAchieved: false,
            newValue: null as number | null,
            canAutoComplete: false,
          };
        }

        const nowIso = new Date().toISOString();
        const { error: updateError } = await admin
          .from("goals")
          .update({
            current_value: maxWeight,
            updated_at: nowIso,
          })
          .eq("id", goal.id)
          .eq("created_by_user_id", goal.created_by_user_id);
        if (updateError) throw new Error(updateError.message);

        const goalAchieved =
          direction === "increase"
            ? isFiniteNumber(goal.target_value) && maxWeight >= goal.target_value
            : isFiniteNumber(goal.target_value) && maxWeight <= goal.target_value;
        const canAutoComplete = goalAchieved && canAutoCompleteFromStatus(goal.status);

        const progressPercent = computeAutoSyncProgressPercent({
          direction,
          maxWeight,
          targetValue: goal.target_value,
          startValue: goal.start_value,
        });
        if (progressPercent === null) {
          return {
            updated: true,
            historyInserted: false,
            goalAchieved,
            newValue: maxWeight,
            canAutoComplete,
          };
        }

        const historyPayload: Database["public"]["Tables"]["goal_history"]["Insert"] = {
          goal_id: goal.id,
          user_id: goal.created_by_user_id,
          progress_percent: progressPercent,
          current_value: maxWeight,
          target_value: goal.target_value,
          status: canAutoComplete ? "completed" : normalizeHistoryStatus(goal.status),
          recorded_by_user_id: event.data.user_id,
          source: "auto_sync",
          snapshot_at: nowIso,
        };

        const { error: historyError } = await admin.from("goal_history").insert(historyPayload);
        if (historyError) throw new Error(historyError.message);

        return {
          updated: true,
          historyInserted: true,
          goalAchieved,
          newValue: maxWeight,
          canAutoComplete,
        };
      });

      if (result.updated) updatedGoals += 1;
      if (result.historyInserted) insertedHistoryRows += 1;

      if (result.updated && result.goalAchieved && result.canAutoComplete) {
        await step.run(`notify-goal-achieved-${goal.id}`, async () => {
          const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count, error: dedupeError } = await admin
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", goal.created_by_user_id)
            .eq("type", "goal_achieved")
            .contains("data", { goal_id: goal.id })
            .gt("created_at", cutoff);
          if (dedupeError) throw new Error(dedupeError.message);
          if ((count ?? 0) > 0) return;

          const targetValueLabel = isFiniteNumber(goal.target_value) ? goal.target_value : "";
          const unitLabel = goal.unit?.trim() ? ` ${goal.unit.trim()}` : "";

          const { error: insertNotificationError } = await admin.from("notifications").insert({
            user_id: goal.created_by_user_id,
            type: "goal_achieved",
            title: "Goal achieved!",
            body: `You reached your target of ${targetValueLabel}${unitLabel}.`,
            data: {
              goal_id: goal.id,
              goal_title: resolveGoalTitle(goal),
              new_value: result.newValue,
              target_value: goal.target_value,
              unit: goal.unit ?? "",
            },
          });
          if (insertNotificationError) throw new Error(insertNotificationError.message);
        });

        await step.run(`complete-goal-${goal.id}`, async () => {
          const { error: completeError } = await admin
            .from("goals")
            .update({
              status: "completed",
              check_in_interval_days: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", goal.id)
            .eq("created_by_user_id", goal.created_by_user_id)
            .in("status", [...ACTIVE_SYNC_GOAL_STATUSES]);
          if (completeError) throw new Error(completeError.message);
        });
        completedGoals += 1;
      }
    }

    return {
      updated_goals: updatedGoals,
      inserted_history_rows: insertedHistoryRows,
      completed_goals: completedGoals,
      matched_goals: matchingGoals.length,
      workout_id: event.data.workout_id,
      effective_user_id: effectiveUserId,
    };
  }
);
