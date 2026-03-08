begin;

alter type public.meal_log_type add value if not exists 'snack';
alter type public.meal_log_type add value if not exists 'pre_workout_meal';
alter type public.meal_log_type add value if not exists 'post_workout_meal';
alter type public.meal_log_type add value if not exists 'protein_drink';
alter type public.meal_log_type add value if not exists 'water';

commit;
