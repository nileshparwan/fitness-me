import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  CLIENT_ACCESS_LEVELS,
  CLIENT_MODULE_KEYS,
  CLIENT_PORTAL_COOKIE_NAME,
  CLIENT_SESSION_TTL_HOURS,
  type ClientModuleAccessLevel,
  type ClientModuleKey,
} from "@/lib/client-portal/constants";
import type { Database } from "@/types/database";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientAuthRow = Database["public"]["Tables"]["client_auth"]["Row"];
type ClientSessionRow = Database["public"]["Tables"]["client_sessions"]["Row"];
type ClientFeatureAccessRow = Database["public"]["Tables"]["client_feature_access"]["Row"];
type ClientPortalAuthStatus = Database["public"]["Enums"]["client_portal_auth_status"];

export type ClientPortalFeatureMap = Record<ClientModuleKey, ClientModuleAccessLevel>;

export type ClientPortalContext = {
  client: ClientRow;
  auth: ClientAuthRow;
  session: ClientSessionRow;
  features: ClientPortalFeatureMap;
};

export function hashClientSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createClientSessionToken() {
  return randomBytes(32).toString("base64url");
}

function defaultFeatureMap(): ClientPortalFeatureMap {
  return CLIENT_MODULE_KEYS.reduce((acc, moduleKey) => {
    acc[moduleKey] = "disabled";
    return acc;
  }, {} as ClientPortalFeatureMap);
}

export function normalizeAccessLevel(
  value: string | null | undefined
): ClientModuleAccessLevel {
  if (value && CLIENT_ACCESS_LEVELS.includes(value as ClientModuleAccessLevel)) {
    return value as ClientModuleAccessLevel;
  }
  return "disabled";
}

export function buildFeatureMap(rows: ClientFeatureAccessRow[]): ClientPortalFeatureMap {
  const mapped = defaultFeatureMap();
  for (const row of rows) {
    mapped[row.module_key as ClientModuleKey] = normalizeAccessLevel(row.access_level);
  }
  return mapped;
}

export function getModuleAccessLevel(
  features: ClientPortalFeatureMap,
  moduleKey: ClientModuleKey
) {
  return features[moduleKey] ?? "disabled";
}

export function canReadModule(level: ClientModuleAccessLevel) {
  return level !== "disabled";
}

export function canWriteModule(level: ClientModuleAccessLevel) {
  return level === "enabled";
}

export async function setClientPortalCookie(params: {
  token: string;
  expiresAt: string;
}) {
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_PORTAL_COOKIE_NAME, params.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/client",
    expires: new Date(params.expiresAt),
  });
}

export async function clearClientPortalCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_PORTAL_COOKIE_NAME);
}

export async function createClientPortalSession(params: {
  clientId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const admin = createAdminClient();
  const token = createClientSessionToken();
  const tokenHash = hashClientSessionToken(token);
  const expiresAt = new Date(Date.now() + CLIENT_SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("client_sessions").insert({
    client_id: params.clientId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_ip: params.ipAddress || null,
    user_agent: params.userAgent || null,
  });
  if (error) throw new Error(error.message);

  return { token, expiresAt };
}

export async function revokeClientPortalSessionByToken(token: string) {
  const admin = createAdminClient();
  const tokenHash = hashClientSessionToken(token);

  const { error } = await admin
    .from("client_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
}

export async function revokeAllClientPortalSessions(clientId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("client_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
}

export async function setClientPortalAuthState(params: {
  clientId: string;
  status: ClientPortalAuthStatus;
  isPortalEnabled?: boolean;
  updatedByUserId?: string | null;
}) {
  const admin = createAdminClient();
  const payload: Database["public"]["Tables"]["client_auth"]["Update"] = {
    status: params.status,
    updated_by_user_id: params.updatedByUserId ?? null,
  };
  if (typeof params.isPortalEnabled === "boolean") {
    payload.is_portal_enabled = params.isPortalEnabled;
  }
  const { error } = await admin
    .from("client_auth")
    .update(payload)
    .eq("client_id", params.clientId);
  if (error) throw new Error(error.message);
}

export const getClientPortalContext = cache(async (): Promise<ClientPortalContext | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  if (!token) return null;

  const admin = createAdminClient();
  const tokenHash = hashClientSessionToken(token);
  const nowIso = new Date().toISOString();

  const { data: session, error: sessionError } = await admin
    .from("client_sessions")
    .select("*")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!session) return null;

  const { data: auth, error: authError } = await admin
    .from("client_auth")
    .select("*")
    .eq("client_id", session.client_id)
    .maybeSingle();
  if (authError) throw new Error(authError.message);
  if (!auth || auth.status !== "active" || !auth.is_portal_enabled) return null;
  if (auth.locked_until && auth.locked_until > nowIso) return null;

  const [{ data: client, error: clientError }, { data: featureRows, error: featureError }] =
    await Promise.all([
      admin.from("clients").select("*").eq("id", session.client_id).maybeSingle(),
      admin.from("client_feature_access").select("*").eq("client_id", session.client_id),
    ]);

  if (clientError) throw new Error(clientError.message);
  if (featureError) throw new Error(featureError.message);
  if (!client) return null;

  await admin
    .from("client_sessions")
    .update({ last_seen_at: nowIso })
    .eq("id", session.id)
    .is("revoked_at", null);

  return {
    client,
    auth,
    session: session as ClientSessionRow,
    features: buildFeatureMap((featureRows || []) as ClientFeatureAccessRow[]),
  };
});

