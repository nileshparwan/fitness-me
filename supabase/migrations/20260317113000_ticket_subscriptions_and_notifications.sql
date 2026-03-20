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
      'support_ticket_reopened'
    )
  );

create table if not exists public.ticket_subscriptions (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  primary key (ticket_id, user_id)
);

create index if not exists idx_ticket_subscriptions_user
  on public.ticket_subscriptions (user_id, subscribed_at desc);

create index if not exists idx_ticket_subscriptions_ticket
  on public.ticket_subscriptions (ticket_id);

alter table public.ticket_subscriptions enable row level security;

drop policy if exists "users can view own subscriptions" on public.ticket_subscriptions;
create policy "users can view own subscriptions"
  on public.ticket_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can subscribe themselves" on public.ticket_subscriptions;
create policy "users can subscribe themselves"
  on public.ticket_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can unsubscribe themselves" on public.ticket_subscriptions;
create policy "users can unsubscribe themselves"
  on public.ticket_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

commit;
