-- Align coach note tags with the product taxonomy:
-- general, injury, nutrition, psychology, milestone.
do $$
begin
  if exists (select 1 from pg_type where typname = 'coach_note_tag')
     and exists (
       select 1
       from pg_enum
       where enumtypid = 'public.coach_note_tag'::regtype
         and enumlabel = 'programming'
     )
     and not exists (
       select 1
       from pg_enum
       where enumtypid = 'public.coach_note_tag'::regtype
         and enumlabel = 'general'
     ) then
    alter type public.coach_note_tag rename value 'programming' to 'general';
  end if;
end $$;

update public.coach_notes
set tag = 'general'::public.coach_note_tag
where tag::text in ('form', 'programming');

alter table public.coach_notes
  alter column tag set default 'general'::public.coach_note_tag;
