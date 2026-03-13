-- Remove payment archive state and allow hard delete from coach tools.

-- Archive-based delete prevention is no longer used.
drop trigger if exists trg_client_payments_no_delete on public.client_payments;
drop function if exists public.prevent_client_payment_delete();

-- Remove archive column from payments.
alter table public.client_payments
  drop column if exists is_archived;

-- Allow coaches with client access to hard-delete payment records.
drop policy if exists client_payments_delete_access on public.client_payments;
create policy client_payments_delete_access on public.client_payments
for delete to authenticated
using (
  coach_id = auth.uid()
  and public.has_client_coach_access(client_id)
);
