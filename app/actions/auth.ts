"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export async function checkAuthUserExistsAction(email: string) {
  const normalizedEmail = emailSchema.parse(email);
  const admin = createAdminClient();

  let page = 1;
  const perPage = 200;
  const maxPages = 50;

  while (page <= maxPages) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error("Unable to verify account.");
    }

    const users = data?.users ?? [];
    if (users.some((user) => (user.email ?? "").toLowerCase() === normalizedEmail)) {
      return { exists: true as const };
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return { exists: false as const };
}
