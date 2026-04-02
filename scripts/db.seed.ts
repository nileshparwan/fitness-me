import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PRIMARY_USER = {
  id: "bdf0b621-076f-4e24-bc6d-7ddfc23b7e47",
  email: "koshal.parwan@gmail.com",
  password: "Password@1234",
  full_name: "Koshal Parwan",
};

const MEMBER_USER = {
  id: "0da99c24-4b0d-42a7-a5a2-3d048df57d06",
  email: "seed.member+fitness@gmail.com",
  password: "Password@1234",
  full_name: "Seed Member",
};

const IDS = {
  accountDeletion: "e05ccf98-0408-438f-9f7f-7e725fd2c58f",
  analyticsA: "219f6527-fe01-459f-a4db-3ccfbf5f6640",
  analyticsB: "8c5b28af-3518-4ec2-a873-c76b2b387c7d",
  bodyA: "35f430dc-ec45-45d7-bcab-f1021923c45a",
  bodyB: "b9e9f5b8-409c-4b95-b4a5-c3ea7244e3aa",
  bodyC: "f2f06f78-9773-4eb9-a8dc-06f156073b14",
  goalA: "2b397f5e-0f4b-4116-93eb-6f07c5134f03",
  goalB: "12f39bbe-42cc-4e66-8cbf-bf22b75d67a4",
  exA: "bb9f6f31-f863-4f04-b9b8-6fbd2f4c2e45",
  exB: "cb31b3fe-5504-4883-a58a-2e31ca3bb5f9",
  exC: "f07cf5ef-6c9d-4024-8499-1e0b8996076a",
  planA: "a3838a11-64b3-4ce9-9d00-9114ce5e7466",
  planB: "070f6ff3-4d09-45ce-b476-2fbceb49871b",
  planItemA: "7d7db4a3-556d-4208-a429-4c8b2cb8621f",
  planItemB: "52cc31c8-e6e4-495d-915f-a032fca1c70d",
  workoutUserA: "7d1eef34-6f16-4536-8cf3-22f4d67cc1e0",
  workoutUserB: "b2e53fd4-ed53-4fe5-b107-3ed14dc07f1f",
  workoutClientA: "6fcd2a5c-f5ce-44f5-a4fd-18f4ec31e4e6",
  strengthA: "95f0cf80-7149-4001-997e-1215d59dd71f",
  strengthB: "e046a58d-f783-4334-8c4b-d7f4ddaee744",
  strengthC: "7f843f73-a287-4fdc-adf7-550a13e1d8c5",
  strengthD: "17fca0d4-5ad5-4eb1-aab4-07f06a145170",
  cardioA: "4bb6eec8-f850-4a8e-bf20-a4651308664d",
  cardioB: "04ec7efe-1e3e-44f4-bb35-dcca5cdb7541",
  mealLogA: "c4f4d3d2-84cf-44dd-b3a5-a9e255f7301d",
  mealLogB: "a8cd8ec8-5036-4ca5-9a67-05a6014e1fb8",
  mealLogC: "76067dff-7adb-4ddd-a6e1-a542afce5a99",
  mealLogItemA: "81f983fd-1182-45cf-8425-72e240e30b5c",
  mealLogItemB: "6a84ad1c-1198-4ec2-a52f-80ea6aa88ce6",
  mealLogItemC: "3f57db2d-7c11-4fca-9f59-f84824b89f13",
  mealLogItemD: "6b58df98-4451-4f9e-ae8f-c5fffd9bec2d",
  mealLogItemE: "42f79084-9bc5-4cc9-8f19-7f3cc95e5b69",
  mealFavA: "f57980fc-595f-4a14-a39d-21bf73c0c17d",
  mealFavB: "f5a19412-516f-40f8-b4af-52a25f4db8b5",
  clientA: "f260c59e-7272-49b3-9d88-0e55b374f727",
  clientB: "dad4a098-7587-4ccf-af53-923deebf2ea0",
  coachTemplateA: "970e210a-380f-45c5-8952-a1652659ca95",
  coachTemplateSessionA: "7d5ab4f3-02a7-4dfa-b93c-8f1fa2bd4ff4",
  coachTemplateSessionB: "05f58eb5-0313-4d48-98af-89fd76ef4471",
  clientPlanAssignA: "4348fc1a-d2a4-4d24-ab8f-e31cd56140a7",
  clientPlanAssignB: "4da8e588-4428-4fb2-b6a3-2377b11f1038",
  clientPlanSessionA: "941b981d-d24f-49f2-af07-d3f97cc96dbf",
  clientPlanSessionB: "6b26df2f-9895-4722-a153-d65f0e0cefd1",
  coachNoteA: "839e8cb9-bbec-432d-a16c-486d3359a7aa",
  coachNoteB: "f97e26de-b050-4448-8f8b-d08978de6779",
  clientPaymentA: "6bc7feca-f5f4-4e44-8069-f8f7be29ecfa",
  clientPaymentB: "3a9d5388-66a4-4c3b-9b89-ba93d8ca6c1f",
  billingPlanA: "5f8a1898-300f-4f28-a8ec-f1db05cc3930",
  billingPlanB: "2ab57b2f-ea47-49ca-b34d-8f62f2abf8f3",
  paymentLogA: "dcf4b458-5587-4dc1-bb73-e72d7885fd8d",
  paymentLogB: "5b0f1f3c-76f6-4bfc-a35a-abf9587a80ce",
  paymentLogC: "02d4dc3f-20b1-4df8-8d98-d64b0fbfbe90",
  paymentLogD: "6f0ca518-ca35-4ac5-b6f5-540e1bf3eb47",
  paymentLogE: "b0054e06-dbcb-4a0c-a3c2-61cc9708a206",
  paymentLogF: "966b9723-c9ab-4f98-a3f7-c969ca65ce09",
  clientSessionA: "75e0f71f-a653-4282-abd7-cb33d8dc31d8",
  clientTaskA: "8eb5c919-2f6c-4b1c-8e8f-a3118a32ec5d",
  clientTaskB: "9f631a2d-f15a-4fd6-a7c1-beae340ea074",
  clientTaskC: "7439a7f8-adf8-4d85-92d9-cfac96d272f2",
  clientStepsA: "1b6b2bc2-e0f8-4cc3-950d-53244b49542d",
  clientStepsB: "eb5c2d55-3ba8-49b6-9e66-b496f8f3b55e",
  clientStepsC: "0cb0abc2-8d6e-4ad3-b606-7872a84dd5ac",
  clientMealFavA: "9aa662f2-f68f-4145-9589-8650d9f66085",
  clientMealFavB: "08f60789-fdc0-4b53-b2b6-2fb872f637aa",
  clientCheckinA: "0fdc0ad0-17b9-4de9-a105-804f5611f260",
  clientCheckinB: "44763425-f2f8-4984-8d2d-51f64041817f",
  ticketA: "fb0d2a6d-a6e6-44f9-9c0a-754f3207bc1e",
  ticketB: "00d0ce55-7fdc-4f8d-aee5-bd8d037563b6",
  ticketC: "6d3f8b71-67a4-4712-ae72-5f0282cd8af9",
  ticketCommentA: "6e0bc0fe-8a95-4a5f-b70b-16dc5f5cb902",
  ticketCommentB: "0ece7c66-5364-4465-a9e8-1a03b3f2976c",
  ticketCommentC: "6ba4f8ef-4e2e-4d22-a3f6-84eef57054e5",
  mealGroupTemplateA: "82ef8c2c-fcef-44f2-bf2b-15bc31ca21a4",
  mealGroupSnapshotA: "1bb35bfd-f5fa-42d8-b29b-e2bb90dc6d5a",
  mealGroupAssignUserA: "c86b5340-aec4-4918-bbbd-f2258e9e4f95",
  mealGroupAssignClientA: "b9b82616-d3bc-4149-95a6-f011d534e4be",
  mealGroupItemA: "4e6b2f55-20ea-4f7d-8ecf-f5a8fd3598e8",
  mealGroupItemB: "df6c82a5-57fe-46ab-b42f-0ea4be4d4f38",
  mealGroupItemC: "259bac57-fb5a-4f27-afce-a59f8ff3a3bb",
  mealGroupItemD: "0ec99c1b-95b8-4db8-b1a8-b174fc38e6f0",
  mealGroupItemE: "8e4ee508-75f5-49bf-a0e2-c32c4c45fd86",
} as const;

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const MODULE_KEYS = [
  "workouts",
  "program",
  "nutrition_plan",
  "diary",
  "steps_tracking",
  "goals",
  "check_ins",
  "client_notes",
  "tasks",
] as const;

const now = new Date();
const nowIso = now.toISOString();

function dateOffset(days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ensure<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new Error(message);
  return value;
}

async function ensureAuthUser(user: { id: string; email: string; password: string; full_name: string }) {
  const existing = await supabase.auth.admin.getUserById(user.id);
  if (existing.data.user) {
    const update = await supabase.auth.admin.updateUserById(user.id, {
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    });
    if (update.error) throw new Error(`Failed to update auth user ${user.email}: ${update.error.message}`);
    return;
  }

  const created = await supabase.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });
  if (created.error) throw new Error(`Failed to create auth user ${user.email}: ${created.error.message}`);
}

async function upsertOne(table: string, row: Record<string, unknown>, onConflict = "id") {
  const { error } = await supabase.from(table).upsert(row, { onConflict });
  if (error) throw new Error(`[${table}] ${error.message}`);
}

async function upsertMany(table: string, rows: Record<string, unknown>[], onConflict = "id") {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`[${table}] ${error.message}`);
}

async function run() {
  console.log("Seeding dummy data...");

  await ensureAuthUser(PRIMARY_USER);
  await ensureAuthUser(MEMBER_USER);

  // Base user data
  await upsertMany(
    "profiles",
    [
      {
        id: PRIMARY_USER.id,
        full_name: PRIMARY_USER.full_name,
        bio: "Primary seeded profile for full app flows",
        preferred_units: "metric",
        role: "user",
        is_onboarding_completed: true,
        is_active: true,
        sport_focus: ["strength", "hypertrophy", "conditioning"],
        height_cm: 178,
        gender: "male",
        date_of_birth: "1995-01-23",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: MEMBER_USER.id,
        full_name: MEMBER_USER.full_name,
        bio: "Secondary seeded member profile",
        preferred_units: "metric",
        role: "user",
        is_onboarding_completed: true,
        is_active: true,
        sport_focus: ["running", "general_fitness"],
        height_cm: 171,
        gender: "female",
        date_of_birth: "1998-04-18",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "exercises",
    [
      {
        id: IDS.exA,
        name: "Seed Barbell Row",
        category: "back",
        muscle_groups: ["lats", "rhomboids", "biceps"],
        equipment: "barbell",
        difficulty_level: "intermediate",
        is_custom: true,
        is_approved: true,
        created_by: PRIMARY_USER.id,
        description: "Heavy horizontal pull",
        created_at: nowIso,
      },
      {
        id: IDS.exB,
        name: "Seed Flat Dumbbell Press",
        category: "chest",
        muscle_groups: ["chest", "triceps", "front_delts"],
        equipment: "dumbbell",
        difficulty_level: "beginner",
        is_custom: true,
        is_approved: true,
        created_by: PRIMARY_USER.id,
        description: "Chest pressing pattern",
        created_at: nowIso,
      },
      {
        id: IDS.exC,
        name: "Seed Goblet Squat",
        category: "legs",
        muscle_groups: ["quads", "glutes", "core"],
        equipment: "dumbbell",
        difficulty_level: "beginner",
        is_custom: true,
        is_approved: true,
        created_by: PRIMARY_USER.id,
        description: "Squat pattern with controlled tempo",
        created_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "programs",
    [
      {
        id: IDS.planA,
        user_id: PRIMARY_USER.id,
        name: "Upper / Lower Split",
        description: "4-day split with progressive overload",
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.planB,
        user_id: PRIMARY_USER.id,
        name: "Conditioning Block",
        description: "Cardio-centric 3-day block",
        is_active: false,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "clients",
    [
      {
        id: IDS.clientA,
        primary_coach_id: PRIMARY_USER.id,
        created_by_user_id: PRIMARY_USER.id,
        first_name: "Demo",
        last_name: "Client",
        display_name: "Demo Client",
        linked_user_id: MEMBER_USER.id,
        email: "demo.client+seed@gmail.com",
        phone: "+2300000000",
        status: "active",
        goals: "Improve strength and body composition",
        medical_flags: "None",
        notes: "Linked client account",
        height_cm: 174,
        weight_kg: 77.5,
        date_of_birth: "1997-04-15",
        sex: "male",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientB,
        primary_coach_id: PRIMARY_USER.id,
        created_by_user_id: PRIMARY_USER.id,
        first_name: "Offline",
        last_name: "Athlete",
        display_name: "Offline Athlete",
        linked_user_id: null,
        email: null,
        phone: "+2300000001",
        status: "paused",
        goals: "Return to regular training consistency",
        medical_flags: "Lower-back sensitivity",
        notes: "No platform account",
        height_cm: 169,
        weight_kg: 69.2,
        date_of_birth: "2001-10-10",
        sex: "female",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertOne("program_templates", {
    id: IDS.coachTemplateA,
    coach_id: PRIMARY_USER.id,
    name: "General Strength Template",
    description: "Base template used for client assignments",
    tags: ["strength", "conditioning"],
    is_archived: false,
    created_at: nowIso,
    updated_at: nowIso,
  });

  const templateSessionsLookup = await supabase
    .from("program_template_workouts")
    .select("id, sequence_no")
    .eq("template_id", IDS.coachTemplateA)
    .in("sequence_no", [1, 2]);
  if (templateSessionsLookup.error) {
    throw new Error(`[program_template_workouts lookup] ${templateSessionsLookup.error.message}`);
  }

  const coachTemplateSessionAId =
    templateSessionsLookup.data?.find((row) => row.sequence_no === 1)?.id ?? IDS.coachTemplateSessionA;
  const coachTemplateSessionBId =
    templateSessionsLookup.data?.find((row) => row.sequence_no === 2)?.id ?? IDS.coachTemplateSessionB;

  await upsertMany(
    "program_template_workouts",
    [
      {
        id: coachTemplateSessionAId,
        template_id: IDS.coachTemplateA,
        sequence_no: 1,
        title: "Upper Strength",
        session_type: "strength",
        default_slot: "afternoon",
        estimated_duration_minutes: 65,
        notes: "Heavy compound emphasis",
        metadata: { focus: "upper" },
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: coachTemplateSessionBId,
        template_id: IDS.coachTemplateA,
        sequence_no: 2,
        title: "Lower + Cardio",
        session_type: "mixed",
        default_slot: "morning",
        estimated_duration_minutes: 70,
        notes: "Lower-body plus steady-state cardio",
        metadata: { focus: "lower" },
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "program_assignments",
    [
      {
        id: IDS.clientPlanAssignA,
        client_id: IDS.clientA,
        coach_id: PRIMARY_USER.id,
        template_id: IDS.coachTemplateA,
        name: "Demo Client Assigned Plan",
        notes: "Client specific snapshot",
        status: "active",
        started_on: dateOffset(-14),
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientPlanAssignB,
        client_id: IDS.clientB,
        coach_id: PRIMARY_USER.id,
        template_id: IDS.coachTemplateA,
        name: "Offline Athlete Rebuild Plan",
        notes: "Paused due schedule constraints",
        status: "archived",
        started_on: dateOffset(-21),
        ended_on: dateOffset(-3),
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  const assignmentSessionsLookup = await supabase
    .from("program_assignment_workouts")
    .select("id, sequence_no")
    .eq("assignment_id", IDS.clientPlanAssignA)
    .in("sequence_no", [1, 2]);
  if (assignmentSessionsLookup.error) {
    throw new Error(`[program_assignment_workouts lookup] ${assignmentSessionsLookup.error.message}`);
  }

  const clientPlanSessionAId =
    assignmentSessionsLookup.data?.find((row) => row.sequence_no === 1)?.id ?? IDS.clientPlanSessionA;
  const clientPlanSessionBId =
    assignmentSessionsLookup.data?.find((row) => row.sequence_no === 2)?.id ?? IDS.clientPlanSessionB;

  await upsertMany(
    "program_assignment_workouts",
    [
      {
        id: clientPlanSessionAId,
        assignment_id: IDS.clientPlanAssignA,
        template_session_id: coachTemplateSessionAId,
        sequence_no: 1,
        title: "Client Session 1",
        session_type: "mixed",
        default_slot: "afternoon",
        estimated_duration_minutes: 65,
        metadata: { seeded: true },
        is_skipped: false,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: clientPlanSessionBId,
        assignment_id: IDS.clientPlanAssignA,
        template_session_id: coachTemplateSessionBId,
        sequence_no: 2,
        title: "Client Session 2",
        session_type: "mixed",
        default_slot: "morning",
        estimated_duration_minutes: 70,
        metadata: { seeded: true },
        is_skipped: false,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "workouts",
    [
      {
        id: IDS.workoutUserA,
        user_id: PRIMARY_USER.id,
        subject_user_id: PRIMARY_USER.id,
        created_by_user_id: PRIMARY_USER.id,
        plan_id: IDS.planA,
        name: "User Session - Upper Pull",
        status: "completed",
        performed_on: dateOffset(-1),
        date: nowIso,
        workout_slot: "morning",
        session_label: "Primary Lift Session",
        started_at: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
        duration_minutes: 70,
        notes: "Strong pulling day",
        overall_rating: 8,
        perceived_exertion: 7,
        location_type: "gym",
        location_label: "Main Gym",
        location_address: "Port Louis",
        location_notes: "Platform lane A",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.workoutUserB,
        user_id: PRIMARY_USER.id,
        subject_user_id: PRIMARY_USER.id,
        created_by_user_id: PRIMARY_USER.id,
        plan_id: IDS.planB,
        name: "User Session - Cardio Builder",
        status: "completed",
        performed_on: dateOffset(0),
        date: nowIso,
        workout_slot: "evening",
        session_label: "Conditioning Block",
        started_at: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        duration_minutes: 40,
        notes: "Intervals felt controlled",
        overall_rating: 7,
        perceived_exertion: 6,
        location_type: "outdoor",
        location_label: "Track",
        location_notes: "Lane 2 intervals",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.workoutClientA,
        user_id: PRIMARY_USER.id,
        subject_client_id: IDS.clientA,
        created_by_user_id: PRIMARY_USER.id,
        plan_assignment_id: IDS.clientPlanAssignA,
        plan_session_id: clientPlanSessionAId,
        name: "Client Logged Session",
        status: "completed",
        performed_on: dateOffset(0),
        date: nowIso,
        workout_slot: "afternoon",
        session_label: "Coach-guided session",
        started_at: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
        completed_at: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
        duration_minutes: 68,
        location_type: "home",
        location_label: "Home Setup",
        notes: "Session linked to plan progression",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "workout_sets",
    [
      {
        id: IDS.strengthA,
        workout_id: IDS.workoutUserA,
        exercise_id: IDS.exA,
        exercise_name: "Seed Barbell Row",
        set_number: 1,
        reps: 8,
        weight: 60,
        rpe: 8,
        rest_seconds: 120,
        notes: "Controlled eccentric",
        entry_sequence: 1,
        calculated_1rm: 76,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.strengthB,
        workout_id: IDS.workoutUserA,
        exercise_id: IDS.exA,
        exercise_name: "Seed Barbell Row",
        set_number: 2,
        reps: 8,
        weight: 62.5,
        rpe: 8,
        rest_seconds: 120,
        notes: "Same tempo",
        entry_sequence: 2,
        calculated_1rm: 79,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.strengthC,
        workout_id: IDS.workoutClientA,
        exercise_id: IDS.exB,
        exercise_name: "Seed Flat Dumbbell Press",
        set_number: 1,
        reps: 10,
        weight: 24,
        rpe: 7,
        rest_seconds: 90,
        notes: "Client kept form stable",
        entry_sequence: 1,
        calculated_1rm: 32,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.strengthD,
        workout_id: IDS.workoutClientA,
        exercise_id: IDS.exC,
        exercise_name: "Seed Goblet Squat",
        set_number: 1,
        reps: 12,
        weight: 26,
        rpe: 7,
        rest_seconds: 90,
        notes: "Depth and posture maintained",
        entry_sequence: 2,
        calculated_1rm: 36,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "workout_cardio",
    [
      {
        id: IDS.cardioA,
        user_id: PRIMARY_USER.id,
        workout_id: IDS.workoutUserA,
        activity_type: "Run",
        duration_minutes: 24,
        distance_km: 4.1,
        calories_burned: 280,
        average_heart_rate: 148,
        date: dateOffset(-1),
        entry_sequence: 3,
        sport_type: "run",
        notes: "Steady zone 2",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.cardioB,
        user_id: PRIMARY_USER.id,
        workout_id: IDS.workoutUserB,
        activity_type: "Bike",
        duration_minutes: 30,
        distance_km: 12.4,
        calories_burned: 260,
        average_heart_rate: 142,
        date: dateOffset(0),
        entry_sequence: 1,
        sport_type: "bike",
        notes: "Tempo ride",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "program_workouts",
    [
      {
        id: IDS.planItemA,
        program_id: IDS.planA,
        item_type: "workout",
        workout_id: IDS.workoutUserA,
        day_label: "Day 1",
        order_index: 1,
        created_at: nowIso,
      },
      {
        id: IDS.planItemB,
        program_id: IDS.planB,
        item_type: "workout",
        workout_id: IDS.workoutUserB,
        day_label: "Day 2",
        order_index: 2,
        created_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "measurements",
    [
      {
        id: IDS.bodyA,
        user_id: PRIMARY_USER.id,
        date: dateOffset(-14),
        weight: 83.4,
        body_fat_percent: 18.1,
        waist_cm: 88.5,
        chest_cm: 106.8,
        hips_cm: 98.7,
        thighs_cm: 58.2,
        arms_cm: 36.8,
        notes: "Start of block",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.bodyB,
        user_id: PRIMARY_USER.id,
        date: dateOffset(-7),
        weight: 82.9,
        body_fat_percent: 17.6,
        waist_cm: 87.8,
        chest_cm: 106.3,
        hips_cm: 98.3,
        thighs_cm: 58,
        arms_cm: 36.9,
        notes: "Mid block",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.bodyC,
        user_id: PRIMARY_USER.id,
        date: dateOffset(0),
        weight: 82.4,
        body_fat_percent: 17.2,
        waist_cm: 87,
        chest_cm: 106,
        hips_cm: 98,
        thighs_cm: 58,
        arms_cm: 37,
        notes: "Current checkpoint",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "goals",
    [
      {
        id: IDS.goalA,
        user_id: PRIMARY_USER.id,
        goal_type: "weight",
        status: "active",
        priority: 1,
        target_weight: 79,
        current_weight: 82.4,
        protein_target: 175,
        carbs_target: 280,
        fat_target: 70,
        daily_calories: 2700,
        weekly_workouts: 5,
        target_date: "2026-08-01",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.goalB,
        user_id: PRIMARY_USER.id,
        goal_type: "weight",
        status: "active",
        priority: 2,
        target_weight: 77,
        current_weight: 82.4,
        protein_target: 180,
        carbs_target: 260,
        fat_target: 68,
        daily_calories: 2550,
        weekly_workouts: 4,
        target_date: "2026-10-01",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "analytics_events",
    [
      {
        id: IDS.analyticsA,
        user_id: PRIMARY_USER.id,
        event_name: "seed_completed",
        page_path: "/dashboard",
        metadata: { source: "db.seed.ts" },
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.analyticsB,
        user_id: PRIMARY_USER.id,
        event_name: "nutrition_diary_opened",
        page_path: "/nutrition",
        metadata: { source: "db.seed.ts" },
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "diary_entries",
    [
      {
        id: IDS.mealLogA,
        subject_user_id: PRIMARY_USER.id,
        created_by_user_id: PRIMARY_USER.id,
        performed_on: dateOffset(0),
        meal_type: "breakfast",
        notes: "Pre-workout breakfast",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.mealLogB,
        subject_user_id: PRIMARY_USER.id,
        created_by_user_id: PRIMARY_USER.id,
        performed_on: dateOffset(0),
        meal_type: "dinner",
        notes: "Evening recovery meal",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.mealLogC,
        subject_client_id: IDS.clientA,
        created_by_user_id: PRIMARY_USER.id,
        performed_on: dateOffset(0),
        meal_type: "lunch",
        notes: "Coach logged client lunch",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "diary_items",
    [
      {
        id: IDS.mealLogItemA,
        meal_log_id: IDS.mealLogA,
        created_by_user_id: PRIMARY_USER.id,
        item_name: "Greek yogurt bowl",
        quantity: 1,
        unit: "bowl",
        calories: 420,
        protein_g: 31,
        carbs_g: 44,
        fat_g: 12,
        fiber_g: 5,
        notes: "Seed item",
        position: 1,
        is_quick_add: false,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.mealLogItemB,
        meal_log_id: IDS.mealLogA,
        created_by_user_id: PRIMARY_USER.id,
        item_name: "Quick Add",
        calories: 180,
        protein_g: 5,
        carbs_g: 25,
        fat_g: 6,
        is_quick_add: true,
        position: 2,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.mealLogItemC,
        meal_log_id: IDS.mealLogB,
        created_by_user_id: PRIMARY_USER.id,
        item_name: "Lean beef + potatoes",
        quantity: 1,
        unit: "serving",
        calories: 710,
        protein_g: 58,
        carbs_g: 62,
        fat_g: 24,
        fiber_g: 7,
        notes: "Post-workout dinner",
        position: 1,
        is_quick_add: false,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.mealLogItemD,
        meal_log_id: IDS.mealLogC,
        created_by_user_id: PRIMARY_USER.id,
        item_name: "Client lunch bowl",
        quantity: 1,
        unit: "bowl",
        calories: 640,
        protein_g: 42,
        carbs_g: 68,
        fat_g: 18,
        fiber_g: 8,
        notes: "Client compliance logged",
        position: 1,
        is_quick_add: false,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.mealLogItemE,
        meal_log_id: IDS.mealLogC,
        created_by_user_id: PRIMARY_USER.id,
        item_name: "Apple",
        quantity: 1,
        unit: "piece",
        calories: 95,
        carbs_g: 25,
        fiber_g: 4,
        position: 2,
        is_quick_add: false,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "diary_favorites",
    [
      {
        id: IDS.mealFavA,
        subject_user_id: PRIMARY_USER.id,
        item_name: "Seed chicken bowl",
        quantity: 1,
        unit: "bowl",
        calories: 640,
        protein_g: 46,
        carbs_g: 70,
        fat_g: 19,
        fiber_g: 8,
        usage_count: 4,
        last_used_at: nowIso,
        notes: "Reliable pre-work meal",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.mealFavB,
        subject_user_id: PRIMARY_USER.id,
        item_name: "Yogurt + berries",
        quantity: 1,
        unit: "bowl",
        calories: 360,
        protein_g: 28,
        carbs_g: 36,
        fat_g: 11,
        fiber_g: 5,
        usage_count: 2,
        last_used_at: nowIso,
        notes: "High-protein snack",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "client_credentials",
    [
      {
        client_id: IDS.clientA,
        username: `client-${PRIMARY_USER.id.slice(0, 8)}`,
        password_hash: await bcrypt.hash("ClientSeed@123", 10),
        status: "active",
        is_portal_enabled: true,
        failed_attempts: 0,
        created_by_user_id: PRIMARY_USER.id,
        updated_by_user_id: PRIMARY_USER.id,
        password_updated_at: nowIso,
        username_updated_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        client_id: IDS.clientB,
        username: `offline-${PRIMARY_USER.id.slice(0, 8)}`,
        password_hash: await bcrypt.hash("ClientSeed@123", 10),
        status: "blocked",
        is_portal_enabled: false,
        failed_attempts: 3,
        created_by_user_id: PRIMARY_USER.id,
        updated_by_user_id: PRIMARY_USER.id,
        password_updated_at: nowIso,
        username_updated_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "client_id"
  );

  await upsertOne("client_auth_sessions", {
    id: IDS.clientSessionA,
    client_id: IDS.clientA,
    token_hash: `seed-token-${PRIMARY_USER.id}`,
    expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_seen_at: nowIso,
    created_ip: "127.0.0.1",
    user_agent: "seed-script",
    created_at: nowIso,
    updated_at: nowIso,
  });

  await upsertMany(
    "feature_access",
    [
      ...MODULE_KEYS.map((module_key) => ({
        client_id: IDS.clientA,
        module_key,
        access_level: "enabled",
        configured_by_user_id: PRIMARY_USER.id,
        created_at: nowIso,
        updated_at: nowIso,
      })),
      ...MODULE_KEYS.map((module_key) => ({
        client_id: IDS.clientB,
        module_key,
        access_level: module_key === "nutrition_plan" || module_key === "client_notes" ? "read_only" : "disabled",
        configured_by_user_id: PRIMARY_USER.id,
        created_at: nowIso,
        updated_at: nowIso,
      })),
    ],
    "client_id,module_key"
  );

  await upsertMany(
    "tasks",
    [
      {
        id: IDS.clientTaskA,
        client_id: IDS.clientA,
        title: "Complete mobility block",
        description: "10 minutes thoracic + shoulder mobility",
        due_date: dateOffset(1),
        status: "pending",
        created_by_user_id: PRIMARY_USER.id,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientTaskB,
        client_id: IDS.clientA,
        title: "Upload weekly check-in",
        description: "Fill soreness, sleep, stress fields",
        due_date: dateOffset(0),
        status: "completed",
        completed_at: nowIso,
        created_by_user_id: PRIMARY_USER.id,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientTaskC,
        client_id: IDS.clientB,
        title: "Resume walking routine",
        description: "Target 6k steps for 3 days",
        due_date: dateOffset(-1),
        status: "overdue",
        created_by_user_id: PRIMARY_USER.id,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "client_activity",
    [
      {
        id: IDS.clientStepsA,
        client_id: IDS.clientA,
        performed_on: dateOffset(-2),
        steps: 7200,
        notes: "Seed steps day 1",
        created_by_user_id: PRIMARY_USER.id,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientStepsB,
        client_id: IDS.clientA,
        performed_on: dateOffset(-1),
        steps: 8100,
        notes: "Seed steps day 2",
        created_by_user_id: PRIMARY_USER.id,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientStepsC,
        client_id: IDS.clientB,
        performed_on: dateOffset(-1),
        steps: 4300,
        notes: "Paused client baseline",
        created_by_user_id: PRIMARY_USER.id,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "client_meal_item_favorites",
    [
      {
        id: IDS.clientMealFavA,
        client_id: IDS.clientA,
        item_name: "Client seed yogurt bowl",
        quantity: 1,
        unit: "bowl",
        calories: 420,
        protein_g: 28,
        carbs_g: 44,
        fat_g: 14,
        fiber_g: 6,
        usage_count: 2,
        last_used_at: nowIso,
        notes: "Post-session snack",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientMealFavB,
        client_id: IDS.clientB,
        item_name: "Simple oats bowl",
        quantity: 1,
        unit: "bowl",
        calories: 360,
        protein_g: 14,
        carbs_g: 52,
        fat_g: 9,
        fiber_g: 8,
        usage_count: 1,
        last_used_at: nowIso,
        notes: "Low-prep fallback",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "client_reviews",
    [
      {
        id: IDS.clientCheckinA,
        subject_client_id: IDS.clientA,
        created_by_user_id: PRIMARY_USER.id,
        submitted_at: nowIso,
        status: "reviewed",
        urgent: false,
        notes: "Client reported stable recovery",
        checkin_data: { sleep: 7.3, stress: 3, soreness: 2 },
        reviewed_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientCheckinB,
        subject_client_id: IDS.clientB,
        created_by_user_id: PRIMARY_USER.id,
        submitted_at: nowIso,
        status: "pending",
        urgent: true,
        notes: "Client reports recurring lower-back discomfort",
        checkin_data: { sleep: 6.1, stress: 6, soreness: 7 },
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "client_notes",
    [
      {
        id: IDS.coachNoteA,
        client_id: IDS.clientA,
        coach_id: PRIMARY_USER.id,
        tag: "programming",
        title: "Technique priority",
        content: "Prioritize tempo control during pulling movements.",
        is_shared_with_linked_user: false,
        visibility: "private",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.coachNoteB,
        client_id: IDS.clientA,
        coach_id: PRIMARY_USER.id,
        tag: "nutrition",
        title: "Meal consistency",
        content: "Keep lunch timing stable on training days.",
        is_shared_with_linked_user: true,
        visibility: "visible_to_client",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "payments",
    [
      {
        id: IDS.clientPaymentA,
        client_id: IDS.clientA,
        coach_id: PRIMARY_USER.id,
        amount: 200,
        currency: "USD",
        method: "bank_transfer",
        payment_date: dateOffset(-10),
        period_start: dateOffset(-10),
        period_end: dateOffset(20),
        status: "paid",
        notes: "Seed payment record",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.clientPaymentB,
        client_id: IDS.clientB,
        coach_id: PRIMARY_USER.id,
        amount: 150,
        currency: "USD",
        method: "card",
        payment_date: dateOffset(-2),
        period_start: dateOffset(-2),
        period_end: dateOffset(28),
        status: "pending",
        notes: "Awaiting settlement",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "billing_plans",
    [
      {
        id: IDS.billingPlanA,
        client_id: IDS.clientA,
        coach_id: PRIMARY_USER.id,
        billing_type: "per_session",
        session_rate: 60,
        currency: "USD",
        payment_method: "card",
        sessions_purchased: 0,
        sessions_used: 0,
        monthly_amount: null,
        billing_cycle_day: null,
        program_start_date: null,
        program_end_date: null,
        is_active: true,
        notes: "Per-session billing for coached sessions.",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.billingPlanB,
        client_id: IDS.clientB,
        coach_id: PRIMARY_USER.id,
        billing_type: "session_package",
        session_rate: 45,
        currency: "USD",
        payment_method: "bank_transfer",
        sessions_purchased: 12,
        sessions_used: 3,
        monthly_amount: null,
        billing_cycle_day: null,
        program_start_date: null,
        program_end_date: null,
        is_active: true,
        notes: "12-session package; credits decremented on each log.",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "payment_events",
    [
      {
        id: IDS.paymentLogA,
        client_id: IDS.clientA,
        coach_id: PRIMARY_USER.id,
        billing_plan_id: IDS.billingPlanA,
        session_date: dateOffset(-12),
        amount: 60,
        session_rate_snapshot: 60,
        sessions_remaining_after: null,
        billing_type_snapshot: "per_session",
        status: "confirmed",
        notes: "Paid after upper body strength session.",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.paymentLogB,
        client_id: IDS.clientA,
        coach_id: PRIMARY_USER.id,
        billing_plan_id: IDS.billingPlanA,
        session_date: dateOffset(-8),
        amount: 60,
        session_rate_snapshot: 60,
        sessions_remaining_after: null,
        billing_type_snapshot: "per_session",
        status: "logged",
        notes: "Paid after cardio-conditioning session.",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.paymentLogC,
        client_id: IDS.clientA,
        coach_id: PRIMARY_USER.id,
        billing_plan_id: IDS.billingPlanA,
        session_date: dateOffset(-3),
        amount: 60,
        session_rate_snapshot: 60,
        sessions_remaining_after: null,
        billing_type_snapshot: "per_session",
        status: "logged",
        notes: "Paid after mobility + accessories session.",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.paymentLogD,
        client_id: IDS.clientB,
        coach_id: PRIMARY_USER.id,
        billing_plan_id: IDS.billingPlanB,
        session_date: dateOffset(-11),
        amount: null,
        session_rate_snapshot: 45,
        sessions_remaining_after: 11,
        billing_type_snapshot: "session_package",
        status: "confirmed",
        notes: "Package session logged.",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.paymentLogE,
        client_id: IDS.clientB,
        coach_id: PRIMARY_USER.id,
        billing_plan_id: IDS.billingPlanB,
        session_date: dateOffset(-6),
        amount: null,
        session_rate_snapshot: 45,
        sessions_remaining_after: 10,
        billing_type_snapshot: "session_package",
        status: "logged",
        notes: "Package session logged.",
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.paymentLogF,
        client_id: IDS.clientB,
        coach_id: PRIMARY_USER.id,
        billing_plan_id: IDS.billingPlanB,
        session_date: dateOffset(-2),
        amount: null,
        session_rate_snapshot: 45,
        sessions_remaining_after: 9,
        billing_type_snapshot: "session_package",
        status: "logged",
        notes: "Package session logged.",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "nutrition_plans",
    [
      {
        id: IDS.mealGroupTemplateA,
        name: "Performance Week Template",
        description: "7-day high-performance meal structure",
        start_date: dateOffset(-1),
        end_date: dateOffset(35),
        status: "active",
        notes: "Template used for assignments",
        created_by_user_id: PRIMARY_USER.id,
        is_snapshot: false,
        source_plan_id: null,
      },
      {
        id: IDS.mealGroupSnapshotA,
        name: "Assigned Snapshot - Demo Client",
        description: "Snapshot generated from template",
        start_date: dateOffset(0),
        end_date: dateOffset(21),
        status: "active",
        notes: "Snapshot copy for assignments",
        created_by_user_id: PRIMARY_USER.id,
        is_snapshot: true,
        source_plan_id: IDS.mealGroupTemplateA,
      },
    ],
    "id"
  );

  await upsertMany(
    "nutrition_plan_days",
    DAY_ORDER.flatMap((day) => [
      {
        nutrition_plan_id: IDS.mealGroupTemplateA,
        day_of_week: day,
        label: DAY_LABELS[day],
        notes: day === "sun" ? "Higher flexibility day" : null,
        created_by_user_id: PRIMARY_USER.id,
      },
      {
        nutrition_plan_id: IDS.mealGroupSnapshotA,
        day_of_week: day,
        label: DAY_LABELS[day],
        notes: day === "sun" ? "Snapshot: flexible intake" : null,
        created_by_user_id: PRIMARY_USER.id,
      },
    ]),
    "nutrition_plan_id,day_of_week"
  );

  const templatePlansRes = await supabase
    .from("nutrition_plan_days")
    .select("id, day_of_week")
    .eq("nutrition_plan_id", IDS.mealGroupTemplateA);
  if (templatePlansRes.error) throw new Error(`[nutrition_plan_days] ${templatePlansRes.error.message}`);
  const snapshotPlansRes = await supabase
    .from("nutrition_plan_days")
    .select("id, day_of_week")
    .eq("nutrition_plan_id", IDS.mealGroupSnapshotA);
  if (snapshotPlansRes.error) throw new Error(`[nutrition_plan_days] ${snapshotPlansRes.error.message}`);

  const templateByDay = new Map(templatePlansRes.data?.map((p) => [p.day_of_week, p.id]) || []);
  const snapshotByDay = new Map(snapshotPlansRes.data?.map((p) => [p.day_of_week, p.id]) || []);

  await upsertMany(
    "nutrition_plan_items",
    [
      {
        id: IDS.mealGroupItemA,
        plan_day_id: ensure(templateByDay.get("mon"), "Missing Monday template meal plan"),
        type: "breakfast",
        title: "Template Monday Breakfast",
        calories: 650,
        protein_g: 38,
        carbs_g: 82,
        fat_g: 18,
        notes: "Higher carbs for training day",
        position: 1,
        created_by_user_id: PRIMARY_USER.id,
      },
      {
        id: IDS.mealGroupItemB,
        plan_day_id: ensure(templateByDay.get("mon"), "Missing Monday template meal plan"),
        type: "lunch",
        title: "Template Monday Lunch",
        calories: 780,
        protein_g: 48,
        carbs_g: 90,
        fat_g: 22,
        notes: null,
        position: 2,
        created_by_user_id: PRIMARY_USER.id,
      },
      {
        id: IDS.mealGroupItemC,
        plan_day_id: ensure(templateByDay.get("tue"), "Missing Tuesday template meal plan"),
        type: "dinner",
        title: "Template Tuesday Dinner",
        calories: 740,
        protein_g: 46,
        carbs_g: 76,
        fat_g: 24,
        notes: null,
        position: 1,
        created_by_user_id: PRIMARY_USER.id,
      },
      {
        id: IDS.mealGroupItemD,
        plan_day_id: ensure(snapshotByDay.get("mon"), "Missing Monday snapshot meal plan"),
        type: "breakfast",
        title: "Snapshot Monday Breakfast",
        calories: 620,
        protein_g: 36,
        carbs_g: 78,
        fat_g: 17,
        notes: "Adjusted from template",
        position: 1,
        created_by_user_id: PRIMARY_USER.id,
      },
      {
        id: IDS.mealGroupItemE,
        plan_day_id: ensure(snapshotByDay.get("mon"), "Missing Monday snapshot meal plan"),
        type: "protein_drink",
        title: "Snapshot Post-Workout Shake",
        calories: 280,
        protein_g: 34,
        carbs_g: 24,
        fat_g: 6,
        notes: null,
        position: 2,
        created_by_user_id: PRIMARY_USER.id,
      },
    ],
    "id"
  );

  await upsertMany(
    "nutrition_plan_assignments",
    [
      {
        id: IDS.mealGroupAssignUserA,
        template_plan_id: IDS.mealGroupTemplateA,
        nutrition_plan_id: IDS.mealGroupSnapshotA,
        subject_user_id: PRIMARY_USER.id,
        assigned_by_user_id: PRIMARY_USER.id,
        start_date: dateOffset(0),
        end_date: dateOffset(21),
        status: "active",
        notes: "Seed assignment to self",
      },
      {
        id: IDS.mealGroupAssignClientA,
        template_plan_id: IDS.mealGroupTemplateA,
        nutrition_plan_id: IDS.mealGroupSnapshotA,
        subject_client_id: IDS.clientA,
        assigned_by_user_id: PRIMARY_USER.id,
        start_date: dateOffset(0),
        end_date: dateOffset(21),
        status: "paused",
        notes: "Seed assignment to client",
      },
    ],
    "id"
  );

  await upsertMany(
    "support_tickets",
    [
      {
        id: IDS.ticketA,
        user_id: PRIMARY_USER.id,
        title: "Add cable row alternatives",
        description: "Please add more horizontal pull alternatives for limited-equipment gyms.",
        category: "exercise_request",
        status: "open",
        is_public: true,
        upvotes: 0,
        metadata: { seeded: true },
        admin_notes: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.ticketB,
        user_id: MEMBER_USER.id,
        title: "Progress page load optimization",
        description: "Progress widgets should render faster on low-end mobile devices.",
        category: "feature_request",
        status: "in_progress",
        is_public: true,
        upvotes: 0,
        metadata: { seeded: true },
        admin_notes: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: IDS.ticketC,
        user_id: PRIMARY_USER.id,
        title: "Meal diary quick-add validation",
        description: "Quick add should reject negative calorie values consistently.",
        category: "bug_report",
        status: "resolved",
        is_public: false,
        upvotes: 0,
        metadata: { seeded: true },
        admin_notes: "Validation guard added in seed baseline",
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "support_replies",
    [
      {
        id: IDS.ticketCommentA,
        ticket_id: IDS.ticketA,
        user_id: PRIMARY_USER.id,
        content: "This would help progression on pull-focused days.",
        created_at: nowIso,
      },
      {
        id: IDS.ticketCommentB,
        ticket_id: IDS.ticketA,
        user_id: MEMBER_USER.id,
        content: "Agree. Also useful for home-gym substitutions.",
        created_at: nowIso,
      },
      {
        id: IDS.ticketCommentC,
        ticket_id: IDS.ticketB,
        user_id: PRIMARY_USER.id,
        content: "Loading skeletons plus lighter queries should solve most lag.",
        created_at: nowIso,
      },
    ],
    "id"
  );

  await upsertMany(
    "support_votes",
    [
      { ticket_id: IDS.ticketA, user_id: PRIMARY_USER.id, created_at: nowIso },
      { ticket_id: IDS.ticketA, user_id: MEMBER_USER.id, created_at: nowIso },
      { ticket_id: IDS.ticketB, user_id: PRIMARY_USER.id, created_at: nowIso },
    ],
    "ticket_id,user_id"
  );

  await upsertOne(
    "deletion_requests",
    {
      id: IDS.accountDeletion,
      user_id: PRIMARY_USER.id,
      reason: "seed_test",
      status: "restored",
      requested_at: nowIso,
      deleted_at: nowIso,
      recoverable_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      restored_at: nowIso,
      finalized_at: nowIso,
      metadata: { seeded: true },
      updated_at: nowIso,
    },
    "user_id"
  );

  console.log("Seed complete.");
  console.log(`Primary User: ${PRIMARY_USER.email} / ${PRIMARY_USER.password}`);
  console.log(`Member User: ${MEMBER_USER.email} / ${MEMBER_USER.password}`);
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
