type SupabaseLike = {
  from: (table: string) => any;
};

export async function getLinkedClientIdsForUser(input: {
  supabase: SupabaseLike;
  userId: string;
}) {
  const { data, error } = await input.supabase
    .from("clients")
    .select("id")
    .eq("linked_user_id", input.userId);

  if (error) throw new Error(error.message);
  return ((data || []) as Array<{ id: string }>).map((row) => row.id);
}

export async function fetchExecutionRowsForUserScope<T extends { id: string }>(input: {
  supabaseAny: SupabaseLike;
  userId: string;
  linkedClientIds?: string[];
  startDate: string;
  endDate: string;
  select: string;
  orderByPerformedOnAsc?: boolean;
}) {
  const orderByPerformedOnAsc = input.orderByPerformedOnAsc ?? true;
  let userQuery = input.supabaseAny
    .from("workout_logs")
    .select(input.select)
    .eq("subject_user_id", input.userId)
    .gte("performed_on", input.startDate)
    .lte("performed_on", input.endDate);
  if (orderByPerformedOnAsc) {
    userQuery = userQuery.order("performed_on", { ascending: true });
  }

  let clientPromise: Promise<{ data: T[]; error: { message: string } | null }>;
  if ((input.linkedClientIds || []).length > 0) {
    let clientQuery = input.supabaseAny
      .from("workout_logs")
      .select(input.select)
      .in("subject_client_id", input.linkedClientIds)
      .gte("performed_on", input.startDate)
      .lte("performed_on", input.endDate);
    if (orderByPerformedOnAsc) {
      clientQuery = clientQuery.order("performed_on", { ascending: true });
    }
    clientPromise = clientQuery;
  } else {
    clientPromise = Promise.resolve({ data: [], error: null });
  }

  const [userRes, clientRes] = await Promise.all([userQuery, clientPromise]);

  if (userRes.error) throw new Error(userRes.error.message);
  if (clientRes.error) throw new Error(clientRes.error.message);

  const merged = [
    ...((userRes.data || []) as T[]),
    ...((clientRes.data || []) as T[]),
  ];

  return Array.from(new Map(merged.map((row) => [row.id, row] as const)).values());
}
