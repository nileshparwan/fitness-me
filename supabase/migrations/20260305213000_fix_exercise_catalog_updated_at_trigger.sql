begin;

-- exercise_catalog does not have updated_at; this trigger causes all writes to fail.
drop trigger if exists trg_exercise_catalog_set_updated_at on public.exercise_catalog;

commit;
