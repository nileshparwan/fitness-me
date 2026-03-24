begin;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'goal_achieved',
      'checkin_submitted',
      'support_ticket_created',
      'support_ticket_updated',
      'support_ticket_comment_added',
      'support_ticket_comment_edited',
      'support_ticket_comment_deleted',
      'support_ticket_status_changed',
      'support_ticket_closed',
      'support_ticket_reopened',
      'meal_reminder',
      'health_checkin_reminder'
    )
  );

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  meal_bell_enabled boolean not null default false,
  meal_push_enabled boolean not null default false,
  meal_reminder_time time not null default '12:00:00',
  checkin_bell_enabled boolean not null default false,
  checkin_push_enabled boolean not null default false,
  checkin_reminder_time time not null default '08:00:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "notification_preferences_select_self" on public.notification_preferences;
create policy "notification_preferences_select_self"
  on public.notification_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_self" on public.notification_preferences;
create policy "notification_preferences_insert_self"
  on public.notification_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_self" on public.notification_preferences;
create policy "notification_preferences_update_self"
  on public.notification_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_delete_self" on public.notification_preferences;
create policy "notification_preferences_delete_self"
  on public.notification_preferences
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_select_self" on public.push_subscriptions;
create policy "push_subscriptions_select_self"
  on public.push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_self" on public.push_subscriptions;
create policy "push_subscriptions_insert_self"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_self" on public.push_subscriptions;
create policy "push_subscriptions_update_self"
  on public.push_subscriptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_self" on public.push_subscriptions;
create policy "push_subscriptions_delete_self"
  on public.push_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

do $$
begin
  if to_regprocedure('public.trigger_set_updated_at()') is not null then
    drop trigger if exists trg_notification_preferences_set_updated_at on public.notification_preferences;
    create trigger trg_notification_preferences_set_updated_at
    before update on public.notification_preferences
    for each row
    execute function public.trigger_set_updated_at();
  end if;
end;
$$;

commit;
