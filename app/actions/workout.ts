"use server";

import { createClient } from "@/lib/supabase/server";
import { runTrackedAction } from "@/lib/events/dispatcher";
import { toDateInput } from "@/lib/utils/date";
import { Database } from "@/types/database";
import { CardioSetMeta, serializeCardioNotes } from "@/utils/cardio-notes";
import {
  emitTrainingWorkoutCompleted,
  insertWorkoutExerciseRows,
  replaceWorkoutExerciseRows,
  revalidateTrainingWorkoutPaths,
} from "@/lib/training/workout-mutation-helpers";
import { z } from "zod";

// 1. DERIVED TYPES FROM DATABASE
type WorkoutInsert = Database['public']['Tables']['training_sessions']['Insert'];
type WorkoutLogInsert = Database['public']['Tables']['strength_sets']['Insert'] & {
  execution_id?: string | null;
};
type CardioLogInsert = Database['public']['Tables']['cardio_sessions']['Insert'] & {
  execution_id?: string | null;
};
type WorkoutRow = Database["public"]["Tables"]["training_sessions"]["Row"];
type StrengthSetRow = Database["public"]["Tables"]["strength_sets"]["Row"];
type WorkoutExecutionSource = "quick_log" | "session_create" | "session_backfill" | "coach_log" | "client_portal";
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type WorkoutActor = { id: string };

type StrengthSetWithWorkout = Pick<
  StrengthSetRow,
  "exercise_name" | "weight" | "reps" | "set_number" | "workout_id"
> & {
  training_sessions: Pick<WorkoutRow, "id" | "date" | "performed_on" | "user_id"> | null;
};

export type WorkoutExerciseLastSession = {
  exercise_name: string;
  weight: number | null;
  reps: number | null;
  workout_id: string;
  workout_date: string;
  days_ago: number;
  relative_label: string;
};

function toNullableNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year || 0, (month || 1) - 1, day || 1, 12, 0, 0));
}

function daysAgoFromDate(value: string) {
  const target = parseDateInput(value).getTime();
  const now = parseDateInput(toDateInput(new Date())).getTime();
  return Math.max(0, Math.floor((now - target) / 86_400_000));
}

function formatRelativeLabel(daysAgo: number) {
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "1 day ago";
  return `${daysAgo} days ago`;
}

function normalizeWorkoutLifecycleStatus(
  value: WorkoutInsert["status"] | undefined
): WorkoutInsert["status"] {
  if (value === "archived" || value === "draft" || value === "active") return value;
  return "active";
}

function normalizeIsoDate(value: string | undefined) {
  if (!value) return toDateInput(new Date());
  return value.slice(0, 10);
}

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

function applyQuickLogSubjectFilter(
  query: any,
  subjectUserId: string | null,
  subjectClientId: string | null
) {
  return subjectUserId !== null
    ? query.eq("subject_user_id", subjectUserId).is("subject_client_id", null)
    : query.eq("subject_client_id", subjectClientId).is("subject_user_id", null);
}

async function findExistingQuickLogExecution(input: {
  supabaseAny: any;
  templateWorkoutId: string;
  performedOn: string;
  subjectUserId: string | null;
  subjectClientId: string | null;
}) {
  const query = applyQuickLogSubjectFilter(
    input.supabaseAny
      .from("workout_executions")
      .select("id")
      .eq("template_workout_id", input.templateWorkoutId)
      .eq("performed_on", input.performedOn)
      .eq("source", "quick_log"),
    input.subjectUserId,
    input.subjectClientId
  );
  const { data } = await query.maybeSingle();
  return (data || null) as { id: string } | null;
}

async function createWorkoutExecutionRecord(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  templateWorkoutId: string;
  actorUserId: string;
  subjectUserId: string | null;
  subjectClientId: string | null;
  performedOn: string;
  source: WorkoutExecutionSource;
  notes?: string | null;
}) {
  const supabaseAny = input.supabase as any;
  const performedOn = normalizeIsoDate(input.performedOn);

  if (input.source === "quick_log") {
    const existing = await findExistingQuickLogExecution({
      supabaseAny,
      templateWorkoutId: input.templateWorkoutId,
      performedOn,
      subjectUserId: input.subjectUserId,
      subjectClientId: input.subjectClientId,
    });
    if (existing?.id) return existing;
  }

  const insertPayload = {
    template_workout_id: input.templateWorkoutId,
    actor_user_id: input.actorUserId,
    subject_user_id: input.subjectUserId,
    subject_client_id: input.subjectClientId,
    performed_on: performedOn,
    source: input.source,
    notes: input.notes || null,
  };

  const { data, error } = await supabaseAny
    .from("workout_executions")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error && isUniqueViolation(error) && input.source === "quick_log") {
    const existing = await findExistingQuickLogExecution({
      supabaseAny,
      templateWorkoutId: input.templateWorkoutId,
      performedOn,
      subjectUserId: input.subjectUserId,
      subjectClientId: input.subjectClientId,
    });
    if (existing?.id) return existing;
  }

  if (error) throw new Error(error.message);
  return data as { id: string };
}

async function syncExecutionExercisesFromWorkout(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  executionId: string;
  workoutId: string;
}) {
  const supabaseAny = input.supabase as any;
  const [{ data: strengthRows, error: strengthError }, { data: cardioRows, error: cardioError }] = await Promise.all([
    supabaseAny
      .from("strength_sets")
      .select("exercise_id, exercise_name, weight, reps")
      .eq("workout_id", input.workoutId),
    supabaseAny
      .from("cardio_sessions")
      .select("activity_type, distance, duration_minutes")
      .eq("workout_id", input.workoutId),
  ]);

  if (strengthError) throw new Error(strengthError.message);
  if (cardioError) throw new Error(cardioError.message);

  const strengthAgg = new Map<
    string,
    { exercise_id: string | null; exercise_name: string; volume_kg: number }
  >();
  for (const row of (strengthRows || []) as Array<{
    exercise_id: string | null;
    exercise_name: string | null;
    weight: number | null;
    reps: number | null;
  }>) {
    const name = (row.exercise_name || "").trim();
    if (!name) continue;
    const key = `${row.exercise_id || "name"}::${name.toLowerCase()}`;
    const existing = strengthAgg.get(key) || {
      exercise_id: row.exercise_id || null,
      exercise_name: name,
      volume_kg: 0,
    };
    existing.volume_kg += Math.max(0, Number(row.weight || 0) * Number(row.reps || 0));
    strengthAgg.set(key, existing);
  }

  const cardioAgg = new Map<
    string,
    { exercise_name: string; distance: number; duration_minutes: number }
  >();
  for (const row of (cardioRows || []) as Array<{
    activity_type: string | null;
    distance: number | null;
    duration_minutes: number | null;
  }>) {
    const name = (row.activity_type || "Cardio").trim() || "Cardio";
    const key = name.toLowerCase();
    const existing = cardioAgg.get(key) || {
      exercise_name: name,
      distance: 0,
      duration_minutes: 0,
    };
    existing.distance += Math.max(0, Number(row.distance || 0));
    existing.duration_minutes += Math.max(0, Math.round(Number(row.duration_minutes || 0)));
    cardioAgg.set(key, existing);
  }

  const exerciseRows = [
    ...Array.from(strengthAgg.values()).map((row) => ({
      execution_id: input.executionId,
      exercise_id: row.exercise_id,
      exercise_name: row.exercise_name,
      exercise_type: "strength",
      volume_kg: row.volume_kg > 0 ? Number(row.volume_kg.toFixed(2)) : null,
      distance_km: null,
      duration_minutes: null,
    })),
    ...Array.from(cardioAgg.values()).map((row) => ({
      execution_id: input.executionId,
      exercise_id: null,
      exercise_name: row.exercise_name,
      exercise_type: "cardio",
      volume_kg: null,
      distance_km: row.distance > 0 ? Number(row.distance.toFixed(2)) : null,
      duration_minutes: row.duration_minutes > 0 ? row.duration_minutes : null,
    })),
  ];

  const { error: clearError } = await supabaseAny
    .from("workout_execution_exercises")
    .delete()
    .eq("execution_id", input.executionId);
  if (clearError) throw new Error(clearError.message);

  if (exerciseRows.length > 0) {
    const { error: insertError } = await supabaseAny.from("workout_execution_exercises").insert(exerciseRows);
    if (insertError) throw new Error(insertError.message);
  }
}

const listWorkoutExecutionSubjectsSchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(1).max(30).default(15),
});

const logWorkoutExecutionSchema = z.object({
  workout_id: z.string().uuid(),
  subject_client_id: z.string().uuid().nullable().optional(),
  performed_on: z.string().date().optional(),
  notes: z.string().trim().max(800).nullable().optional(),
});

function formatSubjectName(input: {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}) {
  if (input.display_name?.trim()) return input.display_name.trim();
  const full = `${input.first_name || ""} ${input.last_name || ""}`.trim();
  if (full) return full;
  return `Client ${input.id.slice(0, 8)}`;
}

async function requireWorkoutActor(unauthorizedMessage = "Unauthorized"): Promise<{
  supabase: SupabaseServerClient;
  user: WorkoutActor;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(unauthorizedMessage);
  return { supabase, user: { id: user.id } };
}

// 2. FORM INPUT TYPE
export type WorkoutActionInput = {
  name: string;
  date: Date;
  sport_type?: string;
  location?: string;
  perceived_exertion?: number;
  notes?: string | null;
  status?: WorkoutInsert['status'];
  overall_rating?: number;
  template_id?: string;
  exercises?: {
    type?: 'strength' | 'cardio'; 
    exercise_id?: string;
    superset_group_id?: string;
    name: string;
    notes?: string;
    // Strength fields
    sets?: {
      set_number: number;
      reps: number | string;
      weight: number | string;
      rest_seconds?: number | string;
      rpe?: number | string;
      rir?: number | string;
      tempo?: string;
      is_warmup?: boolean;
      is_dropset?: boolean;
      paused?: boolean;
      touch_and_go?: boolean;
      equipment_type?: string;
      side?: "bilateral" | "left" | "right";
      form_video_url?: string;
    }[];
    // Cardio fields
    cardio_sets?: {
      set_number: number;
      duration: number | string;
      distance?: number | string;
      reps?: number | string;
      calories?: number | string;
      heartRate?: number | string;
    }[];
    reps?: number | string;
    duration?: number | string;
    distance?: number | string;
    calories?: number | string;
    heartRate?: number | string;
    sport_type?: string;
    indoor_outdoor?: "indoor" | "outdoor";
    weather_conditions?: string;
    device_source?: string;
    avg_cadence_rpm?: number | string;
    avg_power_watts?: number | string;
    avg_speed?: number | string;
    max_speed_kmh?: number | string;
    vo2max_estimate?: number | string;
    training_load_score?: number | string;
  }[];
};

function buildWorkoutLogs(
  exercises: WorkoutActionInput["exercises"] | undefined,
  workoutId: string,
  userId: string,
  dateISO: string,
  executionId: string | null
) {
  const strengthLogs: WorkoutLogInsert[] = [];
  const cardioLogs: CardioLogInsert[] = [];

  if (!exercises || exercises.length === 0) {
    return { strengthLogs, cardioLogs };
  }

  exercises.forEach((ex, entryIndex) => {
    if (ex.type === "cardio") {
      const cardioSets: CardioSetMeta[] = (ex.cardio_sets || []).map((set, idx) => ({
        set_number: idx + 1,
        duration: Number(set.duration || 0),
        distance: toNullableNumber(set.distance) ?? undefined,
        reps: toNullableNumber(set.reps) ?? undefined,
        calories: toNullableNumber(set.calories) ?? undefined,
        heartRate: toNullableNumber(set.heartRate) ?? undefined,
      }));
      const durationMinutes = cardioSets.length > 0
        ? cardioSets.reduce((sum, set) => sum + (set.duration || 0), 0)
        : Number(ex.duration || 0);
      const distanceKm = cardioSets.length > 0
        ? cardioSets.reduce((sum, set) => sum + (set.distance || 0), 0)
        : (toNullableNumber(ex.distance) ?? null);
      const caloriesBurned = cardioSets.some((set) => set.calories !== undefined)
        ? cardioSets.reduce((sum, set) => sum + (set.calories || 0), 0)
        : toNullableNumber(ex.calories);
      const repsValue = cardioSets.some((set) => set.reps !== undefined)
        ? cardioSets.reduce((sum, set) => sum + (set.reps || 0), 0)
        : toNullableNumber(ex.reps);
      const weightedHeartRateDuration = cardioSets.reduce((sum, set) => {
        if (set.heartRate === undefined) return sum;
        return sum + (set.heartRate * (set.duration || 0));
      }, 0);
      const weightedHeartRateMinutes = cardioSets.reduce((sum, set) => {
        if (set.heartRate === undefined) return sum;
        return sum + (set.duration || 0);
      }, 0);
      const averageHeartRate =
        weightedHeartRateMinutes > 0
          ? Math.round(weightedHeartRateDuration / weightedHeartRateMinutes)
          : toNullableNumber(ex.heartRate);

      cardioLogs.push({
        workout_id: workoutId,
        execution_id: executionId,
        user_id: userId,
        date: dateISO,
        entry_sequence: entryIndex,
        activity_type: ex.name,
        sport_type: ex.sport_type || null,
        indoor_outdoor: ex.indoor_outdoor || null,
        weather_conditions: ex.weather_conditions || null,
        device_source: ex.device_source || null,
        avg_cadence_rpm: toNullableNumber(ex.avg_cadence_rpm),
        avg_power_watts: toNullableNumber(ex.avg_power_watts),
        avg_speed: toNullableNumber(ex.avg_speed),
        max_speed_kmh: toNullableNumber(ex.max_speed_kmh),
        vo2max_estimate: toNullableNumber(ex.vo2max_estimate),
        training_load_score: toNullableNumber(ex.training_load_score),
        duration_minutes: durationMinutes,
        distance: distanceKm,
        calories_burned: caloriesBurned,
        average_heart_rate: averageHeartRate,
        reps: repsValue,
        notes: serializeCardioNotes(ex.notes, cardioSets.length > 0 ? cardioSets : undefined),
      });
      return;
    }

    if (!ex.sets) return;

    ex.sets.forEach((set) => {
      strengthLogs.push({
        workout_id: workoutId,
        execution_id: executionId,
        entry_sequence: entryIndex,
        exercise_id: ex.exercise_id || null,
        group_id: ex.superset_group_id || null,
        exercise_name: ex.name,
        set_number: set.set_number,
        reps: Number(set.reps || 0),
        weight: Number(set.weight || 0),
        rest_seconds: set.rest_seconds !== undefined ? Number(set.rest_seconds) : null,
        rpe: set.rpe !== undefined ? Number(set.rpe) : null,
        rir: set.rir !== undefined ? Number(set.rir) : null,
        tempo: set.tempo || null,
        is_warmup: Boolean(set.is_warmup),
        is_dropset: Boolean(set.is_dropset),
        paused: Boolean(set.paused),
        touch_and_go: Boolean(set.touch_and_go),
        equipment_type: set.equipment_type || null,
        side: set.side || null,
        form_video_url: set.form_video_url || null,
        notes: ex.notes || null,
      });
    });
  });

  return { strengthLogs, cardioLogs };
}

export async function getWorkoutExerciseLastSessionAction(input: {
  exercise_names: string[];
  current_workout_id?: string;
}) {
  return runTrackedAction({
    eventName: "workout.last-session.read",
    payload: {
      names_count: input.exercise_names?.length || 0,
      has_current_workout_id: Boolean(input.current_workout_id),
    },
    action: async () => {
      const { supabase, user } = await requireWorkoutActor();

      const normalizedNames = Array.from(
        new Set(
          (input.exercise_names || [])
            .map((name) => name?.trim())
            .filter((name): name is string => Boolean(name))
        )
      );
      if (normalizedNames.length === 0) {
        return [] as WorkoutExerciseLastSession[];
      }

      let query = supabase
        .from("strength_sets")
        .select(
          "exercise_name, weight, reps, set_number, workout_id, training_sessions!inner(id, date, performed_on, user_id)"
        )
        .in("exercise_name", normalizedNames)
        .eq("training_sessions.user_id", user.id)
        .order("date", { ascending: false, referencedTable: "training_sessions" })
        .order("weight", { ascending: false })
        .order("set_number", { ascending: true })
        .limit(Math.max(60, normalizedNames.length * 25));

      if (input.current_workout_id?.trim()) {
        query = query.neq("workout_id", input.current_workout_id.trim());
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data || []) as StrengthSetWithWorkout[];
      const bestByExercise = new Map<string, WorkoutExerciseLastSession>();

      for (const row of rows) {
        const key = row.exercise_name.trim().toLowerCase();
        if (bestByExercise.has(key)) continue;
        const workoutDate =
          row.training_sessions?.performed_on ||
          row.training_sessions?.date?.slice(0, 10) ||
          toDateInput(new Date());
        const daysAgo = daysAgoFromDate(workoutDate);

        bestByExercise.set(key, {
          exercise_name: row.exercise_name,
          weight: row.weight,
          reps: row.reps,
          workout_id: row.workout_id,
          workout_date: workoutDate,
          days_ago: daysAgo,
          relative_label: formatRelativeLabel(daysAgo),
        });
      }

      return Array.from(bestByExercise.values()).sort((a, b) =>
        a.exercise_name.localeCompare(b.exercise_name)
      );
    },
  });
}

// ============================================================================
// 2. CREATE WORKOUT
// ============================================================================
export async function createWorkoutAction(data: WorkoutActionInput) {
  return runTrackedAction({
    eventName: "workout.create",
    payload: { name: data.name, exercises_count: data.exercises?.length ?? 0 },
    action: async () => {
      const { supabase, user } = await requireWorkoutActor("Not authenticated");

      const workoutPayload: WorkoutInsert = {
        user_id: user.id,
        created_by_user_id: user.id,
        subject_user_id: user.id,
        subject_client_id: null,
        name: data.name,
        date: data.date.toISOString(),
        performed_on: data.date.toISOString().slice(0, 10),
        session_slot: "other",
        sport_type: data.sport_type || null,
        location: data.location || null,
        perceived_exertion: data.perceived_exertion ?? null,
        status: normalizeWorkoutLifecycleStatus(data.status),
        notes: data.notes || null,
        overall_rating: data.overall_rating ?? null,
        template_id: data.template_id || null,
      };

      const { data: workout, error: wError } = await supabase
        .from("training_sessions")
        .insert(workoutPayload)
        .select()
        .single();
      if (wError) throw new Error(wError.message);

      const initialLogs = buildWorkoutLogs(data.exercises, workout.id, user.id, data.date.toISOString(), null);
      const hasWorkoutLogs = initialLogs.strengthLogs.length > 0 || initialLogs.cardioLogs.length > 0;

      let executionId: string | null = null;
      if (hasWorkoutLogs) {
        const execution = await createWorkoutExecutionRecord({
          supabase,
          templateWorkoutId: workout.id,
          actorUserId: user.id,
          subjectUserId: workout.subject_user_id ?? user.id,
          subjectClientId: workout.subject_client_id ?? null,
          performedOn: workout.performed_on,
          source: "session_create",
          notes: data.notes || null,
        });
        executionId = execution.id;
      }

      const { strengthLogs, cardioLogs } = hasWorkoutLogs
        ? buildWorkoutLogs(data.exercises, workout.id, user.id, data.date.toISOString(), executionId)
        : initialLogs;

      await insertWorkoutExerciseRows({
        supabase,
        strengthRows: strengthLogs,
        cardioRows: cardioLogs,
      });

      if (executionId) {
        await syncExecutionExercisesFromWorkout({
          supabase,
          executionId,
          workoutId: workout.id,
        });
      }

      if (strengthLogs.length > 0 || cardioLogs.length > 0) {
        emitTrainingWorkoutCompleted({
          workoutId: workout.id,
          executionId,
          userId: user.id,
          subjectUserId: workout.subject_user_id ?? null,
          subjectClientId: workout.subject_client_id ?? null,
        });
      }

      revalidateTrainingWorkoutPaths({
        includeGoals: true,
        includeProgress: true,
      });
      return workout;
    },
  });
}

// ============================================================================
// 3. UPDATE WORKOUT
// ============================================================================
export async function updateWorkoutAction(id: string, data: Partial<WorkoutActionInput>) {
  return runTrackedAction({
    eventName: "workout.update",
    payload: { workout_id: id, exercises_count: data.exercises?.length ?? 0 },
    action: async () => {
      const { supabase, user } = await requireWorkoutActor();

      const { data: ownedWorkout } = await supabase
        .from("training_sessions")
        .select("id, subject_user_id, subject_client_id, performed_on")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!ownedWorkout) throw new Error("Forbidden");

      const updateData: Database["public"]["Tables"]["training_sessions"]["Update"] = {};
      if (data.name) updateData.name = data.name;
      if (data.date) {
        updateData.date = data.date.toISOString();
        updateData.performed_on = data.date.toISOString().slice(0, 10);
      }
      if (data.sport_type !== undefined) updateData.sport_type = data.sport_type || null;
      if (data.location !== undefined) updateData.location = data.location || null;
      if (data.perceived_exertion !== undefined) updateData.perceived_exertion = data.perceived_exertion;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status) updateData.status = normalizeWorkoutLifecycleStatus(data.status);
      if (data.overall_rating !== undefined) updateData.overall_rating = data.overall_rating;
      if (data.template_id !== undefined) updateData.template_id = data.template_id || null;

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from("training_sessions").update(updateData).eq("id", id).eq("user_id", user.id);
        if (error) throw new Error(error.message);
      }

      if (data.exercises) {
        const supabaseAny = supabase as any;
        const { data: latestExecution } = await supabaseAny
          .from("workout_executions")
          .select("id")
          .eq("template_workout_id", id)
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        let executionId = (latestExecution?.id as string | undefined) || null;

        const dateStr = data.date ? data.date.toISOString() : new Date().toISOString();
        const initialLogs = buildWorkoutLogs(data.exercises, id, user.id, dateStr, null);
        const hasWorkoutLogs = initialLogs.strengthLogs.length > 0 || initialLogs.cardioLogs.length > 0;
        if (!executionId && hasWorkoutLogs) {
          const execution = await createWorkoutExecutionRecord({
            supabase,
            templateWorkoutId: id,
            actorUserId: user.id,
            subjectUserId: ownedWorkout.subject_user_id ?? user.id,
            subjectClientId: ownedWorkout.subject_client_id ?? null,
            performedOn: updateData.performed_on || ownedWorkout.performed_on || toDateInput(new Date()),
            source: "session_create",
            notes: data.notes || null,
          });
          executionId = execution.id;
        }

        const { strengthLogs, cardioLogs } = hasWorkoutLogs
          ? buildWorkoutLogs(data.exercises, id, user.id, dateStr, executionId)
          : initialLogs;

        await replaceWorkoutExerciseRows({
          supabase,
          workoutId: id,
          strengthRows: strengthLogs,
          cardioRows: cardioLogs,
        });

        if (executionId) {
          await syncExecutionExercisesFromWorkout({
            supabase,
            executionId,
            workoutId: id,
          });
        }

        if (executionId && (strengthLogs.length > 0 || cardioLogs.length > 0)) {
          emitTrainingWorkoutCompleted({
            workoutId: id,
            executionId,
            userId: user.id,
            subjectUserId: ownedWorkout.subject_user_id ?? null,
            subjectClientId: ownedWorkout.subject_client_id ?? null,
          });
        }
      }

      revalidateTrainingWorkoutPaths({
        workoutId: id,
        includeGoals: true,
        includeProgress: true,
      });
      return { success: true };
    },
  });
}

export async function listWorkoutExecutionSubjectsAction(input: z.input<typeof listWorkoutExecutionSubjectsSchema>) {
  const payload = listWorkoutExecutionSubjectsSchema.parse(input);
  return runTrackedAction({
    eventName: "workout.execution.subjects.list",
    payload: {
      page: payload.page,
      page_size: payload.page_size,
      has_search: Boolean(payload.search?.trim()),
    },
    action: async () => {
      const { supabase, user } = await requireWorkoutActor();

      const { data: actorProfile, error: actorError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (actorError) throw new Error(actorError.message);

      const search = payload.search?.trim() || "";
      let query = supabase
        .from("clients")
        .select("id, display_name, first_name, last_name, status, primary_coach_id, created_by_user_id")
        .neq("status", "archived")
        .order("display_name", { ascending: true, nullsFirst: false })
        .order("first_name", { ascending: true, nullsFirst: false });

      const actorIsSysadmin = actorProfile?.role === "sysadmin";
      if (!actorIsSysadmin) {
        query = query.or(`primary_coach_id.eq.${user.id},created_by_user_id.eq.${user.id}`);
      }

      if (search) {
        const safe = search.replaceAll("%", "\\%").replaceAll("_", "\\_");
        query = query.or(`display_name.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
      }

      const from = payload.page * payload.page_size;
      const to = from + payload.page_size;
      const { data, error } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const rows = (data || []) as Array<{
        id: string;
        display_name: string | null;
        first_name: string | null;
        last_name: string | null;
      }>;

      const hasMore = rows.length > payload.page_size;
      const pageRows = hasMore ? rows.slice(0, payload.page_size) : rows;
      const includeSelf = payload.page === 0;
      const selfLabel = actorProfile?.full_name?.trim() || "Myself";

      return {
        items: [
          ...(includeSelf
            ? [
                {
                  id: "self",
                  full_name: selfLabel,
                  is_self: true,
                },
              ]
            : []),
          ...pageRows.map((row) => ({
            id: row.id,
            full_name: formatSubjectName(row),
            is_self: false,
          })),
        ],
        page: payload.page,
        page_size: payload.page_size,
        has_more: hasMore,
      };
    },
  });
}

export async function logWorkoutExecutionAction(input: z.input<typeof logWorkoutExecutionSchema>) {
  const payload = logWorkoutExecutionSchema.parse(input);
  return runTrackedAction({
    eventName: "workout.execution.log",
    payload: {
      workout_id: payload.workout_id,
      subject_client_id: payload.subject_client_id ?? null,
      performed_on: payload.performed_on ?? null,
    },
    action: async () => {
      const { supabase, user } = await requireWorkoutActor();

      const [{ data: actorProfile, error: actorError }, { data: workout, error: workoutError }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("training_sessions")
          .select("id, user_id, created_by_user_id, subject_user_id, subject_client_id, performed_on")
          .eq("id", payload.workout_id)
          .maybeSingle(),
      ]);

      if (actorError) throw new Error(actorError.message);
      if (workoutError) throw new Error(workoutError.message);
      if (!workout) throw new Error("Workout not found.");

      const actorIsSysadmin = actorProfile?.role === "sysadmin";
      const ownsWorkout =
        workout.user_id === user.id ||
        workout.created_by_user_id === user.id ||
        workout.subject_user_id === user.id;

      let subjectUserId: string | null = user.id;
      let subjectClientId: string | null = null;

      if (payload.subject_client_id) {
        const { data: targetClient, error: targetClientError } = await supabase
          .from("clients")
          .select("id, primary_coach_id, created_by_user_id, status")
          .eq("id", payload.subject_client_id)
          .maybeSingle();
        if (targetClientError) throw new Error(targetClientError.message);
        if (!targetClient) throw new Error("Client not found.");
        if (targetClient.status === "archived") throw new Error("Archived clients cannot be selected.");

        const canAccessClient =
          actorIsSysadmin ||
          targetClient.primary_coach_id === user.id ||
          targetClient.created_by_user_id === user.id;
        if (!canAccessClient) throw new Error("Unauthorized client selection.");

        subjectUserId = null;
        subjectClientId = targetClient.id;
      } else if (!ownsWorkout && !actorIsSysadmin) {
        throw new Error("Unauthorized");
      }

      const execution = await createWorkoutExecutionRecord({
        supabase,
        templateWorkoutId: workout.id,
        actorUserId: user.id,
        subjectUserId,
        subjectClientId,
        performedOn: payload.performed_on || workout.performed_on || toDateInput(new Date()),
        source: "quick_log",
        notes: payload.notes || null,
      });

      await syncExecutionExercisesFromWorkout({
        supabase,
        executionId: execution.id,
        workoutId: workout.id,
      });

      revalidateTrainingWorkoutPaths({
        workoutId: payload.workout_id,
        includeGoals: true,
        includeProgress: true,
      });

      return {
        execution_id: execution.id,
      };
    },
  });
}

// ============================================================================
// 4. DELETE WORKOUT
// ============================================================================
export async function deleteWorkoutAction(ids: string | string[]) {
  return runTrackedAction({
    eventName: "workout.delete",
    payload: { count: Array.isArray(ids) ? ids.length : 1 },
    action: async () => {
      const { supabase, user } = await requireWorkoutActor();
      const idArray = Array.isArray(ids) ? ids : [ids];

      const { error } = await supabase
        .from("training_sessions")
        .delete()
        .eq("user_id", user.id)
        .in("id", idArray);
      if (error) throw new Error(error.message);

      revalidateTrainingWorkoutPaths({});
      return { success: true };
    },
  });
}
