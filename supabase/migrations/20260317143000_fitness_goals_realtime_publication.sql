begin;

-- Enable fitness_goals realtime broadcasts for postgres_changes subscriptions.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'fitness_goals'
  ) then
    alter publication supabase_realtime add table public.fitness_goals;
  end if;
end;
$$;

-- Include full row data in DELETE payloads so user_id-filtered realtime subscriptions
-- can still route deletion events correctly.
alter table public.fitness_goals replica identity full;

commit;
