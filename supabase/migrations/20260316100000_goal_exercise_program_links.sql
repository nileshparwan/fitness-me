begin;

alter table public.fitness_goals
  add column if not exists linked_exercise_id uuid
    references public.exercise_catalog(id) on delete set null,
  add column if not exists linked_program_id uuid
    references public.training_plans(id) on delete set null;

create index if not exists idx_fitness_goals_exercise_link
  on public.fitness_goals (linked_exercise_id, user_id)
  where linked_exercise_id is not null;

alter table public.goal_progress_history
  add column if not exists source text
    not null
    default 'manual'
    check (source in ('manual', 'auto_sync'));

commit;
