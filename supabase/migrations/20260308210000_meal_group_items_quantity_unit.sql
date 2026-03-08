-- Add quantity/unit support for meal planner items.

alter table public.meal_group_items
  add column if not exists quantity numeric(10, 2),
  add column if not exists unit text;
