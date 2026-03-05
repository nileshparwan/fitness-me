# Nutrition Diary Business Notes

## Diary vs Plan
- `meal_plans` define targets and date ranges.
- `meal_logs` + `meal_log_items` are manual daily diary records of what was actually eaten.
- Diary can exist without a plan.
- When a plan is active for the selected day, progress bars compare totals against targets.

## Clients Without Accounts
- `clients` are first-class entities and do not require `auth.users`.
- Coach-mode logging uses `subject_client_id` in nutrition records.
- Clients with linked accounts can still log directly through their own user workflows.
- Access is governed by coach assignment/primary coach and RLS helpers.

## performed_on Timezone Rule
- Day logic uses `performed_on` (DATE), never `created_at`.
- UI sends selected date explicitly.
- Queries for a day always filter by `performed_on` + subject.
- This keeps logs stable across timezone boundaries and delayed entry times.
