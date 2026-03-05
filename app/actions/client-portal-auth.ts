"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import {
  CLIENT_LOGIN_LOCK_MINUTES,
  CLIENT_LOGIN_MAX_ATTEMPTS,
  CLIENT_MODULE_KEYS,
  type ClientModuleAccessLevel,
  type ClientModuleKey,
} from "@/lib/client-portal/constants";
import {
  clearClientPortalCookie,
  createClientPortalSession,
  getClientPortalContext,
  revokeAllClientPortalSessions,
  revokeClientPortalSessionByToken,
  setClientPortalAuthState,
  setClientPortalCookie,
} from "@/lib/client-portal/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/types/database";

type ClientAuthInsert = Database["public"]["Tables"]["client_auth"]["Insert"];
type ClientAuthUpdate = Database["public"]["Tables"]["client_auth"]["Update"];
type ClientFeatureAccessInsert = Database["public"]["Tables"]["client_feature_access"]["Insert"];

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be at most 32 characters.")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username can only contain letters, numbers, period, underscore, and hyphen."
  );

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

const clientIdSchema = z.string().uuid();

const setCredentialsSchema = z.object({
  client_id: clientIdSchema,
  username: usernameSchema,
  password: passwordSchema,
});

const resetPasswordSchema = z.object({
  client_id: clientIdSchema,
  new_password: passwordSchema,
});

const changeUsernameSchema = z.object({
  client_id: clientIdSchema,
  username: usernameSchema,
});

const moduleAccessSchema = z.object({
  client_id: clientIdSchema,
  module_key: z.enum(CLIENT_MODULE_KEYS),
  access_level: z.enum(["disabled", "read_only", "enabled"]),
});

const moduleDefaultAccess: Record<ClientModuleKey, ClientModuleAccessLevel> = {
  workouts: "enabled",
  training_plan: "enabled",
  meal_plan: "read_only",
  meal_logging: "enabled",
  steps_tracking: "enabled",
  goals: "enabled",
  check_ins: "enabled",
  coach_notes: "read_only",
  tasks: "enabled",
};

export type CoachClientScope = {
  actorId: string;
  client: Pick<
    Database["public"]["Tables"]["clients"]["Row"],
    "id" | "display_name" | "first_name" | "last_name" | "primary_coach_id" | "status"
  >;
};

export async function requireCoachAccess(clientId: string): Promise<CoachClientScope> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [{ data: canAccess, error: accessError }, { data: client, error: clientError }] =
    await Promise.all([
      supabase.rpc("has_client_coach_access", { target_client_id: clientId }),
      supabase
        .from("clients")
        .select("id, display_name, first_name, last_name, primary_coach_id, status")
        .eq("id", clientId)
        .maybeSingle(),
    ]);
  if (accessError) throw new Error(accessError.message);
  if (!canAccess) throw new Error("Forbidden");
  if (clientError) throw new Error(clientError.message);
  if (!client) throw new Error("Client not found");

  return {
    actorId: user.id,
    client,
  };
}

function normalizedUsername(value: string) {
  return value.trim().toLowerCase();
}

async function seedDefaultFeatureAccess(clientId: string, actorId: string) {
  const admin = createAdminClient();
  const rows: ClientFeatureAccessInsert[] = CLIENT_MODULE_KEYS.map((moduleKey) => ({
    client_id: clientId,
    module_key: moduleKey,
    access_level: moduleDefaultAccess[moduleKey],
    configured_by_user_id: actorId,
  }));
  const { error } = await admin
    .from("client_feature_access")
    .upsert(rows, { onConflict: "client_id,module_key", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export type ClientPortalSettingsResult = {
  client_id: string;
  username: string | null;
  status: Database["public"]["Enums"]["client_portal_auth_status"] | null;
  is_portal_enabled: boolean;
  failed_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  password_updated_at: string | null;
  username_updated_at: string | null;
  module_access: Array<{
    module_key: ClientModuleKey;
    access_level: ClientModuleAccessLevel;
  }>;
};

export async function listClientPortalSettingsAction(clientId: string): Promise<ClientPortalSettingsResult> {
  const safeClientId = clientIdSchema.parse(clientId);
  return runTrackedAction({
    eventName: "client.portal.settings.read",
    payload: { client_id: safeClientId },
    action: async () => {
      const scope = await requireCoachAccess(safeClientId);
      const admin = createAdminClient();

      const [{ data: authRow, error: authError }, { data: featureRows, error: featureError }] =
        await Promise.all([
          admin
            .from("client_auth")
            .select(
              "client_id, username, status, is_portal_enabled, failed_attempts, locked_until, last_login_at, password_updated_at, username_updated_at"
            )
            .eq("client_id", safeClientId)
            .maybeSingle(),
          admin.from("client_feature_access").select("module_key, access_level").eq("client_id", safeClientId),
        ]);

      if (authError) throw new Error(authError.message);
      if (featureError) throw new Error(featureError.message);

      const featureByModule = new Map<ClientModuleKey, ClientModuleAccessLevel>();
      for (const row of (featureRows || []) as Array<{
        module_key: ClientModuleKey;
        access_level: ClientModuleAccessLevel;
      }>) {
        featureByModule.set(row.module_key, row.access_level);
      }

      const module_access = CLIENT_MODULE_KEYS.map((moduleKey) => ({
        module_key: moduleKey,
        access_level: featureByModule.get(moduleKey) || moduleDefaultAccess[moduleKey],
      }));

      return {
        client_id: scope.client.id,
        username: authRow?.username || null,
        status: authRow?.status || null,
        is_portal_enabled: authRow?.is_portal_enabled ?? false,
        failed_attempts: authRow?.failed_attempts ?? 0,
        locked_until: authRow?.locked_until ?? null,
        last_login_at: authRow?.last_login_at ?? null,
        password_updated_at: authRow?.password_updated_at ?? null,
        username_updated_at: authRow?.username_updated_at ?? null,
        module_access,
      };
    },
  });
}

export async function coachSetClientCredentialsAction(
  input: z.input<typeof setCredentialsSchema>
) {
  const payload = setCredentialsSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.credentials.set",
    payload: { client_id: payload.client_id },
    action: async () => {
      const scope = await requireCoachAccess(payload.client_id);
      const admin = createAdminClient();

      const passwordHash = await bcrypt.hash(payload.password, 12);
      const nowIso = new Date().toISOString();

      const insertRow: ClientAuthInsert = {
        client_id: payload.client_id,
        username: normalizedUsername(payload.username),
        password_hash: passwordHash,
        status: "active",
        is_portal_enabled: true,
        failed_attempts: 0,
        locked_until: null,
        last_failed_at: null,
        password_updated_at: nowIso,
        username_updated_at: nowIso,
        created_by_user_id: scope.actorId,
        updated_by_user_id: scope.actorId,
      };

      const { error } = await admin
        .from("client_auth")
        .upsert(insertRow, { onConflict: "client_id" });
      if (error) throw new Error(error.message);

      await seedDefaultFeatureAccess(payload.client_id, scope.actorId);

      revalidatePath(`/coach/clients/${payload.client_id}`);
      revalidatePath("/coach/clients");
      return { success: true };
    },
  });
}

export async function coachResetClientPasswordAction(
  input: z.input<typeof resetPasswordSchema>
) {
  const payload = resetPasswordSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.password.reset",
    payload: { client_id: payload.client_id },
    action: async () => {
      const scope = await requireCoachAccess(payload.client_id);
      const admin = createAdminClient();

      const passwordHash = await bcrypt.hash(payload.new_password, 12);
      const updateRow: ClientAuthUpdate = {
        password_hash: passwordHash,
        status: "active",
        is_portal_enabled: true,
        failed_attempts: 0,
        locked_until: null,
        last_failed_at: null,
        password_updated_at: new Date().toISOString(),
        updated_by_user_id: scope.actorId,
      };
      const { error } = await admin
        .from("client_auth")
        .update(updateRow)
        .eq("client_id", payload.client_id);
      if (error) throw new Error(error.message);

      await revokeAllClientPortalSessions(payload.client_id);

      revalidatePath(`/coach/clients/${payload.client_id}`);
      return { success: true };
    },
  });
}

export async function coachChangeClientUsernameAction(
  input: z.input<typeof changeUsernameSchema>
) {
  const payload = changeUsernameSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.username.change",
    payload: { client_id: payload.client_id },
    action: async () => {
      const scope = await requireCoachAccess(payload.client_id);
      const admin = createAdminClient();
      const { error } = await admin
        .from("client_auth")
        .update({
          username: normalizedUsername(payload.username),
          username_updated_at: new Date().toISOString(),
          updated_by_user_id: scope.actorId,
        })
        .eq("client_id", payload.client_id);
      if (error) throw new Error(error.message);

      await revokeAllClientPortalSessions(payload.client_id);

      revalidatePath(`/coach/clients/${payload.client_id}`);
      return { success: true };
    },
  });
}

export async function coachBlockClientAccessAction(clientId: string) {
  const safeClientId = clientIdSchema.parse(clientId);
  return runTrackedAction({
    eventName: "client.portal.access.block",
    payload: { client_id: safeClientId },
    action: async () => {
      const scope = await requireCoachAccess(safeClientId);
      await setClientPortalAuthState({
        clientId: safeClientId,
        status: "blocked",
        isPortalEnabled: false,
        updatedByUserId: scope.actorId,
      });
      await revokeAllClientPortalSessions(safeClientId);
      revalidatePath(`/coach/clients/${safeClientId}`);
      return { success: true };
    },
  });
}

export async function coachRemoveClientAccessAction(clientId: string) {
  const safeClientId = clientIdSchema.parse(clientId);
  return runTrackedAction({
    eventName: "client.portal.access.remove",
    payload: { client_id: safeClientId },
    action: async () => {
      const scope = await requireCoachAccess(safeClientId);
      await setClientPortalAuthState({
        clientId: safeClientId,
        status: "removed",
        isPortalEnabled: false,
        updatedByUserId: scope.actorId,
      });
      await revokeAllClientPortalSessions(safeClientId);
      revalidatePath(`/coach/clients/${safeClientId}`);
      return { success: true };
    },
  });
}

export async function coachUpdateClientModuleAccessAction(
  input: z.input<typeof moduleAccessSchema>
) {
  const payload = moduleAccessSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.module_access.update",
    payload,
    action: async () => {
      const scope = await requireCoachAccess(payload.client_id);
      const admin = createAdminClient();

      const { error } = await admin
        .from("client_feature_access")
        .upsert(
          {
            client_id: payload.client_id,
            module_key: payload.module_key,
            access_level: payload.access_level,
            configured_by_user_id: scope.actorId,
          },
          { onConflict: "client_id,module_key" }
        );
      if (error) throw new Error(error.message);

      revalidatePath(`/coach/clients/${payload.client_id}`);
      return { success: true };
    },
  });
}

export async function clientLoginAction(input: z.input<typeof loginSchema>) {
  const payload = loginSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.login",
    payload: { username: payload.username },
    action: async () => {
      const admin = createAdminClient();
      const username = normalizedUsername(payload.username);
      const now = new Date();
      const nowIso = now.toISOString();

      const { data: authRow, error: authError } = await admin
        .from("client_auth")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (authError) throw new Error(authError.message);
      if (!authRow) throw new Error("Invalid username or password.");

      if (!authRow.is_portal_enabled || authRow.status !== "active") {
        throw new Error("Client portal access is disabled.");
      }

      if (authRow.locked_until && authRow.locked_until > nowIso) {
        throw new Error("Too many failed attempts. Try again later.");
      }

      const passwordMatches = await bcrypt.compare(payload.password, authRow.password_hash);
      if (!passwordMatches) {
        const nextAttempts = (authRow.failed_attempts || 0) + 1;
        const shouldLock = nextAttempts >= CLIENT_LOGIN_MAX_ATTEMPTS;

        const updates: ClientAuthUpdate = {
          failed_attempts: shouldLock ? 0 : nextAttempts,
          last_failed_at: nowIso,
          locked_until: shouldLock
            ? new Date(now.getTime() + CLIENT_LOGIN_LOCK_MINUTES * 60 * 1000).toISOString()
            : null,
        };
        await admin.from("client_auth").update(updates).eq("client_id", authRow.client_id);

        if (shouldLock) {
          throw new Error("Too many failed attempts. Try again later.");
        }
        throw new Error("Invalid username or password.");
      }

      const requestHeaders = await headers();
      const ipAddress =
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        requestHeaders.get("x-real-ip");
      const userAgent = requestHeaders.get("user-agent");

      const { token, expiresAt } = await createClientPortalSession({
        clientId: authRow.client_id,
        ipAddress,
        userAgent,
      });

      await admin
        .from("client_auth")
        .update({
          failed_attempts: 0,
          locked_until: null,
          last_failed_at: null,
          last_login_at: nowIso,
        })
        .eq("client_id", authRow.client_id);

      await setClientPortalCookie({ token, expiresAt });

      const { data: clientData } = await admin
        .from("clients")
        .select("id, display_name, first_name, last_name")
        .eq("id", authRow.client_id)
        .maybeSingle();

      return {
        success: true,
        client_id: authRow.client_id,
        display_name:
          clientData?.display_name ||
          `${clientData?.first_name || ""} ${clientData?.last_name || ""}`.trim() ||
          "Client",
      };
    },
  });
}

export async function clientLogoutAction() {
  return runTrackedAction({
    eventName: "client.portal.logout",
    action: async () => {
      const context = await getClientPortalContext();
      if (context) {
        const cookieStore = await cookies();
        const token = cookieStore.get("client_portal_session")?.value;
        if (token) {
          await revokeClientPortalSessionByToken(token);
        }
      }
      await clearClientPortalCookie();
      return { success: true };
    },
  });
}
