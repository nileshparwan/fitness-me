begin;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('fitness_goals', 'goals'),
        ('goal_progress_history', 'goal_history'),
        ('goal_exercise_program_links', 'goal_program_links'),
        ('supplement_catalog', 'supplements'),
        ('supplement_assignments', 'supplement_prescriptions'),
        ('supplement_subject_profiles', 'supplement_profiles'),
        ('coach_notes', 'client_notes'),
        ('client_checkins', 'client_reviews'),
        ('coach_client_assignments', 'coaching_assignments'),
        ('client_billing_plans', 'billing_plans'),
        ('client_payments', 'payments'),
        ('client_tasks', 'tasks'),
        ('client_steps_logs', 'client_activity'),
        ('client_feature_access', 'feature_access'),
        ('client_auth', 'client_credentials'),
        ('client_sessions', 'client_auth_sessions'),
        ('tickets', 'support_tickets'),
        ('ticket_comments', 'support_replies'),
        ('ticket_upvotes', 'support_votes'),
        ('ticket_subscriptions', 'support_subscriptions'),
        ('push_subscriptions', 'device_tokens'),
        ('notification_preferences', 'notification_settings'),
        ('account_deletion_requests', 'deletion_requests'),
        ('payment_logs', 'payment_events')
    ) as pairs(old_name, new_name)
  loop
    if to_regclass(format('public.%s', item.old_name)) is not null
       and to_regclass(format('public.%s', item.new_name)) is null then
      execute format('alter table public.%I rename to %I', item.old_name, item.new_name);
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('goals', 'user_id', 'created_by_user_id'),
        ('supplements', 'owner_user_id', 'created_by_user_id')
    ) as pairs(table_name, old_name, new_name)
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = item.table_name
        and column_name = item.old_name
    ) and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = item.table_name
        and column_name = item.new_name
    ) then
      execute format(
        'alter table public.%I rename column %I to %I',
        item.table_name,
        item.old_name,
        item.new_name
      );
    end if;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        ('goal_history', 'goal_progress_history_insert_access', 'goal_history_insert_access'),
        ('goal_history', 'goal_progress_history_select_access', 'goal_history_select_access'),
        ('supplements', 'supplement_catalog_insert_owner', 'supplements_insert_owner'),
        ('supplements', 'supplement_catalog_select_global_or_owner', 'supplements_select_global_or_owner'),
        ('supplements', 'supplement_catalog_update_visible', 'supplements_update_visible'),
        ('supplements', 'supplement_catalog_delete_owner', 'supplements_delete_owner'),
        ('supplement_prescriptions', 'supplement_assignments_insert_subject_access', 'supplement_prescriptions_insert_subject_access'),
        ('supplement_prescriptions', 'supplement_assignments_select_subject_access', 'supplement_prescriptions_select_subject_access'),
        ('supplement_prescriptions', 'supplement_assignments_update_subject_access', 'supplement_prescriptions_update_subject_access'),
        ('supplement_prescriptions', 'supplement_assignments_delete_subject_access', 'supplement_prescriptions_delete_subject_access'),
        ('supplement_profiles', 'supplement_subject_profiles_insert_subject_access', 'supplement_profiles_insert_subject_access'),
        ('supplement_profiles', 'supplement_subject_profiles_select_subject_access', 'supplement_profiles_select_subject_access'),
        ('supplement_profiles', 'supplement_subject_profiles_update_subject_access', 'supplement_profiles_update_subject_access'),
        ('supplement_profiles', 'supplement_subject_profiles_delete_subject_access', 'supplement_profiles_delete_subject_access'),
        ('client_notes', 'coach_notes_insert_access', 'client_notes_insert_access'),
        ('client_notes', 'coach_notes_select_access', 'client_notes_select_access'),
        ('client_notes', 'coach_notes_update_access', 'client_notes_update_access'),
        ('client_reviews', 'client_checkins_insert_access', 'client_reviews_insert_access'),
        ('client_reviews', 'client_checkins_select_access', 'client_reviews_select_access'),
        ('client_reviews', 'client_checkins_update_access', 'client_reviews_update_access'),
        ('coaching_assignments', 'coach_client_assignments_insert_primary_or_admin', 'coaching_assignments_insert_primary_or_admin'),
        ('coaching_assignments', 'coach_client_assignments_select_access', 'coaching_assignments_select_access'),
        ('coaching_assignments', 'coach_client_assignments_update_primary_or_admin', 'coaching_assignments_update_primary_or_admin'),
        ('coaching_assignments', 'coach_client_assignments_delete_primary_or_admin', 'coaching_assignments_delete_primary_or_admin'),
        ('billing_plans', 'client_billing_plans_insert_access', 'billing_plans_insert_access'),
        ('billing_plans', 'client_billing_plans_select_access', 'billing_plans_select_access'),
        ('billing_plans', 'client_billing_plans_update_access', 'billing_plans_update_access'),
        ('billing_plans', 'client_billing_plans_delete_access', 'billing_plans_delete_access'),
        ('payments', 'client_payments_insert_access', 'payments_insert_access'),
        ('payments', 'client_payments_select_access', 'payments_select_access'),
        ('payments', 'client_payments_update_access', 'payments_update_access'),
        ('payments', 'client_payments_delete_access', 'payments_delete_access'),
        ('feature_access', 'client_feature_access_select_access', 'feature_access_select_access'),
        ('feature_access', 'client_feature_access_write_coach', 'feature_access_write_coach'),
        ('client_credentials', 'client_auth_select_sysadmin', 'client_credentials_select_sysadmin'),
        ('client_credentials', 'client_auth_write_sysadmin', 'client_credentials_write_sysadmin'),
        ('client_auth_sessions', 'client_sessions_select_sysadmin', 'client_auth_sessions_select_sysadmin'),
        ('support_tickets', 'tickets_select_public_or_owner', 'support_tickets_select_public_or_owner'),
        ('support_tickets', 'tickets_insert_own', 'support_tickets_insert_own'),
        ('support_tickets', 'tickets_update_owner_only', 'support_tickets_update_owner_only'),
        ('support_tickets', 'tickets_update_admin_any', 'support_tickets_update_admin_any'),
        ('support_tickets', 'tickets_delete_admin_any', 'support_tickets_delete_admin_any'),
        ('support_tickets', 'tickets_delete_admin_only', 'support_tickets_delete_admin_only'),
        ('support_replies', 'ticket_comments_select_public_ticket', 'support_replies_select_public_ticket'),
        ('support_replies', 'ticket_comments_insert_open_public_ticket', 'support_replies_insert_open_public_ticket'),
        ('support_replies', 'ticket_comments_update_own', 'support_replies_update_own'),
        ('support_replies', 'ticket_comments_delete_own', 'support_replies_delete_own'),
        ('support_votes', 'ticket_upvotes_select_own', 'support_votes_select_own'),
        ('support_votes', 'ticket_upvotes_insert_own_on_open_public_ticket', 'support_votes_insert_own_on_open_public_ticket'),
        ('support_votes', 'ticket_upvotes_delete_own', 'support_votes_delete_own'),
        ('support_subscriptions', 'users can view own subscriptions', 'support_subscriptions_select_own'),
        ('support_subscriptions', 'users can subscribe themselves', 'support_subscriptions_insert_own'),
        ('support_subscriptions', 'users can unsubscribe themselves', 'support_subscriptions_delete_own'),
        ('notification_settings', 'notification_preferences_select_self', 'notification_settings_select_self'),
        ('notification_settings', 'notification_preferences_insert_self', 'notification_settings_insert_self'),
        ('notification_settings', 'notification_preferences_update_self', 'notification_settings_update_self'),
        ('notification_settings', 'notification_preferences_delete_self', 'notification_settings_delete_self'),
        ('device_tokens', 'push_subscriptions_select_self', 'device_tokens_select_self'),
        ('device_tokens', 'push_subscriptions_insert_self', 'device_tokens_insert_self'),
        ('device_tokens', 'push_subscriptions_update_self', 'device_tokens_update_self'),
        ('device_tokens', 'push_subscriptions_delete_self', 'device_tokens_delete_self'),
        ('payment_events', 'payment_logs_select_access', 'payment_events_select_access'),
        ('payment_events', 'payment_logs_insert_access', 'payment_events_insert_access'),
        ('payment_events', 'payment_logs_update_access', 'payment_events_update_access'),
        ('payment_events', 'payment_logs_delete_access', 'payment_events_delete_access')
    ) as pairs(table_name, old_name, new_name)
  loop
    if exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = item.table_name
        and policyname = item.old_name
    ) then
      execute format(
        'alter policy %I on public.%I rename to %I',
        item.old_name,
        item.table_name,
        item.new_name
      );
    end if;
  end loop;
end $$;

do $$
begin
  if to_regprocedure('public.set_tickets_updated_at()') is not null
     and to_regprocedure('public.set_support_tickets_updated_at()') is null then
    execute 'alter function public.set_tickets_updated_at() rename to set_support_tickets_updated_at';
  end if;
  if to_regprocedure('public.sync_ticket_upvotes_count()') is not null
     and to_regprocedure('public.sync_support_votes_count()') is null then
    execute 'alter function public.sync_ticket_upvotes_count() rename to sync_support_votes_count';
  end if;
end $$;

create or replace function public.get_coach_goal_history(
  p_coach_id uuid,
  p_limit int default 400
)
returns table (
  goal_id uuid,
  progress_percent numeric,
  snapshot_at timestamptz
)
language sql
stable
security invoker
as $$
  select history_row.goal_id, history_row.progress_percent::numeric, history_row.snapshot_at
  from public.goal_history history_row
  join public.goals goal_row on goal_row.id = history_row.goal_id
  join public.clients client_row on client_row.linked_user_id = goal_row.created_by_user_id
  where client_row.primary_coach_id = p_coach_id
    and client_row.is_archived = false
  order by history_row.snapshot_at desc
  limit greatest(coalesce(p_limit, 400), 1);
$$;

create or replace function public.has_client_coach_access(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_sysadmin()
    or exists (
      select 1
      from public.clients client_row
      where client_row.id = target_client_id
        and client_row.primary_coach_id = auth.uid()
        and client_row.is_archived = false
    );
$$;

create or replace function public.is_client_primary_coach(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_sysadmin()
    or exists (
      select 1
      from public.clients client_row
      where client_row.id = target_client_id
        and client_row.primary_coach_id = auth.uid()
    );
$$;

create or replace function public.is_active_or_historical_coach_for_student(
  p_coach_id uuid,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_coach_id is not null
    and p_student_id is not null
    and (
      p_coach_id = p_student_id
      or exists (
        select 1
        from public.profiles profile_row
        where profile_row.id = p_coach_id
          and profile_row.role = 'sysadmin'::public.user_role
      )
      or exists (
        select 1
        from public.clients client_row
        where client_row.primary_coach_id = p_coach_id
          and client_row.linked_user_id = p_student_id
      )
    );
$$;

create or replace function public.set_support_tickets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_support_votes_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.support_tickets
       set upvotes = upvotes + 1
     where id = new.ticket_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.support_tickets
       set upvotes = greatest(upvotes - 1, 0)
     where id = old.ticket_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row
execute function public.set_support_tickets_updated_at();

drop trigger if exists trg_support_votes_sync on public.support_votes;
create trigger trg_support_votes_sync
after insert or delete on public.support_votes
for each row
execute function public.sync_support_votes_count();

commit;
