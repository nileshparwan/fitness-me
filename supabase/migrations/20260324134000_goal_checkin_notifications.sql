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
      'health_checkin_reminder',
      'goal_checkin_reminder'
    )
  );

alter table public.notification_preferences
  add column if not exists goal_bell_enabled boolean not null default true,
  add column if not exists goal_push_enabled boolean not null default false;

commit;

