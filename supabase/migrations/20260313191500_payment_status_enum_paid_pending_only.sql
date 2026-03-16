-- Remove legacy payment status enum values that are no longer used by the app.
-- Keeps only: pending, paid.

do $$
declare
  has_legacy_values boolean;
begin
  select exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'payment_status'
      and e.enumlabel in ('failed', 'refunded')
  )
  into has_legacy_values;

  if not has_legacy_values then
    return;
  end if;

  update public.client_payments
  set status = 'pending'
  where status::text in ('failed', 'refunded');

  alter table public.client_payments
    drop constraint if exists client_payments_status_paid_pending_check;

  -- The old default is typed as public.payment_status and cannot be auto-cast
  -- to the new enum type during ALTER COLUMN TYPE.
  alter table public.client_payments
    alter column status drop default;

  drop type if exists public.payment_status_new;
  create type public.payment_status_new as enum ('pending', 'paid');

  alter table public.client_payments
    alter column status type public.payment_status_new
    using (
      case
        when status::text = 'paid' then 'paid'
        else 'pending'
      end
    )::public.payment_status_new;

  drop type public.payment_status;
  alter type public.payment_status_new rename to payment_status;

  alter table public.client_payments
    alter column status set default 'pending'::public.payment_status;

  alter table public.client_payments
    add constraint client_payments_status_paid_pending_check
    check (status::text in ('pending', 'paid'));
end $$;
