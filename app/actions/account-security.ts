"use server";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicAuthClient } from "@/lib/supabase/public-auth";
import { trackEvent } from "@/lib/events/dispatcher";
import { Database } from "@/types/database";
import { AppEventName } from "@/types/events";

type DeletionInsert = Database["public"]["Tables"]["account_deletion_requests"]["Insert"];

const RECOVERY_WINDOW_DAYS = 30;
const CHALLENGE_TTL_SECONDS = 5 * 60;

const toDateIso = (date: Date) => date.toISOString();

const getProviders = (appMetadata: Record<string, unknown> | null | undefined): string[] =>
  (() => {
    const providersValue = appMetadata?.providers;
    return Array.isArray(providersValue)
      ? providersValue
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.toLowerCase())
      : [];
  })();

const hasEmailPasswordProvider = (appMetadata: Record<string, unknown> | null | undefined) => {
  const providers = getProviders(appMetadata);
  return providers.length === 0 || providers.includes("email");
};

const hasConfiguredPassword = (userMetadata: Record<string, unknown> | null | undefined) =>
  Boolean(userMetadata?.has_password);

const hasPasswordAuthEnabled = (
  appMetadata: Record<string, unknown> | null | undefined,
  userMetadata: Record<string, unknown> | null | undefined
) => hasEmailPasswordProvider(appMetadata) || hasConfiguredPassword(userMetadata);

type DeletionChallengePayload = {
  uid: string;
  answer: string;
  exp: number;
  nonce: string;
};

const challengeSecret = () => {
  const secret = process.env.ACCOUNT_CHALLENGE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Challenge secret is not configured");
  }
  return secret;
};

const base64UrlEncode = (value: string) => Buffer.from(value, "utf-8").toString("base64url");
const base64UrlDecode = (value: string) => Buffer.from(value, "base64url").toString("utf-8");

const signChallengePayload = (payloadB64: string) =>
  createHmac("sha256", challengeSecret()).update(payloadB64).digest("base64url");

const toChallengeToken = (payload: DeletionChallengePayload) => {
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signChallengePayload(payloadB64);
  return `${payloadB64}.${signature}`;
};

const verifyChallengeToken = (token: string): DeletionChallengePayload => {
  const [payloadB64, providedSignature] = token.split(".");
  if (!payloadB64 || !providedSignature) {
    throw new Error("Invalid challenge token");
  }

  const expectedSignature = signChallengePayload(payloadB64);
  const providedBuffer = Buffer.from(providedSignature, "utf-8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid challenge signature");
  }

  const payload = JSON.parse(base64UrlDecode(payloadB64)) as DeletionChallengePayload;
  if (!payload.uid || !payload.answer || !payload.exp) {
    throw new Error("Invalid challenge payload");
  }

  return payload;
};

async function listAllUsers(maxUsers = 5000) {
  const admin = createAdminClient();
  const allUsers: Array<{
    id: string;
    email: string | undefined;
    user_metadata: Record<string, unknown> | null;
    app_metadata: Record<string, unknown> | null;
  }> = [];

  const perPage = 500;
  let page = 1;
  while (allUsers.length < maxUsers) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data.users || [];
    if (batch.length === 0) break;

    allUsers.push(
      ...batch.map((user) => ({
        id: user.id,
        email: user.email,
        user_metadata: (user.user_metadata as Record<string, unknown> | null) || null,
        app_metadata: (user.app_metadata as Record<string, unknown> | null) || null,
      }))
    );
    if (batch.length < perPage) break;
    page += 1;
  }

  return allUsers.slice(0, maxUsers);
}

async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const users = await listAllUsers(5000);
  return users.find((entry) => (entry.email || "").trim().toLowerCase() === normalizedEmail) || null;
}

export async function createDeleteAccountChallenge() {
  const supabase = await createClient();
  let actorUserId: string | null = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }
    actorUserId = user.id;

    const left = Math.floor(Math.random() * 9) + 1;
    const right = Math.floor(Math.random() * 9) + 1;
    const answer = String(left + right);
    const exp = Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS;

    const payload: DeletionChallengePayload = {
      uid: user.id,
      answer,
      exp,
      nonce: randomBytes(16).toString("hex"),
    };

    trackEvent(
      "account.deletion.challenge.create",
      {
        user_id: user.id,
        page_path: "/settings/account",
      },
      "success"
    );

    return {
      prompt: `Type the result of ${left} + ${right}`,
      token: toChallengeToken(payload),
      expires_at: new Date(exp * 1000).toISOString(),
    };
  } catch (error) {
    trackEvent(
      "account.deletion.challenge.create",
      {
        user_id: actorUserId,
        page_path: "/settings/account",
        error_message: error instanceof Error ? error.message : "unknown_error",
      },
      "error"
    );
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  const client = createPublicAuthClient();
  const normalizedEmail = email.trim().toLowerCase();

  try {
    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    const matchingUser = await findUserByEmail(normalizedEmail);
    if (matchingUser && !hasPasswordAuthEnabled(matchingUser.app_metadata, matchingUser.user_metadata)) {
      throw new Error(
        "This account does not have password login enabled. Continue with your social provider, then set a password in Account Settings."
      );
    }

    const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`,
    });

    if (error) {
      console.error(error)
      throw new Error("Unable to send reset email right now");
    }

    trackEvent(
      AppEventName.PASSWORD_RESET_REQUESTED,
      {
        page_path: "/forgot-password",
        email: normalizedEmail,
      },
      "success"
    );

    return { success: true };
  } catch (error) {
    trackEvent(
      AppEventName.PASSWORD_RESET_REQUESTED,
      {
        page_path: "/forgot-password",
        email: normalizedEmail || null,
        error_message: error instanceof Error ? error.message : "unknown_error",
      },
      "error"
    );
    throw error;
  }
}

export async function requestSoftDeleteAccount(challengeToken: string, challengeResponse: string, reason?: string) {
  const supabase = await createClient();
  let actorUserId: string | null = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      throw new Error("Unauthorized");
    }
    actorUserId = user.id;

    const normalizedChallengeResponse = challengeResponse.trim();
    if (!challengeToken || !normalizedChallengeResponse) {
      throw new Error("Challenge verification is required");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "sysadmin") {
      throw new Error("Admin accounts cannot self-deactivate.");
    }

    const challenge = verifyChallengeToken(challengeToken);

    if (challenge.uid !== user.id) {
      throw new Error("Challenge is not valid for this account");
    }
    if (challenge.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Challenge expired. Please try again.");
    }
    if (normalizedChallengeResponse !== challenge.answer) {
      throw new Error("Challenge verification failed");
    }

    const admin = createAdminClient();
    const now = new Date();
    const recoverableUntil = new Date(now.getTime() + RECOVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const metadata = {
      ...(user.user_metadata || {}),
      is_deleted: true,
      deleted_at: toDateIso(now),
      recoverable_until: toDateIso(recoverableUntil),
      deletion_reason: reason || null,
    };

    const updateResult = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    });
    if (updateResult.error) throw updateResult.error;

    const payload: DeletionInsert = {
      user_id: user.id,
      reason: reason || null,
      requested_at: toDateIso(now),
      deleted_at: toDateIso(now),
      recoverable_until: toDateIso(recoverableUntil),
      metadata: { email: user.email },
      updated_at: toDateIso(now),
    };

    const { error: deletionError } = await admin
      .from("account_deletion_requests")
      .upsert(payload, { onConflict: "user_id" });
    if (deletionError) throw deletionError;

    trackEvent(
      AppEventName.ACCOUNT_DELETION_REQUESTED,
      {
        user_id: user.id,
        page_path: "/settings/account",
        recoverable_until: toDateIso(recoverableUntil),
        reason: reason || null,
      },
      "success"
    );

    await supabase.auth.signOut();

    return { success: true, recoverableUntil: toDateIso(recoverableUntil) };
  } catch (error) {
    trackEvent(
      AppEventName.ACCOUNT_DELETION_REQUESTED,
      {
        user_id: actorUserId,
        page_path: "/settings/account",
        reason: reason || null,
        error_message: error instanceof Error ? error.message : "unknown_error",
      },
      "error"
    );
    throw error;
  }
}

export async function restoreSoftDeletedAccount(email: string, password: string) {
  const client = createPublicAuthClient();
  const normalizedEmail = email.trim().toLowerCase();
  let actorUserId: string | null = null;

  try {
    const signInResult = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInResult.error || !signInResult.data.user) {
      throw new Error("Invalid credentials");
    }

    const user = signInResult.data.user;
    actorUserId = user.id;
    const recoverableUntilRaw = user.user_metadata?.recoverable_until;
    const recoverableUntil = recoverableUntilRaw ? new Date(String(recoverableUntilRaw)) : null;

    if (!recoverableUntil || Number.isNaN(recoverableUntil.getTime()) || recoverableUntil.getTime() < Date.now()) {
      throw new Error("Recovery window expired");
    }

    const admin = createAdminClient();
    const nowIso = toDateIso(new Date());
    const updatedMetadata = {
      ...(user.user_metadata || {}),
      is_deleted: false,
      restored_at: nowIso,
      deletion_reason: null,
    };

    const restoreResult = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: updatedMetadata,
    });
    if (restoreResult.error) throw restoreResult.error;

    await admin
      .from("account_deletion_requests")
      .update({
        restored_at: nowIso,
        updated_at: nowIso,
      })
      .eq("user_id", user.id);

    trackEvent(
      AppEventName.ACCOUNT_DELETION_RESTORED,
      {
        user_id: user.id,
        page_path: "/restore-account",
        restored_at: nowIso,
      },
      "success"
    );

    return { success: true };
  } catch (error) {
    trackEvent(
      AppEventName.ACCOUNT_DELETION_RESTORED,
      {
        user_id: actorUserId,
        page_path: "/restore-account",
        email: normalizedEmail || null,
        error_message: error instanceof Error ? error.message : "unknown_error",
      },
      "error"
    );
    throw error;
  }
}

export async function restoreCurrentSoftDeletedAccount() {
  const supabase = await createClient();
  let actorUserId: string | null = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }
    actorUserId = user.id;

    const recoverableUntilRaw = user.user_metadata?.recoverable_until;
    const recoverableUntil = recoverableUntilRaw ? new Date(String(recoverableUntilRaw)) : null;

    if (!recoverableUntil || Number.isNaN(recoverableUntil.getTime()) || recoverableUntil.getTime() < Date.now()) {
      throw new Error("Recovery window expired");
    }

    const admin = createAdminClient();
    const nowIso = toDateIso(new Date());
    const updatedMetadata = {
      ...(user.user_metadata || {}),
      is_deleted: false,
      restored_at: nowIso,
      deletion_reason: null,
    };

    const restoreResult = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: updatedMetadata,
    });
    if (restoreResult.error) throw restoreResult.error;

    await admin
      .from("account_deletion_requests")
      .update({
        restored_at: nowIso,
        updated_at: nowIso,
      })
      .eq("user_id", user.id);

    trackEvent(
      AppEventName.ACCOUNT_DELETION_RESTORED,
      {
        user_id: user.id,
        page_path: "/restore-account",
        restored_at: nowIso,
        method: "authenticated-session",
      },
      "success"
    );

    return { success: true };
  } catch (error) {
    trackEvent(
      AppEventName.ACCOUNT_DELETION_RESTORED,
      {
        user_id: actorUserId,
        page_path: "/restore-account",
        method: "authenticated-session",
        error_message: error instanceof Error ? error.message : "unknown_error",
      },
      "error"
    );
    throw error;
  }
}
