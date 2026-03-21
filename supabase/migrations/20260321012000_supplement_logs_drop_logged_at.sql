begin;

alter table public.supplement_logs
  drop column if exists logged_at;

commit;
