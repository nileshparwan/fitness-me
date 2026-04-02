# Database Table Reference — Naming Convention Map

> This document is the canonical reference for the new table names after the schema revamp.
> Old name → New name, grouped by feature area / app route.

---

## Convention rules

1. **Prefix = feature area** — the prefix matches the route segment or domain name exactly.
2. **No `_log` on user-entered data** — `_log` / `_logs` is reserved for system/audit event tables only.
3. **Singular entity in the suffix** — `diary_entries` not `diary_entry_log`.
4. **Child tables inherit the parent prefix** — `diary_items` is a child of `diary_entries`.
5. **Drop redundant words** — if the table is already in the `supplements` domain, it doesn't need `supplement_catalog`, just `supplements`.

---

## Nutrition — Diary (`/nutrition/diary`)

| Old name | New name | Notes |
|---|---|---|
| `meal_logs` | `diary_entries` | A diary entry for a given day + meal type |
| `meal_log_items` | `diary_items` | Food items inside a diary entry |
| `meal_log_sections` | `diary_sections` | Visual grouping within a diary entry |
| `meal_item_favorites` | `diary_favorites` | User-saved favourite food items |
| `daily_macro_compliance` | `diary_compliance` | Daily macro compliance computed from diary |

---

## Nutrition — Meal Planner (`/nutrition/meal-planner`, `/nutrition/groups`)

| Old name | New name | Notes |
|---|---|---|
| `meal_groups` | `nutrition_plans` | A reusable nutrition plan (template or assigned) |
| `meal_group_plans` | `nutrition_plan_days` | Day-of-week schedule within a plan |
| `meal_group_items` | `nutrition_plan_items` | Food items within a plan day |
| `meal_group_assignments` | `nutrition_plan_assignments` | Assigning a nutrition plan to a user/client |
| `meal_group_plan_types` | `nutrition_plan_types` | Plan type metadata (audit before keeping) |
| `nutrition_target_history` | `nutrition_targets` | User nutrition macro targets over time |

---

## Training — Workouts (`/workouts`)

| Old name | New name | Notes |
|---|---|---|
| `training_sessions` | `workouts` | A logged workout session |
| `strength_sets` | `workout_sets` | Strength exercise sets within a workout |
| `cardio_sessions` | `workout_cardio` | Cardio entries within a workout |
| `workout_executions` | `workout_logs` | System log of a workout execution event |
| `workout_execution_exercises` | `workout_log_exercises` | Exercises within a workout log |

---

## Training — Programs (`/programs`)

| Old name | New name | Notes |
|---|---|---|
| `training_plans` | `programs` | A structured training program |
| `training_plan_items` | `program_workouts` | Workout sessions within a program |
| `coach_plan_templates` | `program_templates` | Reusable program templates created by coaches |
| `coach_plan_template_sessions` | `program_template_workouts` | Workout sessions within a template |
| `client_plan_assignments` | `program_assignments` | Assigning a program to a client |
| `client_plan_assignment_sessions` | `program_assignment_workouts` | Workout instances in an active assignment |

---

## Training — Exercises (`/exercises`)

| Old name | New name | Notes |
|---|---|---|
| `exercise_catalog` | `exercises` | Exercise library |
| `exercise_prs` | `personal_records` | Personal records per exercise per subject |

---

## Health — Check-in (`/check-in`)

| Old name | New name | Notes |
|---|---|---|
| `daily_activity` | `checkins` | Daily health check-in entry |
| `sleep_log` | `checkin_sleep` | Sleep data logged during check-in |
| `vitals_log` | `checkin_vitals` | Vitals (HR, BP, etc.) logged during check-in |

---

## Health — Measurements (`/measurements`)

| Old name | New name | Notes |
|---|---|---|
| `body_measurements` | `measurements` | Body measurement entries |

---

## Health — Cycle (`/health/cycle`)

| Old name | New name | Notes |
|---|---|---|
| `menstrual_cycles` | `cycle_entries` | Menstrual cycle tracking entries |

---

## Goals (`/goals`)

| Old name | New name | Notes |
|---|---|---|
| `fitness_goals` | `goals` | User fitness goals |
| `goal_progress_history` | `goal_history` | Progress snapshots against a goal |
| `goal_exercise_program_links` | `goal_program_links` | Links between goals and programs |

---

## Supplements (`/supplements`)

| Old name | New name | Notes |
|---|---|---|
| `supplement_catalog` | `supplements` | Supplement library (global + user-created) |
| `supplement_assignments` | `supplement_prescriptions` | Supplements prescribed to a user/client |
| `supplement_subject_profiles` | `supplement_profiles` | Per-subject supplement tracking preferences |

---

## Clients & Coaching (`/clients`, `/coach`)

| Old name | New name | Notes |
|---|---|---|
| `clients` | `clients` | No change — already clear |
| `coach_notes` | `client_notes` | Notes written by coach about a client |
| `client_checkins` | `client_reviews` | Coach-side review of a client's daily check-in |
| `client_tasks` | `tasks` | Tasks assigned to clients |
| `coach_client_assignments` | `coaching_assignments` | Which coach manages which client |
| `client_billing_plans` | `billing_plans` | Billing plan for a client relationship |
| `client_payments` | `payments` | Payment records for a client |
| `client_steps_logs` | `client_activity` | Step / activity data synced from client device |
| `client_feature_access` | `feature_access` | Per-client module access control |
| `client_auth` | `client_credentials` | Client portal login credentials |
| `client_sessions` | `client_auth_sessions` | Client portal session tokens |

---

## Support (`/support`)

| Old name | New name | Notes |
|---|---|---|
| `tickets` | `support_tickets` | User support tickets |
| `ticket_comments` | `support_replies` | Replies on a support ticket |
| `ticket_upvotes` | `support_votes` | Votes on a support ticket |
| `ticket_subscriptions` | `support_subscriptions` | Notification subscriptions for a ticket |

---

## Account & System (`/settings`, platform-level)

| Old name | New name | Notes |
|---|---|---|
| `profiles` | `profiles` | No change — well understood |
| `push_subscriptions` | `device_tokens` | Web push / device tokens for notifications |
| `notification_preferences` | `notification_settings` | Per-user notification preferences |
| `notifications` | `notifications` | No change |
| `account_deletion_requests` | `deletion_requests` | Account deletion request queue |
| `payment_logs` | `payment_events` | System-recorded payment transaction events |
| `analytics_events` | `analytics_events` | No change — already correct |

---

## Enum renames

| Old enum | New enum | Reason |
|---|---|---|
| `meal_log_type` | `diary_entry_type` | Matches new table name |
| `meal_item_type` | `nutrition_plan_item_type` | Matches new table name |
| `meal_group_status` | `nutrition_plan_status` | Matches new table name |
| `meal_group_assignment_status` | `nutrition_plan_assignment_status` | Matches new table name |
| `meal_assignment_status` | drop — consolidate into `nutrition_plan_assignment_status` | Duplicate |
| `meal_day_of_week` | `day_of_week` | Generic enough to be shared |
| `checkin_status` | drop — consolidate into `client_checkin_status` | Duplicate with different value for `pending` |
| `client_checkin_status` | `client_review_status` | Matches new `client_reviews` table |
| `session_location_type` | `workout_location` | Matches `workouts` table domain |
| `session_slot` | `workout_slot` | Matches `workouts` table domain |

---

## SQL function renames (RLS + triggers)

| Old function | New function |
|---|---|
| `can_access_meal_group` | `can_access_nutrition_plan` |
| `can_manage_meal_group` | `can_manage_nutrition_plan` |
| `has_nutrition_subject_access` | no change |
| `sync_meal_log_totals` | `sync_diary_entry_totals` |
| `prevent_used_meal_plan_delete` | `prevent_used_nutrition_plan_delete` |
| `enforce_active_meal_plan_overlap` | `enforce_active_nutrition_plan_overlap` |

---

## Column renames (applied across all tables)

| Old column | New column | Tables affected |
|---|---|---|
| `owner_user_id` | `created_by_user_id` | `nutrition_plans` (was `meal_groups`), `supplements` (was `supplement_catalog`) |
| `onboarding_completed` | `is_onboarding_completed` | `profiles` |
| `meal_group_id` (FK column) | `nutrition_plan_id` | `diary_entries`, `diary_sections`, `nutrition_plan_days`, `nutrition_plan_assignments` |
| `meal_plan_id` (FK column in `meal_group_items`) | `plan_day_id` | `nutrition_plan_items` (was `meal_group_items`) |
| `template_group_id` (FK column) | `template_plan_id` | `nutrition_plan_assignments` |
| `source_group_id` | `source_plan_id` | `nutrition_plans` |

---

## Complete old → new mapping (alphabetical quick-reference)

| Old table | New table |
|---|---|
| `account_deletion_requests` | `deletion_requests` |
| `analytics_events` | `analytics_events` |
| `body_measurements` | `measurements` |
| `cardio_sessions` | `workout_cardio` |
| `client_auth` | `client_credentials` |
| `client_billing_plans` | `billing_plans` |
| `client_checkins` | `client_reviews` |
| `client_feature_access` | `feature_access` |
| `client_payments` | `payments` |
| `client_plan_assignment_sessions` | `program_assignment_workouts` |
| `client_plan_assignments` | `program_assignments` |
| `client_sessions` | `client_auth_sessions` |
| `client_steps_logs` | `client_activity` |
| `client_tasks` | `tasks` |
| `clients` | `clients` |
| `coach_client_assignments` | `coaching_assignments` |
| `coach_notes` | `client_notes` |
| `coach_plan_template_sessions` | `program_template_workouts` |
| `coach_plan_templates` | `program_templates` |
| `daily_activity` | `checkins` |
| `daily_macro_compliance` | `diary_compliance` |
| `exercise_catalog` | `exercises` |
| `exercise_prs` | `personal_records` |
| `fitness_goals` | `goals` |
| `goal_exercise_program_links` | `goal_program_links` |
| `goal_progress_history` | `goal_history` |
| `meal_group_assignments` | `nutrition_plan_assignments` |
| `meal_group_items` | `nutrition_plan_items` |
| `meal_group_plan_types` | `nutrition_plan_types` |
| `meal_group_plans` | `nutrition_plan_days` |
| `meal_groups` | `nutrition_plans` |
| `meal_item_favorites` | `diary_favorites` |
| `meal_log_items` | `diary_items` |
| `meal_log_sections` | `diary_sections` |
| `meal_logs` | `diary_entries` |
| `menstrual_cycles` | `cycle_entries` |
| `notification_preferences` | `notification_settings` |
| `notifications` | `notifications` |
| `payment_logs` | `payment_events` |
| `profiles` | `profiles` |
| `push_subscriptions` | `device_tokens` |
| `sleep_log` | `checkin_sleep` |
| `strength_sets` | `workout_sets` |
| `supplement_assignments` | `supplement_prescriptions` |
| `supplement_catalog` | `supplements` |
| `supplement_subject_profiles` | `supplement_profiles` |
| `ticket_comments` | `support_replies` |
| `ticket_subscriptions` | `support_subscriptions` |
| `ticket_upvotes` | `support_votes` |
| `tickets` | `support_tickets` |
| `training_plan_items` | `program_workouts` |
| `training_plans` | `programs` |
| `training_sessions` | `workouts` |
| `vitals_log` | `checkin_vitals` |
| `workout_execution_exercises` | `workout_log_exercises` |
| `workout_executions` | `workout_logs` |
