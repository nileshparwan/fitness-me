# Coach-Client Relationship Business Model

## Scope
- This model covers the current client portal, coach workspace, and coach tools.
- `/coach/plans` (Plan Templates) is intentionally excluded.

## 1) Relationship model
- Primary Coach owns the client relationship (`clients.primary_coach_id`).
- Client is a first-class record (`clients`) and may exist with or without linked platform user (`linked_user_id` optional).
- Client Portal Account is separate from app user auth (`client_auth`, `client_sessions`) and can be blocked/removed independently.

## 2) Business value flow
- Onboard: coach creates client profile and optional portal credentials.
- Deliver: coach assigns work (training, tasks, nutrition direction), logs sessions, and tracks progress.
- Engage: client submits workouts, meals, steps, check-ins, goals, and completes tasks in portal.
- Review and adjust: coach reviews check-ins, notes, compliance, and updates access/module permissions.
- Monetize and retain: coach tracks payment status/periods and gets payment alerts for follow-up.

## 3) Core domain entities
| Entity | Main relationship | Why it matters |
| --- | --- | --- |
| `clients` | 1 primary coach -> many clients | Source of truth for each coached client |
| `client_auth`, `client_sessions` | 1 client -> many sessions | Client portal authentication and session lifecycle |
| `client_feature_access` | 1 client -> many module permissions | Module-level `disabled/read_only/enabled` controls |
| `client_plan_assignments`, `client_plan_assignment_sessions` | 1 client -> many plan cycles | Active plan and next-session progression |
| `training_sessions`, `strength_sets`, `cardio_sessions` | 1 client -> many training logs | Workout execution and compliance tracking |
| `client_tasks` | 1 client -> many tasks | Accountability and weekly actions |
| `client_checkins` | 1 client -> many check-ins | Feedback loop and urgent escalation |
| `coach_notes` | many coach notes -> 1 client | Coaching context, private or client-visible |
| `meal_logs`, `meal_log_items`, `client_meal_item_favorites` | 1 client -> many meal events/items | Nutrition adherence and fast meal logging |
| `client_steps_logs` | 1 client -> daily records | Non-training movement adherence |
| `client_payments` | 1 client -> many payments | Revenue operations and overdue/period-end alerts |

## 4) Access and control model
- Coach-side access is enforced by ownership (`has_client_coach_access`).
- Client portal module permissions are controlled per module:
  - `disabled`: no read/write
  - `read_only`: read only
  - `enabled`: read/write
- Coaching actions can block or remove portal access without deleting client data.

## 5) Page map

### Client portal pages
- `/client` - client dashboard summary (today sessions, pending tasks, next session).
- `/client/workouts` - workout logging and day session history.
- `/client/training` - active training plan and per-session completion logging.
- `/client/meal-plan` - read-only assigned meal plan and macro targets.
- `/client/nutrition` - meal diary logging, favorites, recents, copy meals.
- `/client/steps` - daily steps logging.
- `/client/goals` - goals editor.
- `/client/check-ins` - check-in submission and history.
- `/client/notes` - coach notes visible to client.
- `/client/tasks` - assigned tasks and completion status.

### Coach workspace pages (non-admin)
- `/dashboard` - coach workspace overview and quick actions.
- `/workouts` - workout list.
- `/workouts/new` - create workout.
- `/workouts/[id]` - workout detail.
- `/workouts/[id]/edit` - workout edit.
- `/programs` - programs list.
- `/programs/[id]` - program detail.
- `/exercises` - exercise library.
- `/exercises/[id]` - exercise detail/history.
- `/nutrition` - nutrition module landing.
- `/nutrition/dashboard` - nutrition analytics dashboard.
- `/nutrition/diary` - manual meal diary workspace.
- `/nutrition/meal-planner` - meal planner workspace.
- `/nutrition/meal-groups` - meal group dashboard.
- `/nutrition/groups` - template group dashboard.
- `/nutrition/groups/[groupId]` - group detail.
- `/nutrition/[id]` - nutrition program detail.
- `/progress` - progress analytics.
- `/progress/nutrition` - nutrition progress view.
- `/support` - ticket board.
- `/support/new` - create ticket.
- `/support/[id]` - ticket detail.
- `/settings` - settings landing.
- `/settings/profile` - profile settings.
- `/goals` - goals management.
- `/settings/security` - account/security settings.

### Coach tools pages
- `/clients` - client roster, search/filter, client creation.
- `/clients/[clientId]` - client command center (overview, training, check-ins, notes, payments, access).
- `/clients/[clientId]/nutrition` - client nutrition workspace.
- `/clients/[clientId]/access` - portal credentials, module access, block/remove controls.

## 6) Operating sequence (coach -> client)
1. Coach creates client in `/clients`.
2. Coach sets portal credentials and module access in `/clients/[clientId]/access`.
3. Coach manages day-to-day delivery in `/clients/[clientId]` and `/clients/[clientId]/nutrition`.
4. Client executes tasks in `/client/*` modules.
5. Coach reviews outcomes, updates permissions/tasks/notes/check-ins, and tracks billing.
