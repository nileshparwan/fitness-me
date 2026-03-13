# Coaching Domain Notes

## Client without user account
- `public.clients` is first-class and does not require `auth.users`.
- `linked_user_id` is optional and nullable.
- Coaches can create/manage clients with only profile fields (`first_name`, `last_name`, optional contact fields).
- If a platform user is later linked, `linked_user_id` can be set without recreating the client record.
- Access is controlled by:
  - `primary_coach_id`
  - `sysadmin` override

## Today’s sessions computation
- A session is considered “today” when:
  - `training_sessions.subject_client_id = :client_id`
  - `training_sessions.performed_on = current_date` (subject timezone should be normalized before insert)
- Sessions are ordered by `started_at` (nulls first fallback).
- Required indexing:
  - `(subject_client_id, performed_on)`
  - `(subject_user_id, performed_on)`

## Next session computation
- Next session is derived from active assignment:
  1. fetch active `client_plan_assignments` for client (`status = 'active'`)
  2. fetch `client_plan_assignment_sessions` in ascending `sequence_no`
  3. pick first row where `completed_at is null` and `is_skipped = false`
- “Skipped” sessions are treated as resolved.
- Progression only advances from assignment-session state, typically updated when logs are linked via:
  - `training_sessions.plan_assignment_id`
  - `training_sessions.plan_session_id`
