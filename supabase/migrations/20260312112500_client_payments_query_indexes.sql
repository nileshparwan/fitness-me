-- Speed up coach payments dashboard list and sort queries.
create index if not exists idx_client_payments_coach_date
  on public.client_payments (coach_id, payment_date desc);

create index if not exists idx_client_payments_coach_updated
  on public.client_payments (coach_id, updated_at desc);
