"use server";

import { revalidatePath } from "next/cache";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import {
  coachingDefaultsSchema,
  displayPreferencesSchema,
  profileSchema,
  type CoachingDefaultsPayload,
  type DisplayPreferencesPayload,
  type ProfileFormValues,
} from "@/lib/validations/settings";
import type { Database } from "@/types/database";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

export type SettingsProfilePayload = {
  full_name: string | null;
  email: string | null;
  role: Database["public"]["Enums"]["user_role"];
  phone: string | null;
  date_of_birth: string | null;
  bio: string | null;
  avatar_url: string | null;
  preferred_units: "metric" | "imperial";
  default_calories: number | null;
  default_protein: number | null;
  default_carbs: number | null;
  default_fat: number | null;
  compact_mode: boolean;
  has_email_identity: boolean;
};

function normalizeUnit(value: unknown): "metric" | "imperial" {
  return value === "imperial" ? "imperial" : "metric";
}

function toNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value !== 0;
  return false;
}

async function requireSettingsActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

function hasEmailIdentity(user: { identities?: Array<{ provider?: string | null }> | null }) {
  return Boolean(
    user.identities?.some((identity) => {
      const provider = (identity?.provider || "").toLowerCase();
      return provider === "email";
    })
  );
}

export async function getSettingsProfile(): Promise<SettingsProfilePayload> {
  return runTrackedAction({
    eventName: "settings.profile.read",
    action: async () => {
      const { supabase, user } = await requireSettingsActor();

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, date_of_birth, bio, avatar_url, preferred_units, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const metadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};

      const fullName =
        toNullableText(profileData?.full_name) ||
        toNullableText((metadata as Record<string, unknown>).full_name) ||
        toNullableText((metadata as Record<string, unknown>).display_name);
      const bio = toNullableText(profileData?.bio) || toNullableText((metadata as Record<string, unknown>).bio);
      const avatarUrl =
        toNullableText(profileData?.avatar_url) || toNullableText((metadata as Record<string, unknown>).avatar_url);
      const phone = toNullableText((metadata as Record<string, unknown>).phone);

      const preferredUnits = normalizeUnit(
        profileData?.preferred_units ?? (metadata as Record<string, unknown>).preferred_units
      );

      return {
        full_name: fullName,
        email: user.email ?? null,
        role: profileData?.role === "sysadmin" ? "sysadmin" : "user",
        phone,
        date_of_birth: profileData?.date_of_birth ?? null,
        bio,
        avatar_url: avatarUrl,
        preferred_units: preferredUnits,
        default_calories: toNullableInt((metadata as Record<string, unknown>).default_calories),
        default_protein: toNullableInt((metadata as Record<string, unknown>).default_protein),
        default_carbs: toNullableInt((metadata as Record<string, unknown>).default_carbs),
        default_fat: toNullableInt((metadata as Record<string, unknown>).default_fat),
        compact_mode: toBoolean((metadata as Record<string, unknown>).compact_mode),
        has_email_identity: hasEmailIdentity(user),
      };
    },
  });
}

export async function updateProfile(data: ProfileFormValues) {
  return runTrackedAction({
    eventName: "settings.profile.update",
    action: async () => {
      const { supabase, user } = await requireSettingsActor();
      const parsed = profileSchema.parse(data);

      const profilePayload: ProfileInsert = {
        id: user.id,
        full_name: parsed.full_name.trim(),
        date_of_birth: parsed.date_of_birth ?? null,
        bio: toNullableText(parsed.bio),
        avatar_url: toNullableText(parsed.avatar_url),
      };

      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
      if (profileError) throw profileError;

      const nextMetadata = {
        ...(user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {}),
        full_name: profilePayload.full_name,
        bio: profilePayload.bio,
        avatar_url: profilePayload.avatar_url,
        phone: toNullableText(parsed.phone),
        updatedAt: new Date().toISOString(),
      };

      const { error: metadataError } = await supabase.auth.updateUser({ data: nextMetadata });
      if (metadataError) throw metadataError;

      revalidatePath("/settings/profile");
      revalidatePath("/settings");

      return { success: true };
    },
  });
}

export async function updateCoachingDefaults(payload: CoachingDefaultsPayload) {
  return runTrackedAction({
    eventName: "settings.coaching.update",
    action: async () => {
      const { supabase, user } = await requireSettingsActor();
      const parsed = coachingDefaultsSchema.parse(payload);

      const profilePayload: ProfileInsert = {
        id: user.id,
        preferred_units: parsed.preferred_units,
      };

      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
      if (profileError) throw profileError;

      const nextMetadata = {
        ...(user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {}),
        default_calories: parsed.default_calories ?? null,
        default_protein: parsed.default_protein ?? null,
        default_carbs: parsed.default_carbs ?? null,
        default_fat: parsed.default_fat ?? null,
        updatedAt: new Date().toISOString(),
      };
      const { error: metadataError } = await supabase.auth.updateUser({ data: nextMetadata });
      if (metadataError) throw metadataError;

      revalidatePath("/settings/coaching");
      revalidatePath("/settings");

      return {
        success: true,
        preferred_units: parsed.preferred_units,
        default_calories: parsed.default_calories ?? null,
        default_protein: parsed.default_protein ?? null,
        default_carbs: parsed.default_carbs ?? null,
        default_fat: parsed.default_fat ?? null,
      };
    },
  });
}

export async function updateDisplayPreferences(payload: DisplayPreferencesPayload) {
  return runTrackedAction({
    eventName: "settings.display.update",
    action: async () => {
      const { supabase, user } = await requireSettingsActor();
      const parsed = displayPreferencesSchema.parse(payload);

      const nextMetadata = {
        ...(user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {}),
        compact_mode: parsed.compact_mode,
        updatedAt: new Date().toISOString(),
      };
      const { error: metadataError } = await supabase.auth.updateUser({ data: nextMetadata });
      if (metadataError) throw metadataError;

      revalidatePath("/settings/display");
      revalidatePath("/settings");

      return {
        success: true,
        compact_mode: parsed.compact_mode,
      };
    },
  });
}
