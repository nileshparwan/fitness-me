begin;

-- Add tickets table to Supabase Realtime publication.
-- Without this, postgres_changes events for tickets never fire.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tickets'
  ) then
    alter publication supabase_realtime add table public.tickets;
  end if;
end;
$$;

-- Add ticket_comments table to Supabase Realtime publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ticket_comments'
  ) then
    alter publication supabase_realtime add table public.ticket_comments;
  end if;
end;
$$;

-- Include all columns in DELETE payloads for ticket_comments realtime events.
-- This allows clients to resolve ticket_id from payload.old on delete invalidation.
alter table public.ticket_comments replica identity full;

commit;
