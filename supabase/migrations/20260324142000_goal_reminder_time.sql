begin;

alter table public.notification_preferences
  add column if not exists goal_reminder_time time not null default '09:00:00';

commit;

