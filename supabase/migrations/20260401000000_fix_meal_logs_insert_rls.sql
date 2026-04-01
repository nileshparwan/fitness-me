drop policy if exists meal_logs_insert_subject_access on public.meal_logs;

create policy meal_logs_insert_subject_access
on public.meal_logs
for insert
to authenticated
with check (
  (created_by_user_id = auth.uid() or public.is_sysadmin())
  and public.has_nutrition_subject_access(subject_user_id, subject_client_id)
  and (
    meal_group_id is null
    or subject_user_id = auth.uid()
    or public.can_access_meal_group(meal_group_id)
    or public.is_sysadmin()
  )
);
