begin;

drop function if exists public.is_org_admin(uuid);
drop function if exists public.is_org_admin();
drop function if exists public.is_org_admin_for_org(uuid);
drop function if exists public.is_org_admin_for_org(text);
drop function if exists public.is_org_member(uuid);
drop function if exists public.is_org_member(text);
drop function if exists public.is_org_admin_for_user(uuid, uuid);

commit;
