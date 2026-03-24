begin;

alter table public.push_subscriptions
  rename column p256dh to public_key;

alter table public.push_subscriptions
  rename column auth to auth_secret;

commit;
