-- Remove deprecated website columns if they still exist in any profile/account table.
alter table if exists public.profiles drop column if exists website;
alter table if exists public.profiles drop column if exists website_url;
alter table if exists public.account_settings drop column if exists website;
alter table if exists public.account_settings drop column if exists website_url;
alter table if exists public.users drop column if exists website;
alter table if exists public.users drop column if exists website_url;

-- Remove deprecated website keys from Supabase Auth user metadata.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'website' - 'website_url'
where coalesce(raw_user_meta_data, '{}'::jsonb) ?| array['website', 'website_url'];
