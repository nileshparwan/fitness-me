import "server-only";

import { redirect } from "next/navigation";

import { getRoleContext } from "@/lib/auth/roles";
import { getRoleHomePath } from "@/lib/auth/route-access";
import type { Database } from "@/types/database";

type AppRole = Database["public"]["Enums"]["user_role"];

export async function guardServerRole(required: AppRole[]) {
  const context = await getRoleContext();

  if (!context) {
    redirect("/login");
  }

  const homePath = getRoleHomePath(context);

  if (!required.includes(context.role)) {
    redirect(homePath);
  }

  return context;
}
