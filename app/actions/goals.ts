"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import { decodeCursor, encodeCursor } from "@/lib/utils/pagination";
import { escapeLikePattern } from "@/lib/utils/search";

const listGoalLinksSchema = z.object({
  search: z.string().trim().max(80).optional(),
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(20).default(15),
});

export type GoalExerciseSearchItem = {
  id: string;
  name: string;
  category: string | null;
};

export type GoalProgramSearchItem = {
  id: string;
  name: string;
};

type GoalLinksPayload<T> = {
  items: T[];
  nextCursor: string | null;
};

async function requireGoalSearchActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function encodeFilterValue(value: string) {
  return encodeURIComponent(value);
}

export async function listExercisesForGoalAction(
  input: z.input<typeof listGoalLinksSchema>
): Promise<GoalLinksPayload<GoalExerciseSearchItem>> {
  const payload = listGoalLinksSchema.parse(input);

  return runTrackedAction({
    eventName: "goal.exercise_search.read",
    payload,
    action: async () => {
      const { supabase } = await requireGoalSearchActor();

      let query = supabase
        .from("exercises")
        .select("id, name, category")
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .limit(payload.limit + 1);

      const normalizedSearch = payload.search?.trim();
      if (normalizedSearch) {
        query = query.ilike("name", `%${escapeLikePattern(normalizedSearch)}%`);
      }

      if (payload.cursor) {
        const { sortValue, id } = decodeCursor(payload.cursor);
        if (sortValue && id) {
          const encodedName = encodeFilterValue(sortValue);
          const encodedId = encodeFilterValue(id);
          query = query.or(`name.gt.${encodedName},and(name.eq.${encodedName},id.gt.${encodedId})`);
        }
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data || []) as GoalExerciseSearchItem[];
      const hasNextPage = rows.length > payload.limit;
      const items = hasNextPage ? rows.slice(0, payload.limit) : rows;
      const lastItem = items[items.length - 1];

      return {
        items,
        nextCursor: hasNextPage && lastItem ? encodeCursor(lastItem.name, lastItem.id) : null,
      };
    },
  });
}

export async function listProgramsForGoalAction(
  input: z.input<typeof listGoalLinksSchema>
): Promise<GoalLinksPayload<GoalProgramSearchItem>> {
  const payload = listGoalLinksSchema.parse(input);

  return runTrackedAction({
    eventName: "goal.program_search.read",
    payload,
    action: async () => {
      const { supabase, user } = await requireGoalSearchActor();

      let query = supabase
        .from("programs")
        .select("id, name, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .limit(payload.limit + 1);

      const normalizedSearch = payload.search?.trim();
      if (normalizedSearch) {
        query = query.ilike("name", `%${escapeLikePattern(normalizedSearch)}%`);
      }

      if (payload.cursor) {
        const { sortValue, id } = decodeCursor(payload.cursor);
        if (sortValue && id) {
          const encodedTimestamp = encodeFilterValue(sortValue);
          const encodedId = encodeFilterValue(id);
          query = query.or(
            `updated_at.lt.${encodedTimestamp},and(updated_at.eq.${encodedTimestamp},id.gt.${encodedId})`
          );
        }
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data || []) as Array<GoalProgramSearchItem & { updated_at: string | null }>;
      const hasNextPage = rows.length > payload.limit;
      const slice = hasNextPage ? rows.slice(0, payload.limit) : rows;
      const items = slice.map(({ id, name }) => ({ id, name }));
      const lastItem = slice[slice.length - 1];

      return {
        items,
        nextCursor:
          hasNextPage && lastItem
            ? encodeCursor(lastItem.updated_at || "1970-01-01T00:00:00+00:00", lastItem.id)
            : null,
      };
    },
  });
}
