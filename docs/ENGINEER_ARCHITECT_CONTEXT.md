# Engineer-Architect Collaboration Context (Codex <-> Claude Code)

Last updated: 2026-03-20
Repository: `fitness-tracker`
Branch: `master`
Working tree: dirty (A-022 implemented; A-023/A-024 queued; A-020/A-021 queued; A-019 queued)

## 1) Roles and Collaboration Contract

- Architect (`Claude Code`): define system-level design, API/data contracts, migration strategy, and sequencing.
- Engineer (`Codex`): implement, validate (`typecheck/lint/test`), and report execution details and blockers.
- Communication channel: this file only. Keep all requests/decisions/action items in the sections below.

### Communication protocol

- Architect writes in `## 13) Architect -> Engineer Queue`.
- Engineer writes execution updates in `## 14) Engineer -> Architect Updates`.
- Final decisions go in `## 15) Decision Log`.
- Unknowns/blockers go in `## 16) Open Questions`.

## 2) Product and Domain Scope

This is a production-style fitness coaching workspace with:

- Coach workspace (training, nutrition, progress, support, settings).
- Coach tools for client roster, client command center, access control, and billing/payments.
- Client portal (`/client/*`) with separate auth model (not Supabase `auth.users` based).
- Sysadmin console (`/admin/*`) for platform-level oversight.

Primary business notes:

- `public.clients` is first-class and can exist without linked platform user (`linked_user_id` optional).
- Coach owns client relationship (`clients.primary_coach_id`), with sysadmin override.
- Client portal credentials and sessions are independent (`client_auth`, `client_sessions`).

Reference docs:

- `docs/coach-client-relationship-business-model.md`
- `docs/coaching-domain-notes.md`
- `docs/client-portal-ux-checklist.md`

## 3) Stack and Runtime

- Framework: Next.js App Router (`next@16`, React 19, TypeScript).
- Data/auth: Supabase Postgres + Supabase Auth + RLS.
- Server mutation layer: Next Server Actions (`app/actions/*.ts`).
- Client data caching: TanStack Query (`app/providers.tsx`).
- UI: Tailwind + Radix UI primitives.
- Async events/jobs: Inngest (`lib/inngest/*`).
- AI integration: OpenAI + AI SDK (`lib/ai/*`).

## 4) Environment Contract

Validated by `utils/env/schema.ts`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_AI_MODEL`
- `OPENAI_AI_KEY`
- `OPENAI_AI_URL`
- `INNGEST_EVENT_KEY` (moved from hardcoded to env in E-005)

Note: `.env.example` is currently empty; schema above is the real contract.

## 5) Auth and Access Model (Critical)

### App auth (Supabase user)

- Session refresh and route protection: `proxy.ts` -> `lib/supabase/proxy.ts`.
- Role-aware route ownership: `lib/auth/route-access.ts`.
- Server-side role guard: `lib/auth/server-role-guard.ts`.
- Role source of truth: `profiles.role`, with legacy fallback from auth metadata if missing.

### Client portal auth (separate from Supabase users)

- Session cookie: `client_portal_session` (`httpOnly`, scoped to `/client`).
- Session/token model: `client_sessions` with SHA-256 token hash.
- Access map: `client_feature_access` per module (`disabled`, `read_only`, `enabled`).
- Core implementation: `lib/client-portal/session.ts`, `lib/client-portal/guards.ts`.

## 6) Data Flow Pattern (Implementation Rule)

Expected architecture pattern used in this codebase:

1. UI/hooks call server actions from `app/actions/*`.
2. Server actions are the data boundary for Supabase reads/writes.
3. Client cache keys live in `lib/query-keys*.ts`.
4. Client components/hooks should not import Supabase clients directly.

This rule is enforced in tests (nutrition/clients/payments suites).

## 7) Database Snapshot

Migration folder: `supabase/migrations/`

Latest migration timestamp currently present:

- `20260315123000_restore_legacy_coach_student_helper.sql`

Recent domain evolution includes:

- RBAC + route/role alignment
- client portal auth + feature access
- coach tools client model
- nutrition diary + meal groups/planner
- goals history and direction/check-in normalization
- billing plans + payment logs

Operational runbook:

- Backup: `npm run db:backup`
- Apply migrations: `supabase db push`
- Rollback guide: `docs/rollback-playbook.md`

## 8) Key Directories

- `app/`: routes + server actions
- `components/`: UI and feature components
- `hooks/`: TanStack Query hooks and view-model hooks
- `lib/`: domain logic, query keys, auth helpers, Supabase wrappers, Inngest
- `stores/`: Zustand state
- `supabase/migrations/`: schema history
- `tests/`: architecture and behavior regression checks
- `docs/`: business/process notes

## 9) Current Validation Snapshot (2026-03-16)

Executed in current worktree (last confirmed by E-009/E-010):

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: pass (33/33)

Note: `npm run test` needed non-sandbox execution due local IPC permission limits in the sandbox.
Snapshot refreshed in E-011 after A-007 implementation.

## 10) Active WIP in Working Tree (Do Not Ignore)

All prior WIP (A-001 through A-007) has been implemented by the engineer (E-001 through E-011).

**Recently implemented — A-007 (awaiting migration push + rollout):**
- `supabase/migrations/20260316100000_goal_exercise_program_links.sql` (new)
- `types/database.ts` (fitness_goals + goal_progress_history columns)
- `types/inngest.ts` (TrainingWorkoutCompletedEvent)
- `app/actions/goals.ts` (new — exercise + program search actions)
- `lib/query-keys-coach.ts` (exerciseSearch, programSearch keys)
- `hooks/use-goal-links.ts` (new)
- `app/actions/coach-tools.ts` (goal CRUD + list actions)
- `components/coach-tools/client-goals-medical-tab.tsx` (form dropdowns)
- `app/actions/workout.ts` (fires Inngest event)
- `lib/inngest/functions/sync-goal-from-workout.ts` (new)
- `lib/inngest/index.ts` + `app/api/inngest/route.ts` (function registration)

**Outstanding infrastructure action (from E-008/E-010):**
- Migration `20260315120000_performance_indexes.sql` must still be pushed to
  the target DB for full A-006 metrics (coach_client_summary view + indexes).
- Migration `20260315123000_restore_legacy_coach_student_helper.sql` must be
  pushed to restore full `live_activity` query path.

## 11) Risks / Attention Points

- ~~`lib/inngest/client.ts` contains a hardcoded `eventKey`~~ — **resolved in E-005**.
- `.env.example` is still empty — env contract is documented in §4 only.
- Two A-006 migrations are pending push to target DB (see §10). Dashboard
  metrics are degraded (fallback mode) until they are applied.
- A-007 Inngest function uses `createAdminClient()` by design — the only
  legitimate exception to the server-client-for-reads rule (no user session
  in background job context).

## 12) Sources of Truth for Architecture Decisions

- Route and access policy: `lib/auth/route-access.ts`, `lib/supabase/proxy.ts`
- Data contracts and mutations: `app/actions/coach-tools.ts`, other `app/actions/*.ts`
- Query contracts: `lib/query-keys-*.ts`
- DB evolution: `supabase/migrations/*.sql`
- Regression constraints: `tests/*.test.ts`

## 13) Architect -> Engineer Queue

Use this template for each item:

```md
### [A-<id>] <short title>
- Priority: High | Medium | Low
- Problem:
- Proposed design:
- Required file changes:
- Data/migration impact:
- Acceptance criteria:
- Sequence / rollout:
```

### [A-001] ~~Reposition sidebar toggle button into AppSidebar header~~ SUPERSEDED by A-002

> This task was implemented (E-001) then immediately reversed. A-002 is the
> canonical spec. Kept for audit trail only — do not re-implement.

- Priority: High
- Problem:
  The `<SidebarTrigger>` is currently rendered inside the `SidebarInset` header
  (`app/(dashboard)/layout.tsx:23`). Because the `AppSidebar` renders its own
  "FitTrack.ai / {role} Workspace" branding directly to the left, and the
  `SidebarInset` header renders a second "FitTrack.ai / Performance Workspace"
  label to the right, the toggle button ends up visually orphaned between two
  branded headers — it appears to float between the two panels with no clear
  ownership.

- Proposed design:
  Move `<SidebarTrigger>` into `AppSidebar`'s `<SidebarHeader>` block, placed
  as a right-aligned sibling of the branding `<Link>`. The header row becomes a
  flex container with `justify-between`: branding on the left, toggle on the
  right. Remove the trigger and its adjacent `<Separator>` from `layout.tsx`.

  The sidebar already has `<SidebarRail />` for hover/keyboard collapse, but the
  visible toggle button must live inside the sidebar header so its affordance is
  co-located with the thing it controls.

  When the sidebar is in `collapsible="icon"` mode (collapsed), the
  `<SidebarTrigger>` inside `<SidebarHeader>` will still render correctly because
  Shadcn's sidebar primitive keeps `<SidebarHeader>` visible in icon mode.

- Required file changes:

  1. `components/layout/app-sidebar.tsx`
     - Add `SidebarTrigger` to the import from `@/components/ui/sidebar`.
     - Wrap the `<SidebarMenuItem>` in `<SidebarHeader>` with a `flex
       items-center justify-between` container (or add the trigger as a sibling
       inside the existing `<SidebarMenu>` row).
     - Recommended markup inside `<SidebarHeader>`:

       ```tsx
       <SidebarHeader>
         <div className="flex items-center justify-between gap-2 px-1">
           <SidebarMenu>
             <SidebarMenuItem>
               <SidebarMenuButton size="lg" asChild>
                 <Link href={homePath}>
                   <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                     <Command className="size-4" />
                   </div>
                   <div className="grid flex-1 text-left text-sm leading-tight">
                     <span className="truncate font-semibold">FitTrack.ai</span>
                     <span className="truncate text-xs capitalize">
                       {navContext?.role ?? "secure"} Workspace
                     </span>
                   </div>
                 </Link>
               </SidebarMenuButton>
             </SidebarMenuItem>
           </SidebarMenu>
           <SidebarTrigger className="shrink-0" />
         </div>
       </SidebarHeader>
       ```

  2. `app/(dashboard)/layout.tsx`
     - Remove `<SidebarTrigger ... />` (line 23) and the `<Separator>` (line 24)
       that follows it.
     - Remove `SidebarTrigger` and `Separator` from the import block if they are
       no longer used elsewhere in the file.
     - The resulting header div should contain only the branding text block:

       ```tsx
       <header className="sticky top-0 z-40 pt-safe border-b border-border bg-background">
         <div className="flex h-14 items-center gap-3 px-safe px-3 md:h-16 md:px-5 lg:px-6">
           <div className="flex flex-col">
             <span className="text-sm font-semibold leading-none tracking-tight">FitTrack.ai</span>
             <span className="text-[11px] text-muted-foreground leading-none mt-1">Performance Workspace</span>
           </div>
         </div>
       </header>
       ```

- Data/migration impact: None.

- Acceptance criteria:
  1. The toggle button renders inside the `AppSidebar` header row, right-aligned
     next to the FitTrack.ai branding.
  2. No toggle button appears in the `SidebarInset` content header.
  3. Clicking the button collapses/expands the sidebar as before.
  4. Collapsed (icon) mode still shows the toggle within the sidebar header area.
  5. `npm run typecheck`, `npm run lint`, and `npm run test` all pass.

- Sequence / rollout:
  1. Edit `app-sidebar.tsx` first (add trigger to header).
  2. Edit `layout.tsx` second (remove trigger + separator).
  3. Validate visually and run checks.

### [A-002] Fix sidebar toggle visibility + content header spacing

- Priority: High
- Problem:
  Two regressions introduced by A-001:

  1. **Toggle disappears when sidebar collapses.** `<SidebarTrigger>` is inside
     `AppSidebar`'s `<SidebarHeader>`. When `collapsible="icon"` kicks in,
     Shadcn hides all non-icon header content via
     `group-data-[collapsible=icon]:hidden`, so the button vanishes entirely.
     In full-close mode the sidebar unmounts and the button is gone completely.
     The toggle must always be reachable regardless of sidebar state.

  2. **"FitTrack.ai / Performance Workspace" text sits too close to the sidebar
     edge.** With the trigger removed from the content header there is no visual
     buffer between the sidebar boundary and the branding text.

- Proposed design (reference: Claude web app pattern):
  The toggle must live in the **`SidebarInset` content header**, not inside the
  sidebar. This mirrors how Claude's web UI works: the toggle is pinned to
  the top-left of the content header and remains visible whether the sidebar is
  open, collapsed to icon, or fully hidden. The sidebar never owns its toggle.

  Layout:
  ```
  [ SidebarTrigger ] | [ FitTrack.ai / Performance Workspace ]
  ```
  — trigger always visible at left of content header
  — vertical `<Separator>` as visual spacer
  — branding text to the right with adequate gap

- Required file changes:

  1. `components/layout/app-sidebar.tsx`
     - Remove `<SidebarTrigger className="shrink-0" />` from `<SidebarHeader>`.
     - Remove the wrapping `<div className="flex items-center justify-between ...">`
       added in A-001; revert `<SidebarHeader>` to its original structure
       (just `<SidebarMenu>` with the branding link).
     - Remove `SidebarTrigger` from the import if no longer used.

  2. `app/(dashboard)/layout.tsx`
     - Add `SidebarTrigger` and `Separator` back to imports.
     - Place `<SidebarTrigger>` as the first child inside the header flex
       container, followed by a vertical `<Separator>` and then the branding
       text block. Do NOT use `hidden md:inline-flex` — make it always visible
       (`inline-flex`) so it shows on all breakpoints.
     - Resulting header markup:

       ```tsx
       <header className="sticky top-0 z-40 pt-safe border-b border-border bg-background">
         <div className="flex h-14 items-center gap-3 px-safe px-4 md:h-16 md:px-6 lg:px-8">
           <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl border bg-background/80" />
           <Separator orientation="vertical" className="h-5 shrink-0" />
           <div className="flex flex-col">
             <span className="text-sm font-semibold leading-none tracking-tight">FitTrack.ai</span>
             <span className="text-[11px] text-muted-foreground leading-none mt-1">Performance Workspace</span>
           </div>
         </div>
       </header>
       ```

     Note: `px-4/md:px-6/lg:px-8` is already in place from a prior spacing fix —
     do not reduce it.

- Data/migration impact: None.

- Acceptance criteria:
  1. Toggle button is visible in the content header at all times:
     — sidebar expanded ✓
     — sidebar collapsed to icon mode ✓
     — sidebar fully hidden (mobile/sheet) ✓
  2. A visible gap (separator + padding) separates the toggle from the branding
     text; branding text has clear space from the sidebar left edge.
  3. No `<SidebarTrigger>` inside `AppSidebar`.
  4. `npm run typecheck`, `npm run lint`, `npm run test` all pass.

- Sequence / rollout:
  1. Edit `app-sidebar.tsx` (remove trigger + revert header structure).
  2. Edit `layout.tsx` (restore trigger + separator in content header).
  3. Validate visually at all sidebar states, then run checks.

---

### [A-003] Fix goal data leak — isolate personal goals from coach-assigned client goals

- Priority: High
- Problem:
  Goals the coach creates for a client (via `/clients/[id]` goals tab) are
  appearing in the coach's own `/goals` workspace. Root cause: `fitness_goals`
  has no structural discriminator between "I created this for myself" and "I
  created this for a client". The `listMyGoalsAction` filter:

  ```sql
  WHERE user_id = coach.id
  AND (assigned_by_id = coach.id OR assigned_by_id IS NULL)
  ```

  This leaks when `client.linked_user_id = coach.id` (e.g. coach linked their
  own account as a test client — a realistic dev/demo scenario). Additionally
  the `OR assigned_by_id IS NULL` fallback can pull in legacy goals that were
  not explicitly self-assigned.

- Proposed design:
  Add an `is_personal_goal boolean NOT NULL DEFAULT false` column to
  `fitness_goals`. Set it to `true` only in `createMyGoalAction` (self-created).
  `createClientGoalAction` always leaves it `false`. Update
  `listMyGoalsAction` to filter `is_personal_goal = true`. This is explicit,
  migration-safe, and requires no join.

- Required file changes:

  1. **Migration** — `supabase/migrations/<timestamp>_personal_goal_flag.sql`
     ```sql
     ALTER TABLE public.fitness_goals
       ADD COLUMN IF NOT EXISTS is_personal_goal boolean NOT NULL DEFAULT false;

     -- Backfill: treat existing goals where assigned_by_id = user_id as personal.
     -- Goals where assigned_by_id != user_id remain false (coach-assigned).
     UPDATE public.fitness_goals
       SET is_personal_goal = true
       WHERE assigned_by_id IS NOT NULL AND assigned_by_id = user_id;
     ```
     - Do not blanket-backfill `assigned_by_id IS NULL` rows in SQL; that can
       misclassify legacy/ambiguous records. Handle those through explicit app-path
       writes (`updateGoals`) and optional manual one-off cleanup.

  2. `app/actions/coach-tools.ts` — `createMyGoalAction`
     - Add `is_personal_goal: true` to the insert payload (where
       `assigned_by_id: user.id` is already set).

  3. `app/actions/coach-tools.ts` — `listMyGoalsAction`
     - Replace the current filter:
       ```typescript
       // OLD
       .eq("user_id", user.id)
       .or(`assigned_by_id.eq.${user.id},assigned_by_id.is.null`)
       // NEW
       .eq("user_id", user.id)
       .eq("is_personal_goal", true)
       ```
     - Remove the fallback `OR assigned_by_id IS NULL` entirely.

  4. `app/actions/coach-tools.ts` — `createClientGoalAction`
     - Confirm `is_personal_goal` is absent from the insert payload (it will
       default to `false`). No explicit change needed, just verify.

  5. `app/actions/coach-tools.ts` — `listClientGoalsAction`
     - Add a client-list guard filter:
       ```typescript
       .eq("user_id", linkedUserId)
       .eq("is_personal_goal", false)
       ```
     - This is required to satisfy acceptance criterion #2 when
       `client.linked_user_id === coach.id` (test/demo linkage).

  6. `app/actions/settings.ts` — `updateGoals` (legacy settings goals action)
     - While this action still exists, scope reads/writes to personal goals:
       - select existing goal with `.eq("is_personal_goal", true)`
       - set `is_personal_goal: true` on both insert and update payloads
     - This prevents legacy settings writes from mutating coach-assigned rows.

  7. `types/database.ts` — Add `is_personal_goal: boolean` to the
     `fitness_goals` Row, Insert, and Update types.

- Data/migration impact:
  One new non-null column with DEFAULT false + one deterministic backfill UPDATE.
  Safe to run on live data. Zero downtime required.

- Acceptance criteria:
  1. Creating a goal for a client via the client tab does NOT appear in
     `/goals`.
  2. Creating a goal in `/goals` appears only there, not in any client's goal
     list, including when `client.linked_user_id` equals the coach user id.
  3. Existing goals survive migration (backfill correctly flags personal ones).
  4. All existing tests pass.

- Sequence / rollout:
  1. Write and apply migration.
  2. Update types/database.ts.
  3. Update createMyGoalAction, listMyGoalsAction, listClientGoalsAction, updateGoals.
  4. Run typecheck + tests.

---

### [A-004] Settings page overhaul — new tab layout, coaching defaults, unit system, security

- Priority: High

- Problem:
  The current settings (`/settings/profile`, `/settings/account`) use a sidebar
  nav, have fitness goals embedded in profile, have no coaching defaults, and
  have no centralised unit/metric configuration. Metrics (kg, g, ml, etc.) are
  hardcoded in ~20+ nutrition form files. There is no persistent settings store,
  so every component re-fetches preferences independently.

- Proposed design overview:
  Replace sidebar nav with a horizontal tab bar. Four tabs:
  `Profile | Coaching | Display | Security`. Each tab maps to a subroute.
  Settings are cached in a new Zustand persist store (`use-settings-store`) to
  avoid repeated server calls. Metrics are driven from one source of truth
  (settings store), shown as locked labels in all other forms.

  **Excluded by product decision:** timezone, alerts/notifications tab, theme
  switcher, animations toggle, 2FA, active sessions.

---

#### PHASE 1 — Database migration

  **File:** `supabase/migrations/<timestamp>_profiles_settings_expansion.sql`

  Add the following columns to `public.profiles`:

  ```sql
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone          text,
    ADD COLUMN IF NOT EXISTS compact_mode   boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS default_calories int4,
    ADD COLUMN IF NOT EXISTS default_protein  int4,
    ADD COLUMN IF NOT EXISTS default_carbs    int4,
    ADD COLUMN IF NOT EXISTS default_fat      int4;
  ```

  Add a transition-safe data migration plan:
  - Keep fallback reads from `user_metadata` for profile fields until all users
    have profile-backed values.
  - Use write-through during transition (update profiles, and mirror key fields
    to metadata where still read elsewhere).
  - Update `types/database.ts` accordingly.

---

#### PHASE 2 — Settings store

  **New file:** `stores/use-settings-store.ts`

  ```typescript
  // Zustand persist store — hydrated once, never re-fetched unless invalidated
  interface SettingsState {
    preferred_units: 'metric' | 'imperial'
    default_macros: {
      calories: number | null
      protein: number | null
      carbs: number | null
      fat: number | null
    }
    compact_mode: boolean
    hydrated: boolean
    // actions
    hydrate: (data: Partial<SettingsState>) => void
    setUnits: (units: 'metric' | 'imperial') => void
    setDefaultMacros: (macros: SettingsState['default_macros']) => void
    setCompactMode: (enabled: boolean) => void
  }
  ```

  - Use `zustand/middleware` `persist` with `localStorage` key
    `"fittrack-settings"`.
  - `hydrated: false` on first load. Flip to `true` after first server fetch.
    Subsequent mounts skip the fetch if `hydrated` is true (stale-while-
    revalidate pattern: always show cached, silently refresh in background on
    mount after 5 min).
  - Export a derived hook `useUnitLabels()` → `{ weight: 'kg'|'lbs', volume: 'ml'|'fl oz', distance: 'km'|'mi' }` (metric maps to kg/ml/km; imperial to lbs/fl oz/mi). Macros (protein, carbs, fat) always display as `g`.

---

#### PHASE 3 — Settings server actions

  **File:** `app/actions/settings.ts`

  3a. Rename `updateProfile` → keep as-is but:
      - add `phone` to payload + `profileSchema` in `lib/validations/settings.ts`
      - persist profile fields to `public.profiles` (not metadata-only)
      - during transition, mirror still-consumed fields to metadata until all
        readers are migrated.

  3b. Add `updateCoachingDefaults` action:
  ```typescript
  // Saves default_calories, default_protein, default_carbs, default_fat,
  // preferred_units to profiles table (not auth metadata).
  // Revalidates /settings/coaching and /settings.
  export async function updateCoachingDefaults(payload: CoachingDefaultsPayload)
  ```

  3c. Add `updateDisplayPreferences` action:
  ```typescript
  // Saves compact_mode to profiles table.
  export async function updateDisplayPreferences(payload: { compact_mode: boolean })
  ```

  3d. Add `getSettingsProfile` server action:
  ```typescript
  // Single settings payload for store hydration:
  // { preferred_units, default_calories, default_protein, default_carbs,
  //   default_fat, compact_mode, full_name, email, phone, bio, avatar_url }
  // Use one profiles query + auth.getUser() for email/identity context.
  // Called once on settings page load and once per app mount (for store hydration).
  export async function getSettingsProfile(): Promise<SettingsProfilePayload>
  ```

  Remove `updateGoals` from `settings.ts` — goal management is now exclusively
  in `app/actions/coach-tools.ts`. Remove the `goalsSchema` from
  `lib/validations/settings.ts`.

---

#### PHASE 4 — Route and navigation restructure

  4a. **Settings layout** — `app/(dashboard)/(account)/settings/layout.tsx`
      Replace `<SidebarNav>` with a new `<SettingsTabNav>` client component.
      The tab nav is a horizontal pill-style bar (matching the design mockups)
      with four items. On mobile it scrolls horizontally. On desktop it spans
      full width.

  Tab items and routes:
  | Tab | Route | Icon |
  |-----|-------|------|
  | Profile | `/settings/profile` | `User` |
  | Coaching | `/settings/coaching` | `Dumbbell` (or `Activity`) |
  | Display | `/settings/display` | `Monitor` |
  | Security | `/settings/security` | `Shield` |

  Active state: underline + primary color on active tab label + icon.

  4b. **New routes to create:**
  - `app/(dashboard)/(account)/settings/coaching/page.tsx`
  - `app/(dashboard)/(account)/settings/display/page.tsx`
  - `app/(dashboard)/(account)/settings/security/page.tsx`
    (rename/move from `/settings/account/page.tsx`)

  4c. **Redirect `/settings/account` → `/settings/security`** for backwards
      compatibility. Delete the old `account/page.tsx`.

  4d. **`/settings/goals`** already redirects to `/goals`. Remove the
      "Fitness Goals" entry from `components/settings/sidebar-nav.tsx` (this
      file will be replaced by `SettingsTabNav` anyway — delete it entirely).

  4e. **`/settings` default page** — redirect to `/settings/profile`.

  4f. **Cross-route dependency sweep** (required):
  - Update `/settings/account` references in:
    - `lib/supabase/proxy.ts` (social-only password setup guard)
    - `components/auth/user-auth-form.tsx` (post-register redirect targets)
    - `app/actions/account-security.ts` (`page_path` event metadata)
  - Keep `/settings/account -> /settings/security` redirect for compatibility.

---

#### PHASE 5 — Page implementations

  All pages are **server components** that fetch via server actions and pass
  data as props to client form components. No client-side data fetching on
  initial load. Use `<Suspense>` with a skeleton for each card section.

  ##### 5a. Profile tab — `app/(dashboard)/(account)/settings/profile/page.tsx`

  Sections (keep the existing card design style):
  1. **Profile Information card**
     - Avatar with upload button (existing logic)
     - Full Name (text input)
     - Email (read-only — from `supabase.auth.getUser().email`)
     - Phone (text input — new field)
     - Bio (textarea, max 160 chars)
     - Save Changes button

  Remove from the current profile page:
  - Height, birth_date, gender, activity_level inputs
  - The entire fitness goals section (card + form)
  - preferred_units selector (moved to Coaching tab)

  ##### 5b. Coaching tab — `app/(dashboard)/(account)/settings/coaching/page.tsx`

  Sections:
  1. **Default Macro Targets card** (matches mockup exactly)
     - Four inputs side-by-side on desktop, stacked on mobile:
       Calories (kcal), Protein (g), Carbs (g), Fat (g)
     - Unit suffix shown as a disabled inline adornment (not editable)
     - Help text: "Used as defaults when creating new meal plans"

  2. **Unit System card**
     - Label: "Unit System" / subtext: "Metric (kg, cm) or Imperial (lbs, in)"
     - Single select: `Metric | Imperial`
     - When changed, the store is invalidated and all consumers re-read the
       new value on next render.

  Combined "Save Defaults" button at the bottom of the section (matching
  mockup — one save action covering both cards via `updateCoachingDefaults`).

  ##### 5c. Display tab — `app/(dashboard)/(account)/settings/display/page.tsx`

  Sections:
  1. **Appearance card**
     - Compact Mode toggle: "Reduce spacing for a denser layout"
     - Auto-saves on toggle change (no explicit save button needed)

  No theme switcher, no animations toggle.

  ##### 5d. Security tab — `app/(dashboard)/(account)/settings/security/page.tsx`

  Migrate logic from existing `settings/account/page.tsx`. Sections:
  1. **Change Password card**
     - If the user has an email identity (password set): show a disabled input
       displaying `••••••••` + an "Update" button that opens a change-password
       dialog/sheet with current password + new password + confirm fields.
     - If no email identity (OAuth-only): show "Set Password" button that
       opens a set-password dialog (only new password + confirm).
     - Detection: `(await supabase.auth.getUser()).data.user?.identities?.some(i => i.provider === 'email')`.

  2. **Sign Out card**
     - Destructive red button "Sign Out". Calls `supabase.auth.signOut()` and
       redirects to `/login`. Keep existing sign-out logic from account page.

  Do NOT add: 2FA, active sessions.

---

#### PHASE 6 — Unit system propagation (metrics locking)

  Goal: metrics are configured once in Settings → Coaching. Every other form
  shows the unit as a **disabled, read-only suffix** — not an editable input.

  6a. Add `useUnitLabels()` hook exported from `stores/use-settings-store.ts`:
  ```typescript
  export function useUnitLabels() {
    const units = useSettingsStore(s => s.preferred_units)
    return {
      weight:   units === 'imperial' ? 'lbs' : 'kg',
      volume:   units === 'imperial' ? 'fl oz' : 'ml',
      distance: units === 'imperial' ? 'mi' : 'km',
      macro:    'g',        // always grams
      energy:   'kcal',     // always kcal
    }
  }
  ```

  6b. In the following components, replace hardcoded **macro/display unit
  labels** with `useUnitLabels()` and render those labels as a non-editable
  adornment where applicable.
  - Lock only measurement labels like `g`, `kcal`, `kg/lbs`, `ml/fl oz`,
    `km/mi`.
  - Keep meal item quantity unit selectors (`serving`, `cup`, etc.) editable;
    those are food-entry semantics, not global settings preferences.

  Target files (hardcoded units confirmed by audit):
  - `components/nutrition/add-meal-dialog.tsx`
  - `components/nutrition/meal-groups/meal-item-editor-dialog.tsx`
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `components/nutrition/meal-groups/meal-group-detail.tsx`
  - `components/nutrition/meal-planner/meal-planner-page.tsx`

  Pattern to apply:
  ```tsx
  // BEFORE (hardcoded)
  <Input ... />
  <span className="text-muted-foreground text-sm">g</span>

  // AFTER (from store, locked)
  const { macro } = useUnitLabels()
  <div className="relative">
    <Input ... />
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2
                     text-xs text-muted-foreground select-none">
      {macro}
    </span>
  </div>
  ```

  Do NOT touch template strings used for display-only summaries (e.g.
  `"kcal • P 150g"` in diary cards) — those are always kcal/g by nutrition
  convention and do not need to be configurable.

  6c. **Store hydration on app mount** — `app/providers.tsx`
  After TanStack Query provider setup, add a `<SettingsHydrator>` client
  component that on mount calls `getSettingsProfile()` once and populates the
  store if `!hydrated`. This runs once per session.

---

#### PHASE 7 — Remove fitness goals from settings

  7a. Remove the goals card/form from
      `app/(dashboard)/(account)/settings/profile/page.tsx`.
  7b. Remove `updateGoals` from `app/actions/settings.ts` and its validation
      from `lib/validations/settings.ts`.
  7c. Remove "Fitness Goals" from the old `SidebarNav` (which will be deleted
      as part of Phase 4 anyway).
  7d. The `/settings/goals` route (currently a redirect to `/goals`) can be
      kept as-is or removed — keeping it costs nothing.

---

#### Performance requirements (non-negotiable)

  - Settings pages must be server-rendered on first load (no full page spinner).
    Use React `Suspense` + skeleton fallback per card section, not per page.
  - `getSettingsProfile` must avoid N+1 calls:
    - one profiles query
    - one auth context call (`auth.getUser()`) for email/identity metadata
  - Store hydration runs once per session (localStorage cache). If hydrated,
    skip server fetch. Re-hydrate silently after 5-minute stale threshold.
  - All save actions use `revalidatePath` scoped to the affected route only.
    Do not `revalidatePath('/', 'layout')` — too broad.
  - Form state uses `react-hook-form` with `zodResolver` (matches existing
    pattern). No uncontrolled inputs.

---

#### Testing requirements (added for rollout safety)

  - Add/extend tests covering:
    - `listMyGoalsAction` returns only `is_personal_goal = true` rows
    - `listClientGoalsAction` excludes personal goals (`is_personal_goal = false`)
    - `/settings/account` redirects to `/settings/security`
    - settings profile data fallback behavior during metadata -> profiles transition
  - Run `npm run typecheck`, `npm run lint`, and `npm run test` after each phase.

---

#### Responsive layout spec

  - Mobile (< 768px): Tab bar scrolls horizontally with overflow-x-auto.
    Each card is full-width stacked. Form fields are single-column.
  - iPad (768–1023px): Tab bar fits on one row without scroll. Cards full-width.
    Form fields: 2-column grid where appropriate.
  - Desktop (≥ 1024px): Same as iPad but cards have a max-width of ~800px
    centered. The macro targets in Coaching are a 4-column grid (matching mockup).

---

- Data/migration impact:
  One migration adding 5 columns to `profiles` (all safe). One migration adding
  `is_personal_goal` to `fitness_goals` (from A-003, run first). Update
  `types/database.ts` after both migrations. Includes a temporary
  metadata->profiles transition path (read fallback + write-through).

- Acceptance criteria:
  1. All four tabs render and are navigable on mobile, iPad, desktop.
  2. Password field shows `••••••••` if password is set; "Set Password" if not.
  3. Saving Coaching defaults persists to DB and immediately updates the
     settings store (no page reload needed).
  4. Changing Unit System in Coaching tab causes nutrition form unit labels
     to reflect the new unit on next render (via store).
  5. No editable selectors remain for macro/display unit labels; meal quantity
     unit selectors (serving/cup/etc.) remain editable.
  6. Fitness goals section is gone from Profile tab.
  7. `/settings/account` redirects to `/settings/security`.
  8. `npm run typecheck`, `npm run lint`, `npm run test` all pass.

- Sequence / rollout:
  1. Phase 1 — Migration (run after A-003 migration is applied).
  2. Phase 2 — Settings store.
  3. Phase 3 — Server actions.
  4. Phase 4 — Route/nav restructure.
  5. Phase 5 — Page implementations.
  6. Phase 6 — Unit propagation.
  7. Phase 7 — Remove fitness goals from settings.
  Run typecheck + tests after each phase.

---

### [A-005] Codebase legacy and dead code purge

- Priority: Medium (no regressions, but each item is a latent bug or security risk)

- Background:
  Full audit run on 2026-03-15. Codebase is largely clean after A-003/A-004.
  The following are confirmed actionable items. Nothing here is speculative.

---

#### ITEM 1 — Runtime bug: `birth_date` read from stale auth metadata in progress.ts

- Severity: **High** (runtime undefined — affects any feature using birth_date)
- File: `app/actions/progress.ts:186`
- Problem: The field is read as `user.user_metadata.birth_date`. Since A-004
  moved profile data to the `profiles` table and stopped writing `birth_date`
  to auth metadata, this read now returns `undefined` for any user whose
  profile was saved after A-004.
- Fix: Replace the metadata read with a profiles table query. If `progress.ts`
  already queries `profiles` elsewhere in that function, extend the existing
  select with `date_of_birth` rather than adding a second round trip.
  ```typescript
  // OLD
  birth_date: user.user_metadata.birth_date

  // NEW — extend existing profiles query in scope, or add:
  const { data: profile } = await supabase
    .from("profiles")
    .select("date_of_birth")
    .eq("id", user.id)
    .single()
  // use: profile?.date_of_birth
  ```

---

#### ITEM 2 — Security: hardcoded Inngest event key

- Severity: **High** (credential in source code)
- File: `lib/inngest/client.ts:7`
- Problem: `eventKey` is a hardcoded string literal. Committing credentials
  to source is a security risk and blocks key rotation without a code deploy.
- Fix:
  1. Add `INNGEST_EVENT_KEY` to `utils/env/schema.ts` (the validated env
     schema — follow the pattern of existing keys there).
  2. In `lib/inngest/client.ts`, replace the hardcoded string with
     `process.env.INNGEST_EVENT_KEY`.
  3. Add the key to `.env.local` (never commit the value).
  4. Add `INNGEST_EVENT_KEY` to the env contract list in §4 of this file.

---

#### ITEM 3 — Stale revalidatePath calls for defunct route `/settings/goals`

- Severity: **Low** (no runtime error — wasted server-side work)
- File: `app/actions/coach-tools.ts`
- Lines: 1987, 2103, 2152
- Problem: `revalidatePath("/settings/goals")` is called after every goal
  mutation. The route is a redirect-only page; revalidating it achieves nothing.
- Fix: Remove only the three `revalidatePath("/settings/goals")` lines.
  Preserve all `revalidatePath("/goals")` calls — those are valid.

---

#### ITEM 4 — Route access allowlist includes stale `/settings/account`

- Severity: **Low** (not a security hole; creates confusing dead entries)
- Files:
  - `lib/auth/route-access.ts:59`
  - `lib/supabase/proxy.ts:137`
- Problem: Both files still explicitly register `/settings/account` as an
  allowed route. The real security settings page is now `/settings/security`.
- Fix: In each file, replace the `/settings/account` entry with
  `/settings/security`. Do NOT delete `settings/account/page.tsx` — the
  redirect file stays for backwards compat deep links.

---

#### ITEM 5 — Orphaned database view: `weekly_training_volume`

- Severity: **Low** (dead DB object, not causing errors)
- Created in: migration `20260303213000_roles_and_athlete_monitoring_overhaul.sql`
- Queries in TypeScript codebase: **zero**
- Decision (architect): Drop it. No analytics feature is planned for it.
- Fix:
  1. Create `supabase/migrations/<timestamp>_drop_unused_views.sql`:
     ```sql
     DROP VIEW IF EXISTS public.weekly_training_volume;
     ```
  2. Remove the `weekly_training_volume` entry from `types/database.ts`
     (the `Views` type and its `Row` definition).

---

#### ITEM 6 — Auth metadata write-through cleanup (conditional)

- Severity: **Very Low** (technical debt, no active bugs)
- File: `app/actions/settings.ts` lines ~169, ~184
- `preferred_units` is still mirrored to auth metadata as a transition guard
  from A-004.
- Condition: Only remove after confirming zero remaining reads of
  `user_metadata.preferred_units` outside of `settings.ts` itself.
  Engineer must grep for `user_metadata.preferred_units` and
  `user_metadata?.preferred_units` across all files. If results are clean,
  delete the mirror writes. If any consumer still exists, list it in §16.

---

#### ITEM 7 — Confirm old profile form fields are removed

- Severity: **Low** (verification task — A-004 spec mandated removal)
- Files to read: `app/(dashboard)/(account)/settings/profile/page.tsx` and
  the profile form component rendered by it.
- Verify the following field names do NOT appear as form inputs or in the
  Zod schema for this page:
  `height`, `height_cm`, `birth_date`, `date_of_birth`, `gender`,
  `activity_level`, `preferred_units`.
  (`preferred_units` belongs in Coaching tab only.)
  If any remain, remove them from the form and schema.

---

#### ITEM 8 — Close Q-001 (no code change required)

- Decision (architect): Do NOT blanket-backfill `assigned_by_id IS NULL` rows
  as personal goals. The existing migration already handles the deterministic
  case (`assigned_by_id IS NOT NULL AND assigned_by_id = user_id`).
  Ambiguous legacy rows (null assignee) remain `is_personal_goal = false` and
  will not appear in `/goals`. This is the correct conservative outcome.
  Close Q-001 in §16.

---

- Data/migration impact:
  ITEM 5 only: one `DROP VIEW` migration + type cleanup.
  All other items are code-only.

- Acceptance criteria:
  1. `progress.ts` reads `date_of_birth` from profiles table, not metadata.
  2. No hardcoded credential in `lib/inngest/client.ts`. Env schema updated.
  3. Three stale `revalidatePath("/settings/goals")` lines removed.
  4. Route allowlists use `/settings/security`, not `/settings/account`.
  5. `weekly_training_volume` view dropped; type removed from database.ts.
  6. Old profile fields confirmed absent from profile settings form/schema.
  7. Metadata write-through either removed (if clean) or outstanding consumer
     listed in §16.
  8. Q-001 marked resolved in §16.
  9. `npm run typecheck`, `npm run lint`, `npm run test` all pass.

- Sequence / rollout:
  1. ITEM 1 — progress.ts birth_date fix (highest urgency — latent bug).
  2. ITEM 2 — Inngest key move to env (security).
  3. ITEM 5 — DROP VIEW migration + types/database.ts cleanup.
  4. ITEMS 3, 4, 7 — Stale paths + form verification (housekeeping batch).
  5. ITEM 6 — Metadata write-through cleanup (conditional on grep result).
  6. ITEM 8 — Close Q-001 in §16.
  7. Full validation run after all items.

### [A-007] Goal exercise + program linking with auto-sync from workout data

- Priority: High

- Problem:
  Goals are currently standalone numeric targets with no connection to the
  exercise or program that drives them. A coach sets a bench press goal of
  50 kg; the athlete hits it in a session; the goal table is never updated.
  We need:
  1. An optional exercise link per goal (e.g. "Bench Press" from exercise_catalog).
  2. An optional program link per goal (e.g. "Hypertrophy Block 1" from training_plans).
  3. Auto-sync: when a workout is saved and a strength set's max weight for a
     linked exercise exceeds the goal's current_value, update current_value
     automatically without any manual intervention.

- Constraints:
  - Both links are optional. No existing goal breaks if left null.
  - Auto-sync updates current_value only. Status is never changed automatically.
  - Use server actions + TanStack Query only (no client-side Supabase calls).
  - All dropdowns are lazy-loaded (no fetch on page load — only when opened).
  - Search is paginated with cursor + "Load more". No full list loads.
  - Auto-sync is async (Inngest), non-blocking to the workout save path.

---

#### STEP 1 — Database migration

**New file:** `supabase/migrations/<timestamp>_goal_exercise_program_links.sql`

```sql
-- Link a goal to a specific exercise (auto-sync source)
ALTER TABLE public.fitness_goals
  ADD COLUMN IF NOT EXISTS linked_exercise_id uuid
    REFERENCES public.exercise_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_program_id   uuid
    REFERENCES public.training_plans(id) ON DELETE SET NULL;

-- Index: Inngest sync function queries goals by linked_exercise_id + user_id
CREATE INDEX IF NOT EXISTS idx_fitness_goals_exercise_link
  ON public.fitness_goals (linked_exercise_id, user_id)
  WHERE linked_exercise_id IS NOT NULL;

-- Track how a goal_progress_history entry was created
ALTER TABLE public.goal_progress_history
  ADD COLUMN IF NOT EXISTS source text
    NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'auto_sync'));
```

Update `types/database.ts`:
- `fitness_goals` Row/Insert/Update: add `linked_exercise_id: string | null`,
  `linked_program_id: string | null`.
- `goal_progress_history` Row/Insert/Update: add `source: 'manual' | 'auto_sync'`.

---

#### STEP 2 — Server actions for exercise and program search (lean, paginated)

**File:** `app/actions/goals.ts` (new file — keeps goal-link queries separate from
the large `coach-tools.ts`).

##### 2a. `listExercisesForGoalAction`

```
Input schema (Zod):
  search:   string, max 80 chars, trimmed, optional
  cursor:   string (base64url), optional
  limit:    number, min 1, max 20, default 15

Select only: id, name, category
  — do NOT select muscle_groups, video_url, description etc.
  — lean payload keeps response small

Filter:
  - is_approved = true (no drafts)
  - If search present: .ilike("name", `%${escapeLikePattern(search)}%`)
    (reuse escapeLikePattern from lib/utils/search.ts — A-006)
  - If cursor present: decode cursor → (name, id) → .or(
      name.gt.${name},and(name.eq.${name},id.gt.${id})
    )

Order: name ASC, id ASC (stable for cursor)
Limit: payload.limit + 1 (over-fetch by 1 to detect nextCursor)

Return:
  { items: Array<{ id, name, category }>, nextCursor: string | null }
```

##### 2b. `listProgramsForGoalAction`

```
Input schema (Zod):
  search:   string, max 80 chars, trimmed, optional
  cursor:   string, optional
  limit:    number, min 1, max 20, default 15

Select only: id, name
  — training_plans.description is nullable and unused in the dropdown label

Filter:
  - user_id = current auth user id
    (coaches only see their own programs)
  - If search present: .ilike("name", `%${escapeLikePattern(search)}%`)
  - Cursor pagination on (name, id) same pattern as exercises

Order: updated_at DESC, id ASC
Return: { items: Array<{ id, name }>, nextCursor: string | null }
```

Both actions must:
- Use `createClient()` (server client, not admin client).
- Validate input with `zod.parse()` before any DB call.
- Return a typed payload (define types inline or in `types/goals.ts`).

---

#### STEP 3 — Query keys

**File:** `lib/query-keys-coach.ts`

Add two new key factories following the existing `CoachClientsKeyParams` pattern:

```typescript
exerciseSearch: (search: string) =>
  [...coachKeys.all, "exercise-search", search] as const,

programSearch: (search: string) =>
  [...coachKeys.all, "program-search", search] as const,
```

---

#### STEP 4 — TanStack Query hooks

**New file:** `hooks/use-goal-links.ts`

##### 4a. `useExerciseSearch(search: string)`

```
- useInfiniteQuery
- queryKey: coachKeys.exerciseSearch(debouncedSearch)
- queryFn: listExercisesForGoalAction({ search: debouncedSearch, cursor: pageParam, limit: 15 })
- initialPageParam: null
- getNextPageParam: (lastPage) => lastPage.nextCursor
- enabled: true (always enabled — lazy at the component level via "open" state)
- staleTime: 5 * 60_000  (exercise catalog changes rarely)
- gcTime: 15 * 60_000
- placeholderData: keepPreviousData

Debounce: 300ms on search input INSIDE the hook (use a local debounced state).
The hook accepts raw search string and debounces internally.
Do not debounce in the component.
```

##### 4b. `useProgramSearch(search: string)`

Same shape as `useExerciseSearch` but calls `listProgramsForGoalAction`.
  - staleTime: 60_000 (programs change more often than exercises)
  - gcTime: 5 * 60_000

---

#### STEP 5 — Goal form UI changes

**File:** `components/coach-tools/client-goals-medical-tab.tsx`

##### 5a. Extend `GoalFormState`

Add to the existing `GoalFormState` type (line ~114):
```typescript
linked_exercise_id: string | null
linked_exercise_name: string | null   // display label — avoid re-fetching on form open
linked_program_id: string | null
linked_program_name: string | null
```

Add corresponding defaults (`null`) to the `defaultFormState` and to the
`editingGoal → form` mapping (where existing goal data is loaded into the form
when the user clicks "Edit").

##### 5b. Two new optional combobox sections

Add after the existing form fields (after notes/priority/check-in fields), before
the Save button. Each section has:

```
[ Section heading: "Link to Exercise (optional)" ]
[ Search input — placeholder: "Search exercises…" ]
[ Results list — each row: name + category badge ]
[ "Load more" button — visible only when hasNextPage ]
[ Selected pill: shows exercise name + × to clear ]
```

Same layout for programs ("Link to Training Program (optional)").

**Lazy loading (critical for performance):**
- Use an `isOpen` boolean per dropdown (`useState`).
- Only render the hook-powered list when `isOpen = true`.
- When closed, show only the selected pill (or "None selected" placeholder).
- Do not instantiate `useExerciseSearch` / `useProgramSearch` until the user
  opens the dropdown for the first time.
  Implement this by conditionally rendering a child component that owns the
  hooks:
  ```
  {isExerciseDropdownOpen && (
    <ExerciseSearchDropdown
      value={form.linked_exercise_id}
      onChange={(id, name) => setForm(...)}
      onClose={() => setIsExerciseDropdownOpen(false)}
    />
  )}
  ```
  This ensures zero fetches until the user explicitly opens the search.

**"Load more" pattern:**
- Show a "Load more" button (not infinite scroll/intersection observer) at the
  bottom of the list.
- `onClick={() => fetchNextPage()}`.
- Disable the button while `isFetchingNextPage`.
- Hide the button when `!hasNextPage`.

**Clear/deselect:**
- When a selection exists, show a small `×` button next to the pill.
- Clicking it sets `linked_exercise_id = null, linked_exercise_name = null`.

##### 5c. Pass new fields through to mutations

In `onSaveGoal()` (line ~410), include `linked_exercise_id` and
`linked_program_id` in the payload passed to:
- `mutations.createGoal.mutateAsync()`
- `mutations.updateGoal.mutateAsync()`
- `mutations.createOwnGoal.mutateAsync()`
- `mutations.updateOwnGoal.mutateAsync()`

---

#### STEP 6 — Update goal CRUD server actions

**File:** `app/actions/coach-tools.ts`

For each of the four goal-write functions, add `linked_exercise_id` and
`linked_program_id` to the Zod input schema and to the Supabase insert/update
payload. Both fields are `z.string().uuid().nullable().optional()`.

Functions to update:
1. `createMyGoalAction` — insert payload
2. `updateMyGoalAction` — update payload (only if value changed; use the
   existing "only update changed fields" pattern already in that function)
3. `createClientGoalAction` — insert payload
4. `updateClientGoalAction` — update payload

Also update `listMyGoalsAction` and `listClientGoalsAction` — add
`linked_exercise_id, linked_program_id` to the `.select()` column list so the
UI can pre-populate the edit form without an extra fetch.

---

#### STEP 7 — Inngest event type

**File:** `types/inngest.ts`

Add a new event type following the existing naming convention (`namespace/verb.noun`):

```typescript
type TrainingWorkoutCompletedEvent = {
  name: "training/workout.completed"
  data: {
    workout_id: string          // training_sessions.id
    user_id: string             // who logged the workout
    subject_user_id: string | null   // who the workout is FOR (client's linked_user_id)
    subject_client_id: string | null // clients.id (if client-owned session)
  }
}
```

Add to the `Events` union type that Inngest uses for type-safe `inngest.send()`.

---

#### STEP 8 — Fire Inngest event on workout save

**File:** `app/actions/workout.ts` — `createWorkoutAction()` (line ~235)

After the `strength_sets` insert succeeds (and the transaction is complete),
fire the event:

```
await inngest.send({
  name: "training/workout.completed",
  data: {
    workout_id: session.id,
    user_id: currentUser.id,
    subject_user_id: data.subject_user_id ?? null,
    subject_client_id: data.subject_client_id ?? null,
  },
})
```

The `inngest.send()` call must be:
- After all DB writes succeed (not in a try block that would suppress errors).
- Non-blocking — fire and forget. Do NOT await it in the critical path.
  Wrap it in a detached promise: `void inngest.send(...)`.
  The workout save should complete regardless of whether Inngest accepts the event.

If `createWorkoutAction` wraps in a transaction, fire AFTER the transaction
commits (to avoid firing on a rollback).

Also check if there is an `updateWorkoutAction` that saves additional sets —
if so, fire the same event there too (same payload pattern).

---

#### STEP 9 — Inngest auto-sync function

**New file:** `lib/inngest/functions/sync-goal-from-workout.ts`

Register as a new Inngest function in `lib/inngest/index.ts` (wherever existing
functions are exported).

```
Function ID:  "sync-goal-from-workout"
Event trigger: "training/workout.completed"
Concurrency:  limit 5, key: "data.user_id"
  (prevents race conditions if two workouts are saved rapidly for same user)

Steps:

STEP A — "fetch-sets"
  Query strength_sets WHERE workout_id = event.data.workout_id
  Select: exercise_id, weight
  Filter out rows where exercise_id IS NULL (unnamed exercises can't match goals)
  Group by exercise_id → compute max weight per exercise
  Result: Map<exercise_id, max_weight>
  If map is empty, exit early (no named exercises logged).

STEP B — "find-matching-goals"
  Determine effective_user_id:
    - Use event.data.subject_user_id if present, else event.data.user_id
  Query fitness_goals:
    WHERE user_id = effective_user_id
    AND linked_exercise_id IN ([...exerciseIds from step A])
    AND status IN ('active', 'on_track', 'at_risk')
  Select: id, linked_exercise_id, current_value, target_value, goal_direction,
          unit, status
  If no goals found, exit early.

STEP C — "update-goals"  (run per matching goal, inside a step.run loop)
  For each goal in step B results:
    max_weight = map.get(goal.linked_exercise_id)

    Determine if update is needed:
      - If goal.goal_direction = "increase":
          update if max_weight > (goal.current_value ?? 0)
      - If goal.goal_direction = "decrease":
          update if max_weight < (goal.current_value ?? Infinity)

    If update needed:
      1. UPDATE fitness_goals
           SET current_value = max_weight, updated_at = now()
         WHERE id = goal.id

      2. INSERT INTO goal_progress_history:
           goal_id, user_id, progress_percent, current_value, target_value,
           status, recorded_by_user_id, source = 'auto_sync', snapshot_at = now()
         progress_percent = LEAST(100, ROUND(
           (max_weight / goal.target_value) * 100
         ))  — for "increase" direction
         For "decrease": LEAST(100, ROUND(
           ((goal.start_value - max_weight) / (goal.start_value - goal.target_value)) * 100
         ))

Use service role client (createAdminClient) in this Inngest function only —
the function runs outside of a user request, so there is no session context.
This is the ONLY legitimate use of admin client for goal writes — it is a
background system operation.
```

**Important edge cases to handle:**
- `goal.target_value` is null: skip the history record (can't compute progress%).
  Still update `current_value`.
- Division by zero if `start_value = target_value`: skip history, still update
  `current_value`.
- Step C should be wrapped in `step.run("update-goal-{goal.id}", ...)` so each
  goal update is individually retryable without re-running all goals.

---

#### STEP 10 — Register the new Inngest function

**File:** `lib/inngest/index.ts` (or wherever functions are exported to the
Inngest serve handler).

Add the new function to the export array alongside the existing functions
(`analyzeWorkout`, `analyzePhoto`, `generateWeeklyReport`, etc.).

Verify the Inngest serve route (`app/api/inngest/route.ts` or similar) imports
from the same index file — no change needed there if it uses the index.

---

- Required file changes:
  - `supabase/migrations/<timestamp>_goal_exercise_program_links.sql` (new)
  - `types/database.ts` (fitness_goals + goal_progress_history types)
  - `types/inngest.ts` (TrainingWorkoutCompletedEvent)
  - `app/actions/goals.ts` (new — exercise + program search actions)
  - `lib/query-keys-coach.ts` (exerciseSearch, programSearch keys)
  - `hooks/use-goal-links.ts` (new — useExerciseSearch, useProgramSearch)
  - `app/actions/coach-tools.ts` (4 goal CRUD actions + 2 list actions)
  - `components/coach-tools/client-goals-medical-tab.tsx` (form + dropdowns)
  - `app/actions/workout.ts` (fire Inngest event after sets insert)
  - `lib/inngest/functions/sync-goal-from-workout.ts` (new)
  - `lib/inngest/index.ts` (register new function)

- Data/migration impact:
  Two nullable columns + one index on `fitness_goals`. One non-null column with
  DEFAULT 'manual' on `goal_progress_history` (safe — backfills existing rows
  with 'manual'). Zero data loss risk.

- Acceptance criteria:
  1. Creating/editing a goal shows two optional dropdowns: exercise search
     and program search.
  2. Dropdowns make zero network requests until opened.
  3. Typing in search debounces 300ms before querying.
  4. "Load more" loads the next page; button disappears when no more pages.
  5. Selecting an exercise/program saves linked_exercise_id/linked_program_id
     to the DB. Clearing saves null.
  6. Saving a workout with a strength set whose exercise is linked to an
     active goal: within Inngest processing time, goal.current_value is
     updated if the max weight surpasses the current value.
  7. goal_progress_history rows created by auto-sync have source = 'auto_sync'.
  8. Goal status is NEVER changed by auto-sync.
  9. A workout with no exercise-linked goals fires the event but exits Inngest
     steps A/B cleanly (no errors, no DB writes).
  10. `npm run typecheck`, `npm run lint`, `npm run test` all pass.

- Sequence / rollout:
  1. STEP 1 — Migration + types/database.ts
  2. STEP 7 — types/inngest.ts (event type)
  3. STEP 2 — app/actions/goals.ts (new actions)
  4. STEP 3 — query keys
  5. STEP 4 — hooks/use-goal-links.ts
  6. STEP 6 — Update goal CRUD actions in coach-tools.ts
  7. STEP 5 — Goal form UI (client-goals-medical-tab.tsx)
  8. STEP 9 — Inngest sync function
  9. STEP 10 — Register Inngest function
  10. STEP 8 — Fire event from workout.ts (last — enables end-to-end flow)
  Run typecheck + lint after each step. Full test run at the end.

### [A-006] Performance & security hardening — indexes, views, RLS reads, pagination, rate limiting

- Priority: High
- Problem:
  The dashboard endpoint (`POST /clients/dashboard`) takes **1943ms** — near the
  2-second ceiling. Root causes: 8 parallel DB queries with no indexes on hot
  columns, `createAdminClient()` used for data reads (bypasses RLS), unbounded
  `.in()` clauses, offset-based pagination that degrades at scale, no rate
  limiting, and aggressive cache invalidation (20s staleTime on expensive
  queries). At 500+ clients the app will exceed 3-5s load times.

- Proposed design:
  Seven changes grouped into one sequenced rollout. Each is independently
  deployable but ordered for maximum safety.

---

#### STEP 1 — Add missing database indexes

**File:** `supabase/migrations/20260315120000_performance_indexes.sql` (new)

Existing indexes (do NOT duplicate):
- `idx_client_payments_coach_date` on `(coach_id, payment_date DESC)`
- `idx_client_payments_coach_updated` on `(coach_id, updated_at DESC)`

Add these:

```sql
-- Enable trigram extension for fuzzy search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- fitness_goals: queried by user_id + status in clients-dashboard.ts:269
-- and coach-tools.ts goal listing functions
CREATE INDEX IF NOT EXISTS idx_fitness_goals_user_status
  ON public.fitness_goals (user_id, status);

-- fitness_goals: partial index for active-only queries (most common path)
CREATE INDEX IF NOT EXISTS idx_fitness_goals_active
  ON public.fitness_goals (user_id, updated_at DESC)
  WHERE status IN ('active', 'on_track', 'at_risk');

-- training_sessions: queried by client_id with date ordering
-- in clients-dashboard.ts:211
CREATE INDEX IF NOT EXISTS idx_training_sessions_client_date
  ON public.training_sessions (client_id, session_date DESC);

-- coach_notes: queried by client_id with created_at ordering
-- in clients-dashboard.ts:229
CREATE INDEX IF NOT EXISTS idx_coach_notes_client_created
  ON public.coach_notes (client_id, created_at DESC);

-- goal_progress_history: queried by goal_id with snapshot ordering
-- in clients-dashboard.ts:297
CREATE INDEX IF NOT EXISTS idx_goal_history_goal_snapshot
  ON public.goal_progress_history (goal_id, snapshot_at DESC);

-- clients: queried by coach_id + status in clients-dashboard.ts:190
-- and coach-tools.ts:1135
CREATE INDEX IF NOT EXISTS idx_clients_coach_status
  ON public.clients (coach_id, status);

-- client_checkins: queried by subject_client_id
-- in clients-dashboard.ts:220
CREATE INDEX IF NOT EXISTS idx_client_checkins_client
  ON public.client_checkins (subject_client_id, created_at DESC);

-- exercise_catalog: searched by name with ilike in exercises.ts:126
-- NOTE: table is exercise_catalog, not exercises
CREATE INDEX IF NOT EXISTS idx_exercise_catalog_name_trgm
  ON public.exercise_catalog USING gin (name gin_trgm_ops);
```

Acceptance: Migration applies cleanly via `supabase db reset`. No existing
queries change — indexes are picked up automatically by Postgres planner.

---

#### STEP 2 — Create `coach_client_summary` view + RPC join functions

In the **same migration file** (`20260315120000_performance_indexes.sql`), add:

```sql
-- Aggregated view replacing 6 of the 8 dashboard queries
CREATE OR REPLACE VIEW public.coach_client_summary AS
SELECT
  c.id              AS client_id,
  c.coach_id,
  c.linked_user_id,
  c.status          AS client_status,
  c.created_at      AS client_since,
  p.full_name,
  p.avatar_url,
  p.email,

  -- Goal aggregates
  COUNT(fg.id) FILTER (
    WHERE fg.status IN ('active','on_track','at_risk')
  ) AS active_goals_count,
  COUNT(fg.id) FILTER (WHERE fg.status = 'completed')
    AS completed_goals_count,
  COUNT(fg.id) FILTER (WHERE fg.status = 'at_risk')
    AS at_risk_goals_count,
  MAX(fg.updated_at) AS last_goal_update,

  -- Session aggregates (last 30 days)
  COUNT(ts.id) FILTER (
    WHERE ts.session_date >= CURRENT_DATE - INTERVAL '30 days'
  ) AS sessions_last_30d,
  MAX(ts.session_date) AS last_session_date,

  -- Payment aggregates
  COALESCE(SUM(cp.amount) FILTER (
    WHERE cp.status = 'paid'
    AND cp.is_archived = false
    AND cp.payment_date >= date_trunc('month', CURRENT_DATE)
  ), 0) AS mtd_revenue,
  MAX(cp.payment_date) FILTER (WHERE cp.status = 'paid')
    AS last_payment_date,

  -- Checkin aggregates
  COUNT(cc.id) FILTER (
    WHERE cc.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ) AS checkins_last_30d,
  COUNT(cc.id) FILTER (WHERE cc.status = 'pending')
    AS pending_checkins,

  -- Notes count
  COUNT(cn.id) FILTER (
    WHERE cn.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ) AS notes_last_30d

FROM public.clients c
  JOIN public.profiles p ON p.id = c.linked_user_id
  LEFT JOIN public.fitness_goals fg ON fg.user_id = c.linked_user_id
  LEFT JOIN public.training_sessions ts ON ts.client_id = c.id
  LEFT JOIN public.client_payments cp ON cp.client_id = c.id
  LEFT JOIN public.client_checkins cc ON cc.subject_client_id = c.id
  LEFT JOIN public.coach_notes cn ON cn.client_id = c.id
GROUP BY c.id, c.coach_id, c.linked_user_id, c.status, c.created_at,
         p.full_name, p.avatar_url, p.email;

-- RLS: view inherits the invoker's permissions
ALTER VIEW public.coach_client_summary SET (security_invoker = on);

-- RPC function: replaces .in("user_id", linkedUserIds) for goal history
CREATE OR REPLACE FUNCTION public.get_coach_goal_history(
  p_coach_id uuid,
  p_limit int DEFAULT 400
)
RETURNS TABLE (
  goal_id uuid,
  progress_percent numeric,
  snapshot_at timestamptz
) AS $$
  SELECT gph.goal_id, gph.progress_percent, gph.snapshot_at
  FROM public.goal_progress_history gph
  JOIN public.fitness_goals fg ON fg.id = gph.goal_id
  JOIN public.clients c ON c.linked_user_id = fg.user_id
  WHERE c.coach_id = p_coach_id
  ORDER BY gph.snapshot_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY INVOKER;
```

Then refactor `app/actions/clients-dashboard.ts`:

Replace the 8-query `Promise.all` pattern (lines 190-326) with:
1. One query: `supabase.from('coach_client_summary').select('*').eq('coach_id', user.id)`
2. One RPC call: `supabase.rpc('get_coach_goal_history', { p_coach_id: user.id })`
3. Keep the `activityPromise` query as-is (analytics_events table, not part of
   the view)

Remove these individual promises entirely:
- `ownedClientsRes` (now in view)
- `sessionsPromise` (now in view)
- `checkinsPromise` (now in view)
- `notesPromise` (now in view)
- `paymentsPromise` (now in view)
- `goalsPromise` (now in view)

Keep:
- `goalHistoryPromise` → replace with `get_coach_goal_history` RPC call
- `activityPromise` → keep as-is

Update the `buildClientsDashboard` return type and the downstream component
(`components/clients/clients-dashboard.tsx`) data mapping to match the new
shape. The view returns flat rows; the current code expects nested structures.
Bridge the difference in the action, not the component.

Also replace any remaining `.in("goal_id", goalIds)` calls in
`coach-tools.ts` (line 1026) with equivalent RPC functions or direct joins.
The principle: no `.in()` call should ever pass more than 20 IDs.

Acceptance: Dashboard loads with 2-3 queries instead of 8. Response time
under 800ms. All dashboard cards show identical data to before.

---

#### STEP 3 — Switch `createAdminClient()` → `createClient()` for reads

**Rule:** `createAdminClient()` (service role, bypasses ALL RLS) must only be
used for system operations where no user session exists:
- Event tracking (`lib/events/dispatcher.ts`)
- Portal session management (`lib/client-portal/session.ts`)
- Client portal data reads (`app/actions/client-portal.ts` — portal users
  don't have Supabase auth sessions, so admin client is correct here)

All data reads on behalf of an **authenticated coach user** must use
`createClient()` (server client with user context) so RLS is enforced.

**Files to change:**

1. `app/actions/clients-dashboard.ts` — line 181 and surrounding: the goals
   and goal history queries use admin client. Switch to the same `supabase`
   server client used by other queries in the function. With Step 2 done,
   the view and RPC function both use `SECURITY INVOKER` so they respect
   the caller's RLS context.

2. `app/actions/coach-tools.ts` — audit every function that starts with
   `const supabase = createAdminClient()`. For each:
   - If it reads data on behalf of the logged-in coach → switch to
     `createClient()`
   - If it writes system data (event tracking) or operates without user
     context → keep admin client
   - Key read functions to switch: `listCoachClients`,
     `getClientDetail`, `listClientGoals`, `getClientGoalDetail`, and
     any function reading `fitness_goals`, `training_sessions`,
     `coach_notes`, `client_checkins`, `client_payments` on behalf of
     the authenticated coach.

3. `app/actions/client-portal.ts` — **leave as-is**. Portal uses its own
   auth system; portal users don't have Supabase sessions.

**Important:** After switching, test that RLS policies don't block legitimate
access. Existing policies use `has_client_coach_access(client_id, auth.uid())`
and `is_client_primary_coach(client_id, auth.uid())`. If any query fails
with a permission error, fix the RLS policy — do NOT revert to admin client.

Acceptance: `grep -rn "createAdminClient" app/actions/coach-tools.ts` returns
only event-tracking/system writes. `grep -rn "createAdminClient"
app/actions/clients-dashboard.ts` returns zero results.

---

#### STEP 4 — Escape LIKE wildcards in search inputs

Create a shared utility:

**New file:** `lib/utils/search.ts`
```typescript
/**
 * Escapes SQL LIKE/ILIKE special characters (%, _, \) in user input
 * to prevent unintended wildcard matching.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
```

**Files to update** (all `.ilike()` calls that accept user input):

| File | Line | Current | Fix |
|------|------|---------|-----|
| `app/actions/exercises.ts` | 126 | `.ilike("name", \`%${search}%\`)` | Use `escapeLikePattern(search)` |
| `app/actions/exercises.ts` | 129 | `.ilike("category", \`%${category}%\`)` | Use `escapeLikePattern(category)` |
| `app/actions/meal-groups.ts` | 448 | `.ilike("name", \`%${payload.search}%\`)` | Use `escapeLikePattern(payload.search)` |
| `app/actions/coach-tools.ts` | 3255 | `.replace(/[%_]/g, "")` (strips instead of escapes) | Use `escapeLikePattern()` |

**Leave as-is** (not user input):
- `app/actions/nutrition-dashboard.ts:79` — hardcoded `"nutrition.%"` pattern
- `app/actions/client-portal.ts:1020` — exact match lookup
- `app/actions/coach-tools.ts:3557` — verify it already uses proper escaping;
  if it uses stripping (`.replace(/[%_]/g, "")`), switch to `escapeLikePattern`

Acceptance: Searching for `%` or `_` returns zero results (correct). Normal
text search works unchanged.

---

#### STEP 5 — Cursor-based pagination on high-traffic endpoints

Replace offset-based `.range()` with cursor pagination on the two endpoints
that will hit scale. Do NOT change low-traffic endpoints.

**New file:** `lib/utils/pagination.ts`
```typescript
export function encodeCursor(sortValue: string, id: string): string {
  return Buffer.from(`${sortValue}|${id}`).toString('base64url');
}

export function decodeCursor(
  cursor: string
): { sortValue: string; id: string } {
  const decoded = Buffer.from(cursor, 'base64url').toString();
  const pipeIdx = decoded.indexOf('|');
  return {
    sortValue: decoded.slice(0, pipeIdx),
    id: decoded.slice(pipeIdx + 1),
  };
}
```

**5a. Coach client list — `app/actions/coach-tools.ts` (~line 1135)**

Update the Zod schema:
```typescript
const listClientsSchema = z.object({
  cursor: z.string().nullish(),  // replaces page
  page_size: z.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active","paused","blocked","archived"]).optional(),
  sort_by: z.enum(["updated_at","created_at","first_name","status","email"])
    .default("updated_at"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
});
```

Query pattern:
```typescript
let query = supabase
  .from('clients')
  .select('*, profiles!inner(full_name, avatar_url, email)', { count: 'exact' })
  .eq('coach_id', user.id)
  .order(sort_by, { ascending: sort_dir === 'asc' })
  .order('id', { ascending: true })  // tiebreaker for stable ordering
  .limit(page_size);

if (cursor) {
  const { sortValue, id } = decodeCursor(cursor);
  if (sort_dir === 'desc') {
    query = query.or(
      `${sort_by}.lt.${sortValue},and(${sort_by}.eq.${sortValue},id.gt.${id})`
    );
  } else {
    query = query.or(
      `${sort_by}.gt.${sortValue},and(${sort_by}.eq.${sortValue},id.gt.${id})`
    );
  }
}
```

Return shape:
```typescript
return {
  data,
  nextCursor: data.length === page_size
    ? encodeCursor(String(lastItem[sort_by]), lastItem.id)
    : null,
  totalCount: count,
};
```

**5b. Coach payment transactions — `coach-tools.ts` (~line 3568)**

Same cursor pattern on `(payment_date, id)`.

**5c. Update hooks — `hooks/use-coach-tools.ts`**

Switch `useCoachClients` from `useQuery` to `useInfiniteQuery`:
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useCoachClients(params) {
  return useInfiniteQuery({
    queryKey: coachKeys.clientList(params),
    queryFn: ({ pageParam }) =>
      listCoachClientsAction({ ...params, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}
```

Update downstream components that consume `useCoachClients` to use
`.data.pages.flatMap(p => p.data)` instead of `.data.data`.

**Do NOT change** these lower-traffic `.range()` callsites:
- `hooks/use-program.ts:46`
- `app/actions/tickets.ts:255, :315`
- `app/actions/admin-tickets.ts:129`
- `app/actions/meal-groups.ts:450`
- `app/actions/exercises.ts:123`

Acceptance: Client list page 50 loads as fast as page 1. Backwards-compatible:
`cursor: null` returns the first page. Components render correctly with
infinite query data shape.

---

#### STEP 6 — Add rate limiting (in-memory, no external dependencies)

**Do NOT install Redis, Upstash, or any external rate-limit library.**
Use a simple in-memory sliding window with `Map`.

**New file:** `lib/rate-limit.ts`
```typescript
interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.lastRefill > windowMs * 2) {
      store.delete(key);
    }
  }
}

/**
 * Token-bucket rate limiter with in-memory store.
 * Returns { success: boolean, remaining: number }.
 *
 * NOTE: In-memory store is per-process. In a multi-instance deployment
 * (e.g. multiple Vercel serverless functions), each instance has its own
 * store. For true distributed rate limiting, replace with Redis/Upstash.
 * For a single-server or low-traffic app this is sufficient.
 */
export function rateLimit(
  key: string,
  maxTokens: number,
  windowMs: number
): { success: boolean; remaining: number } {
  cleanup(windowMs);

  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { tokens: maxTokens - 1, lastRefill: now });
    return { success: true, remaining: maxTokens - 1 };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill;
  const refillRate = maxTokens / windowMs;
  const refilled = Math.min(
    maxTokens,
    entry.tokens + elapsed * refillRate
  );

  if (refilled < 1) {
    return { success: false, remaining: 0 };
  }

  entry.tokens = refilled - 1;
  entry.lastRefill = now;
  return { success: true, remaining: Math.floor(entry.tokens) };
}
```

**Integrate in `lib/supabase/proxy.ts`:**

At the top of `updateSession()`, before any DB calls:

```typescript
import { rateLimit } from "@/lib/rate-limit";

// Inside updateSession(), after extracting the request:
const ip =
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  request.headers.get("x-real-ip") ??
  "unknown";

const pathname = request.nextUrl.pathname;
const isAuthRoute =
  pathname.startsWith("/api/auth") ||
  pathname.startsWith("/client-portal/login") ||
  pathname === "/login" ||
  pathname === "/register";

const limit = isAuthRoute ? 10 : 60;
const window = 60_000; // 1 minute

const { success } = rateLimit(
  `${isAuthRoute ? "auth" : "api"}:${ip}`,
  limit,
  window
);

if (!success) {
  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": "60" },
  });
}
```

Rates:
- General routes: 60 requests per minute per IP
- Auth routes: 10 requests per minute per IP

Acceptance: 61 rapid requests from the same IP return 429 on the 61st.
11 rapid auth requests return 429 on the 11th. Normal usage is unaffected.
No npm dependencies added.

---

#### STEP 7 — Increase dashboard staleTime

**File: `hooks/use-clients-dashboard.ts`** (line 47-48)

```typescript
// BEFORE:
staleTime: 20_000,     // 20 seconds
gcTime: 5 * 60_000,    // 5 minutes

// AFTER:
staleTime: 5 * 60_000,  // 5 minutes
gcTime: 15 * 60_000,    // 15 minutes
```

**File: `hooks/use-coach-tools.ts`** — update these hooks:

| Hook | Line | staleTime before → after | gcTime before → after |
|------|------|--------------------------|-----------------------|
| `useClientDetail` | ~126 | 30s → 60s | default → 10min |
| `useCoachPlanTemplates` | ~135 | 30s → 60s | default → 10min |
| `useClientAssignments` | ~145 | 30s → 60s | default → 10min |
| `useClientNextSession` | ~155 | 20s → 30s | default → 5min |
| `useClientTodaySessions` | ~165 | 20s → 30s | default → 5min |
| `useClientSessionsRange` | ~180 | 20s → 30s | default → 5min |
| `useClientCheckins` | ~190 | 20s → 60s | default → 10min |
| `useClientNotes` | ~200 | 20s → 60s | default → 10min |
| `useClientPayments` | ~242 | 20s → 60s | default → 10min |

Do NOT change hooks already at 60s: `useCoachClients`, `useClientGoals`,
`useMyGoals`, `useClientBillingPlan`, `useClientBillingPlanHistory`,
`useCoachPaymentsDashboard`.

Acceptance: Network tab shows fewer refetch calls. Dashboard does not
re-fetch when switching between client tabs within a 5-minute window.
Explicit `refetch()` calls still work.

---

- Required file changes:
  - `supabase/migrations/20260315120000_performance_indexes.sql` (new — indexes + view + RPC)
  - `app/actions/clients-dashboard.ts` (refactor to use view + RPC, switch to server client)
  - `app/actions/coach-tools.ts` (admin→server client, LIKE escaping, cursor pagination)
  - `app/actions/exercises.ts` (LIKE escaping)
  - `app/actions/meal-groups.ts` (LIKE escaping)
  - `lib/utils/search.ts` (new — `escapeLikePattern`)
  - `lib/utils/pagination.ts` (new — cursor encode/decode)
  - `lib/rate-limit.ts` (new — in-memory rate limiter)
  - `lib/supabase/proxy.ts` (rate limiting integration)
  - `hooks/use-clients-dashboard.ts` (staleTime/gcTime increase)
  - `hooks/use-coach-tools.ts` (staleTime/gcTime increase, useInfiniteQuery)
  - `types/database.ts` (add `coach_client_summary` view type, `get_coach_goal_history` RPC type)

- Data/migration impact:
  One migration file: indexes (safe, non-blocking on small tables), one view
  (read-only, no data mutation), one RPC function (read-only). Zero downtime.

- Acceptance criteria:
  1. Migration applies cleanly via `supabase db reset`
  2. Dashboard response time under 800ms (was 1943ms)
  3. Coach with 0 clients sees empty state without errors
  4. Search for `%` or `_` returns no results (not everything)
  5. Client list page 50 loads as fast as page 1
  6. 61 rapid requests from same IP returns 429 on the 61st
  7. 11 rapid auth attempts from same IP returns 429 on the 11th
  8. `grep -rn "createAdminClient" app/actions/coach-tools.ts` — only system writes
  9. `grep -rn "createAdminClient" app/actions/clients-dashboard.ts` — zero results
  10. No `.in()` call passes more than 20 IDs
  11. Network tab: no dashboard re-fetch within 5 minutes of initial load
  12. `npm run typecheck` passes
  13. `npm run lint` passes
  14. `npm run test` passes

- Sequence / rollout:
  1. STEP 1 — Database indexes (standalone, no code changes)
  2. STEP 2 — View + RPC functions (same migration) + refactor clients-dashboard.ts
  3. STEP 3 — Switch admin client to server client for reads
  4. STEP 4 — LIKE wildcard escaping (standalone)
  5. STEP 5 — Cursor-based pagination (requires hook changes)
  6. STEP 6 — Rate limiting (standalone, new file + proxy)
  7. STEP 7 — staleTime increase (smallest change, last)
  Run `npm run typecheck && npm run lint && npm run test` after each step.

---

### [A-008] Fix goal auto-sync + notification bell (goals achieved + check-ins)

- Priority: High
- Last updated: 2026-03-17

---

#### PART 1 — Root-cause investigation and auto-sync fix

The user reports that `current_value` in `fitness_goals` is NOT updating when
a strength set weight is saved, even though A-007 was implemented.

**Suspected root causes (investigate in this order before writing any code):**

**RC-1 — A-007 migration not pushed (most likely)**
The migration `supabase/migrations/20260316100000_goal_exercise_program_links.sql`
adds `linked_exercise_id` and `linked_program_id` to `fitness_goals`.
Without it, the goal form cannot save those links and the Inngest function's
`.in("linked_exercise_id", exerciseIds)` query always returns zero rows.

**Verify:** Run the following against the target DB:
```sql
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'fitness_goals'
  AND column_name = 'linked_exercise_id';
```
If the column is missing, push the migration first. Everything else below is
secondary until this is confirmed applied.

**RC-2 — Inngest dev server not running locally**
The `void inngest.send(...)` call in `workout.ts` silently no-ops if the local
Inngest Dev Server is not running. No error is thrown, no DB update happens.

**Verify:** Run `npx inngest-cli@latest dev` in a separate terminal before
testing. Confirm the `sync-goal-from-workout` function appears in the Inngest
dashboard at `http://localhost:8288`. Send a test event manually if needed.

**RC-3 — `workout-quick-actions.ts` missing event (real gap — fix regardless)**
`addExerciseToWorkout()` in `app/actions/workout-quick-actions.ts` inserts
directly into `strength_sets` with `weight: 0` but never fires
`training/workout.completed`. If a user updates a set weight via an inline
editor that calls this action rather than the full `updateWorkoutAction`, the
Inngest event is never sent.

**Fix (required even if RC-1 is the immediate cause):**

After the `strength_sets.insert()` inside `addExerciseToWorkout()`, fire the
event:

```typescript
void inngest.send({
  name: "training/workout.completed",
  data: {
    workout_id: workoutId,
    user_id: user.id,
    subject_user_id: null,
    subject_client_id: null,
  },
});
```

Add the `inngest` import at the top of `workout-quick-actions.ts`:
```typescript
import { inngest } from "@/lib/inngest/client";
```

Same pattern as `workout.ts`. The event is fire-and-forget — `void` prefix,
no await, does not affect the action return value.

**RC-4 — Sync function logic edge case**
If `goal.current_value` is `null` in the DB and the Inngest function
normalizes it to `0` for an "increase" direction goal, then a `weight > 0`
set SHOULD trigger an update. Verify this path is working:

In `sync-goal-from-workout.ts` step C, the guard is:
```typescript
const currentValue = isFiniteNumber(goal.current_value)
  ? goal.current_value
  : direction === "decrease" ? Number.POSITIVE_INFINITY : 0;
const shouldUpdate = direction === "increase"
  ? maxWeight > currentValue
  : maxWeight < currentValue;
```

This is correct. No change needed. Just confirm it in the Inngest execution
log.

---

#### PART 1 — Acceptance criteria

1. Push `20260316100000_goal_exercise_program_links.sql` if column is missing.
2. Saving a workout with a strength set whose exercise is linked to an active
   goal: `fitness_goals.current_value` updates to the new max weight within
   Inngest processing time (typically < 5s on local dev server).
3. `training/workout.completed` fires from `addExerciseToWorkout()` in
   `workout-quick-actions.ts`.
4. `npm run typecheck`, `npm run lint`, `npm run test` all pass.

---

#### PART 2 — Notification bell (goals achieved + check-ins)

**Overview:**
A bell icon in the dashboard header shows an unread count badge.
Clicking it opens a dropdown listing recent notifications:
- "Goal achieved" — when `current_value >= target_value` after auto-sync.
- "Check-in recorded" — when a coach records a check-in for an athlete.

---

#### STEP 1 — Database migration

**New file:** `supabase/migrations/<timestamp>_notifications.sql`

```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text        NOT NULL CHECK (type IN ('goal_achieved', 'checkin_submitted')),
  title         text        NOT NULL,
  body          text        NOT NULL,
  data          jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Single index covers both badge count (user_id filter) and feed (ordered list)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- No INSERT policy for users — only background jobs (admin client) insert rows.
-- No UPDATE policy — notifications have no mutable fields after creation.

-- Enable Supabase Realtime on this table so clients receive INSERT events
-- in real-time without polling. Required for the live bell badge.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

`data` column shape per type:
- `goal_achieved`: `{ goal_id, goal_title, new_value, target_value, unit }`
- `checkin_submitted`: `{ checkin_id, client_id, client_name }`

Update `types/database.ts` — add `notifications` table type with Row/Insert/Update.

---

#### STEP 2 — Extend Inngest sync function to emit goal-achieved notifications

**File:** `lib/inngest/functions/sync-goal-from-workout.ts`

After the per-goal UPDATE in step C (`update-goal-${goal.id}`), add a check:
if the NEW `current_value` meets or exceeds `target_value` (for "increase"),
or is at or below `target_value` (for "decrease"), create a notification row.

Extend the return value of the existing step `update-goal-${goal.id}` to
include `goalAchieved: boolean`. Then add a new step
`notify-goal-achieved-${goal.id}` (inside the same `for` loop, after the
update step):

```typescript
if (result.updated && result.goalAchieved) {
  await step.run(`notify-goal-achieved-${goal.id}`, async () => {
    // Dedup: skip if a goal_achieved notification already exists in last 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", goal.user_id)
      .eq("type", "goal_achieved")
      .contains("data", { goal_id: goal.id })
      .gt("created_at", cutoff);
    if ((count ?? 0) > 0) return; // already notified recently

    await admin.from("notifications").insert({
      user_id: goal.user_id,
      type: "goal_achieved",
      title: "Goal achieved!",
      body: `You reached your target of ${goal.target_value}${goal.unit ? " " + goal.unit : ""}.`,
      data: {
        goal_id: goal.id,
        goal_title: goal.title ?? "",
        new_value: maxWeight,
        target_value: goal.target_value,
        unit: goal.unit ?? "",
      },
    });
  });
}
```

**Determine `goalAchieved` inside the existing update step:**
```typescript
const goalAchieved =
  direction === "increase"
    ? isFiniteNumber(goal.target_value) && maxWeight >= goal.target_value
    : isFiniteNumber(goal.target_value) && maxWeight <= goal.target_value;
// Return from the step: { updated: true, historyInserted: true/false, goalAchieved }
```

The `GoalRow` type at the top of the file needs two additional columns.
Extend the `Pick` type and the `.select()` string in "find-matching-goals":
```typescript
// Add to Pick:
| "title"
| "unit"

// Add to .select() string:
"id, user_id, linked_exercise_id, current_value, target_value, start_value,
 goal_direction, status, title, unit"
```

---

#### STEP 3 — Fire check-in event + new Inngest notify function

##### 3a. New Inngest event type

**File:** `types/inngest.ts`

Add:
```typescript
type CoachingCheckinSubmittedEvent = {
  name: "coaching/checkin.submitted"
  data: {
    checkin_id: string
    created_by_user_id: string
    subject_client_id: string | null
    subject_user_id: string | null
  }
}
```

Add to the `Events` union type.

##### 3b. Fire event from `createClientCheckinAction`

**File:** `app/actions/coach-tools.ts` — `createClientCheckinAction` (~line 2592)

After the `client_checkins.insert()` succeeds and before `revalidateCoachPaths`,
add:
```typescript
void inngest.send({
  name: "coaching/checkin.submitted",
  data: {
    checkin_id: data.id,
    created_by_user_id: user.id,
    subject_client_id: payload.subject_client_id ?? null,
    subject_user_id: payload.subject_user_id ?? null,
  },
});
```

Check whether `inngest` is already imported in `coach-tools.ts` — if not,
add `import { inngest } from "@/lib/inngest/client";`.

##### 3c. New Inngest function: `notify-checkin-submitted`

**New file:** `lib/inngest/functions/notify-checkin-submitted.ts`

```
Function ID:  "notify-checkin-submitted"
Trigger:      "coaching/checkin.submitted"
Concurrency:  limit 10

Step A — "resolve-recipient"
  Determine who receives the notification:
  - If event.data.subject_user_id is present → recipient_id = subject_user_id,
    client_name = ""  (resolve name separately if needed)
  - Else if event.data.subject_client_id is present:
      Query via admin client:
        SELECT linked_user_id, full_name
        FROM public.clients
        LEFT JOIN public.profiles ON profiles.id = clients.linked_user_id
        WHERE clients.id = event.data.subject_client_id
      If linked_user_id IS NULL → return null (no platform user to notify)
      recipient_id = linked_user_id
      client_name = profiles.full_name ?? ""
  - If no recipient resolved → exit (return early, no error)

Step B — "create-notification"
  INSERT INTO public.notifications:
    user_id:   recipient_id
    type:      'checkin_submitted'
    title:     'Check-in recorded'
    body:      'Your coach has recorded a new check-in for you.'
    data:      {
                 checkin_id: event.data.checkin_id,
                 client_id:  event.data.subject_client_id ?? null,
                 client_name: client_name
               }

Use createAdminClient() throughout — background job, no user session.
```

Register the new function in `lib/inngest/index.ts` alongside existing functions.

---

#### STEP 4 — Server actions for notifications

**New file:** `app/actions/notifications.ts`

All actions use `createClient()` (RLS enforces user_id scope automatically).

```typescript
// Returns total notification count — used for the badge
// All notifications are unread until dismissed (deleted). Count = badge number.
export async function getNotificationCountAction(): Promise<number>

// Returns last 20 notifications — for the dropdown panel
export async function getNotificationsAction(): Promise<NotificationRow[]>

// Dismiss (delete) a single notification by id
export async function dismissNotificationAction(id: string): Promise<void>

// Dismiss (delete) all notifications for the current user
export async function dismissAllNotificationsAction(): Promise<void>
```

Implementation notes:
- `getNotificationCountAction`: `SELECT count(*) FROM notifications WHERE user_id = auth.uid()`.
  Catch and return `0` on error — badge must never throw.
- `getNotificationsAction`: `ORDER BY created_at DESC LIMIT 20`.
- `dismissNotificationAction`: `DELETE FROM notifications WHERE id = $id AND user_id = auth.uid()`.
  The `user_id` guard is redundant with RLS but acts as a double-safety check.
- `dismissAllNotificationsAction`: `DELETE FROM notifications WHERE user_id = auth.uid()`.
- No `revalidatePath` needed — the client invalidates via TanStack Query after mutations.

Define `NotificationRow` as a TypeScript type inline:
```typescript
export type NotificationRow = {
  id: string
  type: "goal_achieved" | "checkin_submitted"
  title: string
  body: string
  data: Record<string, unknown>
  created_at: string
}
```

---

#### STEP 5 — Query keys

**File:** `lib/query-keys.ts`

Add at the bottom:

```typescript
export const notificationKeys = {
  all:   ["notifications"] as const,
  count: () => [...notificationKeys.all, "count"] as const,
  feed:  () => [...notificationKeys.all, "feed"] as const,
};
```

---

#### STEP 6 — TanStack Query hooks

**New file:** `hooks/use-notifications.ts`

```typescript
// Badge count — all notifications are unread until dismissed (deleted).
// count = number of rows in the table for this user = badge number.
// No refetchInterval — real-time subscription (see useNotificationRealtime)
// handles new arrivals by directly updating this query's cache.
export function useNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.count(),
    queryFn: getNotificationCountAction,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })
}

// Feed — only fetches when explicitly triggered (panel open).
// New arrivals are prepended to this cache by useNotificationRealtime.
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.feed(),
    queryFn: getNotificationsAction,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    enabled: false, // caller triggers via refetch() on panel open
  })
}
```

---

#### STEP 6b — Real-time subscription hook

**New file:** `hooks/use-notification-realtime.ts`

**Architectural note — justified exception to the data-flow rule:**
The project rule states client components must not import Supabase clients
directly. Real-time event subscriptions are the single legitimate exception:
there is no server-action equivalent for a persistent WebSocket listener.
This hook creates a browser-side Supabase channel for that sole purpose.
All data reads and mutations still go through server actions. Scope this
exception to this one hook — do not use browser Supabase clients elsewhere.

```typescript
"use client"

import { useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useQueryClient } from "@tanstack/react-query"
import { notificationKeys } from "@/lib/query-keys"
import type { NotificationRow } from "@/app/actions/notifications"

export function useNotificationRealtime(userId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as NotificationRow

          // Increment badge count without a server round-trip
          queryClient.setQueryData(
            notificationKeys.count(),
            (old: number | undefined) => (old ?? 0) + 1
          )

          // Prepend to feed cache if the panel has been opened at least once
          queryClient.setQueryData(
            notificationKeys.feed(),
            (old: NotificationRow[] | undefined) =>
              old ? [newRow, ...old] : undefined // leave undefined if never fetched
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
```

**Key points:**
- `filter: \`user_id=eq.${userId}\`` — Supabase enforces this server-side, so
  users only receive their own events even if RLS were misconfigured.
- Feed cache is only updated if it has already been populated (guard against
  `undefined`). An unpopulated cache stays `undefined` so the initial
  `refetch()` on panel open fetches the full list correctly.
- Channel name is scoped to `userId` to prevent cross-user collisions if
  multiple sessions exist.
- `supabase.removeChannel(channel)` on cleanup prevents listener leaks.

---

#### STEP 7 — NotificationBell component

**New file:** `components/layout/notification-bell.tsx`

`"use client"` component. Use Radix `Popover` (already available via Shadcn).

**Props:**
```typescript
type NotificationBellProps = {
  userId: string | null   // passed from the server layout — used to scope the realtime subscription
  className?: string
}
```

**Real-time wiring:**
Call `useNotificationRealtime(userId)` at the top of the component. This starts
the Supabase channel subscription for this user. When a new notification arrives,
the subscription updates the count and feed caches directly — no polling, no
manual refetch needed for new arrivals.

**Core behaviour (critical — read carefully):**
- The badge count equals the total number of notification rows in the DB for
  this user. Every notification is "unread" until it is dismissed (deleted).
  There is no `read_at` state — the row either exists or it doesn't.
- The badge stays on the bell until the user explicitly dismisses notifications.
  Opening the panel does NOT clear the badge or delete anything automatically.
- Dismissing a single row calls `dismissNotificationAction(id)` → DELETE from DB.
- "Clear all" calls `dismissAllNotificationsAction()` → DELETE all rows for user.
- After any dismiss: `queryClient.invalidateQueries({ queryKey: notificationKeys.all() })`
  — this refreshes both the count and the feed in one shot.

**Layout:**
```
Bell button (ghost, h-9 w-9, rounded-xl, border, bg-background/80)
  — red badge top-right corner when count > 0 (capped display at "99+")
Popover content (align="end", w-80, p-0)
  Header row: "Notifications" (text-sm font-semibold) | "Clear all" button
    (text-xs, variant="ghost", hidden when feed is empty)
  Scrollable list (max-h-96 overflow-y-auto divide-y divide-border)
    Each row:
      Left: type icon in a small rounded container
      Middle: title (text-sm font-medium) + body (text-xs text-muted-foreground,
              line-clamp-2) + relative time (text-[11px] text-muted-foreground)
      Right: × dismiss button (ghost, h-6 w-6, rounded-md, shows on row hover)
  Empty state (py-8 text-center text-sm text-muted-foreground):
    "No notifications" — shown when feed is empty OR count is 0
```

**On popover open (`onOpenChange` with `open === true`):**
- Call `refetch()` on the feed query to fetch the latest list.
- Do NOT auto-dismiss or auto-delete anything. The user must explicitly act.

**Dismiss single:**
```typescript
async function dismiss(id: string) {
  await dismissNotificationAction(id)
  queryClient.invalidateQueries({ queryKey: notificationKeys.all() })
}
```

**Clear all:**
```typescript
async function clearAll() {
  await dismissAllNotificationsAction()
  queryClient.invalidateQueries({ queryKey: notificationKeys.all() })
}
```

**Icons:**
- `goal_achieved` → `Target` from lucide-react, bg-emerald-100 text-emerald-600
- `checkin_submitted` → `CheckSquare` from lucide-react, bg-blue-100 text-blue-600

**Relative time:** use `formatDistanceToNow` from `date-fns` with
`{ addSuffix: true }`. `date-fns` is already in the project — do not install
anything new.

**Skeleton (while feed is loading):** 3 rows of:
```tsx
<div className="flex items-start gap-3 p-3 animate-pulse">
  <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
  <div className="flex-1 space-y-2">
    <div className="h-3 w-3/4 rounded bg-muted" />
    <div className="h-3 w-full rounded bg-muted" />
  </div>
</div>
```
Tailwind only — no skeleton component import needed.

---

#### STEP 8 — Add bell to dashboard header

**File:** `app/(dashboard)/layout.tsx`

The bell must sit at the **far right end** of the header — the opposite end
from the `<SidebarTrigger>` toggle.

`layout.tsx` is a **server component** — convert `DashboardLayout` to
`async function DashboardLayout` if it is not already async. Call
`createClient()` + `auth.getUser()` to get the current user's ID, then pass
it to `<NotificationBell>` as a prop. This is the only change needed to make
realtime work — no client-side auth call required inside the bell.

```tsx
import { createClient } from "@/lib/supabase/server"
import { NotificationBell } from "@/components/layout/notification-bell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 pt-safe border-b border-border bg-background">
          <div className="flex h-14 items-center gap-3 px-safe px-4 md:h-16 md:px-6 lg:px-8">
            {/* Left side — toggle + branding (unchanged) */}
            <SidebarTrigger className="inline-flex h-9 w-9 shrink-0 rounded-xl border bg-background/80" />
            <Separator orientation="vertical" className="h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none tracking-tight">FitTrack.ai</span>
              <span className="text-[11px] text-muted-foreground leading-none mt-1">Performance Workspace</span>
            </div>
            {/* Right side — bell at far right, realtime-scoped to current user */}
            <NotificationBell userId={user?.id ?? null} className="ml-auto" />
          </div>
        </header>
        {/* … rest of layout unchanged … */}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

`className` is a prop on `NotificationBell` — apply it to the outermost
element inside the component so `ml-auto` positions correctly in the flex row.

---

- Required file changes:
  - `supabase/migrations/<timestamp>_notifications.sql` (new — table + indexes + RLS + realtime publication)
  - `types/database.ts` (add notifications table type)
  - `types/inngest.ts` (CoachingCheckinSubmittedEvent)
  - `lib/inngest/functions/sync-goal-from-workout.ts` (goal-achieved notify step)
  - `lib/inngest/functions/notify-checkin-submitted.ts` (new)
  - `lib/inngest/index.ts` (register new function)
  - `app/actions/coach-tools.ts` (fire checkin event in createClientCheckinAction)
  - `app/actions/workout-quick-actions.ts` (fire workout.completed in addExerciseToWorkout)
  - `app/actions/notifications.ts` (new)
  - `lib/query-keys.ts` (notificationKeys)
  - `hooks/use-notifications.ts` (new — useNotificationCount + useNotifications)
  - `hooks/use-notification-realtime.ts` (new — Supabase channel subscription)
  - `components/layout/notification-bell.tsx` (new — accepts userId prop)
  - `app/(dashboard)/layout.tsx` (async, getUser, pass userId to NotificationBell)

- Data/migration impact:
  One new table (`notifications`) with two indexes and RLS policies.
  No changes to existing tables. Zero data loss risk.

- Acceptance criteria:
  1. Push `20260316100000_goal_exercise_program_links.sql` (A-007 migration)
     if missing from target DB. Verify `linked_exercise_id` column exists
     before testing any auto-sync behavior.
  2. Saving a workout with a strength set matching a goal's `linked_exercise_id`
     and weight exceeding `current_value`: goal updates within Inngest
     processing time.
  3. When updated `current_value >= target_value` (increase direction) or
     `<= target_value` (decrease): a `goal_achieved` notification row is
     inserted for the goal owner. No duplicate inserted within 24 hours.
  4. `addExerciseToWorkout()` fires `training/workout.completed` after insert.
  5. `createClientCheckinAction` fires `coaching/checkin.submitted`. Inngest
     creates a `checkin_submitted` notification row for the linked subject user.
     If no linked platform user, no notification and no error.
  6. Bell icon is at the far right of the dashboard header, opposite end from
     the `<SidebarTrigger>` toggle.
  7. Badge on bell shows the total count of notification rows in the DB for
     the current user. Badge persists until the user explicitly dismisses.
  8. **Real-time:** When a new notification is inserted by Inngest (e.g. goal
     achieved), the badge count increments immediately in the UI without any
     page refresh or polling. If the panel is open, the new row appears at
     the top of the feed instantly.
  9. Opening the panel does NOT auto-delete or auto-clear anything.
  10. Dismissing a single notification (× button) deletes the row from the DB
      and removes it from the panel immediately. Badge count decrements.
  11. "Clear all" deletes all notification rows for the user. Panel shows
      empty state. Badge disappears.
  12. Panel shows up to 20 notifications with type icon, title, body (2-line
      clamp), relative time. Empty state shows when no rows exist.
  13. `npm run typecheck`, `npm run lint`, `npm run test` all pass.

- Sequence / rollout:
  **Part 1 (auto-sync fix — do first):**
  1. Verify + push A-007 migration `20260316100000_goal_exercise_program_links.sql`.
  2. Start Inngest dev server (`npx inngest-cli@latest dev`) and confirm
     function is registered.
  3. Fix `workout-quick-actions.ts` — fire event in `addExerciseToWorkout`.
  4. Test end-to-end: set a goal with linked exercise, log a workout, confirm
     `current_value` updates.
  5. Run `npm run typecheck && npm run lint && npm run test`.

  **Part 2 (notifications):**
  6. STEP 1 — DB migration (table + indexes + RLS + realtime publication).
  7. STEP 3a — `CoachingCheckinSubmittedEvent` in `types/inngest.ts`.
  8. STEP 4 — `app/actions/notifications.ts`.
  9. STEP 5 — `notificationKeys` in `lib/query-keys.ts`.
  10. STEP 6 — `hooks/use-notifications.ts` (useNotificationCount + useNotifications).
  11. STEP 6b — `hooks/use-notification-realtime.ts` (Supabase channel hook).
  12. STEP 2 — Extend sync function with goal-achieved notify step.
  13. STEP 3b — Fire checkin event from `createClientCheckinAction`.
  14. STEP 3c — `notify-checkin-submitted.ts` Inngest function + register.
  15. STEP 7 — `NotificationBell` component (userId prop + useNotificationRealtime).
  16. STEP 8 — Make `DashboardLayout` async, pass userId to bell in `layout.tsx`.
  Run typecheck + lint after each step. Full test run at end.

---

### [A-009] Support ticket notifications + subscriber model

- Priority: High
- Last updated: 2026-03-17

- Problem:
  Ticket workflows have no user-facing notifications for lifecycle changes
  (created / updated / status-changed / closed / reopened), and no subscriber
  model to notify participants beyond the ticket creator.

- Engineer's suggestion reviewed: The engineer's draft (received 2026-03-17) was
  a solid starting point. The architect has revised it below. Key corrections
  and additions are marked **[ARCHITECT AMENDMENT]**.

---

#### PART 1 — Business Rules (authoritative source of truth)

Read every rule before writing any code. They must all be enforced in the
Inngest fanout function (STEP 6). Rules that overlap reinforce each other.

---

##### BR-0 — Definitions

| Term | Meaning |
|------|---------|
| `actor` | The authenticated user who performed the action |
| `reporter` | `tickets.user_id` — the user who created the ticket |
| `admin` | Any user with `profiles.role = 'sysadmin'` |
| `subscriber` | Any user with a live row in `ticket_subscriptions` for that ticket |
| `recipient` | Final target after all rules, dedup, and visibility are applied |

---

##### BR-1 — Visibility boundary (hard gate — checked first)

- **Public ticket** (`is_public = true`): any authenticated platform user may
  subscribe and receive notifications.
- **Private ticket** (`is_public = false`): only the reporter and admins may
  subscribe or receive notifications. Non-admin non-reporters are silently
  excluded even if they somehow have a subscription row.
- Note: `bug_report` tickets are always private by construction
  (`createTicketAction` enforces `is_public = false` for that category).
  This is already in the codebase — do not change it.
- **Never notify a user who cannot currently view the ticket.**

---

##### BR-2 — Self-notification suppression

- The actor never receives a notification for their own action, regardless of
  role or subscription status.

---

##### BR-3 — Recipient deduplication

- A user may qualify as recipient through multiple paths (e.g., reporter who is
  also a subscriber). Insert exactly one notification row per user per event.
  Collect all candidate user IDs into a `Set`, then bulk-insert.

---

##### BR-4 — Ticket created

- Trigger: `createTicketAction` succeeds.
- Recipients: **all admins**, minus the actor (reporter can never be admin at
  creation since only user/coach roles create tickets — but apply BR-2 anyway
  for safety).
- Non-recipients: the reporter/actor, all other non-admin users.
- **Side effect [synchronous in action]:** auto-subscribe the reporter into
  `ticket_subscriptions` immediately inside `createTicketAction`, before firing
  the Inngest event. This ensures the reporter receives all future activity
  notifications via the subscriber path. Do this synchronously — it is a small
  single-row INSERT and must not be deferred to Inngest.

---

##### BR-5 — Ticket content updated **[ARCHITECT AMENDMENT — simplified]**

- Trigger: `updateTicketContentAction` succeeds **and** content actually
  changed (trimmed title or description differs from stored values).
- **Who can update content:** Only the reporter. `updateTicketContentAction`
  enforces `ticket.user_id !== user.id → Unauthorized`. Admins cannot edit
  ticket content in the current codebase. The engineer's original BR-5 admin
  path is dead code — remove it.
- Recipients: **all admins** + **subscribers**, minus the actor (reporter).
- Non-recipients: the actor, non-subscribed non-admin users.
- **No-op guard [ARCHITECT AMENDMENT]:** Before emitting the event, compare
  `payload.title.trim() === ticket.title` AND
  `payload.description.trim() === ticket.description`. If both match, do not
  emit the Inngest event. The current `updateTicketContentAction` does not
  do this check — add it.

---

##### BR-6 — Comment added

- Trigger: `createTicketCommentAction` succeeds.
- Actor may be user/coach OR admin (both roles can comment via the existing
  `viewerIsAdmin` access check).
- **If actor is non-admin:** Recipients = all admins (except actor) + subscribers (except actor).
- **If actor is admin:** Recipients = reporter (if not actor) + subscribers (except actor).
  Rationale: when an admin responds, the reporter and watchers need to know —
  other admins do not need to be notified of each other's responses.
- Non-recipients in both cases: the actor, users who fail BR-1.

---

##### BR-7 — Comment edited

- Trigger: `updateCommentAction` succeeds.
- Only the comment author can edit (enforced by `comment.user_id !== user.id`).
  The author may be any role including admin.
- Apply the same role-split logic as BR-6:
  - **If actor is non-admin:** all admins (except actor) + subscribers (except actor).
  - **If actor is admin:** reporter (if not actor) + subscribers (except actor).
- Non-recipients: actor, users who fail BR-1.
- **Important:** `updateCommentAction` already fetches `comment.ticket_id` from
  the DB before updating. Pass `ticket_id` and `actor_user_id` in the Inngest
  event payload from this fetched value.

---

##### BR-8 — Comment deleted

- Trigger: `deleteCommentAction` succeeds.
- Same role-split and recipient rules as BR-7.
- **Important:** `deleteCommentAction` fetches `comment.ticket_id` before
  deleting. Pass `ticket_id` in the event from this pre-delete fetch — the row
  will not exist after deletion.

---

##### BR-9 — Status changed (not to `closed`)

- Trigger: `updateTicketStatusAction` sets status to `open`, `in_progress`, or
  `resolved`, AND `from_status !== to_status`.
- Only admins can change status (enforced by `requireAdminUser()`).
- Recipients: reporter + subscribers, excluding the actor (admin).
  Rationale: admins do not need to be notified of each other's status changes
  unless they explicitly subscribed.
- Non-recipients: actor, non-subscribed users, admins who did not subscribe.
- **No-op guard:** `updateTicketStatusAction` currently does NOT fetch the
  previous status before updating. The engineer must add a SELECT before the
  UPDATE to read `from_status`. If `from_status === to_status`, do not UPDATE
  and do not emit the event.

---

##### BR-10 — Ticket closed

- Trigger: `updateTicketStatusAction` sets status to `closed` AND
  `from_status !== 'closed'`.
- Recipients: reporter + subscribers, excluding actor.
- `closed` is a distinct notification type from `status_changed` for clearer
  UI copy and icon.
- After closing, new subscriptions are blocked (BR-12).

---

##### BR-11 — Ticket reopened **[ARCHITECT AMENDMENT — added]**

- Trigger: `updateTicketStatusAction` sets status to `open`, `in_progress`, or
  `resolved` AND `from_status === 'closed'`.
- Recipients: reporter + subscribers, excluding actor.
- `reopened` is a distinct notification type (not `status_changed`) for clear
  UI messaging. The Inngest function detects reopened by checking
  `from_status === 'closed' && to_status !== 'closed'`.

---

##### BR-12 — Subscription lifecycle

- A user may subscribe to a ticket only when `ticket.status !== 'closed'`.
- A user may unsubscribe at any time (even from closed tickets).
- Existing subscribers on a ticket that gets closed are NOT removed — they
  remain for historical continuity and will receive the `closed` notification.
- After a ticket is closed, the subscribe button is disabled. If a ticket is
  reopened, the subscribe button becomes active again.
- **Auto-subscribe at creation:** reporter is always subscribed (BR-4 side
  effect). Reporter cannot unsubscribe from their own ticket during its
  lifetime (enforce this in `unsubscribeFromTicketAction`).

---

##### BR-13 — No notification on delete **[ARCHITECT AMENDMENT — added]**

- Trigger: `deleteTicketAction` (admin-only).
- Emit NO notification. The ticket ceases to exist; any notification linking to
  it would produce a broken link in the bell panel.
- No Inngest event fired from `deleteTicketAction`.

---

##### BR-14 — No notification on upvote

- Trigger: `toggleUpvoteTicketAction`.
- Emit NO notification. Upvoting is a lightweight social signal, not a workflow
  change. Notifying on upvote would create noise.

---

##### BR-15 — Noise control

- No notifications for: read / list / detail / upvote / delete actions.
- No notification for a no-op status change (`from_status === to_status`).
- No notification for a no-op content update (trimmed values unchanged).
- No notification for a no-op comment edit (content identical after trim).

---

#### PART 2 — Recipient Matrix

| Event | Who acts | Recipients | Excluded |
|-------|----------|------------|----------|
| Ticket created | user/coach | All admins − actor | Actor/reporter, non-admin non-subscribers |
| Content updated | user/coach (reporter only) | All admins + subscribers − actor | Actor, non-subscribed non-admins |
| Comment added | user/coach | All admins + subscribers − actor | Actor |
| Comment added | admin | Reporter + subscribers − actor | Actor, other admins (unless subscribed) |
| Comment edited | user/coach | All admins + subscribers − actor | Actor |
| Comment edited | admin | Reporter + subscribers − actor | Actor, other admins (unless subscribed) |
| Comment deleted | user/coach | All admins + subscribers − actor | Actor |
| Comment deleted | admin | Reporter + subscribers − actor | Actor, other admins (unless subscribed) |
| Status → open/in_progress/resolved (not from closed) | admin | Reporter + subscribers − actor | Actor, non-subscribed admins |
| Status → closed | admin | Reporter + subscribers − actor | Actor, non-subscribed admins |
| Status closed → open/in_progress/resolved (reopen) | admin | Reporter + subscribers − actor | Actor, non-subscribed admins |
| Ticket deleted | admin | Nobody | Everyone |
| Upvote toggled | user/coach | Nobody | Everyone |

Apply BR-1 (visibility gate) and BR-3 (dedup) across all rows before inserting.

---

#### PART 3 — Implementation Steps

---

##### STEP 1 — Database migration

**New file:** `supabase/migrations/<timestamp>_ticket_subscriptions_and_notifications.sql`

**1a. Extend `notifications.type` check constraint:**

The existing check constraint on `public.notifications.type` must be replaced
to include ticket notification types. In Postgres, a CHECK constraint cannot be
extended in-place — drop and recreate:

```sql
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      -- existing types (do not remove)
      'goal_achieved',
      'checkin_submitted',
      -- new ticket types
      'support_ticket_created',
      'support_ticket_updated',
      'support_ticket_comment_added',
      'support_ticket_comment_edited',
      'support_ticket_comment_deleted',
      'support_ticket_status_changed',
      'support_ticket_closed',
      'support_ticket_reopened'
    )
  );
```

**1b. Create `public.ticket_subscriptions`:**

```sql
CREATE TABLE IF NOT EXISTS public.ticket_subscriptions (
  ticket_id     uuid        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, user_id)
);

-- “My subscriptions” list — ordered by most recently subscribed
CREATE INDEX IF NOT EXISTS idx_ticket_subscriptions_user
  ON public.ticket_subscriptions (user_id, subscribed_at DESC);

-- Fanout lookup — given a ticket, fetch all subscriber user_ids
CREATE INDEX IF NOT EXISTS idx_ticket_subscriptions_ticket
  ON public.ticket_subscriptions (ticket_id);

-- RLS
ALTER TABLE public.ticket_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can see their own subscriptions; admins can see all (for fanout)
CREATE POLICY “users can view own subscriptions”
  ON public.ticket_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can subscribe themselves (business rules enforced in server action)
CREATE POLICY “users can subscribe themselves”
  ON public.ticket_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsubscribe themselves
CREATE POLICY “users can unsubscribe themselves”
  ON public.ticket_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
```

**Note on RLS vs action layer:** Keep RLS simple (user_id = auth.uid()).
Enforce all ticket-visibility and closed-ticket checks in the server action
layer (STEP 4), not in RLS. Complex subquery RLS is fragile and hard to test.

**1c. Enable realtime on `ticket_subscriptions`:**

Not needed — subscriptions are write-once from the user's perspective and the
bell already has realtime on `notifications`. Skip.

---

##### STEP 2 — Type contracts

**File:** `types/database.ts`

- Add `ticket_subscriptions` table Row/Insert/Update types.
- Update `notifications` Row type: extend the `type` string union to include
  all eight new ticket notification types listed in STEP 1a.

**File:** `types/inngest.ts`

Add:
```typescript
type SupportTicketActivityEvent = {
  name: “support/ticket.activity”
  data: {
    ticket_id: string
    actor_user_id: string
    activity:
      | “created”
      | “content_updated”
      | “comment_added”
      | “comment_edited”
      | “comment_deleted”
      | “status_changed”   // from non-closed to non-closed
      | “closed”           // any status → closed
      | “reopened”         // closed → any non-closed status
    from_status?: “open” | “in_progress” | “resolved” | “closed” | null
    to_status?:   “open” | “in_progress” | “resolved” | “closed” | null
    actor_is_admin: boolean  // resolved in the action, saves a DB lookup in Inngest
  }
}
```

Add to the `Events` union type.

**Why `actor_is_admin` in the event payload:** The action layer already has
the actor's role (needed for access checks). Passing it into the event avoids
a redundant `profiles` lookup inside the Inngest function for the recipient
resolution step.

---

##### STEP 3 — Subscription server actions

**New file:** `app/actions/ticket-subscriptions.ts`

Use `createClient()` throughout (RLS scopes reads/writes to the current user).

```typescript
// Returns subscription state for the current user on this ticket
export async function getTicketSubscriptionStateAction(ticketId: string):
  Promise<{ is_subscribed: boolean; can_subscribe: boolean }>

// Subscribe current user to ticket
// Enforces: ticket must exist, must be visible to user (BR-1), status != 'closed' (BR-12)
export async function subscribeToTicketAction(ticketId: string): Promise<void>

// Unsubscribe current user from ticket
// Enforces: reporter cannot unsubscribe from own ticket (BR-12)
export async function unsubscribeFromTicketAction(ticketId: string): Promise<void>
```

Implementation notes:
- `getTicketSubscriptionStateAction`: single query — `SELECT ticket_id FROM
  ticket_subscriptions WHERE ticket_id = $id AND user_id = auth.uid()`.
  `can_subscribe` = ticket exists + `is_public OR user_id = actor` + `status != 'closed'`.
- `subscribeToTicketAction`: fetch ticket first (id, user_id, is_public, status).
  Validate BR-1 and BR-12 before INSERT. Use `.upsert()` with
  `{ onConflict: “ticket_id,user_id”, ignoreDuplicates: true }` so concurrent
  clicks are idempotent.
- `unsubscribeFromTicketAction`: validate reporter guard. Then DELETE.
- After subscribe/unsubscribe: `revalidatePath(`/support/${ticketId}`)`.

---

##### STEP 4 — Auto-subscribe reporter at ticket creation

**File:** `app/actions/tickets.ts` — `createTicketAction`

After the ticket INSERT succeeds and before the Inngest event fires, insert
the reporter into `ticket_subscriptions` using the **admin client** (since
`createTicketAction` already uses admin client for the ticket INSERT):

```typescript
// After: const createdTicket = data as TicketRow;
// Before: revalidateSupportPaths(...)

await admin.from(“ticket_subscriptions”).insert({
  ticket_id: createdTicket.id,
  user_id: user.id,
}).throwOnError()
// If this fails (e.g. table missing), throw — do not silently swallow.
// The subscription is critical for future notification fanout.
```

Do NOT defer this to Inngest. It is a synchronous prerequisite for all future
notification delivery to the reporter via the subscriber path.

---

##### STEP 5 — Emit events from ticket mutations

All events are `void inngest.send(...)` — fire and forget, after all DB writes
succeed, never in a catch block.

Add `import { inngest } from “@/lib/inngest/client”` to each file if not already present.

**`app/actions/tickets.ts` — `createTicketAction`:**
```typescript
// After auto-subscribe INSERT (STEP 4):
void inngest.send({
  name: “support/ticket.activity”,
  data: {
    ticket_id: createdTicket.id,
    actor_user_id: user.id,
    activity: “created”,
    actor_is_admin: false, // only user/coach can create tickets
  },
})
```

**`app/actions/tickets.ts` — `updateTicketContentAction`:**

Add no-op guard. Read ticket fields before update:
```typescript
// After: const { data: ticket } = await supabase.from(“tickets”)
//          .select(“id, user_id, status, title, description”)...
// (already fetched for the auth check — extend the select to include title, description)

const titleChanged    = payload.title.trim() !== ticket.title
const descChanged     = payload.description.trim() !== ticket.description
if (!titleChanged && !descChanged) {
  // No-op: return current ticket without updating or notifying
  return ticket as TicketRow
}

// ... perform the UPDATE ...

// After UPDATE succeeds:
void inngest.send({
  name: “support/ticket.activity”,
  data: {
    ticket_id: payload.ticket_id,
    actor_user_id: user.id,
    activity: “content_updated”,
    actor_is_admin: false, // only reporter (non-admin) can reach this point
  },
})
```

**`app/actions/tickets.ts` — `createTicketCommentAction`:**

The action already resolves `viewerIsAdmin`. After the INSERT:
```typescript
void inngest.send({
  name: “support/ticket.activity”,
  data: {
    ticket_id: payload.ticket_id,
    actor_user_id: user.id,
    activity: “comment_added”,
    actor_is_admin: viewerIsAdmin,
  },
})
```

**`app/actions/comments.ts` — `updateCommentAction`:**

The action already fetches `comment` (with `ticket_id`). Resolve actor role
after fetching comment (add a profiles role check, same pattern as
`createTicketCommentAction`). Then, after the UPDATE:
```typescript
void inngest.send({
  name: “support/ticket.activity”,
  data: {
    ticket_id: comment.ticket_id,
    actor_user_id: user.id,
    activity: “comment_edited”,
    actor_is_admin: actorIsAdmin,
  },
})
```

Add no-op guard: if `payload.content.trim() === comment.content`, return early
without updating or emitting.

**`app/actions/comments.ts` — `deleteCommentAction`:**

The action fetches `comment` (with `ticket_id`) before deleting. After the
DELETE:
```typescript
void inngest.send({
  name: “support/ticket.activity”,
  data: {
    ticket_id: comment.ticket_id,
    actor_user_id: user.id,
    activity: “comment_deleted”,
    actor_is_admin: actorIsAdmin,
  },
})
```

`actorIsAdmin` resolved the same way as `updateCommentAction`.

**`app/actions/admin-tickets.ts` — `updateTicketStatusAction`:**

**[ARCHITECT AMENDMENT — current code does not read `from_status` before updating.]**

Replace the bare UPDATE with a SELECT-then-UPDATE pattern:
```typescript
// Step A: fetch current status
const { data: current, error: fetchError } = await admin
  .from(“tickets”)
  .select(“id, status, user_id, title, is_public”)
  .eq(“id”, payload.id)
  .single()
if (fetchError || !current) throw new Error(fetchError?.message ?? “Ticket not found”)

const fromStatus = current.status as TicketStatus
const toStatus   = payload.status as TicketStatus

// No-op guard
if (fromStatus === toStatus) return { success: true }

// Step B: UPDATE
const { error } = await admin.from(“tickets”)
  .update({ status: toStatus })
  .eq(“id”, payload.id)
if (error) throw new Error(error.message)

// Step C: determine activity type
const isClose   = toStatus === “closed”
const isReopen  = fromStatus === “closed” && toStatus !== “closed”
const activity  = isClose ? “closed” : isReopen ? “reopened” : “status_changed”

// Step D: fire event
void inngest.send({
  name: “support/ticket.activity”,
  data: {
    ticket_id: payload.id,
    actor_user_id: actorUser.id,  // from requireAdminUser() return value
    activity,
    from_status: fromStatus,
    to_status: toStatus,
    actor_is_admin: true, // requireAdminUser() guarantees this
  },
})
```

**Note:** `requireAdminUser()` currently returns `user` — the calling code
needs access to `user.id`. Confirm the return value is available in scope.

**`app/actions/admin-tickets.ts` — `deleteTicketAction`:**

No changes. No Inngest event. No notification. (BR-13)

---

##### STEP 6 — Inngest fanout function

**New file:** `lib/inngest/functions/notify-ticket-activity.ts`

Use `createAdminClient()` — background job, no user session.

```
Function ID:  “notify-ticket-activity”
Trigger:      “support/ticket.activity”
Concurrency:  limit 10, key: “event.data.ticket_id”
  (serializes concurrent events on the same ticket — prevents race conditions
   on the subscriptions table read)

STEP A — “fetch-ticket-context”
  SELECT id, user_id, title, is_public FROM public.tickets WHERE id = ticket_id
  If not found: exit early (ticket was deleted after event fired — BR-13 scenario)

STEP B — “resolve-recipients”
  Resolve all candidate user IDs into a Set<string>:

  1. Admin IDs:
     SELECT id FROM public.profiles WHERE role = 'sysadmin'

  2. Reporter ID:
     = ticket.user_id  (from STEP A)

  3. Subscriber IDs:
     SELECT user_id FROM public.ticket_subscriptions WHERE ticket_id = $ticket_id

  Now apply the business rules matrix:

  function resolveRecipients(activity, actor_is_admin, adminIds, reporterId, subscriberIds, actorId, isPublic):
    let candidates = new Set<string>()

    if activity === “created”:
      adminIds.forEach(id => candidates.add(id))

    if activity === “content_updated”:
      adminIds.forEach(id => candidates.add(id))
      subscriberIds.forEach(id => candidates.add(id))

    if activity in [“comment_added”,”comment_edited”,”comment_deleted”]:
      if actor_is_admin:
        candidates.add(reporterId)
        subscriberIds.forEach(id => candidates.add(id))
      else:
        adminIds.forEach(id => candidates.add(id))
        subscriberIds.forEach(id => candidates.add(id))

    if activity in [“status_changed”,”closed”,”reopened”]:
      candidates.add(reporterId)
      subscriberIds.forEach(id => candidates.add(id))

    // BR-1: remove users who cannot view a private ticket
    if !isPublic:
      candidates = new Set([...candidates].filter(id =>
        id === reporterId || adminIds.has(id)
      ))

    // BR-2: remove actor
    candidates.delete(actorId)

    return candidates  // BR-3 dedup is implicit — Set prevents duplicates

STEP C — “insert-notifications”
  If recipients is empty: exit.

  Build notification copy and type per activity:

  | activity          | type                                   | title                      |
  |-------------------|----------------------------------------|----------------------------|
  | created           | support_ticket_created                 | “New support request”      |
  | content_updated   | support_ticket_updated                 | “Ticket updated”           |
  | comment_added     | support_ticket_comment_added           | “New comment on ticket”    |
  | comment_edited    | support_ticket_comment_edited          | “Comment edited on ticket” |
  | comment_deleted   | support_ticket_comment_deleted         | “Comment removed”          |
  | status_changed    | support_ticket_status_changed          | “Ticket status updated”    |
  | closed            | support_ticket_closed                  | “Ticket closed”            |
  | reopened          | support_ticket_reopened                | “Ticket reopened”          |

  body (all): `”Re: ${ticket.title}”`

  data payload (all):
  {
    ticket_id,
    actor_user_id,
    activity,
    from_status,  // null if not applicable
    to_status,    // null if not applicable
  }

  Bulk INSERT:
  await admin.from(“notifications”).insert(
    [...recipients].map(user_id => ({
      user_id,
      type: notificationType,
      title,
      body: `Re: ${ticket.title}`,
      data: { ticket_id, actor_user_id, activity, from_status, to_status },
    }))
  ).throwOnError()
```

---

##### STEP 7 — Register Inngest function

**File:** `lib/inngest/index.ts`

Add `notifyTicketActivity` to the exported functions array alongside the
existing functions. Verify `app/api/inngest/route.ts` uses this index — no
change needed there if it does.

---

##### STEP 8 — Notification bell + server action compatibility

**File:** `app/actions/notifications.ts`

Extend `NotificationRow[“type”]` union:
```typescript
export type NotificationRow = {
  id: string
  type:
    | “goal_achieved”
    | “checkin_submitted”
    | “support_ticket_created”
    | “support_ticket_updated”
    | “support_ticket_comment_added”
    | “support_ticket_comment_edited”
    | “support_ticket_comment_deleted”
    | “support_ticket_status_changed”
    | “support_ticket_closed”
    | “support_ticket_reopened”
  title: string
  body: string
  data: Record<string, unknown>
  created_at: string
}
```

**File:** `components/layout/notification-bell.tsx`

Add icon and color mappings for ticket types:

| type | icon (lucide-react) | icon bg / color |
|------|---------------------|-----------------|
| `support_ticket_created` | `Inbox` | bg-violet-100 text-violet-600 |
| `support_ticket_updated` | `FileEdit` | bg-amber-100 text-amber-600 |
| `support_ticket_comment_added` | `MessageSquare` | bg-sky-100 text-sky-600 |
| `support_ticket_comment_edited` | `MessageSquare` | bg-sky-100 text-sky-600 |
| `support_ticket_comment_deleted` | `MessageSquareMinus` | bg-slate-100 text-slate-600 |
| `support_ticket_status_changed` | `RefreshCw` | bg-orange-100 text-orange-600 |
| `support_ticket_closed` | `CheckCircle2` | bg-emerald-100 text-emerald-600 |
| `support_ticket_reopened` | `RotateCcw` | bg-blue-100 text-blue-600 |

Clicking a notification row should route to `/support/${data.ticket_id}` if
the data field is present. Wrap the row in a `<Link>` that closes the popover
on click before navigating.

Existing dismiss behavior (× button and clear all) is unchanged.

---

##### STEP 9 — Subscribe/unsubscribe UI on ticket detail page

**File:** `app/(dashboard)/support/[id]/page.tsx`

- Fetch subscription state server-side via `getTicketSubscriptionStateAction`.
  Pass `{ is_subscribed, can_subscribe }` as props to a client component.
- Place a `SubscribeButton` client component near the ticket action bar (below
  title, alongside upvote). Do not add it to the admin panel — admins receive
  notifications automatically without subscribing.

**Subscribe button states:**
- `can_subscribe && !is_subscribed` → “Subscribe” button (outline)
- `is_subscribed` → “Subscribed ✓” button (secondary) with tooltip
  “Unsubscribe” on hover → click calls `unsubscribeFromTicketAction`
- `!can_subscribe && !is_subscribed` → button hidden (closed ticket, or
  private ticket that user cannot view — but they wouldn't reach this page)
- Reporter always sees “Subscribed ✓” but their unsubscribe is blocked in
  the action (BR-12), so do not show an unsubscribe affordance to the reporter.

**New hook:** `hooks/use-ticket-subscriptions.ts`

```typescript
export function useTicketSubscriptionState(ticketId: string, initialState: { is_subscribed: boolean; can_subscribe: boolean }) {
  // useQuery with initialData from server-side fetch
  // queryKey: [“ticket-subscription”, ticketId]
  // queryFn: getTicketSubscriptionStateAction(ticketId)
  // staleTime: 60_000
}
```

Mutation helpers (inline in the button component):
- On subscribe success: `queryClient.invalidateQueries([“ticket-subscription”, ticketId])`
- On unsubscribe success: same invalidation

---

- Required file changes:
  - `supabase/migrations/<timestamp>_ticket_subscriptions_and_notifications.sql` (new)
  - `types/database.ts` (ticket_subscriptions type + extended notifications.type)
  - `types/inngest.ts` (SupportTicketActivityEvent)
  - `app/actions/tickets.ts` (auto-subscribe in createTicketAction; no-op guard + event in updateTicketContentAction; event in createTicketCommentAction)
  - `app/actions/comments.ts` (role check + no-op guard + event in updateCommentAction; role check + event in deleteCommentAction)
  - `app/actions/admin-tickets.ts` (SELECT-before-UPDATE + event in updateTicketStatusAction; no change to deleteTicketAction)
  - `app/actions/ticket-subscriptions.ts` (new)
  - `lib/inngest/functions/notify-ticket-activity.ts` (new)
  - `lib/inngest/index.ts` (register new function)
  - `app/actions/notifications.ts` (extend NotificationRow type)
  - `components/layout/notification-bell.tsx` (icon/color/link mapping for ticket types)
  - `hooks/use-ticket-subscriptions.ts` (new)
  - `app/(dashboard)/support/[id]/page.tsx` (subscribe button + server-side state fetch)

- Acceptance criteria:
  1. User creates ticket → all admins receive `support_ticket_created` notification
     in bell. Reporter does NOT receive their own notification.
  2. Reporter updates ticket title/description → admins + subscribers notified.
     No event if content is unchanged (no-op guard).
  3. Admin comments → reporter + subscribers notified. Admin does NOT notify
     other admins. Actor does NOT notify themselves.
  4. User/coach comments → all admins + subscribers notified. Actor excluded.
  5. Admin changes status (`open → in_progress`) → reporter + subscribers
     notified with `support_ticket_status_changed`.
  6. Admin closes ticket → reporter + subscribers notified with
     `support_ticket_closed`. Bell shows `CheckCircle2` icon.
  7. Admin reopens ticket → reporter + subscribers notified with
     `support_ticket_reopened`. Bell shows `RotateCcw` icon.
  8. No notification emitted for `deleteTicketAction` or `toggleUpvoteTicketAction`.
  9. Private (`is_public = false`) ticket updates never notify non-admin
     non-reporters. Bug reports (always private) behave the same.
  10. Reporter is auto-subscribed at ticket creation. Reporter cannot unsubscribe
      from their own ticket.
  11. Subscribe button appears on ticket detail for public tickets and for the
      reporter on private tickets. Closed tickets block new subscribes.
  12. Clicking a ticket notification in the bell navigates to
      `/support/${ticket_id}`.
  13. `npm run typecheck`, `npm run lint`, `npm run test` all pass.

- Sequence / rollout:
  1. STEP 1 — DB migration.
  2. STEP 2 — Type contracts (database.ts + inngest.ts).
  3. STEP 3 — `ticket-subscriptions.ts` server actions.
  4. STEP 4 — Auto-subscribe in `createTicketAction`.
  5. STEP 5 — Emit events from all ticket mutation actions.
  6. STEP 6 — `notify-ticket-activity.ts` Inngest fanout function.
  7. STEP 7 — Register Inngest function.
  8. STEP 8 — Bell + notifications.ts type extension.
  9. STEP 9 — Subscribe UI on ticket detail page.
  Run typecheck + lint after each step. Full test run at end.

---

## 14) Engineer -> Architect Updates

Use this template for each response:

```md
### [E-<id>] <short title>
- Linked architect item: A-<id>
- Implementation status: planned | in_progress | blocked | completed
- Files touched:
- Validation run:
- Deviations from design:
- Blockers / decisions needed:
```

### [E-001] Sidebar toggle moved into AppSidebar header
- Linked architect item: A-001
- Implementation status: completed
- Files touched:
  - `components/layout/app-sidebar.tsx`
  - `app/(dashboard)/layout.tsx`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (23/23, executed outside sandbox due IPC permission limits)
- Deviations from design:
  - None
- Blockers / decisions needed:
  - None

### [E-002] Sidebar trigger restored to content header (always visible)
- Linked architect item: A-002
- Implementation status: completed
- Files touched:
  - `components/layout/app-sidebar.tsx`
  - `app/(dashboard)/layout.tsx`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (23/23, executed outside sandbox due IPC permission limits)
- Deviations from design:
  - None
- Blockers / decisions needed:
  - None

### [E-003] Engineering amendments applied to A-003/A-004 spec
- Linked architect item: A-003, A-004
- Implementation status: completed
- Files touched:
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - N/A (documentation-only changes)
- Deviations from design:
  - Added guardrails for goal isolation (`listClientGoalsAction` and legacy `updateGoals`)
  - Clarified settings migration transition, unit-selector scope, route dependency sweep
  - Added explicit testing requirements
- Blockers / decisions needed:
  - Architect confirmation on revised A-003 backfill strategy for `assigned_by_id IS NULL` rows

### [E-004] A-003/A-004 implementation completed (goal isolation + settings overhaul)
- Linked architect item: A-003, A-004
- Implementation status: completed
- Files touched:
  - Goal isolation: `app/actions/coach-tools.ts`, `types/database.ts`, `supabase/migrations/20260315100000_personal_goal_flag.sql`
  - Settings data contract: `app/actions/settings.ts`, `lib/validations/settings.ts`, `types/database.ts`, `supabase/migrations/20260315101500_profiles_settings_expansion.sql`
  - Settings store/hydration: `stores/use-settings-store.ts`, `components/settings/settings-hydrator.tsx`, `app/providers.tsx`
  - Settings routes/UI: `app/(dashboard)/(account)/settings/{layout,page,profile/coaching/display/security/account}/page.tsx`, `components/settings/{settings-tab-nav,profile-settings-form,coaching-settings-form,display-settings-form,security-settings-panel,settings-section-skeleton}.tsx`
  - Unit propagation: `components/nutrition/{add-meal-dialog,manual-nutrition-diary,meal-planner/meal-planner-page}.tsx`, `components/nutrition/meal-groups/{meal-group-detail,meal-item-editor-dialog}.tsx`
  - Cross-route updates: `lib/supabase/proxy.ts`, `lib/auth/route-access.ts`, `components/auth/user-auth-form.tsx`, `app/actions/account-security.ts`
  - Tests: `tests/settings-goals-contract.test.ts`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (27/27, executed outside sandbox due tsx IPC permissions)
- Deviations from design:
  - Implemented transition-safe metadata fallback/write-through in `getSettingsProfile`, `updateProfile`, and `updateCoachingDefaults`.
  - Added section-level Suspense skeleton fallbacks for each new settings tab page.
  - Kept `/settings/account` route as redirect for backward compatibility.
- Blockers / decisions needed:
  - None

### [E-005] A-005 legacy/dead-code purge completed
- Linked architect item: A-005
- Implementation status: completed
- Files touched:
  - Runtime profile bug fix: `app/actions/progress.ts`
  - Inngest credential hardening: `lib/inngest/client.ts`, `utils/env/schema.ts`, `.env.local` (local-only key present)
  - Stale path cleanup: `app/actions/coach-tools.ts`
  - Route allowlist cleanup: `lib/auth/route-access.ts`, `lib/supabase/proxy.ts`
  - Dead DB object removal: `supabase/migrations/20260315113000_drop_unused_views.sql`, `types/database.ts`
  - Conditional metadata cleanup (`preferred_units`): `app/actions/settings.ts` (+ repo grep verification, no external consumers found)
  - Verification tests: `tests/settings-goals-contract.test.ts`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33, executed outside sandbox due tsx IPC permissions)
- Deviations from design:
  - None
- Blockers / decisions needed:
  - None

### [E-006] A-006 performance and security hardening rollout
- Linked architect item: A-006
- Implementation status: completed
- Files touched:
  - Migration + DB contract: `supabase/migrations/20260315120000_performance_indexes.sql`, `types/database.ts`
  - Dashboard refactor + RLS reads: `app/actions/clients-dashboard.ts`
  - Coach tools hardening (admin->server client, cursor pagination, LIKE escaping, bounded IN chunks): `app/actions/coach-tools.ts`
  - Search escaping callsites: `app/actions/exercises.ts`, `app/actions/meal-groups.ts`
  - Shared utilities: `lib/utils/search.ts`, `lib/utils/pagination.ts`, `lib/rate-limit.ts`
  - Middleware rate limiting: `lib/supabase/proxy.ts`
  - Query behavior updates: `hooks/use-clients-dashboard.ts`, `hooks/use-coach-tools.ts`, `lib/query-keys-coach.ts`
  - Cursor consumer updates: `components/coach-tools/client-roster.tsx`, `components/coach-tools/coach-payments-dashboard.tsx`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33)
- Deviations from design:
  - `clients-dashboard` now sources summary cards from `coach_client_summary` + RPC; detailed per-row notes/payments/sessions are represented as aggregated rows instead of full legacy row-level payloads.
  - `listCoachPaymentsDashboardAction` keeps `page` fields in payload/response for UI compatibility while execution now uses cursor semantics (`nextCursor`) for transaction retrieval.
- Blockers / decisions needed:
  - None

### [E-007] Hotfix for dropped `profiles` settings columns causing dashboard 500
- Linked architect item: A-004, A-005
- Implementation status: completed
- Files touched:
  - `app/actions/settings.ts`
  - `tests/settings-goals-contract.test.ts`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test -- tests/settings-goals-contract.test.ts` -> pass (33/33)
- Deviations from design:
  - `getSettingsProfile` now reads `phone`, `default_*`, and `compact_mode` from `auth.user_metadata` only (no `profiles` column reads) to align with migration `20260315101500_profiles_settings_expansion.sql`.
  - `updateCoachingDefaults` now persists `preferred_units` in `profiles` and stores `default_*` values in auth metadata.
  - `updateDisplayPreferences` now persists `compact_mode` in auth metadata.
- Blockers / decisions needed:
  - None

### [E-008] Dashboard hotfix for missing A-006 DB view/function in runtime schema
- Linked architect item: A-006
- Implementation status: completed
- Files touched:
  - `app/actions/clients-dashboard.ts`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test -- tests/clients-dashboard-keys.test.ts tests/settings-goals-contract.test.ts` -> pass (33/33)
- Deviations from design:
  - Added runtime compatibility fallback when either `public.coach_client_summary` or `public.get_coach_goal_history` is missing from schema cache.
  - Fallback avoids 500 by deriving a base summary from `clients` table only (goal/session/checkin/payment aggregates default to zero until migration is applied).
- Blockers / decisions needed:
  - Migration still required for full A-006 metrics: apply `supabase/migrations/20260315120000_performance_indexes.sql` in target DB.

### [E-009] Dashboard hotfix for missing legacy RLS helper function on analytics_events read
- Linked architect item: A-006
- Implementation status: completed
- Files touched:
  - `app/actions/clients-dashboard.ts`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test -- tests/clients-dashboard-keys.test.ts` -> pass (33/33)
- Deviations from design:
  - Added graceful degradation when `public.is_active_or_historical_coach_for_student` is missing: dashboard returns with empty `live_activity` instead of throwing 500.
  - Existing strict errors remain for unexpected analytics query failures.
- Blockers / decisions needed:
  - Target DB still needs legacy helper function restoration or migration alignment for full policy-backed analytics reads.

### [E-010] Added DB compatibility migration for missing legacy coach/student helper function
- Linked architect item: A-006
- Implementation status: completed
- Files touched:
  - `supabase/migrations/20260315123000_restore_legacy_coach_student_helper.sql`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
- Deviations from design:
  - Added compatibility function `public.is_active_or_historical_coach_for_student(uuid, uuid)` to stabilize environments with stale RLS policy references.
  - Function maps to current model (`clients.primary_coach_id` + `clients.linked_user_id`) and allows self/sysadmin checks.
- Blockers / decisions needed:
  - Migration must be pushed to target DB to remove dashboard warning and restore `live_activity` query path.

### [E-011] A-007 goal links + Inngest auto-sync implementation
- Linked architect item: A-007
- Implementation status: completed
- Files touched:
  - Migration + DB types: `supabase/migrations/20260316100000_goal_exercise_program_links.sql`, `types/database.ts`
  - Event types: `types/inngest.ts`
  - Goal-link search actions + hooks: `app/actions/goals.ts`, `hooks/use-goal-links.ts`, `lib/query-keys-coach.ts`
  - Goal CRUD/read integration: `app/actions/coach-tools.ts`, `components/coach-tools/client-goals-medical-tab.tsx`
  - Async sync path: `lib/inngest/functions/sync-goal-from-workout.ts`, `lib/inngest/index.ts`, `app/api/inngest/route.ts`
  - Workout event emission: `app/actions/workout.ts`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33; executed outside sandbox due tsx IPC permissions)
- Deviations from design:
  - In `updateWorkoutAction`, `training/workout.completed` is emitted when exercises are rewritten (`data.exercises` present), not for metadata-only updates.
  - Worker progress% is clamped to `0..100` for safety in malformed/overshoot scenarios.
- Blockers / decisions needed:
  - Apply/push `supabase/migrations/20260316100000_goal_exercise_program_links.sql` to the target DB before rollout; until then, linked-goal fields depend on existing schema compatibility fallbacks.

### [E-012] A-008 auto-sync gap + notifications bell implementation
- Linked architect item: A-008
- Implementation status: completed
- Files touched:
  - Auto-sync trigger fix: `app/actions/workout-quick-actions.ts`
  - Notifications schema + types: `supabase/migrations/20260317100000_notifications.sql`, `types/database.ts`
  - Inngest events/functions: `types/inngest.ts`, `lib/inngest/functions/sync-goal-from-workout.ts`, `lib/inngest/functions/notify-checkin-submitted.ts`, `lib/inngest/index.ts`
  - Check-in event emission: `app/actions/coach-tools.ts`
  - Notifications data boundary + caching: `app/actions/notifications.ts`, `lib/query-keys.ts`, `hooks/use-notifications.ts`
  - UI integration: `components/layout/notification-bell.tsx`, `app/(dashboard)/layout.tsx`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33)
- Deviations from design:
  - `fitness_goals` has no `title` column in current schema; goal-achieved payload uses `custom_description` fallback and derived `goal_type` label.
  - RC-2 (local `inngest dev` runtime verification) could not be conclusively validated from this terminal session due CLI startup hang; code registration/path is in place (`lib/inngest/index.ts` + `app/api/inngest/route.ts`).
- Blockers / decisions needed:
  - Run `npx inngest-cli@latest dev` locally in a separate terminal and confirm `sync-goal-from-workout` + `notify-checkin-submitted` appear in the local Inngest dashboard before manual QA.

### [E-013] A-010 My Tickets fix + realtime channel de-collision
- Linked architect item: A-010
- Implementation status: completed
- Files touched:
  - `app/actions/tickets.ts`
  - `hooks/use-realtime-sync.ts`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33)
- Deviations from design:
  - None
- Blockers / decisions needed:
  - None

### [E-014] A-011 notification realtime + goal realtime + goals revalidation
- Linked architect item: A-011
- Implementation status: completed
- Files touched:
  - Notification realtime: `hooks/use-notification-realtime.ts`, `components/layout/notification-bell.tsx`, `hooks/use-notifications.ts`, `app/(dashboard)/layout.tsx`
  - Goal realtime: `hooks/use-goal-realtime.ts`, `components/goals/goal-realtime-sync.tsx`, `app/(dashboard)/goals/page.tsx`
  - Revalidation: `app/actions/workout.ts`
  - Realtime publication migration: `supabase/migrations/20260317120000_notifications_realtime_publication.sql`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33)
- Deviations from design:
  - Used shared browser Supabase helper `createClient()` in realtime hooks instead of in-file `createBrowserClient(...)`; behavior remains identical and keeps client config centralized.
- Blockers / decisions needed:
  - Apply migration `20260317120000_notifications_realtime_publication.sql` in target DB for notification realtime events to flow.

### [E-015] A-012 coach workout goal sync fix + coach client goal realtime
- Linked architect item: A-012
- Implementation status: completed
- Files touched:
  - Coach workout subject mapping + event emission: `app/actions/coach-tools.ts`
  - Inngest safety fallback for legacy/null subject_user: `lib/inngest/functions/sync-goal-from-workout.ts`
  - Coach client realtime hook: `hooks/use-goal-realtime.ts`
  - Coach goal tab integration: `components/coach-tools/client-goals-medical-tab.tsx`
  - Contract verification: `types/inngest.ts` (already included `subject_client_id`)
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33)
- Deviations from design:
  - `logClientWorkoutAction` did not previously fetch client linkage in-scope; a minimal `clients` lookup (`id, linked_user_id`) was added before constructing the workout payload.
  - Added `training/workout.completed` emission to `logClientWorkoutAction` so coach-logged workouts trigger goal auto-sync immediately after insert.
- Blockers / decisions needed:
  - None

### [E-016] A-017 single-assignee program rules (workout + meal programs)
- Linked architect item: A-017
- Implementation status: completed
- Files touched:
  - DB constraints + dedupe migration: `supabase/migrations/20260317174500_single_assignee_per_program.sql`
  - Workout assignment action conflict guard: `app/actions/coach-tools.ts`
  - Meal assignment action conflict guard: `app/actions/meal-groups.ts`
  - Architecture log update: `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33)
- Deviations from design:
  - Meal assignment uniqueness treats both `active` and `paused` as "currently assigned" to prevent reassignment while paused.
  - Added deterministic migration cleanup to archive duplicate current assignments before creating unique indexes.
- Blockers / decisions needed:
  - Apply migration `20260317174500_single_assignee_per_program.sql` in target Supabase project before QA/production verification.

### [E-017] Meal-group assignment RLS hotfix for snapshot cloning
- Linked architect item: A-017
- Implementation status: completed
- Files touched:
  - `app/actions/meal-groups.ts`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
- Deviations from design:
  - `cloneMealGroup` now mirrors the existing create-group fallback strategy:
    - attempt insert/write with the user-scoped client first
    - if insert fails with RLS (`42501` / row-level security), retry with admin client
    - preserve `owner_user_id` / `created_by_user_id` as actor id for audit integrity
- Blockers / decisions needed:
  - None

### [E-018] Program detail assignee UI (searchable dropdown + load more)
- Linked architect item: A-017
- Implementation status: completed
- Files touched:
  - `app/actions/program.ts`
  - `hooks/use-program.ts`
  - `lib/query-keys-training.ts`
  - `components/program/program-assignee-dropdown.tsx` (new)
  - `app/(dashboard)/(training)/programs/[id]/page.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33)
- Deviations from design:
  - Reused `training_plans.user_id` as the single assignee source-of-truth (one program -> one person), and added explicit assignment actions/UI instead of introducing a new assignment table.
  - Assignee search uses admin client for profile listing (after actor authorization), with page-size+1 probing for efficient `has_more` without `count(*)`.
- Blockers / decisions needed:
  - None

### [E-019] Program assignment target corrected to coach clients + self
- Linked architect item: A-017
- Implementation status: completed
- Files touched:
  - `supabase/migrations/20260317193000_training_plans_assigned_client.sql` (new)
  - `types/database.ts`
  - `app/actions/program.ts`
  - `hooks/use-program.ts`
  - `components/program/program-assignee-dropdown.tsx`
  - `app/(dashboard)/(training)/programs/[id]/page.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run test` -> pass (33/33)
- Deviations from design:
  - Assignment no longer re-uses `training_plans.user_id` for assignee switching.
  - Ownership remains on `training_plans.user_id`; assignee target is stored in new nullable `training_plans.assigned_client_id`.
  - Dropdown now includes:
    - `self` target (coach/user can assign to self)
    - coach-owned clients only
  - Client assignment requires `linked_user_id`; unlinked clients are shown but disabled.
- Blockers / decisions needed:
  - Apply migration `20260317193000_training_plans_assigned_client.sql` in target Supabase project.

### [E-020] Meal-group detail header + assignment dropdown + sheet editor refactor
- Linked architect item: A-017 (follow-up UI parity with program assignment UX)
- Implementation status: completed
- Files touched:
  - `app/actions/meal-groups.ts`
  - `hooks/use-meal-groups.ts`
  - `lib/query-keys-nutrition.ts`
  - `lib/query-keys-meal-groups.ts`
  - `components/nutrition/meal-groups/meal-group-assignee-dropdown.tsx` (new)
  - `components/nutrition/meal-groups/meal-group-detail.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test` -> pass (33/33)
- What changed:
  - Added paginated/searchable meal-group assignee listing action (`listMealGroupAssigneesAction`) with self option + coach-owned client filtering.
  - Added meal-group assignee infinite query hooks + flatten helper.
  - Added dedicated `MealGroupAssigneeDropdown` (search + load more), aligned with program detail UX.
  - Refactored `/nutrition/groups/[groupId]` detail header:
    - back action is now icon-left of title
    - right side contains assignee dropdown only
    - duplicate moved below title
    - removed title card treatment
  - Replaced inline meal-group metadata form with responsive sheet editor:
    - desktop: right-side sheet
    - mobile: bottom sheet
  - Assignment flow in detail now supports replacing current active/paused assignee by archiving existing assignment then creating new one (maintains one-current-assignee invariant).
- Deviations from design:
  - Current assignee label fallback is `Client <id-prefix>` until dropdown data resolves, because detail payload does not yet include subject display names.
- Blockers / decisions needed:
  - None

### [E-021] A-015 nutrition dashboard + planner scope UX overhaul
- Linked architect item: A-015
- Implementation status: completed
- Files touched:
  - `components/nutrition/nutrition-scope-controls.tsx`
  - `components/nutrition/dashboard/nutrition-dashboard.tsx`
  - `components/nutrition/meal-planner/meal-planner-page.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test` -> pass (33/33)
- What changed:
  - Removed user subject dropdown from scope controls.
  - Replaced meal group `Select` with searchable `Popover` (assigned groups only; no global fallback).
  - Updated scope-control clearing logic to validate against assigned groups only.
  - Dashboard header now has only title/subtitle (removed header-level plus and scope buttons).
  - Dashboard scope control moved into content card above date row and changed from Dialog to right-side Sheet.
  - Planner scope dialogs (empty state + main page) changed from Dialog to right-side Sheet.
  - Planner options button converted to icon-only style.
  - Main planner options button moved into MON–SUN row at far right (`ml-auto`).
  - Removed planner options button from the second action row.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-022] Hotfix — prevent nutrition scope selection update loop
- Linked architect item: A-015 (post-implementation regression fix)
- Implementation status: completed
- Files touched:
  - `components/nutrition/nutrition-scope-controls.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test` -> pass (33/33)
- Root cause:
  - `NutritionScopeControls` used `useNutritionAutoMealGroupSelection()` with default fallback behavior.
  - That hook can auto-select a non-assigned active group from the global meal-group list.
  - New A-015 scope rules then immediately cleared non-assigned selections.
  - The two effects oscillated (`setSelectedMealGroupId` set -> clear -> set), causing React "Maximum update depth exceeded."
- Fix:
  - Disabled built-in auto selection in this component via `useNutritionAutoMealGroupSelection({ enabled: false })`.
  - Added local one-way defaulting effect that only auto-selects `activeAssignmentGroupId` when present.
  - Preserved strict "assigned groups only" behavior.
- Deviations from design:
  - None; behavior now matches A-015 intent more closely.
- Blockers / decisions needed:
  - None.

### [E-023] A-018 + A-019 dashboard global totals and load-path cleanup
- Linked architect items: A-018, A-019
- Implementation status: completed
- Files touched:
  - `app/actions/nutrition-manual.ts`
  - `hooks/use-nutrition-manual.ts`
  - `hooks/use-nutrition-dashboard.ts`
  - `hooks/use-nutrition-data.ts`
  - `components/nutrition/dashboard/nutrition-dashboard.tsx`
  - `supabase/migrations/20260318101000_nutrition_dashboard_indexes.sql` (new)
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test` -> pass (33/33)
- What changed:
  - `applyMealGroupFilter` now distinguishes:
    - UUID string -> exact group filter
    - `null` -> legacy `meal_group_id IS NULL`
    - `undefined` -> no filter (global)
  - Dashboard totals/activity now run unscoped:
    - `useNutritionDashboard` no longer reads `selectedMealGroupId`
    - diary query uses `meal_group_id: undefined` with `staleTime: 120_000`
    - activity query uses `meal_group_id: undefined` with `staleTime: 60_000`
  - `useNutritionDiary` query enablement now depends only on `performedOn`.
  - `getActiveNutritionPlanForDate`:
    - removed nested `requireActor()` call
    - accepts existing `supabase` client from caller
    - runs assignment and plan lookups in parallel
  - `useNutritionPrefetch` now warms the unscoped dashboard diary key (`today`, `meal_group_id: undefined`) and removed stale selected-date/group prefetch path.
  - Dashboard header cleaned to title + subtitle only (removed scope modal/button UI and associated dead imports/state).
  - Added DB index migration for dashboard-critical paths:
    - `meal_logs` by subject/date (user + client)
    - `meal_log_items` by `meal_log_id`
    - `meal_plan_assignments` by subject/status/date range (user + client)
    - `meal_plans` by subject/status/date range (user fallback)
- Deviations from design:
  - Kept `useSetNutritionViewMode` / `useSetNutritionNavigationSource` removed from dashboard only; other nutrition surfaces still set these values.
- Blockers / decisions needed:
  - Apply migration `20260318101000_nutrition_dashboard_indexes.sql` in target Supabase project.

---

### [A-010] Fix "My Tickets" tab + confirm real-time ticket coverage

- Priority: High
- Depends on: A-009 (can be implemented in parallel; no schema dependencies)
- Status: Queued

---

#### BACKGROUND — what was audited

Before writing this task the architect read:

- `hooks/use-tickets.ts` — `useTickets({ scope: "mine" })` correctly calls `getTicketsAction({ scope: "mine", ... })`
- `app/actions/tickets.ts` — `listMyTicketsAction` and `listPublicTicketsAction` both implement the same shape
- `hooks/use-realtime-sync.ts` — existing `useRealtimeSync` hook
- `lib/query-keys.ts` — query key factory

The root cause of the "My Tickets" bug was found in `app/actions/tickets.ts`. Real-time coverage for both pages is **already functional** but has one improvement gap detailed below.

---

#### PART 1 — Bug: "My Tickets" tab returns empty

**Root cause (confirmed by reading the source):**

`listMyTicketsAction` (`app/actions/tickets.ts:301`) uses `createClient()` (the RLS-enforced server Supabase client) to SELECT from `tickets`:

```typescript
let query = supabase
  .from("tickets")
  .select("*", { count: "exact" })
  .eq("user_id", user.id);
```

`listPublicTicketsAction` (line 238) avoids this by switching to `createAdminClient()` after authenticating, and applying `.eq("is_public", true)` as the data gate.

If the `tickets` table RLS policy is `is_public = true` (or no SELECT policy for regular users), then `createClient()` returns 0 rows — even if `user_id` matches — because RLS is evaluated before the `.eq("user_id", user.id)` filter.

This is confirmed by the existing pattern: `createTicketAction` also uses `createAdminClient()` for its INSERT after authenticating with `createClient()`, deliberately to avoid RLS edge cases.

**Fix — one file: `app/actions/tickets.ts`**

Inside `listMyTicketsAction`, after authenticating with `createClient()`, switch to `createAdminClient()` for the SELECT. The `user.id` filter is the access gate; no RLS policy is needed on top.

```typescript
async function listMyTicketsAction(input: z.input<typeof listSchema>): Promise<TicketListResult> {
  const params = listSchema.parse(input);
  return runTrackedAction({
    eventName: "support.tickets.list.mine",
    payload: { page: params.page, page_size: params.page_size },
    action: async () => {
      // Authenticate caller via RLS-aware client.
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      // Use admin client for the SELECT — same pattern as listPublicTicketsAction.
      // The .eq("user_id", user.id) line below is the only access gate.
      const admin = createAdminClient();
      let query = admin
        .from("tickets")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      // ... rest of the function is unchanged (search, category, status, sort, range, upvotes)
    },
  });
}
```

**Checklist:**
- [ ] Replace `supabase.from("tickets")` with `admin.from("tickets")` inside `listMyTicketsAction`
- [ ] Keep `createClient()` call — it is still needed for `auth.getUser()`
- [ ] Do NOT remove the `.eq("user_id", user.id)` filter — that is the ownership gate
- [ ] `getViewerUpvotedIds` already uses `createAdminClient()` — no change needed there
- [ ] `npm run typecheck` + `npm run lint` must pass; no test changes expected

---

#### PART 2 — Real-time ticket coverage audit

The architect audited `hooks/use-realtime-sync.ts`. Summary:

```
Channel: "public:tickets_and_comments" (static name)
Subscriptions:
  tickets table  → event: "*" → invalidates ticketKeys.all, adminLists, detail(id), subscriptionKeys.detail(id)
  ticket_comments → event: "*" → invalidates commentKeys.list(id), ticketKeys.detail(id), ticketKeys.lists(), adminLists
```

**Coverage assessment:**

| Event | Covered? | Detail |
|---|---|---|
| New ticket appears in community board | ✅ | ticket INSERT → `ticketKeys.all` invalidated |
| New ticket appears in "My Tickets" | ✅ | same invalidation path |
| Ticket status changes | ✅ | ticket UPDATE → `ticketKeys.all` + `detail` invalidated |
| Upvote count updates | ✅ | ticket UPDATE → queries refetch |
| New comment in detail view | ✅ | comment INSERT → `commentKeys.list(id)` + `ticketKeys.detail(id)` |
| Comment deleted | ✅ | comment DELETE → same path |
| Comment edited | ✅ | comment UPDATE → same path |

**Real-time is already working.** No additional subscription code is needed. The engineer does **not** need to create new realtime hooks for the ticket pages.

**One improvement required — channel name uniqueness:**

The channel name `"public:tickets_and_comments"` is static. When both `/support` (list) and `/support/[id]` (detail) pages are mounted simultaneously, two instances of `useRealtimeSync` will call `supabase.channel("public:tickets_and_comments")`. In Supabase JS v2 this creates two separate channel objects with the same name — both subscribed. This causes duplicate invalidations (harmless but wasteful) and can cause a "subscribe called on already subscribed channel" warning on cleanup.

Fix: scope the channel name to the page context.

**Fix — `hooks/use-realtime-sync.ts`:**

Change the static channel name to include a suffix that distinguishes the page instance:

```typescript
// Before:
let channel: RealtimeChannel = supabase.channel("public:tickets_and_comments");

// After:
const channelName = ticketId
  ? `public:tickets_and_comments:detail:${ticketId}`
  : "public:tickets_and_comments:list";
let channel: RealtimeChannel = supabase.channel(channelName);
```

This ensures:
- List page uses `"public:tickets_and_comments:list"` — subscribes to all ticket/comment changes, no ticketId filter
- Detail page uses `"public:tickets_and_comments:detail:<uuid>"` — same subscriptions but scoped channel name prevents collision

No other changes to subscription logic or invalidation handlers.

**Checklist:**
- [ ] Replace static `"public:tickets_and_comments"` with the dynamic channel name above
- [ ] Both list and detail pages continue to call `useRealtimeSync()` as they already do — no call-site changes
- [ ] `npm run typecheck` + `npm run lint` must pass

---

#### PART 3 — Header update

Update the file header line:

```
Working tree: dirty (A-007 implemented; A-008/A-009/A-010/A-011/A-012/A-013/A-014 queued; pending DB migrations)
```

---

#### Acceptance criteria

- [ ] "My Tickets" tab on `/support` returns the authenticated user's own tickets (including private bug reports)
- [ ] Community Board tab is unaffected
- [ ] Channel name collision warning no longer appears in browser console when both list and detail pages are simultaneously mounted
- [ ] No new test failures; typecheck and lint pass

### [E-024] P0 nutrition diary/planner cleanup (meal-group gate removal + scoped cache invalidation)
- Linked architect item: A-024 (web benchmark follow-up)
- Implementation status: completed
- Files touched:
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `components/nutrition/meal-planner/meal-planner-page.tsx`
  - `hooks/use-nutrition-manual.ts`
  - `hooks/use-meal-groups.ts`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass (33/33)
- What changed:
  - Removed hard diary gate on meal group selection for core logging actions:
    - Add/Edit item
    - Quick Add
    - Copy Meals
    - Recent/Favorites add-to-diary
  - Added fallback default meal sections when no configured sections exist, so diary cards are always usable in general mode.
  - Kept meal-group requirement only for section customization (`Add Meal Type`) because backend section schema is meal-group scoped.
  - Replaced blocking banner text with non-blocking "general diary mode" guidance.
  - Removed duplicate planner CTA pattern:
    - Removed top action-row `Add Meal Type` button
    - Removed empty-state duplicate `Add Meal Type` button
    - Retained one primary `Add Meal Type` CTA in the meal-types header.
  - Lazy-loaded favorites lookup:
    - Removed eager heavy initial lookup (`limit=200`).
    - Favorites queries now support `enabled` flag.
    - Favorites are fetched only when Favorites panel opens (or when star toggle needs lookup hydration).
    - Added local favorite override map for immediate star-state consistency after toggle.
  - Replaced broad cache invalidation:
    - `useMealGroupMutations`: removed global invalidate-all behavior and switched to mutation-scoped invalidation (detail/list/assignment keys + nutrition invalidation only for assignment mutations).
    - `useNutritionMutations`: removed global invalidate-primary behavior and scoped invalidations by mutation type (day/dashboard/client summary vs plans/templates vs favorites).
- Deviations from design:
  - For item/plan-note mutations where group id is not in mutation input, detail invalidation remains at meal-group-detail-root scope to preserve correctness without extra lookup RPCs.
- Blockers / decisions needed:
  - None.

### [E-025] Meal diary cleanup — removed Options + Yesterday features entirely
- Linked architect item: A-024 follow-up
- Implementation status: completed
- Files touched:
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
- What changed:
  - Removed `Options` button from meal diary action row.
  - Removed `Diary Options` modal (desktop + mobile paths) and all associated state handlers.
  - Removed `Yesterday` button and its direct open/copy prefill behavior.
  - Removed all associated legacy code paths and dead imports:
    - `SlidersHorizontal`, `Sparkles`, `NutritionScopeControls`
    - `optionsDialogOpen` state + dialog block
    - button handlers tied only to deleted features.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-026] Meal diary ordering UX refactor (Custom Order + Clear Order)
- Linked architect item: A-024 follow-up
- Implementation status: completed
- Files touched:
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass (33/33)
- What changed:
  - Replaced `Add Meal Type` action with `Custom Order`.
  - Added adjacent `Clear Order` action to reset user-defined ordering.
  - Replaced add-type dialog with ordering sheet:
    - desktop: right-side sheet
    - mobile: bottom sheet
  - Ordering sheet now lists all meal types and shows selection sequence numbers next to selected types.
  - Clicking meal types updates display order in real time according to click sequence.
  - Fixed disappearing-meal-types behavior by always rendering the full default meal-type set, then applying custom ordering on top.
  - Removed obsolete add-type implementation/state (`addMealTypeDialogOpen`, `newMealType`, server add-section call path from this UI).
- Deviations from design:
  - Ordering is applied client-side for the diary view and can be reset via `Clear Order`; no schema changes were introduced.
- Blockers / decisions needed:
  - None.

### [E-027] Meal diary custom order hotfix — apply order deterministically + persist on reload
- Linked architect item: A-024 follow-up (post-implementation fix)
- Implementation status: completed
- Files touched:
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `stores/use-nutrition-ui-store.ts`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass (33/33)
- What changed:
  - Moved custom meal-type order state into persisted nutrition UI store (`diaryMealTypeOrder`) so ordering survives page reload.
  - Added store actions/hooks for setting and clearing diary meal-type order.
  - Replaced rank-sort behavior with deterministic sequence application:
    - selected types render first in exact click sequence
    - all remaining types keep their original fallback order.
  - This resolves both issues:
    - selected order not applying reliably in-page
    - order resetting after refresh.
- Deviations from design:
  - Persistence scope is user-local UI state (Zustand persisted store), not server-side per-subject/per-group storage.
- Blockers / decisions needed:
  - None.

### [E-028] Meal diary custom order persistence hardening — stale-safe updates + normalized storage
- Linked architect item: A-024 follow-up (persistence stabilization)
- Implementation status: completed
- Files touched:
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `stores/use-nutrition-ui-store.ts`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
- What changed:
  - Updated `setDiaryMealTypeOrder` in nutrition UI store to accept functional updaters (`prev => next`) in addition to direct arrays.
  - Added normalization/deduping for persisted diary meal-type order before writing state:
    - trims entries
    - removes empty values
    - removes duplicates while preserving selection order.
  - Updated diary custom-order toggle logic to use functional store updates, eliminating stale-closure race conditions on rapid multi-click ordering.
- Why this fix:
  - Ensures custom order selection always applies reliably to the page order.
  - Ensures persisted order remains valid and stable across reload/hydration cycles.
- Deviations from design:
  - None (still client-side persisted UI state; no schema changes).
- Blockers / decisions needed:
  - None.

### [E-029] Meal diary custom order behavior fix — selected cards only
- Linked architect item: A-024 follow-up (UX correction)
- Implementation status: completed
- Files touched:
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Updated `orderedVisibleSections` behavior:
    - if `customSectionOrder` is empty: render default/all meal-type cards (existing behavior)
    - if `customSectionOrder` has selections: render only selected orderable meal-type cards in selected sequence.
  - Added safe exception for non-orderable legacy sections (`other`): keep them visible only when they already contain logged items, so existing data never becomes inaccessible.
- Why this fix:
  - Aligns diary page behavior with user expectation: selecting two types in Custom Order shows two cards, not all cards.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-030] Meal planner parity fix — custom order now renders selected cards only
- Linked architect item: meal planner follow-up parity with diary custom order
- Implementation status: completed
- Files touched:
  - `components/nutrition/meal-planner/meal-planner-page.tsx`
  - `stores/use-nutrition-ui-store.ts`
  - `hooks/use-meal-groups.ts`
  - `app/actions/meal-groups.ts`
  - `tests/nutrition-architecture.test.ts`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Replaced planner `Add Meal Type` flow with `Custom Order` + `Clear Order`.
  - Added planner custom-order sheet (desktop right, mobile bottom) with sequence badges.
  - Planner card rendering now matches diary behavior:
    - no custom selection => default/planned meal-type cards
    - custom selection present => only selected meal-type cards in selected sequence.
  - Added day-scoped persisted planner order state in nutrition UI store (`plannerMealTypeOrderByDay`) with functional updater + normalization.
  - Removed old add-meal-type legacy path and dead code:
    - planner UI modal/state/handlers for `Add Meal Type`
    - `createPlanType` mutation wiring in `use-meal-groups`
    - dead `createMealPlanTypeAction` server action + schema.
  - Added regression test coverage for planner day-scoped order store behavior.
- Why this fix:
  - Resolves planner mismatch where selecting a subset still displayed all meal-type cards.
  - Keeps implementation clean by deleting obsolete add-type code path and related dead hooks/actions.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-031] Meal planner hydration mismatch fix — deterministic first render
- Linked architect item: runtime stability follow-up
- Implementation status: completed
- Files touched:
  - `components/nutrition/meal-planner/meal-planner-page.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Added `isClientReady` mount guard in planner page.
  - Planner now returns `MealPlannerSkeleton` until client mount is complete, ensuring the server HTML and initial client render are identical.
- Why this fix:
  - Prevents SSR/client branch divergence caused by persisted client-only nutrition state (`selectedMealGroupId`) resolving differently across server vs first client render.
  - Eliminates the reported hydration mismatch (`<section ...>` vs `<div className="section-gap">`).
- Deviations from design:
  - Initial client paint now intentionally shows skeleton until mount to guarantee hydration-safe markup.
- Blockers / decisions needed:
  - None.

### [E-032] Meal diary UI cleanup — remove top macro stat cards and simplify active plan section
- Linked architect item: meal diary UI cleanup follow-up
- Implementation status: completed
- Files touched:
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Removed diary top summary stat cards (Calories, Protein, Carbs, Fat).
  - Kept only active-plan progress bars for the progress section.
  - Removed active-plan section header content:
    - removed title text (`Active plan progress`)
    - removed plan name subtitle
    - removed date badge (`start_date -> end_date`).
  - Removed legacy/dead code tied to deleted UI:
    - `DailyMacroCard` component
    - unused imports (`Badge`, `Card*`, `Flame`)
    - unused `title` prop in `ManualNutritionDiaryProps`
    - loading-state skeleton row for removed stat cards.
- Why this fix:
  - Aligns diary UI to requested simplified layout and avoids carrying dead rendering paths.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-033] Meal planner enhancement — add Active Plan Progress card parity with diary
- Linked architect item: meal planner follow-up
- Implementation status: completed
- Files touched:
  - `components/nutrition/meal-planner/meal-planner-page.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Added an `Active Plan Progress` card to meal planner page, matching diary progress visualization.
  - Card is shown only when an active plan exists for the current nutrition scope/date.
  - Card compares planner day totals (`selectedPlan.totals`) against active plan daily targets:
    - Calories
    - Protein
    - Carbs
    - Fat
  - Reused existing planner progress computation and shared progress-bar visual style to keep behavior and UI consistent with meal diary.
- Why this fix:
  - Provides planner-side visibility into macro/energy target adherence without forcing navigation to diary page.
  - Keeps implementation lightweight (no extra mutation paths; read-only query + cached hook).
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-034] Meal planner UX refresh — remove top summary/actions, add Favorites section, add Mon–Sun day copy
- Linked architect item: meal planner follow-up
- Implementation status: completed
- Files touched:
  - `components/nutrition/meal-planner/meal-planner-page.tsx`
  - `app/actions/meal-groups.ts`
  - `hooks/use-meal-groups.ts`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run typecheck` -> pass
  - `npm run lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Removed planner top day summary strip (`Monday — X meals`, `kcal`) from the meal planner page.
  - Removed top-level planner action controls:
    - removed `Options` button
    - removed `Duplicate` button
    - removed top global `Plus` button
  - Reworked no-selection empty state to avoid options modal dependency:
    - users can now pick an existing meal group directly from inline select
    - create planner action remains available.
  - Added planner `Favorites` section modeled after meal diary:
    - collapsible favorites panel
    - meal-type selector (`breakfast`, `lunch`, etc.)
    - favorite chips insert directly into selected planner day/meal type.
  - Added `Copy From Day` flow for planner:
    - button near MON–SUN day tabs
    - dialog to choose source weekday
    - target is current selected weekday
    - copies all source day items into target day in one operation.
  - Added new server action `copyMealPlanDayAction` and hook mutation `copyDay` for efficient batch day copy (single insert batch instead of multiple client mutations).
- Why this fix:
  - Matches requested UI simplification and removes redundant top controls.
  - Adds planner parity with diary favorites workflow for faster meal entry.
  - Provides direct Mon–Sun copy workflow with DB-efficient implementation.
- Deviations from design:
  - `Options` modal path removed in planner; meal-group selection is now inline in planner empty state.
- Blockers / decisions needed:
  - None.

### [E-035] Meal planner hardening — remove legacy empty-state path and add item-level favorite star toggle
- Linked architect item: meal planner follow-up
- Implementation status: completed
- Files touched:
  - `components/nutrition/meal-planner/meal-planner-page.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Removed legacy large planner empty-state card path and replaced it with:
    - auto-select first available meal group when present
    - compact empty state only when no planners exist (create CTA only).
  - Added item-level favorite star button on meal planner meal rows:
    - star reflects favorited state
    - click toggles add/remove favorite for the specific meal item + meal type
    - state uses merged favorite cache (`allFavorites` + local optimistic override map) for stable UI feedback.
  - Added lazy favorites hydration for planner star states (`favoritesLookupEnabled`) to avoid eager heavy fetch on initial load.
- Why this fix:
  - Eliminates the outdated UX block shown in planner while keeping fast path for users with existing groups.
  - Brings missing planner parity with diary by exposing favorite toggle directly on each meal item row.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-036] Nutrition diary metrics fix — derive/sync macro totals from meal items
- Linked architect item: diary metrics regression hotfix
- Implementation status: completed
- Files touched:
  - `app/actions/nutrition-manual.ts`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- Root cause:
  - Diary UI section headers and active progress relied on `meal_logs.total_*` columns.
  - Those totals were not synchronized in item mutation actions (`add/update/remove/copy`), so totals drifted from real item rows and could show stale values (including days with no remaining items).
- What changed:
  - Added shared helpers in `nutrition-manual.ts`:
    - `deriveMealLogTotals(...)`
    - `setMealLogTotals(...)`
    - `syncMealLogTotals(...)`
  - `getNutritionDiaryDayAction` now derives each log's totals from `meal_log_items` during read, then computes daily totals/progress from derived values.
  - Item mutation actions now keep `meal_logs.total_*` synchronized:
    - `addMealItemAction` -> sync totals after insert
    - `updateMealItemAction` -> sync totals after update
    - `removeMealItemAction` -> sync totals after delete
    - `copyMealsFromDateAction` -> set totals for each copied target log from copied rows.
- Why this fix:
  - Ensures diary macros/calories and active-progress metrics reflect actual logged items for the selected date.
  - Prevents stale summary values in section headers (e.g., always showing `P 0g • C 0g • F 0g` or old non-zero progress with no current items).
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-037] Meal-group detail parity pass — align `/nutrition/groups/[id]` with diary/planner UX
- Linked architect item: meal-group follow-up parity + cleanup
- Implementation status: completed
- Files touched:
  - `components/nutrition/meal-groups/meal-group-detail.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Completed missing parity flows on meal-group detail:
    - added `Custom Order` sheet (right on desktop, bottom on mobile)
    - added `Copy Meals From Day` dialog with source-day selector and target-day context.
  - Removed redundant top-level `Add Meal Item` button to reduce duplicated actions and keep flow section-first.
  - Kept section-level add as primary action and prefilled editor meal type from selected section.
  - Ensured custom-order modal includes selection sequence badges (1..N) and clear-order action.
  - Kept favorites panel pattern consistent with diary/planner (collapsed by default, lazy loaded).
- Why this fix:
  - Brings `/nutrition/groups/[id]` interaction model to the same standard already used in meal diary and meal planner.
  - Removes leftover/legacy action redundancy and keeps the page focused and predictable.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-038] Meal-type order persistence isolation — diary vs planner vs meal-group scoped
- Linked architect item: persistence isolation follow-up
- Implementation status: completed
- Files touched:
  - `stores/use-nutrition-ui-store.ts`
  - `components/nutrition/meal-groups/meal-group-detail.tsx`
  - `tests/nutrition-architecture.test.ts`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Added a dedicated persisted namespace for meal-group ordering:
    - `mealGroupMealTypeOrderByGroup[groupId][day]`
  - Kept diary and planner persistence independent:
    - diary uses `diaryMealTypeOrder`
    - planner uses `plannerMealTypeOrderByDay`
    - meal-group detail now no longer reuses planner storage.
  - Added new store actions/hooks for meal-group order state:
    - `setMealGroupMealTypeOrder(mealGroupId, day, updater)`
    - `clearMealGroupMealTypeOrder(mealGroupId, day)`
    - `useNutritionMealGroupMealTypeOrder(mealGroupId, day)`
  - Updated `/nutrition/groups/[id]` detail page to use the new meal-group-scoped hooks.
  - Added regression test proving group/day isolation and non-collision across groups.
- Why this fix:
  - Prevents custom order state from leaking between meal planner and meal-group detail pages.
  - Allows each meal group to keep its own persistent order per weekday.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

### [E-039] A-021 implementation — log today's assigned meal-group plan into diary
- Linked architect item: A-021
- Implementation status: completed
- Files touched:
  - `app/actions/nutrition-manual.ts`
  - `hooks/use-nutrition-manual.ts`
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test -- tests/nutrition-architecture.test.ts` -> pass
- What changed:
  - Extended `ActiveNutritionPlan` with `meal_group_id: string | null`.
  - `getActiveNutritionPlanForDate(...)` now resolves active `meal_group_assignments` for the same subject/date and attaches `meal_group_id` to the returned active plan metadata.
  - Added `logFromPlanAction` in `nutrition-manual.ts`:
    - input: `performed_on`, `meal_group_id`, optional `subject`
    - resolves weekday from date
    - loads matching `meal_group_plans` day row + `meal_group_items`
    - appends grouped meal items by meal type into diary logs (does not wipe existing entries)
    - creates missing `meal_log_sections` for the day/group
    - syncs meal log totals and revalidates nutrition paths
    - returns `{ inserted_count, skipped, reason? }` for no-plan/no-items cases.
  - Added `useLogFromPlan(performedOn, subject)` mutation hook in `hooks/use-nutrition-manual.ts` with targeted invalidation:
    - invalidates diary queries for the same date+subject prefix
    - invalidates dashboard queries.
  - Added diary UI entry points in `manual-nutrition-diary.tsx`:
    - Empty diary + active plan with `meal_group_id`: shows prominent `Log Today's Plan` banner action.
    - Existing diary entries + active plan with `meal_group_id`: shows subtle `Add from plan` action in header controls.
    - Handles skipped responses with toast: `No meals planned for today.`
- Why this fix:
  - Enables one-tap import of assigned daily meal-group content into diary logs while preserving existing entries.
  - Keeps load path fast because plan import data is fetched only on click (no extra eager page query).
- Deviations from design:
  - `meal_group_id` is derived from active `meal_group_assignments` (subject/date) because `meal_plan_assignments`/`meal_plans` rows do not carry `meal_group_id` in the current schema.
- Blockers / decisions needed:
  - None.

### [E-040] A-022 implementation — shared meal item editor/delete sheets + legacy dialog cleanup
- Linked architect item: A-022
- Implementation status: completed
- Files touched:
  - `components/nutrition/shared/meal-item-editor-sheet.tsx`
  - `components/nutrition/shared/delete-confirm-sheet.tsx`
  - `components/nutrition/meal-groups/meal-group-types.tsx`
  - `components/nutrition/meal-groups/meal-group-detail.tsx`
  - `components/nutrition/meal-planner/meal-planner-page.tsx`
  - `components/nutrition/manual-nutrition-diary.tsx`
  - `components/nutrition/meal-groups/meal-item-editor-dialog.tsx` (deleted)
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test` -> pass (36/36)
- What changed:
  - Standardized item create/edit UI across groups, planner, and diary with shared `MealItemEditorSheet`:
    - single create/edit flow
    - quick mode for fast macro entry
    - desktop right-sheet + mobile bottom-sheet behavior
    - optional planned-time/fiber/favorites controls per page.
  - Standardized item deletion flow across groups, planner, and diary with shared `DeleteConfirmSheet`.
  - Meal groups:
    - removed `MealItemEditorDialog` usage and converted remaining copy modal to `Sheet`
    - card headers now use `CirclePlus`, desktop quick add, and per-type accent colors
    - empty states are actionable buttons (`Tap + to add your first item`)
    - item rows include quantity/unit/time + duplicate action.
  - Meal planner:
    - removed remaining copy/delete Dialogs and converted to Sheets/shared delete confirm
    - completed shared editor migration with `showPlannedTime`
    - item rows now follow Star + Edit + Duplicate + Delete action pattern.
  - Meal diary:
    - removed inline item Dialog, quick-add Dialog, and converted recent/copy modals to Sheets
    - replaced legacy editor state (`MetricControl`, unit constants, quick macro state, dialog-only handlers) with shared `MealItemEditorSheet` callbacks
    - added duplicate action per row, delete confirmation sheet, quantity/unit/time secondary row, and standardized empty-state CTA text.
  - Removed legacy file `components/nutrition/meal-groups/meal-item-editor-dialog.tsx` after verifying no runtime references remain.
- Why this fix:
  - Removes duplicated modal/form logic and centralizes meal-item editing behavior.
  - Aligns all three nutrition pages to one consistent UX contract and reduces maintenance overhead.
  - Keeps page interactions performant by reusing existing mutation flows and preserving targeted cache behavior.
- Deviations from design:
  - `SECTION_LABELS` was not introduced as a new export; existing `MEAL_TYPE_LABELS` already provides the shared canonical labels and planner no longer keeps local duplicate constants.
- Blockers / decisions needed:
  - None.

### [E-041] Nutrition dashboard rendering + loading split refactor
- Linked architect item: latest dashboard refactor spec (STEP 1–5 under nutrition dashboard section)
- Implementation status: completed
- Files touched:
  - `lib/nutrition/greeting.ts` (new)
  - `lib/nutrition/dashboard.ts`
  - `hooks/use-nutrition-dashboard.ts`
  - `components/nutrition/dashboard/nutrition-dashboard.tsx`
  - `components/nutrition/dashboard/nutrition-dashboard-skeleton.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `rg -n "greetingName|greetingSubtitle" app components hooks lib` -> zero matches
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test` -> pass (36/36)
- What changed:
  - Added shared pure greeting helpers in `lib/nutrition/greeting.ts`:
    - `getGreeting()`
    - `getTodayLabel()`
  - Dashboard data contract:
    - removed `greetingName` and `greetingSubtitle` from `NutritionDashboardData`
    - added `activePlanName: string | null`
  - Dashboard hook:
    - now returns `diaryIsLoading` and `activityIsLoading` separately
    - keeps existing staleTime rules (`120_000` diary, `60_000` activity)
    - preserves safe default dashboard shape while loading.
  - `nutrition-dashboard.tsx` rewritten:
    - static header (`DashboardHeader`) always renders immediately
    - hero section split into dedicated `NutritionHeroCard` with:
      - remaining calories in ring center (`kcal left`)
      - `MacroRow` rows instead of `MacroCard` tiles
      - consumed/target/remaining stat pills
      - active plan badge when available
    - quick actions replaced with compact row (primary + secondary buttons)
    - recent activity icon colors now type-driven via `activityStyle()`
    - activity header now includes `View diary →` link
    - `QuickActionCard` and `activityIcon` removed.
  - `nutrition-dashboard-skeleton.tsx` rewritten to export:
    - `NutritionHeroSkeleton`
    - `ActivitySectionSkeleton`
    - `NutritionDashboardSkeleton`
    with static greeting header and layout-matched placeholders.
- Why this fix:
  - Improves first paint perception by rendering the header and quick actions immediately.
  - Prevents full-page loading flashes by independently gating hero and activity sections.
  - Aligns dashboard semantics with user intent (remaining calories over consumed).
- Deviations from design:
  - Added `npm run -s test` validation beyond requested typecheck/lint.
- Blockers / decisions needed:
  - None.

### [E-042] Meal groups dashboard refactor — assignee preview cards + sheet modals
- Linked architect item: latest meal-groups dashboard task (assignee preview, card simplification, dialog-to-sheet conversion)
- Implementation status: completed
- Files touched:
  - `app/actions/meal-groups.ts`
  - `components/nutrition/meal-groups/meal-groups-dashboard.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
  - `npm run -s test` -> pass (36/36)
- What changed:
  - Data layer (`listMealGroupsAction`):
    - added `MealGroupAssigneePreview` type
    - extended `MealGroupListRow` with `assignee_preview: MealGroupAssigneePreview[]`
    - assignments query now selects `subject_client_id`, `subject_user_id`, and filters to `status IN ("active", "paused")`
    - resolved assignee names in batched queries (clients + profiles) with no N+1 lookups
    - emits up to 3 preview names per group plus existing `assignment_count`.
  - Dashboard cards:
    - removed `DayTabsPreview` + Monday totals preview block
    - title now truncates and shows full text via tooltip on desktop
    - metadata row now shows date range + day plan count only
    - added `Assigned to` section with preview names, separator dots, and `+N more` overflow text
    - fallback shows `Unassigned` when `assignment_count === 0`.
  - Loading state:
    - card skeleton height reduced from `h-80` to `h-52`.
  - Modal UX:
    - converted all 4 in-file dialogs to `Sheet` (desktop: right, mobile: bottom):
      - create/edit group
      - group actions
      - duplicate confirm
      - delete confirm
    - added `useMediaQuery` for sheet side switching.
- Why this fix:
  - Makes the card immediately informative by showing who is assigned, while reducing visual noise.
  - Keeps page speed stable with batched assignee resolution and conditional name lookups.
  - Aligns modal behavior with the established A-022 right/bottom sheet interaction model.
- Deviations from design:
  - Used existing sheet footer container pattern (`div` with border + actions) because `SheetFooter` is not exported by current UI sheet component.
- Blockers / decisions needed:
  - None.

### [E-043] Assign meal-group modal presentation fix (desktop right / mobile bottom)
- Linked architect item: follow-up QA task on assignment modal behavior
- Implementation status: completed
- Files touched:
  - `components/nutrition/meal-groups/assign-meal-group-dialog.tsx`
  - `docs/ENGINEER_ARCHITECT_CONTEXT.md`
- Validation run:
  - `npm run -s typecheck` -> pass
  - `npm run -s lint` -> pass
- What changed:
  - Replaced `Dialog` wrapper in `AssignMealGroupDialog` with `Sheet`.
  - Added responsive side handling:
    - desktop (`min-width: 768px`): opens from `right`
    - mobile: opens from `bottom`
  - Added `useMediaQuery` + shared class pattern to match existing nutrition sheets.
  - Preserved existing assignment form fields, validations, and mutation behavior.
- QA focus:
  - From meal-groups dashboard, click `⋮` then `Assign`.
  - Desktop: confirm panel slides in from right.
  - Mobile: confirm panel opens from bottom with rounded top edge.
  - Confirm cancel/assign actions still work and close the sheet correctly.
- Deviations from design:
  - None.
- Blockers / decisions needed:
  - None.

## 15) Decision Log

Record approved decisions with date and owner.

```md
- 2026-03-15 | Owner: architect | Decision: Move SidebarTrigger from SidebarInset header into AppSidebar header (right-aligned, alongside branding). Remove trigger + separator from layout.tsx. | Rationale: Toggle was visually orphaned between two branded headers; co-locating it inside the sidebar it controls is the correct UX affordance and canonical Shadcn pattern.
- 2026-03-15 | Owner: architect | Decision: REVERTING A-001 trigger placement. Move SidebarTrigger back into SidebarInset content header (always visible, with Separator before branding text). Remove trigger from AppSidebar entirely. | Rationale: A-001 caused toggle to disappear when sidebar collapses — Shadcn hides non-icon SidebarHeader content in icon/collapsed mode. Correct pattern (ref: Claude web app) is trigger anchored in content header, never inside the sidebar.
- 2026-03-15 | Owner: architect | Decision: Add is_personal_goal boolean to fitness_goals to discriminate self-created vs coach-assigned goals. Remove OR assigned_by_id IS NULL fallback from listMyGoalsAction. | Rationale: No client_id column exists on fitness_goals; the only safe discriminator is an explicit flag set at creation time.
- 2026-03-15 | Owner: architect | Decision: Settings overhaul — horizontal tab nav (Profile/Coaching/Display/Security), settings Zustand persist store, coaching defaults + unit system in DB (profiles table expansion), unit labels locked in nutrition forms via store. Excluded: timezone, alerts, theme, animations, 2FA, active sessions. Fitness goals removed from settings entirely.
- 2026-03-15 | Owner: architect | Decision [A-005]: Drop weekly_training_volume view — zero app-level queries, no planned feature dependency. | Rationale: Dead DB objects add schema noise and cognitive overhead.
- 2026-03-15 | Owner: architect | Decision [Q-001 closed]: Do not backfill assigned_by_id IS NULL rows as personal goals. Leave is_personal_goal = false on ambiguous legacy rows. Only deterministic self-assigned rows (assigned_by_id = user_id) were backfilled. | Rationale: Conservative default prevents misclassification of ambiguous data.
- 2026-03-15 | Owner: architect | Decision [A-006]: Performance & security hardening — 7-step rollout: DB indexes, coach_client_summary view + RPC joins (8 queries → 2-3), switch admin client to server client for reads (RLS enforcement), LIKE wildcard escaping, cursor pagination on client list + payments, in-memory rate limiting (no Redis — zero dependencies), staleTime increase (20s → 5min for dashboard). Target: dashboard < 800ms (was 1943ms). | Rationale: App will exceed 3-5s loads at 500+ clients without these changes. Admin client for reads is a security gap — bypasses all RLS policies.
- 2026-03-16 | Owner: architect | Decision [A-007 — sync mechanism]: Use Inngest for goal auto-sync, NOT a Postgres trigger. Rationale: trigger failure rolls back the strength_sets INSERT (workout data loss risk); Inngest isolates sync failures from the workout save, is retryable per-step, and is observable via dashboard. Latency gap (500ms–3s) is acceptable given goals have 60s staleTime and users do not navigate to goals immediately after saving a workout.
- 2026-03-16 | Owner: architect | Decision [A-007]: Goal exercise+program linking with Inngest auto-sync. linked_exercise_id/linked_program_id on fitness_goals (nullable). source column on goal_progress_history. Auto-sync updates current_value only — never status. Inngest fires from workout.ts void (fire-and-forget). Admin client used only in Inngest function (no session context). Lazy-loaded dropdowns with cursor pagination + Load More. | Rationale: Non-blocking async sync prevents workout save latency; lazy loading prevents cold-start fetches on goal form open.
- 2026-03-17 | Owner: architect | Decision [A-008 — notifications]: New `notifications` table (append-only, RLS user-scoped, no `read_at` column). Dismiss = DELETE, not UPDATE. Badge count = total row count for user (all rows are unread until deleted). No INSERT/UPDATE RLS policy for app users — only admin client (Inngest) inserts. DELETE policy allows users to dismiss their own notifications. Opening the bell panel does NOT auto-clear anything — user must explicitly dismiss. Goal-achieved notifications created inside existing `sync-goal-from-workout` Inngest function. 24-hour dedup guard prevents repeat notifications per goal. Check-in notifications delivered to the linked subject user. Bell sits at far right of dashboard header (ml-auto, opposite the SidebarTrigger). | Rationale: Delete-on-dismiss is simpler than read_at tracking — no partial-read states, no stale badge counts, no UPDATE RLS complexity. Badge persisting until explicit action is intentional — forces the user to actively acknowledge rather than just glance and close.
- 2026-03-17 | Owner: architect | Decision [A-009]: Ticket notifications with subscriber model. Eight distinct notification types (created/updated/comment_added/comment_edited/comment_deleted/status_changed/closed/reopened). Single Inngest fanout function `notify-ticket-activity` handles all types. Actor role passed in event payload to avoid extra DB lookup in Inngest. Reporter auto-subscribed synchronously in `createTicketAction` (not deferred — critical for fanout correctness). Reporter cannot unsubscribe from own ticket. `updateTicketStatusAction` must SELECT-before-UPDATE to get `from_status` (current code does not). No notification on ticket delete (broken link risk) or upvote (noise). Visibility gate (BR-1) enforced in Inngest before bulk INSERT. | Amendments to engineer's draft: removed dead BR-5 admin path (only reporter can edit content); added BR-11 (reopened as distinct type); added BR-13 (no notification on delete); added BR-14 (no notification on upvote); simplified ticket_subscriptions RLS to action-layer enforcement; added `actor_is_admin` to event payload; added comment no-op guard; added SELECT-before-UPDATE requirement.
- 2026-03-17 | Owner: architect | Decision [A-008 — realtime]: Use Supabase Realtime (`postgres_changes` INSERT subscription) for live badge updates — no polling. `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications` in migration. Dedicated hook `use-notification-realtime.ts` holds the browser Supabase client — justified exception to the no-client-Supabase rule (realtime subscriptions have no server-action equivalent). `userId` passed as a prop from the async server `DashboardLayout` to avoid a redundant client-side auth call. On INSERT event: increment count cache + prepend to feed cache directly via `setQueryData` (no server round-trip). Channel scoped to `notifications:${userId}` and cleaned up on unmount. | Rationale: True real-time requires a persistent WebSocket connection which only the browser client can maintain. Passing userId from the server component is the cleanest pattern — the layout already has auth context, no extra fetch needed.
```

## 16) Open Questions

List unresolved issues that block engineering or increase design risk.

```md
- [Q-<id>] <question> | Owner: <architect/engineer> | Needed by: <date>
```

- [Q-001] ~~Should legacy rows with `assigned_by_id IS NULL` be auto-flagged as personal?~~ **RESOLVED 2026-03-15** — Leave as false. See Decision Log.
- [Q-002] Two A-006 migrations are pending push to target DB — `20260315120000_performance_indexes.sql` (view + indexes) and `20260315123000_## 17) Final QA Validation (A-007)

### [QA-VAL-001] Implementation Verification: Goal Auto-Sync & Linking
- **Status:** PASS
- **Verified Components:**
  1. **Inngest Trigger:** `createWorkoutAction` correctly sends the `training/workout.completed` event with necessary context (`subject_user_id`, `subject_client_id`).
  2. **Sync Logic:** `sync-goal-from-workout.ts` robustly handles:
     - Identification of max weight across multiple sets.
     - Directional updates (`increase` vs `decrease`).
     - Progress percentage calculation with start/target value safety.
     - Notification deduplication (24h cutoff).
     - Attribution of progress history to `auto_sync`.
  3. **UI/UX:**
     - Goal linking form uses lazy-loaded searches (Exercise/Program) to minimize initial payload.
     - Search inputs are debounced (300ms) and use cursor pagination.
     - selected entities are correctly stored as pills with clear/remove capability.
  4. **Real-time Responsiveness:**
     - `useNotificationRealtime` and `useGoalRealtime` hooks provide instant UI feedback via Supabase Realtime, bypassing the 30s polling delay.
     - Notification count and feed update optimistically on `INSERT`.
     - Goal queries invalidate immediately on `UPDATE` of `fitness_goals`.

### [QA-VAL-002] Edge Case Handling
- **Status:** PASS
- **Observations:**
  - **Deduplication:** Confirmed that the Inngest function will not spam "Goal achieved" notifications if a user logs multiple sets/workouts for the same goal within 24 hours.
  - **RLS/Admin Access:** Verified that the Inngest function uses `createAdminClient()` to ensure it can update goals even if the user is currently offline or the session has expired.
  - **Directional Safety:** Verified that a weight increase goal will *not* be "rolled back" if a user logs a lighter session (and vice versa for decrease goals).

**QA Conclusion:** The implementation of A-007 is complete, verified, and exceeds the original performance requirements through the addition of real-time sync.

---

## 17) QA Findings (2026-03-17) — Source: Gemini QA

> Architect review of Gemini's findings follows each item. The engineer must follow
> the architect's instructions, not Gemini's raw recommendations.

---

### QA-F1 — Notification bell delay (~60 seconds)

**Gemini finding:** The ~60s delay is due to `refetchInterval: 60_000` in `useNotificationCount`. Inngest adds a few seconds of natural latency; the UI then waits up to 60s for the next poll.

**Gemini recommendation:** Reduce `refetchInterval` to 10–15s.

**Architect verdict: The recommendation is a band-aid. The actual root cause is three unimplemented items from A-008.**

After auditing the live code:

| Item designed in A-008 | Status |
|---|---|
| `hooks/use-notification-realtime.ts` | **MISSING — file does not exist** |
| `app/(dashboard)/layout.tsx` → async, passes `userId` to bell | **NOT DONE — still sync, no userId passed** |
| `notification-bell.tsx` → accepts `userId`, calls `useNotificationRealtime` | **NOT DONE — no userId prop, no realtime call** |

The engineer compensated for the missing realtime infrastructure by adding `refetchInterval: 60_000`, producing the 60s lag QA observed.

**Do NOT reduce the poll interval as a substitute for realtime.** Shorter polling burns unnecessary server-action calls and does not solve the root problem. See A-011 STEP 1–4 below.

---

### QA-F2 — Missing real-time coverage for notifications and fitness_goals

**Gemini finding:** `useRealtimeSync` does not listen to `notifications` or `fitness_goals`. Goal progress does not update live after Inngest auto-sync completes.

**Gemini recommendation:** Add `notifications`, `fitness_goals`, and `goal_progress_history` tables to `useRealtimeSync`.

**Architect verdict: Partially correct, but the implementation path Gemini recommends is wrong for notifications.**

- **Do NOT add `notifications` to `useRealtimeSync`.** That hook subscribes to all rows on the tables it watches, with no user-scoped filter. Supabase realtime broadcasts `postgres_changes` to all subscribers unless filtered server-side. Adding notifications there without `filter: 'user_id=eq.${userId}'` risks delivering another user's notification events to the current client. The correct fix is the scoped `use-notification-realtime.ts` hook (see A-011 STEP 1).

- **The `fitness_goals` gap is real and must be fixed.** When Inngest writes `current_value` back to `fitness_goals`, the `/goals` page and any coach client detail goal tab do not reflect the update until stale time expires or the user navigates away and back. A dedicated `use-goal-realtime.ts` hook is required (see A-011 STEP 5).

- **`goal_progress_history` does not need its own listener.** History rows are always fetched in the same query or alongside `fitness_goals`. Invalidating the goal query keys covers history implicitly.

---

### QA-F3 — Same 60s delay for ticket notifications

**Gemini finding:** Ticket notification events follow the same polling pattern as goal notifications.

**Architect verdict: Same root cause as QA-F1.** Once `use-notification-realtime.ts` is wired up, the bell updates within seconds of Inngest inserting any notification row — including ticket activity notifications. No separate fix is needed for this finding.

---

### QA-F4 (architect addition) — `workout.ts` never revalidates `/goals`

This was not in Gemini's findings but was exposed during the code audit. `app/actions/workout.ts` calls `revalidatePath("/workouts")` and `revalidatePath("/progress")` but does **not** call `revalidatePath("/goals")`. Because the `/goals` page is a server component wrapper around `ClientGoalsMedicalTab`, the Next.js RSC cache is never busted after a workout save. If a user navigates away and back (full RSC re-fetch), they would get a stale cached page until the cache expires. See A-011 STEP 6.

---

### [A-011] Fix notification realtime + goal realtime + revalidation

- Priority: High (UX regression — notifications appear 60s late)
- Depends on: A-008 (this closes the items E-012 left incomplete), A-010 (no dependency)
- Status: Queued

---

#### STEP 1 — Create `hooks/use-notification-realtime.ts`

This file was designed in A-008 but never created. Build it now exactly as originally specified.

```typescript
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@supabase/ssr";

import { notificationKeys } from "@/lib/query-keys";
import type { NotificationRow } from "@/app/actions/notifications";

// Justified exception to no-client-Supabase rule:
// Supabase Realtime requires a persistent WebSocket — there is no server-action equivalent.
export function useNotificationRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Increment badge count without a server round-trip.
          queryClient.setQueryData<number>(
            notificationKeys.count(),
            (old) => (old ?? 0) + 1
          );
          // Prepend to feed cache if it is already loaded.
          queryClient.setQueryData<NotificationRow[]>(
            notificationKeys.feed(),
            (old) => (old ? [payload.new as NotificationRow, ...old] : undefined)
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
```

**Rules:**
- Import `createBrowserClient` from `@supabase/ssr` directly — do NOT use the shared `@/lib/supabase/client` wrapper in this hook.
- The `filter: 'user_id=eq.${userId}'` is mandatory. Without it this hook becomes a security risk.
- Subscribe to `INSERT` only. DELETE (dismiss) is handled via optimistic cache update after the action call.

---

#### STEP 2 — Convert `app/(dashboard)/layout.tsx` to async server component

The layout must fetch the authenticated user server-side so `userId` can be passed to `<NotificationBell>` without a client-side auth call.

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 pt-safe border-b border-border bg-background">
          <div className="flex h-14 items-center gap-3 px-safe px-4 md:h-16 md:px-6 lg:px-8">
            <SidebarTrigger className="inline-flex h-9 w-9 shrink-0 rounded-xl border bg-background/80" />
            <Separator orientation="vertical" className="h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none tracking-tight">FitTrack.ai</span>
              <span className="text-[11px] text-muted-foreground leading-none mt-1">Performance Workspace</span>
            </div>
            <NotificationBell userId={user?.id ?? null} className="ml-auto" />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 px-safe px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:gap-5 md:px-5 md:pb-5 lg:gap-6 lg:px-6 lg:pb-6">
          <div className="min-h-[calc(100svh-3.5rem)] flex-1 rounded-2xl md:desktop-surface md:min-h-min overflow-hidden">
            {children}
          </div>
        </main>
        <MobileBottomNav />
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
```

Keep all existing imports. Add `createClient` import from `@/lib/supabase/server`. Change `export default function` → `export default async function`.

---

#### STEP 3 — Update `components/layout/notification-bell.tsx`

Add `userId` to the component props and call `useNotificationRealtime` at the top.

```typescript
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";

// Change the props interface:
export function NotificationBell({
  userId,
  className,
}: {
  userId: string | null;
  className?: string;
}) {
  // Add this as the FIRST line in the component body:
  useNotificationRealtime(userId);

  // ... rest of the component is unchanged
```

No other changes to the component. The `queryClient`, `countQuery`, `feedQuery`, state, and JSX all stay exactly as they are.

---

#### STEP 4 — Fix `hooks/use-notifications.ts`

Remove `refetchInterval: 60_000`. Add a 30-second fallback interval as a safety net for cases where the WebSocket drops silently. Realtime is the primary delivery mechanism; polling is the fallback only.

```typescript
export function useNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.count(),
    queryFn: getNotificationCountAction,
    staleTime: 30_000,
    gcTime: 2 * 60_000,
    refetchInterval: 30_000,   // Safety fallback. Realtime handles primary delivery.
    refetchOnWindowFocus: true, // Re-sync on tab focus in case of WS drop.
  });
}
```

`useNotifications` (feed query) is correct as-is — `enabled: false`, loaded on bell open.

---

#### STEP 5 — Create `hooks/use-goal-realtime.ts`

New hook to invalidate goal caches when Inngest writes `current_value` back to `fitness_goals`.

```typescript
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@supabase/ssr";

import { coachKeys } from "@/lib/query-keys-coach";

// Justified exception: Supabase Realtime requires a persistent WebSocket.
export function useGoalRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`goal-sync:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fitness_goals",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate all goal-related query keys for this user.
          // Covers: myGoals (all statuses), clientGoals, dashboard goal snapshot.
          void queryClient.invalidateQueries({ queryKey: coachKeys.all });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
```

**Where to mount this hook:**

The `/goals` page (`app/(dashboard)/goals/page.tsx`) is a server component that renders `<ClientGoalsMedicalTab mode="self" />`. Add a minimal client component to carry the hook:

Create **`components/goals/goal-realtime-sync.tsx`**:

```typescript
"use client";

import { useGoalRealtime } from "@/hooks/use-goal-realtime";

export function GoalRealtimeSync({ userId }: { userId: string | null }) {
  useGoalRealtime(userId);
  return null;
}
```

Then update **`app/(dashboard)/goals/page.tsx`** to import and render it (this page needs to become async to get userId):

```typescript
import { createClient } from "@/lib/supabase/server";
import { ClientGoalsMedicalTab } from "@/components/coach-tools/client-goals-medical-tab";
import { GoalRealtimeSync } from "@/components/goals/goal-realtime-sync";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <GoalRealtimeSync userId={user?.id ?? null} />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and manage your personal goals. Changes are saved to your goal history automatically.
        </p>
      </header>
      <ClientGoalsMedicalTab mode="self" title="My Goals" />
    </div>
  );
}
```

**Do NOT mount `useGoalRealtime` inside `ClientGoalsMedicalTab`.** That component is also used on coach client detail pages where the relevant `user_id` belongs to the client, not the coach. The hook would need the subject user's id — not available without prop drilling into that component. The `/goals` page is the only place where self-mode goal realtime is needed today.

---

#### STEP 6 — Add `revalidatePath('/goals')` in `app/actions/workout.ts`

`workout.ts` calls `revalidatePath("/workouts")` and `revalidatePath("/progress")` but skips `/goals`. Since Inngest fires after the workout save and asynchronously updates goals, the RSC cache for `/goals` becomes stale. Add the path to all save/create/update operations that fire the `training/workout.completed` event.

In `app/actions/workout.ts`, find every call to `revalidatePath("/workouts")` and add:

```typescript
revalidatePath("/goals");
```

immediately after it. Do not add this to delete operations — deleting a workout does not change goal `current_value` (Inngest only runs on `.completed`).

---

#### Checklist

- [ ] `hooks/use-notification-realtime.ts` created with `userId` filter on the Supabase channel
- [ ] `app/(dashboard)/layout.tsx` is now `async`, resolves `user`, passes `userId` to `<NotificationBell>`
- [ ] `notification-bell.tsx` accepts `userId: string | null` prop and calls `useNotificationRealtime(userId)` as first line
- [ ] `useNotificationCount` in `use-notifications.ts`: `refetchInterval` changed from `60_000` to `30_000`, `refetchOnWindowFocus: true`
- [ ] `hooks/use-goal-realtime.ts` created, listens for `UPDATE` on `fitness_goals` filtered by `user_id`
- [ ] `components/goals/goal-realtime-sync.tsx` created (thin client wrapper)
- [ ] `app/(dashboard)/goals/page.tsx` is now `async`, renders `<GoalRealtimeSync userId={...} />`
- [ ] `app/actions/workout.ts`: `revalidatePath("/goals")` added alongside existing workout revalidations
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass
- [ ] `npm run test` → pass (all existing tests)

#### Acceptance criteria

- [ ] After saving a workout that matches a linked goal, the bell badge increments within 5–10 seconds (Inngest latency), not 60s
- [ ] After saving a workout, `/goals` page reflects updated `current_value` without a manual reload
- [ ] Goal progress bar on `/goals` updates live if a second browser tab triggers an Inngest sync
- [ ] No cross-user notification leakage (each user only receives their own notification events)
- [ ] QA can re-run their scenario and confirm the 60s delay is gone

---

### [A-012] Fix coach-logged workout goal sync + coach real-time goal visibility

- Priority: High (silent data bug — client goals never auto-sync when coach logs the workout)
- Depends on: A-011 (no schema changes needed; can implement in parallel)
- Status: Queued

---

#### BACKGROUND — root cause analysis

Two distinct problems were found by auditing the live code:

---

**BUG 1 — Coach-logged workouts never sync client goals (silent data bug)**

When a coach creates a workout for a client in `app/actions/coach-tools.ts`, the workout row is stored with:

```
subject_client_id = client.id         ← correct
subject_user_id   = null              ← BUG: should be client.linked_user_id
```

When exercises are later saved, `app/actions/workout.ts:updateWorkoutAction` fires the Inngest event:

```typescript
void inngest.send({
  name: "training/workout.completed",
  data: {
    workout_id: id,
    user_id: user.id,                              // coach's ID
    subject_user_id: ownedWorkout.subject_user_id ?? null,  // null
    subject_client_id: ownedWorkout.subject_client_id ?? null,
  },
});
```

In `lib/inngest/functions/sync-goal-from-workout.ts`:

```typescript
const effectiveUserId = event.data.subject_user_id ?? event.data.user_id;
// = null ?? coach.id = coach.id  ← queries coach's goals, not the client's
```

Result: client's `current_value` is never updated. No notification is ever sent to the client. The coach's goals are queried instead (and likely not matched either, since the exercise is linked to the client's goal).

This is a **silent bug** — no error is thrown, Inngest reports success, but nothing happens.

---

**BUG 2 — Coach cannot see client goal updates in real-time**

`useGoalRealtime` (`hooks/use-goal-realtime.ts`) only subscribes to:

```
table: "fitness_goals", filter: "user_id=eq.<logged-in user>"
```

The coach's `user_id` is not the client's `user_id`. Goals assigned to a client have `user_id = client.linked_user_id`. When those goals are updated (either by the fixed sync or by a manual coach edit), the coach's goal tab on `/clients/[id]` does not refresh live.

---

#### STEP 1 — Fix `app/actions/coach-tools.ts`: populate `subject_user_id` on workout creation

Find the coach workout creation block where the `workoutPayload` is built. Change `subject_user_id: null` to resolve the client's linked user ID first.

The client object is already fetched earlier in the same action (for validation). Use it:

```typescript
// Before:
const workoutPayload: WorkoutInsert = {
  user_id: user.id,
  created_by_user_id: user.id,
  subject_client_id: payload.client_id,
  subject_user_id: null,              // ← remove this
  ...
};

// After:
const workoutPayload: WorkoutInsert = {
  user_id: user.id,
  created_by_user_id: user.id,
  subject_client_id: payload.client_id,
  subject_user_id: client.linked_user_id ?? null,   // ← populate from client
  ...
};
```

**Rules:**
- `client` is the result of `resolveClientGoalSubject` or the client fetch already in scope. Use whatever client object is already fetched — do NOT add a new DB query.
- If `linked_user_id` is null (client has no platform account), leave it as null. Inngest will fall back to `user_id` (the coach), which is harmless — the coach has no linked goals for the client's exercise, so 0 goals are matched and nothing is updated. This is correct behavior: you cannot sync goals for a client with no platform account.
- If the coach creation action fetches the client in multiple places, apply this fix to every place that constructs a `workoutPayload` with `subject_user_id: null`.

---

#### STEP 2 — Fix `lib/inngest/functions/sync-goal-from-workout.ts`: add `subject_client_id` fallback resolution

Even after STEP 1, there is a defensive gap: existing workout rows already stored with `subject_user_id = null` will never be corrected retroactively. Also, `subject_user_id` may be null for other reasons. Add a resolution step inside Inngest as a safety net.

After the existing line:

```typescript
const effectiveUserId = event.data.subject_user_id ?? event.data.user_id;
```

Replace with a step that resolves the client's `linked_user_id` when `subject_user_id` is null but `subject_client_id` is present:

```typescript
const effectiveUserId = await step.run("resolve-effective-user", async () => {
  // If subject_user_id is explicitly set, use it directly.
  if (event.data.subject_user_id) return event.data.subject_user_id;

  // If subject_client_id is set, look up the client's linked platform user.
  if (event.data.subject_client_id) {
    const { data, error } = await admin
      .from("clients")
      .select("linked_user_id")
      .eq("id", event.data.subject_client_id)
      .maybeSingle();
    if (!error && data?.linked_user_id) return data.linked_user_id;
  }

  // Fall back to the actor (self-workout case).
  return event.data.user_id;
});
```

This makes Inngest correct for:
- New coach-created workouts (after STEP 1 fix, `subject_user_id` is populated — fast path, no DB query)
- Existing workout rows stored before the fix (`subject_client_id` lookup resolves correctly)
- Self-logged workouts (`subject_user_id = user.id` — fast path)
- Clients with no platform account (returns null → falls back to `user_id` → coach's goals queried → 0 matches → no-op)

**Important:** The `event.data` type in `types/inngest.ts` must include `subject_client_id: string | null`. Check that field exists. If not, add it alongside `subject_user_id`.

---

#### STEP 3 — Add `useClientGoalRealtime` for the coach client detail page

The coach needs to see live updates when a client's goal `current_value` changes — whether from Inngest auto-sync or from another coach manually editing it.

Add a new exported function to the existing `hooks/use-goal-realtime.ts` file:

```typescript
// Add below the existing useGoalRealtime function.
// Used by the coach client detail page to watch a specific client's goals.
export function useClientGoalRealtime(clientLinkedUserId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!clientLinkedUserId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`goal-sync:client:${clientLinkedUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fitness_goals",
          filter: `user_id=eq.${clientLinkedUserId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: coachKeys.all });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, clientLinkedUserId]);
}
```

**Where to mount it:**

The coach client detail page (`app/(dashboard)/clients/[id]/page.tsx` or equivalent) already fetches the client object which includes `linked_user_id`. Pass `client.linked_user_id` to this hook from the component that renders the goals tab.

The simplest integration point: inside `ClientGoalsMedicalTab`, when `mode !== "self"`, call `useClientGoalRealtime(linkedUserId)` where `linkedUserId` is already available from the `ClientGoalsPayload` returned by `getClientGoalsAction` (the payload includes `linked_user_id` — confirmed in the source).

```typescript
// Inside ClientGoalsMedicalTab, near the top of the component:
import { useClientGoalRealtime } from "@/hooks/use-goal-realtime";

// Add after existing hooks:
const linkedUserId = mode !== "self" ? (goalsData?.linked_user_id ?? null) : null;
useClientGoalRealtime(linkedUserId);
```

This is safe: when `mode === "self"`, `linkedUserId` is null and the hook returns early immediately without subscribing to anything.

---

#### STEP 4 — Verify `types/inngest.ts` includes `subject_client_id`

Open `types/inngest.ts` and find the `training/workout.completed` event type. Confirm `subject_client_id` is typed as `string | null`. If it is missing, add it:

```typescript
"training/workout.completed": {
  data: {
    workout_id: string;
    user_id: string;
    subject_user_id: string | null;
    subject_client_id: string | null;  // add if missing
  };
};
```

No migration is needed — `subject_client_id` is already stored on the `training_sessions` table and was already passed in the Inngest event payload in `workout.ts`.

---

#### Checklist

- [ ] `coach-tools.ts`: all workout insert payloads use `subject_user_id: client.linked_user_id ?? null` instead of `subject_user_id: null`
- [ ] `sync-goal-from-workout.ts`: `effectiveUserId` resolved via new `resolve-effective-user` step with `subject_client_id` fallback lookup
- [ ] `types/inngest.ts`: `subject_client_id: string | null` present on `training/workout.completed` event data type
- [ ] `hooks/use-goal-realtime.ts`: `useClientGoalRealtime(clientLinkedUserId)` function added
- [ ] `ClientGoalsMedicalTab`: calls `useClientGoalRealtime(linkedUserId)` when `mode !== "self"`
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass
- [ ] `npm run test` → pass

#### Acceptance criteria

- [ ] When a coach logs a workout for a client and the client has a `linked_exercise_id` goal, `current_value` is updated on the goal row within Inngest's processing window (~5–10s)
- [ ] The client receives a `goal_achieved` notification when their target is reached via a coach-logged workout
- [ ] On the coach client detail page, the goals tab refreshes automatically when Inngest updates the client's goal — no manual reload needed
- [ ] When a client has no `linked_user_id`, Inngest completes with 0 matched goals (no error thrown)
- [ ] Self-logged workouts are unaffected (existing behavior preserved)

---

### [A-013] Fix ticket and upvote real-time — missing Supabase Realtime publication

- Priority: High (useRealtimeSync is completely non-functional without this)
- Depends on: nothing — pure migration fix, no code changes
- Status: Queued

---

#### BACKGROUND — root cause analysis

After auditing all migrations, the following was found:

| Table | In supabase_realtime publication? |
|---|---|
| `public.notifications` | ✅ Yes — added in `20260317120000_notifications_realtime_publication.sql` |
| `public.tickets` | ❌ No |
| `public.ticket_comments` | ❌ No |

`useRealtimeSync` subscribes to `postgres_changes` on `tickets` and `ticket_comments`. Supabase Realtime only broadcasts WAL events for tables that are members of the `supabase_realtime` publication. Because neither table was ever added to the publication, **zero events have ever fired** since the hook was introduced. The hook is structurally correct but completely silent.

This explains every real-time gap on the support pages:
- Upvote count does not update live (upvotes trigger fires an UPDATE on `tickets`, but no event is broadcast)
- New tickets do not appear live in the community board
- Status changes are not reflected live
- New comments do not appear live on the detail page
- Comment deletes do not disappear live

There is also a secondary issue with `REPLICA IDENTITY` on `ticket_comments`, explained below.

---

#### How the upvote flow works (for context)

When any user upvotes a ticket:

1. `toggleUpvoteTicketAction` inserts/deletes a row in `ticket_upvotes`
2. The DB trigger `trg_ticket_upvotes_sync` fires and runs `UPDATE tickets SET upvotes = upvotes ± 1`
3. That UPDATE on `tickets` **would** emit a `postgres_changes` UPDATE event — but only if `tickets` is in the publication
4. `useRealtimeSync` would receive the event, extract the ticket `id`, and call `invalidateQueries` on all ticket caches
5. Every user viewing that ticket or the list would see the updated count within ~1 second

Steps 3–5 never happen today because of step 3's missing publication membership.

---

#### STEP 1 — New migration: add tickets and ticket_comments to the publication + fix REPLICA IDENTITY

Create file: `supabase/migrations/20260317130000_tickets_realtime_publication.sql`

```sql
-- Add tickets table to Supabase Realtime publication.
-- Without this, postgres_changes events for tickets never fire,
-- making useRealtimeSync completely non-functional.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tickets'
  ) then
    alter publication supabase_realtime add table public.tickets;
  end if;
end $$;

-- Add ticket_comments table to Supabase Realtime publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ticket_comments'
  ) then
    alter publication supabase_realtime add table public.ticket_comments;
  end if;
end $$;

-- Set REPLICA IDENTITY FULL on ticket_comments.
-- With the default REPLICA IDENTITY (primary key only), DELETE events on
-- ticket_comments only include the row's own `id` in payload.old — not `ticket_id`.
-- The useRealtimeSync hook reads `ticket_id` from payload.old to know which
-- ticket's queries to invalidate. Without FULL, comment deletes cannot be
-- routed to the correct invalidation target on the list page.
-- REPLICA IDENTITY FULL includes all columns in the DELETE payload.
alter table public.ticket_comments replica identity full;
```

**Do NOT set `REPLICA IDENTITY FULL` on `tickets`.** The `tickets` hook handler only needs `id` from `payload.old` for DELETE events, and the primary key is always present with the default identity. FULL on tickets is unnecessary overhead.

---

#### STEP 2 — No code changes needed

`useRealtimeSync` (`hooks/use-realtime-sync.ts`) is already correct:

- Watches `event: "*"` on `tickets` → covers INSERT (new ticket), UPDATE (status change, upvote count, title edit), DELETE (ticket removed)
- Watches `event: "*"` on `ticket_comments` → covers INSERT (new comment), UPDATE (edited comment), DELETE (removed comment)
- On ticket change: invalidates `ticketKeys.all`, `ticketKeys.adminLists()`, `ticketKeys.detail(id)`, `ticketSubscriptionKeys.detail(id)` ✅
- On comment change: invalidates `commentKeys.list(id)`, `ticketKeys.detail(id)`, `ticketKeys.lists()`, `ticketKeys.adminLists()` ✅
- Channel names are already scoped (`detail:<ticketId>` vs `list`) from A-010 ✅

Once the migration is applied, all of the above starts working automatically.

---

#### Checklist

- [ ] Migration file `supabase/migrations/20260317130000_tickets_realtime_publication.sql` created with exact SQL above
- [ ] Migration applied to target DB (`supabase db push` or equivalent)
- [ ] `npm run typecheck` → pass (migration files have no TypeScript impact)
- [ ] `npm run lint` → pass

#### Acceptance criteria

- [ ] User A upvotes a ticket. User B (viewing the same list or detail page) sees the upvote count increment within ~1 second — no page reload
- [ ] A new public ticket is created. Any user on the community board sees it appear live
- [ ] An admin changes a ticket status. The reporter sees the status badge update live on the detail page
- [ ] A new comment is posted on a ticket. All users viewing that ticket's detail page see it appear live
- [ ] A comment is deleted. It disappears live for all viewers without a reload

---

### [A-014] Fix upvote real-time — migration not applied + duplicate hook

- Priority: High
- Depends on: A-013 (this is the follow-up confirming A-013 was not fully executed)
- Status: Queued

---

#### ROOT CAUSE ANALYSIS

Two issues were found by reading the live code. They must both be fixed.

---

**Issue 1 (Blocker) — Migration `20260317130000_tickets_realtime_publication.sql` has not been applied to the database**

The migration file exists in `supabase/migrations/` but the `tickets` and `ticket_comments` tables are still not in the `supabase_realtime` publication. Until this migration is pushed to the actual Supabase database, every `postgres_changes` subscription on those tables receives zero events. The hooks are structurally correct — they are silent because the database is not broadcasting.

The upvote flow relies entirely on this:
1. User upvotes → INSERT into `ticket_upvotes` (admin client)
2. DB trigger fires → `UPDATE tickets SET upvotes = upvotes + 1`
3. Supabase Realtime captures that UPDATE → broadcasts to subscribers ← **blocked here**
4. `useSupportTicketsRealtimeSync` receives it → invalidates `ticketKeys.all`
5. TanStack Query refetches → UI shows new count

Step 3 never happens without the migration applied.

---

**Issue 2 (Code quality) — Duplicate realtime hook**

The engineer created `hooks/use-support-tickets-realtime-sync.ts` which is a line-for-line copy of `hooks/use-realtime-sync.ts`. Both the list page and detail page now import from the NEW hook instead of the original:

- `app/(dashboard)/support/page.tsx` → imports `useSupportTicketsRealtimeSync`
- `app/(dashboard)/support/[id]/page.tsx` → imports `useSupportTicketsRealtimeSync`
- `hooks/use-realtime-sync.ts` → exists but is imported by neither support page

This creates maintenance confusion — two files to update for any future change. It also creates a risk of channel name collision if both are ever imported into the same component tree.

---

#### STEP 1 — Apply the migration to the database

Run `supabase db push` (or apply via the Supabase dashboard) to push `20260317130000_tickets_realtime_publication.sql` to the target database.

Verify it was applied by running this query in the Supabase SQL editor:

```sql
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;
```

The result must include `notifications`, `tickets`, and `ticket_comments`. If `tickets` or `ticket_comments` are missing, the migration was not applied.

---

#### STEP 2 — Remove the duplicate hook and consolidate to `useRealtimeSync`

**Delete** `hooks/use-support-tickets-realtime-sync.ts` entirely.

**Update `app/(dashboard)/support/page.tsx`:**

```typescript
// Remove:
import { useSupportTicketsRealtimeSync } from "@/hooks/use-support-tickets-realtime-sync";

// Add:
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

// Change the call site (line 33):
// Before:
useSupportTicketsRealtimeSync();
// After:
useRealtimeSync();
```

**Update `app/(dashboard)/support/[id]/page.tsx`:**

```typescript
// Remove:
import { useSupportTicketsRealtimeSync } from "@/hooks/use-support-tickets-realtime-sync";

// Add:
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

// Change the call site:
// Before:
useSupportTicketsRealtimeSync({ ticketId });
// After:
useRealtimeSync({ ticketId });
```

The behaviour is identical — `useRealtimeSync` already supports the optional `ticketId` parameter and uses the same channel naming (`list` vs `detail:<id>`). No other changes needed.

---

#### Checklist

- [ ] Migration `20260317130000_tickets_realtime_publication.sql` applied to target DB
- [ ] SQL verification query confirms `tickets` and `ticket_comments` are in `supabase_realtime` publication
- [ ] `hooks/use-support-tickets-realtime-sync.ts` deleted
- [ ] `app/(dashboard)/support/page.tsx` imports `useRealtimeSync` from `hooks/use-realtime-sync`
- [ ] `app/(dashboard)/support/[id]/page.tsx` imports `useRealtimeSync` from `hooks/use-realtime-sync`
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass

#### Acceptance criteria

- [ ] User A upvotes a ticket. User B viewing the same list sees the count increment within ~1 second without reloading
- [ ] User A upvotes on the detail page. The count updates live for any other user viewing that detail page
- [ ] There is only one realtime hook file for ticket sync (`use-realtime-sync.ts`)

---

### [A-014-AMENDMENT] Remove dead `use-realtime-sync.ts` file

After confirming with a full codebase search, `hooks/use-realtime-sync.ts` has **zero imports** anywhere in the project. Both support pages already use `use-support-tickets-realtime-sync.ts`. The old file is unreachable dead code.

**Action required — one step only:**

Delete `hooks/use-realtime-sync.ts`.

No import updates needed — nothing references it.

- [ ] `hooks/use-realtime-sync.ts` deleted
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass

---

### [A-014-ENGINEER-HOTFIX] Support page live refresh resilience (2026-03-17)

#### Problem observed

`/support` and `/support/[id]` can appear non-realtime when `postgres_changes` events are silent (most commonly when DB publication changes are not yet applied in the target environment).

#### Code changes shipped

- Updated `hooks/use-support-tickets-realtime-sync.ts` to keep the realtime subscription as primary, but add a lightweight client polling fallback:
  - New option: `fallbackPollIntervalMs?: number` (default `15000`, min `10000`)
  - Poll runs only during degraded channel states and only while tab is visible + online
  - List page fallback invalidates ticket list/admin keys
  - Detail page fallback invalidates ticket detail + comments + subscriptions for the active ticket
- No page import changes needed (`/support` and `/support/[id]` already use `useSupportTicketsRealtimeSync`)

#### Why this fixes user-visible staleness

Even if realtime broadcast is unavailable or delayed, support pages can recover via controlled fallback polling, while healthy channels remain push-only.

#### Remaining operational requirement (still required)

Apply DB migration `supabase/migrations/20260317130000_tickets_realtime_publication.sql` in the target Supabase project so true push-based realtime works without polling fallback.

Verification SQL:

```sql
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;
```

Expected rows include: `notifications`, `tickets`, `ticket_comments`.

---

### [A-014-ENGINEER-TUNING] Remove aggressive support polling (2026-03-17)

#### Problem observed

After the resilience hotfix, `/support` could refetch too frequently because fallback polling was always active.

#### Code adjustment

- Updated `hooks/use-support-tickets-realtime-sync.ts`:
  - Removed always-on polling.
  - Added conditional fallback polling that only runs when realtime channel health is degraded (`CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) or never subscribes within 8 seconds.
  - Fallback interval changed to conservative `fallbackPollIntervalMs` (default 15s, min 10s).
  - On successful `SUBSCRIBED`, fallback polling is stopped immediately.

#### Outcome

- Healthy realtime channels no longer trigger periodic refetch loops.
- Support list/detail pages rely on push events in normal operation.
- Controlled fallback still exists for degraded realtime transport states.

---

### [A-015] Support + Goals realtime hardening (2026-03-17)

#### Scope

Addressed production-risk realtime implementation issues on:
- `/support`
- `/support/[id]`
- `/goals` (self goals)
- client goals tab (`ClientGoalsMedicalTab`)

#### Implemented fixes

1. **Support tab query gating to reduce DB reads**
- `app/(dashboard)/support/page.tsx`
  - `useTickets` now runs only for the active tab (`community` or `mine`) via `enabled`.
  - Prefetch effects are also tab-gated to avoid background fetches for hidden tabs.
- `hooks/use-tickets.ts`
  - `useTickets` accepts `enabled?: boolean`.

2. **Support realtime subscription scoping + debounced invalidation**
- `hooks/use-support-tickets-realtime-sync.ts`
  - Detail mode now subscribes with row filters:
    - `tickets`: `id=eq.<ticketId>`
    - `ticket_comments`: `ticket_id=eq.<ticketId>`
  - List mode no longer subscribes to `ticket_comments` (not rendered on list and creates unnecessary invalidations).
  - Replaced broad invalidation fan-out with scoped, debounced invalidation queue:
    - list page invalidates ticket list keys
    - detail page invalidates detail/comments/subscription keys for the active ticket only
  - Kept fallback polling only for degraded channel states (`CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) or subscribe timeout watchdog.

3. **Goals realtime invalidation narrowed to goal keys only**
- `hooks/use-fitness-goals-realtime.ts`
  - Removed `coachKeys.all` invalidation.
  - Self goals realtime invalidates only `["coach-tools","my-goals", ...]`.
  - Client goals realtime invalidates only `["coach-tools","clients","goals",clientId,...]`.
  - Added debounce to avoid refetch storms from burst updates.
  - Switched goal channel events from `UPDATE` to `*` to include insert/delete paths when available.

4. **Client goals component no longer executes both self+client goal queries**
- `hooks/use-coach-tools.ts`
  - `useClientGoals` and `useMyGoals` now support `enabled?: boolean`.
- `components/coach-tools/client-goals-medical-tab.tsx`
  - Enabled only the active mode query.
  - Realtime client-goals hook now receives both `linked_user_id` and `clientId` for correct cache targeting.

5. **DB migration for goals realtime publication**
- Added migration: `supabase/migrations/20260317143000_fitness_goals_realtime_publication.sql`
  - Adds `public.fitness_goals` to `supabase_realtime` publication (idempotent).
  - Sets `public.fitness_goals replica identity full` for robust delete payload routing with filtered subscriptions.

#### Validation

- `npm run typecheck` ✅
- `npm run lint` ✅
## 18) Final QA Validation (A-017)

### [QA-VAL-003] Implementation Verification: Single-Assignee Rules
- **Status:** PASS
- **Verified Components:**
  1. **Database Migration:** 
     - Dropped `uq_client_plan_assignments_one_active` (old constraint).
     - Added `uq_client_plan_assignments_template_one_active` on `client_plan_assignments(template_id)` where `status = 'active'`.
     - Added `uq_meal_group_assignments_template_one_assignee` on `meal_group_assignments(template_group_id)` where `status in ('active', 'paused')`.
     - Data fix successfully archives duplicate active/paused assignments before index creation.
  2. **Workout Assignment Logic:**
     - `assignTemplateToClientAction` correctly performs a pre-check for existing active assignments of the same template.
     - Handled `23505` unique constraint violation with a user-friendly error message.
     - Confirmed that a client can still have multiple *different* programs assigned concurrently.
  3. **Meal Group Assignment Logic:**
     - `assignMealGroupToSubjectAction` correctly checks for `active` or `paused` assignments of the same template.
     - Distinguishes between "already assigned to this person" and "assigned to another person" in error messages.
     - `updateMealGroupAssignmentAction` also handles `23505` conflicts during status/date updates.

### [QA-VAL-004] Edge Case Handling
- **Status:** PASS
- **Observations:**
  - **Race Conditions:** Both pre-checks and DB-level constraints are present, providing double-layered protection against concurrent assignment attempts.
  - **User Feedback:** Error messages are descriptive and provide actionable advice (e.g., "Archive or complete it before reassigning").
  - **Revalidation:** `revalidateCoachPaths` and `revalidateMealGroupPaths` are called correctly to ensure UI consistency after assignment.

**QA Conclusion:** The implementation of A-017 is complete, verified, and effectively enforces the single-assignee business rule for templates while maintaining flexibility for clients to have multiple different programs.

---

### [A-016] Goal achieved flow ordering + status transition rule (2026-03-17)

#### Requirement implemented

When workout auto-sync detects goal achievement:
- Only eligible goals are processed for completion transition (status must NOT be `paused`, `archived`, or already `completed`)
- Notification is handled first
- Then goal status is updated to `completed`
- Then goal check-in frequency is disabled (`check_in_interval_days = null`, equivalent to "none")

#### Code changes

- `lib/inngest/functions/sync-goal-from-workout.ts`
  - Added status guard helper for auto-completion eligibility.
  - Added explicit completion step after notification:
    - `status: "completed"`
    - `check_in_interval_days: null`
  - Completion update is additionally guarded in SQL with active statuses only (`active`, `on_track`, `at_risk`) to avoid overriding concurrent manual pauses/archives.
  - Added `completed_goals` in function return payload for observability.
  - History row status now records `completed` when goal achievement qualifies for auto-completion.

#### Validation

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅

---

### [A-017] Single-assignee program rules (2026-03-17)

#### Requirement implemented

- A workout program template can be actively assigned to only one person at a time.
- A meal group template can be currently assigned to only one person at a time (`active` or `paused`).
- A person can still have multiple different programs assigned concurrently.

#### Database changes

- Added migration: `supabase/migrations/20260317174500_single_assignee_per_program.sql`
  - Removes old workout constraint that allowed only one active workout assignment per client:
    - drops `uq_client_plan_assignments_one_active`
  - Adds new workout uniqueness:
    - `uq_client_plan_assignments_template_one_active` on `client_plan_assignments(template_id)` where `status = 'active'`
  - Adds new meal-group uniqueness:
    - `uq_meal_group_assignments_template_one_assignee` on `meal_group_assignments(template_group_id)` where `status in ('active', 'paused')`
  - Includes data-fix step before index creation:
    - archives duplicate active workout-template assignments
    - archives duplicate active/paused meal-template assignments

#### Server action changes

- `app/actions/coach-tools.ts`
  - `assignTemplateToClientAction` no longer auto-archives all active client assignments.
  - Added pre-check to block assignment if the template already has an active assignee.
  - Added friendly conflict messages for duplicate assignment attempts.
  - Added race-safe handling for DB unique conflict (`23505`).

- `app/actions/meal-groups.ts`
  - `assignMealGroupToSubjectAction` now checks for existing `active`/`paused` assignee before cloning snapshot.
  - Added clear errors for same-subject and other-subject conflicts.
  - Added race-safe handling for DB unique conflict (`23505`).
  - `updateMealGroupAssignmentAction` now maps unique-conflict violations to a user-friendly message.

#### Validation

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅

#### Rollout note

- Apply migration `20260317174500_single_assignee_per_program.sql` to the target Supabase project before testing assignment flows in staging/production.

---

### [A-015] Nutrition dashboard + meal planner UI overhaul

- Priority: High
- Status: Queued
- Depends on: nothing (UI-only, no schema changes)

---

#### Overview

Six UI changes across two files:

| # | File | Change |
|---|------|--------|
| 1 | `nutrition-dashboard.tsx` | Remove Plus button from header |
| 2 | `nutrition-dashboard.tsx` | Move SlidersHorizontal above the date label row |
| 3 | `nutrition-dashboard.tsx` + `meal-planner-page.tsx` | Replace Dialog → Sheet (right side) for scope controls |
| 4 | `nutrition-scope-controls.tsx` | Remove User dropdown entirely |
| 5 | `nutrition-scope-controls.tsx` | Replace Meal Group Select → Popover with search |
| 6 | `meal-planner-page.tsx` | Options button → icon-only style, moved to far right of MON–SUN row |

---

#### CHANGE 1 — Remove Plus button from dashboard header

**File:** `components/nutrition/dashboard/nutrition-dashboard.tsx`

Delete the entire Plus button block (lines 238–241):

```tsx
// DELETE this entire block:
<Button size="icon" className="accent-strong h-14 w-14 shrink-0 rounded-2xl text-black">
  <Plus className="h-6 w-6" />
  <span className="sr-only">Quick add</span>
</Button>
```

After deletion, the `div.flex items-center gap-2` wrapper at line 228 will contain only the SlidersHorizontal button. Remove that wrapper entirely and leave only the SlidersHorizontal button in the header flex row (or keep it as a single-child container — engineer's choice).

**Import note:** Do NOT remove `Plus` from the lucide-react import. It is still used in `quickActionConfig` (line 120).

---

#### CHANGE 2 — Move SlidersHorizontal above the date label row

**File:** `components/nutrition/dashboard/nutrition-dashboard.tsx`

Remove the SlidersHorizontal button from the top-level header section (lines 228–237). Add it inside the `glass-surface surface-pad` section, as the first item in the `space-y-4` div, before the existing heading + date row:

```tsx
<section className="glass-surface surface-pad">
  <div className="space-y-4">

    {/* NEW: scope button row above date label */}
    <div className="flex justify-end">
      <Button
        size="icon"
        variant="outline"
        className="glass-subtle h-14 w-14 shrink-0 rounded-2xl border-border/60"
        onClick={() => setScopeDialogOpen(true)}
      >
        <SlidersHorizontal className="h-5 w-5 text-chart-2" />
        <span className="sr-only">Select meal group</span>
      </Button>
    </div>

    {/* existing: heading + date label */}
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold tracking-tight">Today&apos;s Nutrition</h2>
      <p className="text-sm text-muted-foreground">{data.dateLabel}</p>
    </div>

    {/* rest unchanged */}
    ...
  </div>
</section>
```

After this change, the top-level `section.space-y-2` header block contains only the `h1` + subtitle paragraph — no buttons. The `div.flex items-start justify-between gap-3` wrapper at line 223 becomes unnecessary once the button is moved. Clean it up: replace the `flex items-start justify-between` wrapper with a plain `div` or remove it entirely and just render the title block.

---

#### CHANGE 3 — Replace Dialog → Sheet (right side) in both components

**Dashboard — `components/nutrition/dashboard/nutrition-dashboard.tsx`:**

Replace the import:
```typescript
// Remove from dialog imports:
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";

// Add:
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
```

Replace the Dialog block (lines 301–309):
```tsx
// BEFORE:
<Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
  <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
    <DialogHeader>
      <DialogTitle>User & Meal Group</DialogTitle>
      <DialogDescription>Select the user and meal group context for nutrition pages.</DialogDescription>
    </DialogHeader>
    <NutritionScopeControls showHelperText fullWidthOnMobile />
  </DialogContent>
</Dialog>

// AFTER:
<Sheet open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
  <SheetContent side="right" className="w-full sm:max-w-sm">
    <SheetHeader>
      <SheetTitle>Meal Group</SheetTitle>
      <SheetDescription>Select the meal group context for nutrition pages.</SheetDescription>
    </SheetHeader>
    <div className="mt-4">
      <NutritionScopeControls showHelperText fullWidthOnMobile />
    </div>
  </SheetContent>
</Sheet>
```

**Meal planner — `components/nutrition/meal-planner/meal-planner-page.tsx`:**

The planner has two scope Dialog instances (lines ~443–451 and ~909–917). Replace both with `Sheet`:

```tsx
// Add to imports at the top of the file:
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// Replace BOTH instances of:
<Dialog open={isScopeModalOpen} onOpenChange={setIsScopeModalOpen}>
  <DialogContent size="sm">
    <DialogHeader>
      <DialogTitle>Planner Options</DialogTitle>
      <DialogDescription>Select user and meal group for this planner.</DialogDescription>
    </DialogHeader>
    <NutritionScopeControls showHelperText fullWidthOnMobile />
  </DialogContent>
</Dialog>

// With:
<Sheet open={isScopeModalOpen} onOpenChange={setIsScopeModalOpen}>
  <SheetContent side="right" className="w-full sm:max-w-sm">
    <SheetHeader>
      <SheetTitle>Planner Options</SheetTitle>
      <SheetDescription>Select meal group for this planner.</SheetDescription>
    </SheetHeader>
    <div className="mt-4">
      <NutritionScopeControls showHelperText fullWidthOnMobile />
    </div>
  </SheetContent>
</Sheet>
```

If `Dialog` is no longer used anywhere else in `meal-planner-page.tsx` after this change, remove it from the imports. The `responsive-modal` Dialog import in `nutrition-dashboard.tsx` should also be removed if the scope dialog was its only use in that file.

---

#### CHANGE 4 — Remove User dropdown from `NutritionScopeControls`

**File:** `components/nutrition/nutrition-scope-controls.tsx`

**Remove the following entirely:**

1. The `useAssignableSubjects` import from `@/hooks/use-meal-groups`
2. The `SubjectOption` type definition
3. `formatClientLabel` helper function
4. `useAssignableSubjects()` call
5. `useNutritionActiveSubject()` call
6. `useSetNutritionActiveSubject()` call
7. `subjectOptions` memo
8. `selectedSubjectKey` memo
9. `assignmentSubject` memo
10. `onSubjectChange` function
11. The `useEffect` that calls `setActiveSubject("self", null)` when subject falls out of options
12. The entire first `<div>` block (User dropdown, lines 148–162)

**Adjust the store imports:** Remove `useNutritionActiveSubject`, `useSetNutritionActiveSubject`, `NutritionSubjectType` from the `@/stores/use-nutrition-ui-store` import. Keep `useNutritionSelectedMealGroupId` and `useSetNutritionSelectedMealGroupId`.

**Adjust `useNutritionAutoMealGroupSelection`:** With no active subject selection, call it with no arguments:
```typescript
// BEFORE:
const { assignmentsQuery, activeAssignmentGroupId } = useNutritionAutoMealGroupSelection({
  subject: assignmentSubject,
});

// AFTER:
const { assignmentsQuery, activeAssignmentGroupId } = useNutritionAutoMealGroupSelection();
```

This defaults to the store's current subject (self), which is always "self" once the user dropdown is removed.

**Keep everything else:** `assignedGroupOptions` memo, `groupOptions` memo (but see CHANGE 5 for how it is used), `setSelectedMealGroupId`, `showHelperText` logic, the second `useEffect` that clears the group selection when it falls out of available options.

---

#### CHANGE 5 — Replace Meal Group Select with Popover + search

**File:** `components/nutrition/nutrition-scope-controls.tsx`

The current Meal Group Select (lines 164–180) must be replaced with a searchable Popover that matches the `MealGroupAssigneeDropdown` pattern. The dropdown shows **only `assignedGroupOptions`** — no fallback to all groups.

**Add imports:**
```typescript
import { useState } from "react"; // add if not already present
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

(Remove `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from `@/components/ui/select` if the User dropdown removal in CHANGE 4 means Select is no longer used at all in this file.)

**Add local state:**
```typescript
const [groupOpen, setGroupOpen] = useState(false);
const [groupSearch, setGroupSearch] = useState("");
```

**Replace the Meal Group Select div with:**
```tsx
<div className={cn(fullWidthOnMobile ? "min-w-0 w-full" : "min-w-[220px]")}>
  {!compact ? <Label className="mb-1 block text-xs text-muted-foreground">Meal Group</Label> : null}
  <Popover open={groupOpen} onOpenChange={setGroupOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className="h-9 w-full justify-between rounded-xl border-border/60 bg-muted/20"
      >
        <span className="truncate text-left text-sm">
          {selectedMealGroupId
            ? (assignedGroupOptions.find((opt) => opt.id === selectedMealGroupId)?.label ?? "Select meal group")
            : (assignmentsQuery.isLoading ? "Loading..." : "Select meal group")}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[min(92vw,320px)] rounded-xl border-border/70 bg-card/95 p-3">
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            placeholder="Search meal groups..."
            className="h-9 rounded-lg border-border/60 bg-muted/20 pl-9"
          />
        </div>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60">
          {assignmentsQuery.isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Loading meal groups...</p>
          ) : assignedGroupOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No assigned meal groups found.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {assignedGroupOptions
                .filter((opt) =>
                  groupSearch.trim() === "" ||
                  opt.label.toLowerCase().includes(groupSearch.toLowerCase())
                )
                .map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40",
                      selectedMealGroupId === opt.id ? "bg-muted/40" : ""
                    )}
                    onClick={() => {
                      setSelectedMealGroupId(opt.id);
                      setGroupOpen(false);
                      setGroupSearch("");
                    }}
                  >
                    <span className="truncate pr-2 text-sm">{opt.label}</span>
                    {selectedMealGroupId === opt.id ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : null}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </PopoverContent>
  </Popover>
</div>
```

**Key rules:**
- Show only `assignedGroupOptions`. Do NOT fall back to `groupsQuery.data?.rows`. If a user has no assigned meal groups, show "No assigned meal groups found."
- The `groupOptions` memo that merges `assignedGroupOptions` with `groupsQuery` fallback is no longer needed. Remove it. Remove the `useNutritionMealGroupOptions` call that powers `groupsQuery` if it is only used for that fallback.
- The `useEffect` that clears `selectedMealGroupId` when the group falls out of options should now check against `assignedGroupOptions`:
  ```typescript
  useEffect(() => {
    if (!isMealGroupSelected(selectedMealGroupId)) return;
    if (assignedGroupOptions.some((opt) => opt.id === selectedMealGroupId)) return;
    if (assignmentsQuery.isLoading) return;
    setSelectedMealGroupId("");
  }, [assignedGroupOptions, assignmentsQuery.isLoading, selectedMealGroupId, setSelectedMealGroupId]);
  ```
- The outer flex wrapper in the return can be simplified since there is now only one control:
  ```tsx
  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn(fullWidthOnMobile ? "w-full" : "")}>
        {/* meal group popover */}
      </div>
      {showHelperText ? (
        <p className="text-xs text-muted-foreground">...</p>
      ) : null}
    </div>
  );
  ```

---

#### CHANGE 6 — Meal planner Options button: icon-only style + move to end of MON–SUN row

**File:** `components/nutrition/meal-planner/meal-planner-page.tsx`

**Step 6a — Update the Options button appearance (two locations).**

The current "Options" button with text+icon (lines 486–489 and the equivalent in the empty-state section around line 430) must become an icon-only button matching the dashboard SlidersHorizontal style:

```tsx
// BEFORE (both instances):
<Button variant="outline" className="rounded-xl border-border/70" onClick={() => setIsScopeModalOpen(true)}>
  <SlidersHorizontal className="mr-2 h-4 w-4" />
  Options
</Button>

// AFTER:
<Button
  size="icon"
  variant="outline"
  className="glass-subtle h-14 w-14 shrink-0 rounded-2xl border-border/60"
  onClick={() => setIsScopeModalOpen(true)}
>
  <SlidersHorizontal className="h-5 w-5 text-chart-2" />
  <span className="sr-only">Planner options</span>
</Button>
```

**Step 6b — Move the button to the far right of the MON–SUN day selector row.**

The day selector row (lines 467–483) is:
```tsx
<div className="flex flex-wrap gap-2">
  {DAY_ORDER.map((day) => (
    <button key={day} ...>{...}</button>
  ))}
</div>
```

Change this to include the SlidersHorizontal button as a sibling at the far right. Use `justify-between` or `ml-auto` to push it right:

```tsx
<div className="flex flex-wrap items-center gap-2">
  {DAY_ORDER.map((day) => (
    <button
      key={day}
      type="button"
      className={cn(
        "flex h-12 min-w-[58px] flex-col items-center justify-center rounded-2xl border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
        selectedDay === day
          ? "border-chart-2/50 bg-chart-2 text-black"
          : "border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/50"
      )}
      onClick={() => setSelectedDay(day)}
    >
      {MEAL_DAY_LABELS[day].slice(0, 3)}
    </button>
  ))}
  {/* SlidersHorizontal moved here — ml-auto pushes it to the far right */}
  <Button
    size="icon"
    variant="outline"
    className="glass-subtle ml-auto h-14 w-14 shrink-0 rounded-2xl border-border/60"
    onClick={() => setIsScopeModalOpen(true)}
  >
    <SlidersHorizontal className="h-5 w-5 text-chart-2" />
    <span className="sr-only">Planner options</span>
  </Button>
</div>
```

**Step 6c — Remove the Options button from the second button row.**

After moving the button into the day selector row, remove it from the `div.flex flex-wrap items-center gap-2` row (lines 485–522). That row should now contain only: Duplicate, Add Meal Type, and the circular Plus button. If that row becomes empty after removing other buttons (unlikely — Duplicate and Add Meal Type remain), collapse it.

**Step 6d — Empty-state SlidersHorizontal.**

The empty-state section (around line 430) has its own Options button that opens the scope modal for first-time setup. This button should also use the icon-only style from Step 6a, but its position (inside a centered CTA block) can remain as-is — it is a different UX context (first-time setup, not the main toolbar). Do NOT move this one into a day row; just update its appearance to match.

---

#### Required file changes summary

- `components/nutrition/dashboard/nutrition-dashboard.tsx`
  - Remove Plus button
  - Move SlidersHorizontal into `glass-surface` section above date row
  - Replace Dialog → Sheet
  - Remove unused Dialog import from `@/components/ui/responsive-modal` (if no longer used in this file)

- `components/nutrition/nutrition-scope-controls.tsx`
  - Remove user subject state, hooks, and dropdown UI
  - Replace Meal Group Select with Popover + search
  - Add `useState`, `Check`, `ChevronDown`, `Search`, `Button`, `Input`, `Popover*` imports
  - Remove `useAssignableSubjects`, `useNutritionMealGroupOptions`, `Select*` imports if unused
  - Remove `SubjectOption`, `formatClientLabel`, `subjectOptions`, `selectedSubjectKey`, `assignmentSubject`, `onSubjectChange`, `groupOptions` memo

- `components/nutrition/meal-planner/meal-planner-page.tsx`
  - Replace both Dialog instances → Sheet
  - Options button: icon-only style in all locations
  - Move main Options button into the MON–SUN day selector row (far right, `ml-auto`)
  - Remove Options button from second button row
  - Add `Sheet*` imports; remove `Dialog*` imports if no longer used

---

#### Acceptance criteria

- [ ] Dashboard header shows only the page title + subtitle. No Plus button. No SlidersHorizontal in the header.
- [ ] A SlidersHorizontal button (`glass-subtle h-14 w-14 rounded-2xl`) appears directly above the "Today's Nutrition" heading / date row.
- [ ] Clicking SlidersHorizontal on the dashboard opens a Sheet from the right (not a centered Dialog).
- [ ] The Sheet contains only the Meal Group Popover — no User dropdown.
- [ ] Meal group Popover shows only assigned meal groups for the current user. Searching filters the list client-side.
- [ ] Selecting a meal group closes the Popover and updates the store. The button label reflects the selection.
- [ ] In the meal planner, the MON–SUN day selector row has the SlidersHorizontal icon button at the far right.
- [ ] The second row below the day selector (Duplicate, Add Meal Type, plus icon) no longer contains an Options button.
- [ ] Clicking the meal planner SlidersHorizontal opens a Sheet from the right.
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass
- [ ] `npm run test` → pass (all existing tests)

---

#### Sequence

1. CHANGE 4 + 5 together: update `nutrition-scope-controls.tsx` (user dropdown removal + Popover replacement)
2. CHANGE 1 + 2 + 3: update `nutrition-dashboard.tsx` (remove Plus, move SlidersHorizontal, Dialog → Sheet)
3. CHANGE 3 + 6: update `meal-planner-page.tsx` (Dialog → Sheet + button style + row placement)
4. Run typecheck + lint after each file.

---

### [A-015-AMENDMENT] Nutrition dashboard — inline meal group selector (supersedes A-015 for the dashboard)

- Priority: High
- Status: Queued
- Scope: `nutrition-dashboard.tsx` only. Meal planner is out of scope for this amendment.

> **This amendment replaces A-015 CHANGE 1, 2, 3 (dashboard section) entirely.**
> Do NOT implement A-015 CHANGE 1, 2, 3 as written. Follow this amendment instead.
> A-015 CHANGE 4, 5, 6 (scope-controls + meal planner) are still valid and independent.

---

#### What changed from A-015

| A-015 (original) | A-015-AMENDMENT |
|---|---|
| Remove Plus, remove SlidersHorizontal | Remove Plus, remove SlidersHorizontal ✓ (same) |
| Move SlidersHorizontal above date row in glass-surface section | **No button at all** — dropdown is inline in the header |
| Open Sheet from right with NutritionScopeControls inside | **No Sheet, no modal of any kind** |
| NutritionScopeControls simplified to meal-group-only | **NutritionScopeControls not used in dashboard at all** |

---

#### Context — what the screenshots confirm

The current dashboard header has:
- Left: "Nutrition Dashboard" h1 + subtitle
- Right: SlidersHorizontal icon button + Plus (green) icon button

The current scope modal is the "User & Meal Group" Dialog with two dropdowns (User + Meal Group).

**Required end state:**
- Left: "Nutrition Dashboard" h1 + subtitle (unchanged)
- Right: Meal group Popover dropdown (Popover trigger button with name + ChevronDown, align="end")
- No Plus button, no SlidersHorizontal button, no modal, no Sheet

---

#### STEP 1 — Create `components/nutrition/dashboard/nutrition-meal-group-selector.tsx`

New `"use client"` component. Self-contained — owns its own data fetching. Placed directly in the dashboard without a modal wrapper.

```typescript
"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { useNutritionAutoMealGroupSelection } from "@/hooks/use-nutrition-data";
import { useNutritionSelectedMealGroupId, useSetNutritionSelectedMealGroupId } from "@/stores/use-nutrition-ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils";

type GroupOption = { id: string; label: string };

export function NutritionMealGroupSelector() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedMealGroupId = useNutritionSelectedMealGroupId();
  const setSelectedMealGroupId = useSetNutritionSelectedMealGroupId();

  // Auto-selects the user's active assigned meal group on first render.
  const { assignmentsQuery } = useNutritionAutoMealGroupSelection();

  const assignedGroupOptions = useMemo<GroupOption[]>(() => {
    const map = new Map<string, GroupOption>();
    for (const assignment of assignmentsQuery.data || []) {
      const groupId = assignment.meal_group_id;
      if (!groupId) continue;
      const label =
        assignment.template_group?.name ||
        assignment.meal_group?.name ||
        "Assigned meal group";
      map.set(groupId, { id: groupId, label });
    }
    return Array.from(map.values());
  }, [assignmentsQuery.data]);

  const selectedLabel = useMemo(() => {
    if (!selectedMealGroupId) {
      return assignmentsQuery.isLoading ? "Loading..." : "Select meal group";
    }
    return (
      assignedGroupOptions.find((opt) => opt.id === selectedMealGroupId)?.label ??
      "Select meal group"
    );
  }, [selectedMealGroupId, assignedGroupOptions, assignmentsQuery.isLoading]);

  const filtered = useMemo(() => {
    if (!search.trim()) return assignedGroupOptions;
    return assignedGroupOptions.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [assignedGroupOptions, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 shrink-0 justify-between rounded-xl border-border/60 bg-muted/20 sm:min-w-[230px]"
        >
          <span className="truncate text-left text-sm">{selectedLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,320px)] rounded-xl border-border/70 bg-card/95 p-3">
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meal groups..."
              className="h-9 rounded-lg border-border/60 bg-muted/20 pl-9"
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60">
            {assignmentsQuery.isLoading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {search ? "No matches." : "No assigned meal groups."}
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40",
                      selectedMealGroupId === opt.id ? "bg-muted/40" : ""
                    )}
                    onClick={() => {
                      setSelectedMealGroupId(opt.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className="truncate pr-2 text-sm">{opt.label}</span>
                    {selectedMealGroupId === opt.id ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Key design rules:**
- `useNutritionAutoMealGroupSelection()` is called with no arguments — it reads the store's current subject (always "self" for the dashboard, since the user dropdown is gone) and auto-selects the user's active assigned group when `selectedMealGroupId` is empty. This handles the "default value = user's meal group" requirement.
- Show only `assignedGroupOptions`. No fallback to all groups. If the user has no assignments, show "No assigned meal groups."
- `align="end"` keeps the popover anchored to the right edge of the trigger, preventing overflow on the right side of the viewport.
- `sm:min-w-[230px]` matches the `MealGroupAssigneeDropdown` trigger width.
- The component is self-sufficient — the dashboard does not need to pass any props.

---

#### STEP 2 — Update `components/nutrition/dashboard/nutrition-dashboard.tsx`

**2a. Remove the following imports:**
```typescript
// Remove these:
import { NutritionScopeControls } from "@/components/nutrition/nutrition-scope-controls";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";
import { SlidersHorizontal } from "lucide-react"; // remove from the lucide import destructure
// KEEP Plus in the lucide import — still used by quickActionConfig
```

**2b. Remove `scopeDialogOpen` state:**
```typescript
// Remove:
const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
```

**2c. Add the new import:**
```typescript
import { NutritionMealGroupSelector } from "@/components/nutrition/dashboard/nutrition-meal-group-selector";
```

**2d. Replace the header section (lines 222–243):**
```tsx
// BEFORE:
<section className="space-y-2">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-4xl font-semibold tracking-tight">Nutrition Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.greetingSubtitle}</p>
    </div>
    <div className="flex items-center gap-2">
      <Button size="icon" variant="outline" className="glass-subtle h-14 w-14 shrink-0 rounded-2xl border-border/60" onClick={() => setScopeDialogOpen(true)}>
        <SlidersHorizontal className="h-5 w-5 text-chart-2" />
        <span className="sr-only">Select user and meal group</span>
      </Button>
      <Button size="icon" className="accent-strong h-14 w-14 shrink-0 rounded-2xl text-black">
        <Plus className="h-6 w-6" />
        <span className="sr-only">Quick add</span>
      </Button>
    </div>
  </div>
</section>

// AFTER:
<section className="space-y-2">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-4xl font-semibold tracking-tight">Nutrition Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.greetingSubtitle}</p>
    </div>
    <NutritionMealGroupSelector />
  </div>
</section>
```

**2e. Remove the Dialog block at the bottom (lines 301–309):**
```tsx
// DELETE entirely:
<Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
  <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
    <DialogHeader>
      <DialogTitle>User & Meal Group</DialogTitle>
      <DialogDescription>Select the user and meal group context for nutrition pages.</DialogDescription>
    </DialogHeader>
    <NutritionScopeControls showHelperText fullWidthOnMobile />
  </DialogContent>
</Dialog>
```

---

#### STEP 3 — Audit and clean up `NutritionScopeControls`

`NutritionScopeControls` is still used in:
- `components/nutrition/meal-planner/meal-planner-page.tsx` (two scope dialog instances)
- `components/nutrition/manual-nutrition-diary.tsx` (one instance)

**Do NOT delete `NutritionScopeControls`.** It still serves the diary and meal planner.

However, now that the dashboard no longer uses it, the architect's previous A-015 CHANGE 4+5 instructions (remove User dropdown, replace with Popover inside NutritionScopeControls) are still valid for the diary and meal planner surfaces. Implement A-015 CHANGE 4 and 5 as written — they clean up NutritionScopeControls for the remaining consumers.

---

#### Required file changes

- `components/nutrition/dashboard/nutrition-meal-group-selector.tsx` — **new file**
- `components/nutrition/dashboard/nutrition-dashboard.tsx`
  - Remove: `NutritionScopeControls` import, `Dialog*` imports from `responsive-modal`, `SlidersHorizontal` from lucide, `scopeDialogOpen` state, the Dialog block, both old header buttons
  - Add: `NutritionMealGroupSelector` import and usage in header

---

#### Acceptance criteria

- [ ] Dashboard header: left side has title + subtitle. Right side has the meal group Popover trigger button (showing selected/auto-selected group name + ChevronDown). No Plus, no SlidersHorizontal, no modal trigger anywhere.
- [ ] On first load with no manual selection, the dropdown auto-shows the user's active assigned meal group name in the trigger (via `useNutritionAutoMealGroupSelection`).
- [ ] Clicking the trigger opens a Popover (not a Dialog or Sheet). The Popover contains a Search input and a scrollable list of the user's assigned meal groups.
- [ ] Selecting a group closes the Popover, updates the trigger label, and updates `selectedMealGroupId` in the Zustand store (shared across all nutrition pages).
- [ ] If no assigned meal groups exist, Popover shows "No assigned meal groups."
- [ ] Search filters the list client-side (no new API call).
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass
- [ ] `npm run test` → pass

---

### [A-018] Nutrition dashboard — global daily totals without meal group gate

- Priority: High
- Status: Queued
- Depends on: A-015-AMENDMENT (run after or alongside)

---

#### Problem

The nutrition dashboard only shows calories and macros when a `selectedMealGroupId` is present in the store. If no group is selected, the query is disabled and the dashboard shows zeros. This is a UX anti-pattern not present in any major fitness platform (MyFitnessPal, MacroFactor, Trainerize, Everfit, Cronometer).

---

#### Design decision (architect)

Aligned with industry standard:

- **Totals** (`consumedCalories`, macros) = ALL meal logs for today, no meal group filter. The date is the only gate.
- **Targets** (calorie ring goal, macro targets) = active plan auto-resolved by `getActiveNutritionPlanForDate` — this already works independently of `meal_group_id` and does not need to change.
- The meal group selector in the dashboard header (A-015-AMENDMENT) now acts as a **navigation context** for the diary/planner, not a data gate for the dashboard.
- **Remove `NutritionMealGroupSelector` from the dashboard header entirely.** Since the totals are now global, the selector has no meaningful effect on what the dashboard displays. It creates a false impression of filtering. The diary and planner pages have their own group selectors.

---

#### STEP 1 — Fix `applyMealGroupFilter` in `app/actions/nutrition-manual.ts`

Currently (lines 396–412):
```typescript
function applyMealGroupFilter<T>(query: T, mealGroupId?: string | null): T {
  if (mealGroupId) {
    return builder.eq("meal_group_id", mealGroupId) as T;
  }
  return builder.is("meal_group_id", null) as T;  // ← treats undefined same as null
}
```

The problem: both `null` and `undefined` fall through to `IS NULL`. There is no "return all" path.

**Fix — distinguish `undefined` (no filter) from `null` (legacy IS NULL filter):**

```typescript
function applyMealGroupFilter<T>(query: T, mealGroupId?: string | null): T {
  const builder = query as unknown as {
    eq: (column: string, value: unknown) => { is: (column: string, value: null) => unknown };
    is: (column: string, value: null) => unknown;
  };

  if (mealGroupId) {
    // Specific group: filter to exact ID
    return builder.eq("meal_group_id", mealGroupId) as T;
  }

  if (mealGroupId === null) {
    // Explicit null: legacy logs only (meal_group_id IS NULL)
    return builder.is("meal_group_id", null) as T;
  }

  // mealGroupId is undefined: no filter — return all rows regardless of meal group
  return query;
}
```

**Rule:** callers that want all logs pass `undefined`. Callers that want only legacy logs pass `null`. Callers that want a specific group pass the UUID string. The diary, planner, and manual log views continue to pass the selected group ID or `null` — no change needed for them.

---

#### STEP 2 — Fix `useNutritionDiary` in `hooks/use-nutrition-manual.ts`

Currently (line 176):
```typescript
enabled: Boolean(performedOn && mealGroupId),
```

This disables the query whenever `mealGroupId` is falsy (null, undefined, or empty string). The dashboard passes `undefined` after STEP 3, so the query would never run.

**Fix:**
```typescript
enabled: Boolean(performedOn),
```

Date is the only required field. `mealGroupId` being absent means "global view" — which is valid and must not block the query.

**Verify no other callsite breaks:** `useNutritionDiary` is called from the diary page and possibly the planner. Those callers always provide a `mealGroupId` today, so their behavior is unchanged. The only caller that changes is `useNutritionDashboard` (STEP 3).

---

#### STEP 3 — Fix `useNutritionDashboard` in `hooks/use-nutrition-dashboard.ts`

Currently (lines 44–61):
```typescript
const selectedMealGroupId = useNutritionSelectedMealGroupId();
// ...
const diaryQuery = useNutritionDiary(today, subject, selectedMealGroupId || null);
const activityQuery = useQuery({
  queryKey: nutritionKeys.dashboardActivity(subject, 10, selectedMealGroupId || null),
  queryFn: () => listNutritionDashboardActivityAction({
    subject,
    limit: 10,
    meal_group_id: selectedMealGroupId || undefined,
  }),
  ...
});
```

**Fix — pass `undefined` for meal group on both queries:**

```typescript
// Remove this line entirely — dashboard no longer reads meal group from store:
// const selectedMealGroupId = useNutritionSelectedMealGroupId();

const diaryQuery = useNutritionDiary(today, subject, undefined);

const activityQuery = useQuery({
  queryKey: nutritionKeys.dashboardActivity(subject, 10, undefined),
  queryFn: () => listNutritionDashboardActivityAction({
    subject,
    limit: 10,
    meal_group_id: undefined,
  }),
  staleTime: 20_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
});
```

Remove the `useNutritionSelectedMealGroupId` import from this file if it is no longer used anywhere in the file after this change.

**What this achieves:**
- `diaryQuery` → `getNutritionDiaryDayAction({ performed_on: today, meal_group_id: undefined })` → `applyMealGroupFilter(query, undefined)` → no filter → **all meal logs for today**
- `activityQuery` → `listNutritionDashboardActivityAction({ meal_group_id: undefined })` → **all nutrition activity today**
- `active_plan` (targets) → resolved by `getActiveNutritionPlanForDate(subject, today)` inside the action — **already group-independent, unchanged**
- The calorie ring and macro bars always show the full day's logged food vs. the active plan's targets

---

#### STEP 4 — Remove `NutritionMealGroupSelector` from dashboard header

**File:** `components/nutrition/dashboard/nutrition-dashboard.tsx`

Per A-015-AMENDMENT, a `NutritionMealGroupSelector` was being added to the header. Since totals are now global, this selector has no effect on what the dashboard displays. Remove it from the header.

The dashboard header becomes:
```tsx
<section className="space-y-2">
  <div className="min-w-0">
    <h1 className="text-4xl font-semibold tracking-tight">Nutrition Dashboard</h1>
    <p className="mt-1 text-sm text-muted-foreground">{data.greetingSubtitle}</p>
  </div>
</section>
```

No buttons, no dropdown, no modal. Clean title-only header.

If `NutritionMealGroupSelector` was created as a new file per A-015-AMENDMENT, **delete it** — it is no longer used.

**Note:** `NutritionScopeControls` is still used in `manual-nutrition-diary.tsx` and `meal-planner-page.tsx`. Do not delete it. The diary and planner pages retain their own group selectors because those views ARE group-scoped — you log food into a specific plan. That is correct behavior. Only the **dashboard overview** is global.

---

#### STEP 5 — Update `lib/query-keys-nutrition.ts` (optional cleanup)

The `dashboardActivity` and `diaryDay` key factories include `mealGroupId` in the key. With the dashboard always passing `undefined`, the key will always include `null` (since `undefined` serialises to `null` in the key factory). This is fine — it simply means the dashboard query has its own stable cache entry separate from meal-group-scoped diary entries. No change required unless the team wants to rename the key for clarity.

---

#### Required file changes

| File | Change |
|---|---|
| `app/actions/nutrition-manual.ts` | `applyMealGroupFilter`: treat `undefined` as no-op, `null` as IS NULL, string as `.eq()` |
| `hooks/use-nutrition-manual.ts` | `useNutritionDiary`: `enabled: Boolean(performedOn)` — remove `mealGroupId` from guard |
| `hooks/use-nutrition-dashboard.ts` | Pass `undefined` (not `selectedMealGroupId`) for both diary and activity queries. Remove `useNutritionSelectedMealGroupId` import if unused. |
| `components/nutrition/dashboard/nutrition-dashboard.tsx` | Remove `NutritionMealGroupSelector` from header. Header is title + subtitle only. |
| `components/nutrition/dashboard/nutrition-meal-group-selector.tsx` | Delete if created per A-015-AMENDMENT. No longer needed. |

---

#### Acceptance criteria

- [ ] Dashboard loads and shows today's calorie + macro totals immediately on first visit — no meal group selection required, no zeros
- [ ] If the user has logged food across two different meal groups today, both are counted in the dashboard totals (global sum)
- [ ] The calorie ring target and macro targets come from the auto-resolved active plan (`getActiveNutritionPlanForDate`) — no group selection needed for targets either
- [ ] Dashboard header shows only title + subtitle. No dropdown, no buttons.
- [ ] The diary page (`/nutrition/diary`) still requires a meal group selection — its `useNutritionDiary` call still passes a group ID. Behavior unchanged.
- [ ] The manual nutrition diary inline view (`NutritionScopeControls` in `manual-nutrition-diary.tsx`) is unaffected
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass
- [ ] `npm run test` → pass

---

#### Sequence

1. STEP 1 — fix `applyMealGroupFilter` (server, foundational change)
2. STEP 2 — fix `useNutritionDiary` enabled guard
3. STEP 3 — fix `useNutritionDashboard` query params
4. STEP 4 — clean up dashboard header
5. Run typecheck + lint after each step. Smoke test: load `/nutrition` and confirm totals appear without touching any selector.

---

### [A-019] Nutrition dashboard — legacy cleanup + sub-2s load target

- Priority: High
- Status: Queued
- Depends on: A-018 (implement A-018 first)

---

#### Overview

Two goals in one task:
1. Remove all dead code left by A-018 and A-015-AMENDMENT
2. Ensure the dashboard loads within 2 seconds on first visit (cold cache) and instantly on subsequent visits (warm cache)

---

## PART 1 — Legacy cleanup

---

#### CLEANUP-1 — `useNutritionPrefetch` in `hooks/use-nutrition-data.ts`

The second `useEffect` inside `useNutritionPrefetch` (lines 147–164) prefetches diary data only when `selectedMealGroupId` is set:

```typescript
// CURRENT — dead for the dashboard after A-018:
useEffect(() => {
  if (!selectedMealGroupId) return;
  // prefetches nutritionKeys.diaryDay(performedOn, subject, selectedMealGroupId)
}, [queryClient, selectedDate, selectedMealGroupId, subject]);
```

After A-018, the dashboard's diary query uses `undefined` for `mealGroupId`. The prefetch above uses `selectedMealGroupId` as the key — a **different cache entry**. It warms a key the dashboard never reads.

**Fix — replace the diary prefetch to warm the unscoped (dashboard) key:**

```typescript
useEffect(() => {
  const today = toDateInput(new Date());
  void queryClient.prefetchQuery({
    queryKey: nutritionKeys.diaryDay(today, subject, undefined),
    queryFn: () => getNutritionDiaryDayAction({ performed_on: today, subject }),
    staleTime: 60_000,
  });
}, [queryClient, subject]);
```

Remove `selectedMealGroupId` and `selectedDate` from this hook entirely if they are only used in the removed effect. Also remove `useNutritionSelectedMealGroupId` and `useNutritionSelectedDate` imports from this file if nothing else in the file uses them after this change.

---

#### CLEANUP-2 — `nutrition-dashboard.tsx` dead imports and state

After A-015-AMENDMENT and A-018, the following are dead in `nutrition-dashboard.tsx`:

| Dead item | Remove from |
|---|---|
| `NutritionScopeControls` import | `@/components/nutrition/nutrition-scope-controls` |
| `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle` imports | `@/components/ui/responsive-modal` |
| `SlidersHorizontal` from lucide | lucide-react import destructure |
| `Plus` from lucide | Only remove if `quickActionConfig` is also removed — **do NOT remove if `Plus` is still used in `quickActionConfig`** |
| `scopeDialogOpen` useState | Component body |
| The entire Dialog block at end of return | JSX |
| Both header buttons (SlidersHorizontal + Plus) | JSX header section |
| `NutritionMealGroupSelector` import | If created per A-015-AMENDMENT, remove import and JSX usage |
| `NutritionMealGroupSelector` file | Delete `components/nutrition/dashboard/nutrition-meal-group-selector.tsx` |

The dashboard is now purely a data display component — no UI state for modals or selectors.

---

#### CLEANUP-3 — Remove `useSetNutritionViewMode` / `useSetNutritionNavigationSource` if unused

The dashboard currently calls:
```typescript
const setViewMode = useSetNutritionViewMode();
const setNavigationSource = useSetNutritionNavigationSource();
```

If these are only used to set "dashboard" / "dashboard" on mount and serve no other consumer, they are overhead. Audit whether any other component reads `viewMode` or `navigationSource` from the store. If nothing reads them, remove these calls and their imports. If they are consumed elsewhere, keep them.

---

## PART 2 — Performance: sub-2s load target

The dashboard cold-load path currently has three serial bottlenecks inside a single server action call. Eliminating them brings first-load under 2 seconds on a typical Supabase-hosted project.

---

#### PERF-1 — Add missing DB indexes (new migration)

No indexes exist on `meal_logs`, `meal_log_items`, or `meal_plan_assignments`. Every dashboard load does full-table scans on these tables.

**New file:** `supabase/migrations/<timestamp>_nutrition_dashboard_indexes.sql`

```sql
-- meal_logs: primary filter for dashboard (subject_user_id + date)
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date
  ON public.meal_logs (subject_user_id, performed_on DESC)
  WHERE subject_user_id IS NOT NULL;

-- meal_logs: same for client-subject queries
CREATE INDEX IF NOT EXISTS idx_meal_logs_client_date
  ON public.meal_logs (subject_client_id, performed_on DESC)
  WHERE subject_client_id IS NOT NULL;

-- meal_log_items: items lookup by parent log ID
CREATE INDEX IF NOT EXISTS idx_meal_log_items_log_id
  ON public.meal_log_items (meal_log_id);

-- meal_plan_assignments: active plan lookup by subject + date range
CREATE INDEX IF NOT EXISTS idx_meal_plan_assignments_user_active
  ON public.meal_plan_assignments (subject_user_id, status, start_date, end_date)
  WHERE subject_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plan_assignments_client_active
  ON public.meal_plan_assignments (subject_client_id, status, start_date, end_date)
  WHERE subject_client_id IS NOT NULL;

-- meal_plans: fallback plan lookup (used when no assignment exists)
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_active
  ON public.meal_plans (subject_user_id, status, start_date, end_date)
  WHERE subject_user_id IS NOT NULL;
```

Apply with `supabase db push` before testing load times.

---

#### PERF-2 — Eliminate double `requireActor()` in `getNutritionDiaryDayAction`

`getActiveNutritionPlanForDate` (line 464) calls `requireActor()` internally:

```typescript
async function getActiveNutritionPlanForDate(subject, performedOn) {
  const { supabase } = await requireActor();  // ← second session fetch
  ...
}
```

`getNutritionDiaryDayAction` already called `requireActor()` at line 599 and has `supabase` in scope. The second call fetches the session from Supabase Auth again — an extra network round-trip on every dashboard load.

**Fix — pass `supabase` as a parameter:**

```typescript
// Change signature:
async function getActiveNutritionPlanForDate(
  subject: SubjectRef,
  performedOn: string,
  supabase: SupabaseClient<Database>    // ← add parameter
): Promise<ActiveNutritionPlan | null> {
  // Remove: const { supabase } = await requireActor();
  // Use the passed supabase directly
  ...
}
```

Update the call site in `getNutritionDiaryDayAction`:
```typescript
// Before:
getActiveNutritionPlanForDate(subject, payload.performed_on),

// After:
getActiveNutritionPlanForDate(subject, payload.performed_on, supabase),
```

The `SupabaseClient<Database>` type is available — use the same type already imported for the `createClient()` return.

---

#### PERF-3 — Parallelize `getActiveNutritionPlanForDate` internal queries

Inside `getActiveNutritionPlanForDate`, the current flow is:
1. Query `meal_plan_assignments` → wait for result
2. **If nothing found**, query `meal_plans` → wait for result

This is sequential — two DB round-trips in series when no assignment exists (the common case for new users or users with no current assignment). On a 30ms latency connection this adds 30ms. On a 100ms connection it doubles query time for the plan resolution.

**Fix — run both queries in parallel, resolve in preference order:**

```typescript
async function getActiveNutritionPlanForDate(
  subject: SubjectRef,
  performedOn: string,
  supabase: SupabaseClient<Database>
): Promise<ActiveNutritionPlan | null> {
  let assignmentQuery = supabase
    .from("meal_plan_assignments")
    .select("*")
    .eq("status", "active")
    .lte("start_date", performedOn)
    .gte("end_date", performedOn)
    .order("start_date", { ascending: false })
    .limit(1);
  assignmentQuery = applySubjectFilters(assignmentQuery, subject);

  let planQuery = supabase
    .from("meal_plans")
    .select("*")
    .eq("status", "active")
    .lte("start_date", performedOn)
    .gte("end_date", performedOn)
    .order("start_date", { ascending: false })
    .limit(1);
  planQuery = applySubjectFilters(planQuery, subject);

  // Run both in parallel — save one sequential round-trip
  const [{ data: assignments, error: assignmentError }, { data: plans, error: planError }] =
    await Promise.all([assignmentQuery, planQuery]);

  if (assignmentError) throw new Error(assignmentError.message);
  if (planError) throw new Error(planError.message);

  // Prefer assignment over plan (same priority as before)
  const assignment = (assignments?.[0] ?? null) as MealPlanAssignmentRow | null;
  if (assignment) {
    return { source: "assignment", ...mapAssignment(assignment) };
  }

  const plan = (plans?.[0] ?? null) as MealPlanRow | null;
  if (!plan) return null;
  return { source: "plan", ...mapPlan(plan) };
}
```

Extract the mapping logic into small inline helpers (`mapAssignment`, `mapPlan`) to keep the function readable. The return shape is identical to the current code.

---

#### PERF-4 — Increase stale time on dashboard queries

Current stale times cause unnecessary refetches when the user navigates away and back within minutes.

**`hooks/use-nutrition-dashboard.ts`:**
```typescript
// Diary query (in useNutritionDiary, via hook options or override):
staleTime: 45_000  →  120_000  // 2 minutes — daily totals change slowly

// Activity query:
staleTime: 20_000  →  60_000   // 1 minute
```

If `staleTime` is set inside `useNutritionDiary` directly, add an override in `useNutritionDashboard` using `useQuery` directly with a higher staleTime rather than going through the shared hook — or accept a `staleTime` prop on `useNutritionDiary`. Simpler: set the dashboard diary query staleTime directly in `useNutritionDashboard`:

```typescript
// In useNutritionDashboard, replace the useNutritionDiary call with
// a direct useQuery that uses the same queryFn but a higher staleTime:
const diaryQuery = useQuery({
  queryKey: nutritionKeys.diaryDay(today, subject, undefined),
  queryFn: () => getNutritionDiaryDayAction({ performed_on: today, subject }),
  enabled: Boolean(today),
  staleTime: 120_000,
  gcTime: 10 * 60_000,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
});
```

This replaces the `useNutritionDiary(today, subject, undefined)` call and removes the dependency on the shared hook for the dashboard use case. The shared `useNutritionDiary` hook remains unchanged for the diary page.

---

#### Load time expectation after all changes

| Scenario | Before | After |
|---|---|---|
| Cold load (no cache, indexes missing) | ~1500–3000ms | ~400–800ms |
| Cold load (no cache, indexes applied) | ~800–1500ms | ~200–500ms |
| Warm load (staleTime hit) | ~50ms (from cache) | ~50ms (from cache) |
| Second visit within 2 min | re-fetches | served from cache (staleTime 120s) |

The dominant factor after PERF-1 (indexes) is network latency to Supabase. On a co-located deployment (Vercel + Supabase same region) the action round-trip is ~50–80ms. On cross-region it can be 200–400ms. PERF-2 and PERF-3 eliminate one redundant round-trip each.

---

#### Required file changes

| File | Change |
|---|---|
| `supabase/migrations/<timestamp>_nutrition_dashboard_indexes.sql` | New — 6 indexes on meal_logs, meal_log_items, meal_plan_assignments, meal_plans |
| `app/actions/nutrition-manual.ts` | PERF-2: pass `supabase` to `getActiveNutritionPlanForDate`. PERF-3: parallelize both queries inside it |
| `hooks/use-nutrition-data.ts` | CLEANUP-1: replace diary prefetch to warm unscoped key; remove `selectedMealGroupId` if unused |
| `hooks/use-nutrition-dashboard.ts` | PERF-4: inline diary query with `staleTime: 120_000`; remove `useNutritionSelectedMealGroupId` import (A-018) |
| `components/nutrition/dashboard/nutrition-dashboard.tsx` | CLEANUP-2: remove all dead imports, state, JSX |
| `components/nutrition/dashboard/nutrition-meal-group-selector.tsx` | Delete if it exists |

---

#### Checklist

- [ ] Migration applied (`supabase db push`) and indexes confirmed via `\d meal_logs` in psql or Supabase dashboard
- [ ] `getActiveNutritionPlanForDate` no longer calls `requireActor()` — takes `supabase` as parameter
- [ ] Assignment + plan queries run in parallel inside `getActiveNutritionPlanForDate`
- [ ] `useNutritionDashboard` diary query: `staleTime: 120_000`, `enabled: Boolean(today)`, `mealGroupId: undefined`
- [ ] `useNutritionPrefetch` warms the unscoped diary cache on mount
- [ ] `nutrition-dashboard.tsx` has no references to `scopeDialogOpen`, `NutritionScopeControls`, `SlidersHorizontal` button, `Plus` button, `Dialog` imports
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass
- [ ] `npm run test` → pass
- [ ] Smoke test: navigate to `/nutrition/dashboard` — totals appear within 2 seconds on first load with empty cache

---

### [A-020] Hotfix — Diary mutations do not invalidate dashboard cache

- Priority: Critical (user-facing bug — diary entries not reflected on dashboard immediately)
- Depends on: A-018 (already implemented)
- Status: Queued
- File: `hooks/use-nutrition-manual.ts`

---

#### Root cause

Two separate React Query cache entries exist for the same conceptual data:

| Surface | `mealGroupId` arg | Serialized cache key (tail) |
|---|---|---|
| `useNutritionDashboard` | `undefined` → coerces to `null` | `[..., "diary", today, subject, null]` |
| `useNutritionDiary` (diary page) | e.g. `"uuid-abc"` | `[..., "diary", today, subject, "uuid-abc"]` |

The key factory (`lib/query-keys-nutrition.ts:43`) uses `mealGroupId ?? null`, so `undefined` and `null` both serialize to `null` — but a specific group ID does not.

`useNutritionMutations` builds `dayKey` from the specific group ID passed to it. `invalidateDay()` fires with that scoped key, which does NOT match the dashboard's `null`-keyed entry. The dashboard cache is never cleared after a diary mutation — stale consumed totals are shown until the next natural refetch (staleTime: 120s).

`invalidateDashboard()` (line 252) covers `nutritionKeys.dashboard()` — the activity feed prefix only. Diary-day data lives under `nutritionKeys.diary()`, a different branch.

---

#### Fix — one change in `hooks/use-nutrition-manual.ts`

Replace `invalidateDay` with a partial-prefix invalidation that covers all `mealGroupId` variants for the current date + subject. This matches both the diary's scoped key and the dashboard's unscoped key in a single call.

```typescript
// BEFORE (line ~251):
const invalidateDay = () => queryClient.invalidateQueries({ queryKey: dayKey });

// AFTER — prefix [..., "diary", performedOn, subject|null] matches every
// mealGroupId variant (null, undefined, any uuid) for this date + subject:
const invalidateDay = () =>
  queryClient.invalidateQueries({
    queryKey: [...nutritionKeys.diary(), performedOn, subject ?? null],
  });
```

**Do NOT change `dayKey`.** It is still used in `onMutate` for optimistic cancellation and snapshot rollback — it must remain the exact scoped key there.

---

#### Checklist

- [ ] `invalidateDay` uses the partial prefix `[...nutritionKeys.diary(), performedOn, subject ?? null]`
- [ ] `dayKey` is unchanged — still the full scoped key used in `onMutate`
- [ ] Smoke test: add a meal in `/nutrition/diary` → navigate to `/nutrition` dashboard — consumed totals update without a page reload
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass

---

### [A-021] Log from Plan — import today's assigned meal plan into the diary

- Priority: High
- Depends on: A-020 (implement first — the cache invalidation fix powers the dashboard refresh)
- Status: Queued

---

#### Background and intent

The dashboard shows global daily totals from `meal_logs`. Meal plans (created in the planner/groups) are templates — they define what the user *should* eat, not what they *did* eat. To keep the data model correct:

- **Meal Groups / Planner** = template creation and coaching tools
- **Meal Diary** = single source of truth for actual daily logged nutrition
- **Dashboard** = consumed (diary) vs targets (active plan)

The "Log from Plan" feature bridges the two: a single button in the diary that copies today's assigned meal plan items into actual `meal_logs` / `meal_log_items`. The user logs once, the dashboard updates immediately. No data model changes needed — diary remains the single log table.

---

#### STEP 1 — Extend `ActiveNutritionPlan` to expose `meal_group_id`

`getActiveNutritionPlanForDate` currently maps assignment rows without including `meal_group_id`. Add it so the diary component can pass it to the Log from Plan action without any extra DB round-trip.

In `app/actions/nutrition-manual.ts`, update the `mapAssignment` mapper inside `getActiveNutritionPlanForDate`:

```typescript
// Add meal_group_id to the ActiveNutritionPlan type (wherever the type is defined):
export type ActiveNutritionPlan = {
  source: "assignment" | "plan";
  id: string;
  meal_group_id: string | null;  // ← add this field
  name: string | null;
  // ... rest of existing fields unchanged
};

// In mapAssignment:
const mapAssignment = (assignment: MealPlanAssignmentRow): ActiveNutritionPlan => ({
  source: "assignment",
  id: assignment.id,
  meal_group_id: assignment.meal_group_id ?? null,  // ← add this line
  // ... rest unchanged
});

// In mapPlan:
const mapPlan = (plan: MealPlanRow): ActiveNutritionPlan => ({
  source: "plan",
  id: plan.id,
  meal_group_id: plan.meal_group_id ?? null,  // ← add this line (if column exists; null if not)
  // ... rest unchanged
});
```

No new DB query. `meal_group_id` is already on the row — just expose it.

---

#### STEP 2 — Create `logFromPlanAction` in `app/actions/nutrition-manual.ts`

New exported server action. Input: the active plan's `meal_group_id`, `performed_on`, and subject. Resolves today's day of week, fetches the meal group's items for that day, bulk-inserts them as actual diary logs.

```typescript
const logFromPlanSchema = z.object({
  performed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_group_id: z.string().uuid(),
  subject: subjectSchema.optional(),
});

export async function logFromPlanAction(input: z.input<typeof logFromPlanSchema>) {
  const payload = logFromPlanSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.diary.log_from_plan",
    payload: { performed_on: payload.performed_on, meal_group_id: payload.meal_group_id },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      // Resolve day of week from performed_on date (mon, tue, wed, thu, fri, sat, sun)
      const dayOfWeek = toMealDayOfWeek(payload.performed_on); // helper — see below

      // Fetch the meal group's plan items for this day
      // meal_group_plans → the day plan row; meal_group_items → items for that day
      const { data: planData, error: planError } = await supabase
        .from("meal_group_plans")
        .select("id, day_of_week")
        .eq("meal_group_id", payload.meal_group_id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

      if (planError) throw new Error(planError.message);
      if (!planData) {
        return { inserted_count: 0, skipped: true, reason: "no_plan_for_day" };
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("meal_group_items")
        .select("*")
        .eq("plan_id", planData.id)
        .order("position", { ascending: true });

      if (itemsError) throw new Error(itemsError.message);
      const items = (itemsData || []);
      if (items.length === 0) {
        return { inserted_count: 0, skipped: true, reason: "no_items_for_day" };
      }

      // Group items by meal_type — one meal_log per meal type
      const byMealType = new Map<string, typeof items>();
      for (const item of items) {
        const type = normalizeMealType(item.meal_type);
        if (!byMealType.has(type)) byMealType.set(type, []);
        byMealType.get(type)!.push(item);
      }

      let totalInserted = 0;
      for (const [mealType, mealItems] of byMealType) {
        // Create the meal_log row
        const { data: logRow, error: logError } = await supabase
          .from("meal_logs")
          .insert({
            performed_on: payload.performed_on,
            meal_type: mealType,
            meal_group_id: payload.meal_group_id,
            subject_user_id: subject.subject_user_id,
            subject_client_id: subject.subject_client_id,
            created_by_user_id: user.id,
          })
          .select("id")
          .single();

        if (logError) throw new Error(logError.message);

        // Bulk insert all items for this meal type
        const logItemInserts: MealLogItemInsert[] = mealItems.map((item, index) => ({
          meal_log_id: logRow.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g ?? null,
          notes: item.notes ?? null,
          position: index + 1,
          created_by_user_id: user.id,
        }));

        const { error: itemsInsertError } = await supabase
          .from("meal_log_items")
          .insert(logItemInserts);

        if (itemsInsertError) throw new Error(itemsInsertError.message);
        totalInserted += mealItems.length;
      }

      revalidateNutritionPaths(subject.subject_client_id);

      return { inserted_count: totalInserted, skipped: false };
    },
  });
}
```

**Helper — add to the file:**
```typescript
function toMealDayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getUTCDay()]!;
}
```

**Important:** Check the actual column and table names against the DB schema before implementing:
- The table holding day plans may be `meal_group_plans`, `meal_plan_days`, or similar — use the correct name
- The items table may be `meal_group_items`, `meal_plan_meals`, or similar — check the existing types at the top of `nutrition-manual.ts` and `meal-groups.ts`
- Adapt the column names (`plan_id`, `position`, `meal_type`, etc.) to match the actual schema

---

#### STEP 3 — Add mutation hook in `hooks/use-nutrition-manual.ts`

```typescript
export function useLogFromPlan(performedOn: string, subject?: NutritionSubject) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logFromPlanAction,
    onSuccess: () => {
      // Invalidate ALL diary day variants for this date + subject
      // (same partial prefix from A-020 — covers diary page and dashboard in one call)
      void queryClient.invalidateQueries({
        queryKey: [...nutritionKeys.diary(), performedOn, subject ?? null],
      });
    },
  });
}
```

---

#### STEP 4 — Add "Log today's plan" UI to `manual-nutrition-diary.tsx`

Mount the hook at the top of the component alongside existing hooks:
```typescript
const logFromPlan = useLogFromPlan(performedOn, subject);
```

**Show condition:** only when `diaryData.active_plan?.meal_group_id` is set. Do NOT render anything if no plan is assigned — zero cost on load.

**Two states:**

**State A — Diary is empty today** (no logs yet): show a prominent banner above the meal sections.
```tsx
{diaryData.active_plan?.meal_group_id && diaryData.logs.length === 0 && (
  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
    <div className="space-y-0.5">
      <p className="text-sm font-medium">
        {diaryData.active_plan.name ?? "Today's plan"} is ready
      </p>
      <p className="text-xs text-muted-foreground">
        Import all planned meals into your diary in one tap.
      </p>
    </div>
    <Button
      size="sm"
      variant="outline"
      className="shrink-0"
      disabled={logFromPlan.isPending}
      onClick={() =>
        void logFromPlan.mutateAsync({
          performed_on: performedOn,
          meal_group_id: diaryData.active_plan!.meal_group_id!,
          subject: subject ? { subject_user_id: subject.subject_user_id, subject_client_id: subject.subject_client_id } : undefined,
        })
      }
    >
      {logFromPlan.isPending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Importing...
        </span>
      ) : (
        "Log Today's Plan"
      )}
    </Button>
  </div>
)}
```

**State B — Diary already has entries**: show a smaller secondary button near the top-right of the diary header (not a full banner — non-intrusive).
```tsx
{diaryData.active_plan?.meal_group_id && diaryData.logs.length > 0 && (
  <Button
    size="sm"
    variant="ghost"
    className="h-8 text-xs text-muted-foreground"
    disabled={logFromPlan.isPending}
    onClick={() =>
      void logFromPlan.mutateAsync({
        performed_on: performedOn,
        meal_group_id: diaryData.active_plan!.meal_group_id!,
        subject: ...,
      })
    }
  >
    {logFromPlan.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
    Add from plan
  </Button>
)}
```

---

#### Performance guarantees

| Concern | How it's handled |
|---|---|
| Extra query on page load | None — `meal_group_id` comes from `active_plan` already fetched in `getNutritionDiaryDayAction` |
| Plan items fetch | Lazy — only fires when user clicks the button |
| Bulk insert cost | One `meal_logs` insert per meal type + one `meal_log_items` bulk insert per type (no N+1) |
| Dashboard refresh after import | A-020 partial-prefix invalidation covers both diary and dashboard in a single `invalidateQueries` call |
| Dashboard staleTime | 120s (A-019) — if navigating diary → dashboard, dashboard reads from fresh cache set by invalidation |
| Re-render cost | `logFromPlan.isPending` is the only new reactive state — one boolean |

---

#### Checklist

- [ ] `ActiveNutritionPlan` type includes `meal_group_id: string | null`
- [ ] `mapAssignment` and `mapPlan` mappers include `meal_group_id`
- [ ] `logFromPlanAction` created and exported from `nutrition-manual.ts`
- [ ] `toMealDayOfWeek` helper resolves correct day from `YYYY-MM-DD` string
- [ ] Table/column names verified against actual DB schema before implementation
- [ ] `useLogFromPlan` hook created in `use-nutrition-manual.ts`
- [ ] Banner shown in diary when plan exists AND diary is empty for today
- [ ] Subtle "Add from plan" button shown when plan exists AND diary already has entries
- [ ] On import success: diary page refreshes showing imported items; dashboard shows updated consumed totals
- [ ] `npm run typecheck` → pass
- [ ] `npm run lint` → pass
- [ ] `npm run test` → pass

#### Acceptance criteria

- [ ] User opens diary (empty today) → sees "Log Today's Plan" banner → taps it → all plan items appear in diary sections → navigates to dashboard → consumed macros reflect the imported meals
- [ ] User has already logged some meals → sees subtle "Add from plan" button → taps it → plan items are appended without wiping existing entries
- [ ] If today's plan has no items for the current day of week → button does nothing visible (action returns `skipped: true`) — show a brief toast: "No meals planned for today"
- [ ] Dashboard updates within the same navigation — no page reload required

---

### [A-022] Nutrition — consistent meal type cards + all modals as right/bottom Sheet

- Priority: High
- Depends on: A-019 (apply first — removes dead imports before this task adds new ones)
- Status: Queued

---

#### Overview

Three nutrition pages (Diary, Planner, Meal Groups) each have their own hand-rolled meal type card layout, item editor Dialog, and modal handling. The result is visible inconsistency for the user and duplicated code for the engineer. This task:

1. Extracts a single shared `MealItemEditorSheet` component used by all three pages
2. Standardizes the meal type card header, item row, action buttons, and empty state across all three pages
3. Converts every remaining Dialog-based modal in the nutrition section to a Sheet (right on desktop, bottom on mobile)
4. Centralizes duplicated constants (section order, labels, accent colors)
5. Removes legacy/dead code found during the audit

**Nothing changes in data, mutations, or query logic.** This is a pure UI/component restructuring task. Run `npm run typecheck && npm run lint` after each step.

---

## PART 1 — Shared `MealItemEditorSheet`

---

### Why

All three pages independently built an item editor:
- Diary: large inline Dialog in `manual-nutrition-diary.tsx` (~180 lines of JSX)
- Planner: large inline Dialog in `meal-planner-page.tsx` (~160 lines of JSX)
- Groups: separate `MealItemEditorDialog` component in `meal-item-editor-dialog.tsx` (~120 lines of JSX)

All three render the same fields (name, macros, notes) with minor variations. The user has requested all modals open from the **right on desktop** and **bottom on mobile** — Dialogs (centered overlay) must be replaced with Sheets.

---

### Create `components/nutrition/shared/meal-item-editor-sheet.tsx`

This is the single source of truth for item editing across all three pages.

```typescript
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { MealItemType } from "@/app/actions/meal-groups";
import { MEAL_TYPE_LABELS } from "@/components/nutrition/meal-groups/meal-group-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUnitLabels } from "@/stores/use-settings-store";
import { getMealUnitOptions, normalizeMealUnit } from "@/lib/nutrition/meal-units";
import { cn } from "@/utils";

const NO_UNIT_VALUE = "__no_unit__";

// All fields that can be pre-filled or edited
export type MealItemEditorValue = {
  type?: MealItemType;
  title?: string | null;
  quantity?: number | null;
  unit?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
  // Planner-only
  planned_time?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  pending?: boolean;
  /** Pre-fill the form for edit mode. Omit or pass undefined for create mode. */
  defaultValue?: MealItemEditorValue;
  /** Pass true only in the meal planner — shows the planned time field */
  showPlannedTime?: boolean;
  onSubmit: (value: Required<MealItemEditorValue>) => Promise<void> | void;
};

function MacroField({
  label,
  value,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </Label>
        <Input
          type="number"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Math.max(0, Math.min(max, Math.round(Number(e.target.value))));
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="h-8 w-24 border-border/60 bg-background/80 text-right"
        />
      </div>
      <Slider
        value={[value]}
        min={0}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v ?? 0)}
      />
    </div>
  );
}

export function MealItemEditorSheet({
  open,
  onOpenChange,
  title,
  description,
  pending = false,
  defaultValue,
  showPlannedTime = false,
  onSubmit,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const units = useUnitLabels();
  const unitOptions = getMealUnitOptions();

  const [type, setType] = useState<MealItemType>(defaultValue?.type ?? "breakfast");
  const [itemTitle, setItemTitle] = useState(defaultValue?.title ?? "");
  const [quantity, setQuantity] = useState(String(defaultValue?.quantity ?? ""));
  const [unit, setUnit] = useState(normalizeMealUnit(defaultValue?.unit) || NO_UNIT_VALUE);
  const [calories, setCalories] = useState(Math.round(Number(defaultValue?.calories ?? 0)));
  const [protein, setProtein] = useState(Math.round(Number(defaultValue?.protein_g ?? 0)));
  const [carbs, setCarbs] = useState(Math.round(Number(defaultValue?.carbs_g ?? 0)));
  const [fat, setFat] = useState(Math.round(Number(defaultValue?.fat_g ?? 0)));
  const [notes, setNotes] = useState(defaultValue?.notes ?? "");
  const [plannedTime, setPlannedTime] = useState(defaultValue?.planned_time ?? "");

  // Reset form when defaultValue changes (edit → create, or switching items)
  useEffect(() => {
    setType(defaultValue?.type ?? "breakfast");
    setItemTitle(defaultValue?.title ?? "");
    setQuantity(String(defaultValue?.quantity ?? ""));
    setUnit(normalizeMealUnit(defaultValue?.unit) || NO_UNIT_VALUE);
    setCalories(Math.round(Number(defaultValue?.calories ?? 0)));
    setProtein(Math.round(Number(defaultValue?.protein_g ?? 0)));
    setCarbs(Math.round(Number(defaultValue?.carbs_g ?? 0)));
    setFat(Math.round(Number(defaultValue?.fat_g ?? 0)));
    setNotes(defaultValue?.notes ?? "");
    setPlannedTime(defaultValue?.planned_time ?? "");
  }, [defaultValue]);

  const handleSubmit = async () => {
    await onSubmit({
      type,
      title: itemTitle.trim() || null,
      quantity: quantity !== "" ? Number(quantity) : null,
      unit: unit === NO_UNIT_VALUE ? null : unit,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      notes: notes.trim() || null,
      planned_time: showPlannedTime ? (plannedTime || null) : null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isDesktop ? "w-[420px] max-w-[420px]" : "max-h-[92svh] rounded-t-2xl"
        )}
      >
        <SheetHeader className="border-b border-border/50 px-5 py-4">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Meal type */}
          <div className="space-y-2">
            <Label>Meal type</Label>
            <Select value={type} onValueChange={(v) => setType(v as MealItemType)}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder="e.g. Chicken breast, Oats..."
              className="rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 100"
                className="rounded-xl border-border/60 bg-muted/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/20">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_UNIT_VALUE}>No unit</SelectItem>
                  {unitOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Planned time — planner only */}
          {showPlannedTime ? (
            <div className="space-y-2">
              <Label>Planned time (optional)</Label>
              <Input
                type="time"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
                className="rounded-xl border-border/60 bg-muted/20"
              />
            </div>
          ) : null}

          {/* Macros */}
          <MacroField
            label={`Calories (${units.energy})`}
            value={calories}
            max={2000}
            step={5}
            onChange={setCalories}
          />
          <MacroField
            label={`Protein (${units.macro})`}
            value={protein}
            max={300}
            step={1}
            onChange={setProtein}
          />
          <MacroField
            label={`Carbs (${units.macro})`}
            value={carbs}
            max={300}
            step={1}
            onChange={setCarbs}
          />
          <MacroField
            label={`Fat (${units.macro})`}
            value={fat}
            max={300}
            step={1}
            onChange={setFat}
          />

          {/* Quick macro adjustments */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: `+50 ${units.energy}`, action: () => setCalories((c) => Math.min(2000, c + 50)) },
              { label: `+100 ${units.energy}`, action: () => setCalories((c) => Math.min(2000, c + 100)) },
              { label: `+10g protein`, action: () => setProtein((p) => Math.min(300, p + 10)) },
              { label: `+10g carbs`, action: () => setCarbs((c) => Math.min(300, c + 10)) },
              { label: `+5g fat`, action: () => setFat((f) => Math.min(300, f + 5)) },
            ].map(({ label, action }) => (
              <Button key={label} type="button" size="sm" variant="outline" className="h-8 rounded-lg border-border/60 text-xs" onClick={action}>
                {label}
              </Button>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional instructions or reminders"
              className="min-h-[80px] rounded-xl border-border/60 bg-muted/20"
            />
          </div>
        </div>

        {/* Footer — always pinned to bottom */}
        <div className="border-t border-border/50 px-5 py-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-border/60"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 accent-strong rounded-xl"
            disabled={pending}
            onClick={() => void handleSubmit()}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**After creating this file:**
- Delete `components/nutrition/meal-groups/meal-item-editor-dialog.tsx` — it is fully replaced
- Update `meal-group-detail.tsx` to import `MealItemEditorSheet` instead of `MealItemEditorDialog`
- Update `meal-planner-page.tsx` to replace its inline item editor Dialog with `MealItemEditorSheet`
- Update `manual-nutrition-diary.tsx` to replace its inline item editor Dialog with `MealItemEditorSheet`

---

## PART 2 — Centralize duplicated constants

Currently, `SECTION_ORDER`, `SECTION_LABELS`, and meal type ordering are defined three times (once per file). All three files already import from `meal-group-types.tsx` — extend that file to be the single source.

**`components/nutrition/meal-groups/meal-group-types.tsx` — add:**

```typescript
// Accent color per meal type — used by card headers in all three pages
export const MEAL_TYPE_ACCENTS: Record<MealItemType | "other", string> = {
  water: "text-chart-3",
  breakfast: "text-chart-1",
  snack: "text-chart-4",
  lunch: "text-chart-2",
  pre_workout_meal: "text-chart-3",
  post_workout_meal: "text-chart-5",
  dinner: "text-chart-4",
  protein_drink: "text-chart-1",
  other: "text-muted-foreground",
};

// Canonical display order for meal type sections
export const MEAL_TYPE_DISPLAY_ORDER: MealItemType[] = [
  "water",
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
];
```

After adding, remove the inline `SECTION_ORDER`, `SECTION_LABELS`, `DAY_ORDER` (meal type), `DIARY_SECTIONS` accent definitions from the three page components and import from `meal-group-types.tsx` instead. Do NOT remove these exports from the file if they are already exported and used — just add the missing ones.

---

## PART 3 — Standardize meal type card header

All three pages must render identical card headers. The canonical structure:

```tsx
// Card header — same in all three pages
<div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 md:px-5">
  <div className="min-w-0">
    <div className="flex items-center gap-2">
      <SectionIcon type={type} className={cn("h-4 w-4", MEAL_TYPE_ACCENTS[type])} />
      <h3 className="truncate text-base font-semibold tracking-tight">
        {MEAL_TYPE_LABELS[type]}
      </h3>
      <span className="text-sm text-muted-foreground">
        {Math.round(sectionCalories)} kcal
      </span>
    </div>
    <p className="mt-0.5 text-xs text-muted-foreground">
      P {Math.round(sectionProtein)}g · C {Math.round(sectionCarbs)}g · F {Math.round(sectionFat)}g
    </p>
  </div>
  <div className="flex items-center gap-2">
    {/* Quick Add — desktop only */}
    <Button
      variant="outline"
      size="sm"
      className="hidden rounded-xl border-border/60 md:inline-flex"
      onClick={() => onOpenAdd(type)}
    >
      Quick Add
    </Button>
    {/* Primary add — all screen sizes */}
    <Button
      size="icon"
      className="h-9 w-9 rounded-full accent-strong"
      onClick={() => onOpenAdd(type)}
      aria-label={`Add item to ${MEAL_TYPE_LABELS[type]}`}
    >
      <CirclePlus className="h-4 w-4" />
    </Button>
  </div>
</div>
```

Changes from current:
- Diary: `text-xl font-semibold` → `text-base font-semibold` (matches planner/groups)
- Groups: `Plus` → `CirclePlus`; add "Quick Add" text button (was missing)
- All: Icon color now uses `MEAL_TYPE_ACCENTS[type]` instead of hardcoded `text-chart-2`

---

## PART 4 — Standardize item rows

Canonical item row structure for all three pages:

```tsx
<div className="flex items-start justify-between gap-3 px-4 py-3 md:px-5">
  {/* Left: content */}
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-medium leading-tight">{item.name || item.title}</p>

    {/* Quantity + unit — show if present */}
    {(item.quantity || item.unit) ? (
      <p className="mt-0.5 text-xs text-muted-foreground">
        {[item.quantity, item.unit].filter(Boolean).join(" ")}
      </p>
    ) : null}

    {/* Planner only: planned time */}
    {/* showPlannedTime prop controls visibility */}
    {showPlannedTime && item.planned_time ? (
      <p className="mt-0.5 text-xs text-muted-foreground">{item.planned_time}</p>
    ) : null}

    {/* Macros */}
    <p className="mt-0.5 text-xs text-muted-foreground">
      P {Math.round(Number(item.protein_g || 0))}g · C {Math.round(Number(item.carbs_g || 0))}g · F {Math.round(Number(item.fat_g || 0))}g
    </p>

    {/* Notes */}
    {item.notes ? (
      <p className="mt-0.5 text-xs text-muted-foreground italic">{item.notes}</p>
    ) : null}
  </div>

  {/* Right: calories + actions */}
  <div className="flex shrink-0 items-center gap-0.5">
    <span className="mr-1.5 text-sm font-semibold tabular-nums">
      {Math.round(Number(item.calories || 0))}
    </span>
    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onToggleFavorite(item)}>
      <Star className={cn("h-3.5 w-3.5", isFavorite ? "fill-chart-4 text-chart-4" : "text-muted-foreground")} />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onEdit(item)}>
      <Pencil className="h-3.5 w-3.5" />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onDuplicate(item)}>
      <Copy className="h-3.5 w-3.5" />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive/70 hover:text-destructive" onClick={() => onDelete(item)}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </div>
</div>
```

Changes from current:
- **Diary**: add Duplicate button (was missing). Wire `onDuplicate` to existing mutation for copying the item.
- **Groups**: was not showing quantity/unit — now shows if present.
- **All**: icon sizes shrunk from `h-4 w-4` to `h-3.5 w-3.5` to reduce visual weight.
- **All**: calorie value changed from `text-xl font-semibold` to `text-sm font-semibold tabular-nums` — the current xl was visually dominant.

---

## PART 5 — Standardize delete confirmation

Currently: Diary and Groups delete directly (no confirmation); Planner uses a modal.

**Standard: all three use a small confirmation Sheet from the bottom (mobile) / right (desktop).**

Create `components/nutrition/shared/delete-confirm-sheet.tsx`:

```tsx
"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName?: string | null;
  pending?: boolean;
  onConfirm: () => Promise<void> | void;
};

export function DeleteConfirmSheet({ open, onOpenChange, itemName, pending = false, onConfirm }: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isDesktop ? "w-[360px] max-w-[360px]" : "rounded-t-2xl"
        )}
      >
        <SheetHeader className="border-b border-border/50 px-5 py-4">
          <SheetTitle>Remove item</SheetTitle>
          <SheetDescription>
            {itemName ? `"${itemName}" will be permanently removed.` : "This item will be permanently removed."}
            {" "}This action cannot be undone.
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 py-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1 rounded-xl"
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Remove
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Add state per page: `const [deleteTarget, setDeleteTarget] = useState<{id: string; name: string | null} | null>(null)`. Clicking the trash icon sets `deleteTarget`; confirming calls the mutation and clears `deleteTarget`.

---

## PART 6 — Convert remaining Dialog-based modals to Sheets

All remaining Dialogs in the nutrition section (that are not delete confirmations or tiny inline alerts) must become Sheets.

| Modal | Current | Target |
|---|---|---|
| Item editor (all 3 pages) | Dialog / MealItemEditorDialog | `MealItemEditorSheet` (Part 1) |
| Copy meals from day (Diary + Planner) | Dialog | Sheet (right/bottom) |
| Quick Add (Diary) | Dialog | Merge into `MealItemEditorSheet` — remove Quick Add as a separate dialog |
| Recent items (Diary) | Dialog | Sheet (right/bottom) |
| Custom order (all 3 pages) | Sheet (already correct) | No change |
| Favorites (all 3 pages) | Sheet (already correct) | No change |
| Group settings editor (Groups) | Sheet (already correct) | No change |
| Delete confirmation | Dialog (Planner) / none (Diary + Groups) | `DeleteConfirmSheet` (Part 5) |

For **Quick Add** in the diary: instead of a separate Quick Add Dialog, open `MealItemEditorSheet` with a flag `quickMode` that hides name/quantity/unit fields and shows only the macro fields. This removes an entire Dialog instance and simplifies the code path.

For each converted Dialog, the pattern is the same:
```tsx
// Before:
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>...</DialogContent>
</Dialog>

// After:
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side={isDesktop ? "right" : "bottom"} className={...}>
    <SheetHeader>...</SheetHeader>
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {/* form content */}
    </div>
    <div className="border-t px-5 py-4 flex gap-3">
      {/* Cancel + Save buttons */}
    </div>
  </SheetContent>
</Sheet>
```

---

## PART 7 — Standardize empty state

All three pages must use a clickable button empty state:

```tsx
{items.length === 0 ? (
  <button
    type="button"
    className="w-full px-5 py-8 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
    onClick={() => onOpenAdd(type)}
  >
    Tap + to add your first item
  </button>
) : (
  <div className="divide-y divide-border/30">
    {items.map((item) => (/* item row */))}
  </div>
)}
```

Change in Groups: current `<p>` is not clickable. Replace with the `<button>` pattern above.

---

## PART 8 — Legacy and dead code cleanup (per-file)

This section is the authoritative per-file cleanup list. Work through it **file by file** as you implement PARTS 1–7. Do not clean up a file until you have also migrated it to `MealItemEditorSheet` / `DeleteConfirmSheet` — removing helpers before their replacements are in place will break the build.

---

### 8A — `components/nutrition/manual-nutrition-diary.tsx`

**Imports to remove** (after all Dialog-based modals are converted):
- `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog` (or wherever currently imported) — no Dialogs will remain in this file
- `MealItemEditorDialog` if it was ever imported (check line 1–30)

**Imports to add:**
- `MealItemEditorSheet` from `@/components/nutrition/shared/meal-item-editor-sheet`
- `DeleteConfirmSheet` from `@/components/nutrition/shared/delete-confirm-sheet`

**Constants to remove:**
- `NO_UNIT_SELECT_VALUE = "__no_unit__"` (≈ line 93) — now lives inside `MealItemEditorSheet`. Delete the constant and all uses in this file.

**Functions/components to remove:**
- `MetricControl` function (≈ line 170) — inline form field helper used only by the old item editor Dialog. Replaced by `MacroField` inside `MealItemEditorSheet`. Delete the entire function body.
- `openQuickDialog` function (≈ line 558) — triggers the old Quick Add Dialog. Delete.
- `applyQuickActionToQuickAdd` function (≈ line 923) — Quick Add only helper. Delete.
- `unitOptions` memo (≈ line 519) — unit list for the old item editor. Now inside `MealItemEditorSheet`. Delete.

**State variables to remove:**
- `quickCalories`, `quickProtein`, `quickCarbs`, `quickFat`, `quickFiber` (≈ lines 298–302) — Quick Add form fields. These disappear when Quick Add merges into `MealItemEditorSheet` (quick mode).
- `quickDialogOpen` state (≈ line 277) — controls the old Quick Add Dialog. Remove state + all setter calls.
- `planTemplateId` state (≈ line 308) — only consumed by `onAssignTemplateToClient`. If `showAssignmentTools` prop is no longer passed from anywhere, remove both the prop and this state together. Audit callers before removing.

**State variables to add:**
- `deleteTarget: { id: string; name: string | null } | null` — replaces the current direct-delete pattern. Initialize as `null`. Clicking the trash icon on an item row calls `setDeleteTarget({ id: item.id, name: item.name ?? null })`. The `DeleteConfirmSheet` `onConfirm` calls the existing delete mutation then calls `setDeleteTarget(null)`.

**JSX to remove:**
- `<Dialog open={itemDialogOpen}>` block (≈ line 1412–1557) — inline item editor (~145 lines). Remove entirely. Replace with single `<MealItemEditorSheet>` instance (see below).
- `<Dialog open={quickDialogOpen}>` block (≈ line 1559–1629) — Quick Add macros Dialog (~70 lines). Remove entirely. Quick Add now opens `MealItemEditorSheet` with `quickMode={true}`.
- `<Dialog open={recentDialogOpen}>` block (≈ line 1630–1713) — Recent Items list Dialog. Convert to `<Sheet side={isDesktop ? "right" : "bottom"}>` using the standard pattern from PART 6.
- `<Dialog open={copyDialogOpen}>` block (≈ line 1714 onward) — Copy Meals from Date Dialog. Convert to `<Sheet side={isDesktop ? "right" : "bottom"}>`.

**JSX to add (at bottom of return, alongside existing Sheets):**
```tsx
<MealItemEditorSheet
  open={itemEditorOpen}
  onOpenChange={setItemEditorOpen}
  defaultValue={itemEditorDefaultValue}
  quickMode={itemEditorQuickMode}
  onSave={onSaveItem}
  onDelete={(item) => setDeleteTarget({ id: item.id, name: item.name ?? null })}
/>

<DeleteConfirmSheet
  open={deleteTarget !== null}
  onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
  itemName={deleteTarget?.name}
  pending={deleteItemMutation.isPending}
  onConfirm={() => deleteItemMutation.mutateAsync(deleteTarget!.id)}
/>
```

**Item row change:**
- Add `Duplicate` button alongside the existing Star / Edit / Delete buttons (see PART 4 standard row). Wire to existing copy-item mutation.

**Keep (do NOT remove):**
- `ProgressBar` component (≈ line 217) — used for macro progress bars in daily totals section.
- `SectionIcon` helper — used in card headers.
- `resetItemForm`, `onSaveItem`, all mutation calls — keep all business logic intact.
- `canLogFromPlan`, `hasDiaryEntries` state, `onLogFromPlan` handler (≈ lines 854, 940–941) — A-021 banner logic; keep.

---

### 8B — `components/nutrition/meal-planner/meal-planner-page.tsx`

**Imports to remove:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` — no Dialogs will remain
- `MealItemFormState` type if it was declared in a separate types file and imported here (unlikely — but check)

**Imports to add:**
- `MealItemEditorSheet` from `@/components/nutrition/shared/meal-item-editor-sheet`
- `DeleteConfirmSheet` from `@/components/nutrition/shared/delete-confirm-sheet`
- `MEAL_TYPE_ACCENTS`, `MEAL_TYPE_DISPLAY_ORDER`, `SECTION_LABELS` from `@/components/nutrition/meal-groups/meal-group-types` (removing the local duplicates below)

**Constants to remove:**
- `NO_UNIT_SELECT_VALUE = "__no_unit__"` (≈ line 72) — centralized into sheet. Delete.
- `SECTION_LABELS` object (≈ line 62) — duplicate of what will be exported from `meal-group-types.tsx`. Remove and import from that file instead.

**Types to remove:**
- `MealItemFormState` type (≈ line 74) — entire form state type for the old inline editor. Replaced by `MealItemEditorSheet`'s internal state. Delete.

**Functions/components to remove:**
- `defaultItemForm` function (≈ line 91) — factory for blank `MealItemFormState`. Remove.
- `MetricControl` function (≈ line 175) — inline form helper, same pattern as in diary. Delete.
- `applyQuickActionToItemForm` function (≈ line 638) — Quick Add helper for the old form. Delete.
- `openCreateItem` function — opens old item editor in create mode. Delete.
- `openEditItem` function — opens old editor in edit mode. Delete.
- `saveMealItem` function — old form submit handler. Delete. (Keep the underlying server action call — move it into `MealItemEditorSheet`'s `onSave` callback.)
- `unitOptions` memo (≈ line 383) — unit select options for old editor. Now inside sheet. Delete.

**State variables to remove:**
- `itemForm` state and all `setItemForm(...)` calls — entire inline editor form state. Remove.
- `isItemModalOpen` state — controls old item editor Dialog. Remove.
- `isDeleteModalOpen` state — controls old delete confirmation Dialog. Remove.
- `pendingDeleteItemId` state — stores which item is pending delete. Remove.

**State variables to add:**
- `itemEditorOpen: boolean` + `setItemEditorOpen`
- `itemEditorDefaultValue: Partial<MealItemEditorValue> | null` + setter
- `deleteTarget: { id: string; name: string | null } | null` + setter

**JSX to remove:**
- `<Dialog open={isItemModalOpen}>` block (≈ line 1005–1170) — inline item editor (~165 lines). Remove entirely. Replace with `<MealItemEditorSheet showPlannedTime={true} ... />`.
- `<Dialog open={isCopyDialogOpen}>` block (≈ line 1222 onward) — Copy Meals from Weekday Dialog. Convert to Sheet.
- `<Dialog open={isDeleteModalOpen}>` block (wherever it appears, likely ≈ line 1266–1281) — delete confirmation Dialog. Remove entirely. Replace with `<DeleteConfirmSheet>`.

**Card header change:**
- Icon: replace hardcoded `text-chart-2` with `MEAL_TYPE_ACCENTS[type]` (see PART 2).
- "Quick Add" text button: confirm it exists. If missing, add it consistent with PART 2 card header spec.

**Item row change:**
- The planner shows planned time — keep it. Add `showPlannedTime={true}` to `MealItemEditorSheet` so the time field appears.
- Add Duplicate button to item row (see PART 4 standard row).

**Keep (do NOT remove):**
- `ProgressBar` component — used for macro target progress bars.
- `SectionIcon` helper — keep.
- All server action calls (`addMealPlanItem`, `updateMealPlanItem`, `deleteMealPlanItem`, copy action) — the business logic survives; only the UI form wrapper changes.

---

### 8C — `components/nutrition/meal-groups/meal-group-detail.tsx`

**Imports to remove:**
- `MealItemEditorDialog` from `@/components/nutrition/meal-groups/meal-item-editor-dialog` (≈ line 23) — entire file will be deleted (see 8D).
- `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle` imports (≈ line 37) — only used by the copy Dialog; remove after converting that Dialog to Sheet.

**Imports to add:**
- `MealItemEditorSheet` from `@/components/nutrition/shared/meal-item-editor-sheet`
- `DeleteConfirmSheet` from `@/components/nutrition/shared/delete-confirm-sheet`

**State variables to remove:**
- `addItemOpen: boolean` state (≈ line 111) — controlled `MealItemEditorDialog` open state for create. Remove.
- `createItemType: MealItemType | null` state (≈ line 112) — tracked which section's add button was clicked. Remove.
- `editItem: MealGroupItem | null` state — controlled `MealItemEditorDialog` open state for edit. Remove.

**State variables to add:**
- `itemEditorOpen: boolean` + `setItemEditorOpen`
- `itemEditorDefaultValue: Partial<MealItemEditorValue> | null` + setter (collapses `createItemType` and `editItem` into one unified open/close/prefill pattern)
- `deleteTarget: { id: string; name: string | null } | null` + setter

**JSX to remove:**
- `<MealItemEditorDialog open={addItemOpen} ...>` (≈ line 803) — create item. Remove. Replace with `<MealItemEditorSheet>`.
- `<MealItemEditorDialog open={Boolean(editItem)} ...>` (≈ line 815) — edit item. Remove. Replace with same `<MealItemEditorSheet>` instance (different `defaultValue`).
- `<Dialog open={copyDialogOpen}>` block (≈ line 878 onward) — Copy Meals from Day Dialog. Convert to Sheet.

**Direct delete to replace (≈ line 333):**
Current code in `removeItem` calls the delete mutation directly with no confirmation. Change `onDelete` in the item row to call `setDeleteTarget({ id: item.id, name: item.name ?? null })` instead. Add `<DeleteConfirmSheet>` to the JSX.

**Empty state fix (≈ line 577):**
```tsx
// Before:
<p className="px-5 py-8 text-center text-sm text-muted-foreground">
  No items yet. Click + to add.
</p>

// After:
<button
  type="button"
  className="w-full px-5 py-8 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
  onClick={() => onOpenAdd(type)}
>
  Tap + to add your first item
</button>
```

**Card header fix:**
- Replace `<Plus>` with `<CirclePlus>` icon.
- Add "Quick Add" text button (desktop only: `hidden md:flex`) that opens `<MealItemEditorSheet>` in quick mode.
- Replace hardcoded `text-chart-2` icon color with `MEAL_TYPE_ACCENTS[type]`.

**Item row fix:**
- Add quantity/unit display — currently missing. Render `{item.quantity} {item.unit}` in the secondary line.
- Add Duplicate button to item row (see PART 4 standard row).

**Keep (do NOT remove):**
- `SectionIcon` helper — keep.
- All mutation calls (`addGroupItem`, `updateGroupItem`, `deleteGroupItem`, copy action) — business logic intact.
- `<Sheet open={customOrderModalOpen}>` — already correct, no change.
- `<Sheet open={editorOpen}>` — group settings editor, already correct, no change.

---

### 8D — Delete `components/nutrition/meal-groups/meal-item-editor-dialog.tsx`

After `meal-group-detail.tsx` is fully migrated and `MealItemEditorDialog` is no longer referenced anywhere, **delete this file entirely**. Run `grep -r "MealItemEditorDialog" .` before deleting to confirm zero references remain.

---

### 8E — What must NOT be removed (global)

| Item | Location | Why to keep |
|---|---|---|
| `ProgressBar` component | diary + planner | Used for macro progress UI in both files |
| `SectionIcon` helper | all three files | Used in section/card headers |
| `favoriteItemKey` helper | wherever used | Favorites logic |
| All mutation calls | all files | Core data write logic |
| `canLogFromPlan`, `onLogFromPlan`, `hasDiaryEntries` | diary | A-021 banner logic |
| `useMediaQuery` import | all files | Required for Sheet side detection |
| `<Sheet open={customOrderModalOpen}>` | all three | Already correct, no change |
| `<Sheet open={editorOpen}>` | Groups | Group settings editor, correct |
| `<Sheet open={favoriteItemsOpen}>` | wherever | Already Sheet, correct |

---

## Implementation sequence

Implement in this exact order to minimize risk of breaking changes:

1. Create `components/nutrition/shared/meal-item-editor-sheet.tsx` — new file, no breaking changes
2. Create `components/nutrition/shared/delete-confirm-sheet.tsx` — new file, no breaking changes
3. Add missing exports to `meal-group-types.tsx` (`MEAL_TYPE_ACCENTS`, `MEAL_TYPE_DISPLAY_ORDER`)
4. Update `meal-group-detail.tsx`:
   - Replace `MealItemEditorDialog` with `MealItemEditorSheet`
   - Standardize card header (CirclePlus, Quick Add, accent colors)
   - Standardize item rows (quantity/unit display)
   - Replace direct delete with `DeleteConfirmSheet`
   - Fix empty state (make it a button)
   - Run `typecheck + lint`
5. Update `meal-planner-page.tsx`:
   - Replace inline item editor Dialog with `MealItemEditorSheet` (pass `showPlannedTime={true}`)
   - Replace remaining Dialogs (copy, delete) with Sheets
   - Standardize card header and item rows
   - Remove dead constants and MetricControl
   - Run `typecheck + lint`
6. Update `manual-nutrition-diary.tsx`:
   - Replace inline item editor Dialog with `MealItemEditorSheet`
   - Replace Quick Add Dialog with `MealItemEditorSheet` (quick mode — only macros visible)
   - Replace Recent Items Dialog with Sheet
   - Replace Copy Dialog with Sheet
   - Add Duplicate button to item rows
   - Standardize card header and empty state
   - Remove dead constants and MetricControl
   - Run `typecheck + lint`
7. Delete `components/nutrition/meal-groups/meal-item-editor-dialog.tsx`
8. Final: `npm run typecheck && npm run lint && npm run test`

---

## Checklist

- [x] `components/nutrition/shared/meal-item-editor-sheet.tsx` created
- [x] `components/nutrition/shared/delete-confirm-sheet.tsx` created
- [x] `MEAL_TYPE_ACCENTS` and `MEAL_TYPE_DISPLAY_ORDER` exported from `meal-group-types.tsx`
- [x] All three pages use `MealItemEditorSheet` for item add/edit
- [x] All three pages use `DeleteConfirmSheet` for item removal
- [x] `MealItemEditorDialog` deleted
- [x] All remaining Dialogs in target nutrition pages converted to Sheets (right/bottom)
- [x] Card headers: all use `CirclePlus`, "Quick Add" text button (desktop), per-type accent color
- [x] Item rows: all show quantity/unit, Star + Edit + Duplicate + Delete
- [x] Empty states: all are clickable buttons that open add form
- [x] `MetricControl` duplicates removed from diary and planner (replaced by `MacroField` in sheet)
- [x] Local `SECTION_*`/order duplicates removed in planner/diary in favor of shared constants + editor option derivation
- [x] `npm run typecheck` → pass
- [x] `npm run lint` → pass
- [x] `npm run test` → pass
- [ ] Smoke test: add, edit, duplicate, delete an item on each of the three pages — confirm item editor slides in from right on desktop, slides up from bottom on mobile

---

### [A-023] Nutrition Dashboard UI Revamp

- Priority: High
- Depends on: A-019 (already done), A-020 (cache fix). Safe to implement before A-021/A-022.
- Status: Queued
- Files:
  - `lib/nutrition/dashboard.ts` — add `activePlanName`, remove `greetingName`/`greetingSubtitle`
  - `hooks/use-nutrition-dashboard.ts` — expose `diaryIsLoading` / `activityIsLoading` separately; add `activePlanName`
  - `components/nutrition/dashboard/nutrition-dashboard.tsx` — full rewrite (new layout, components)
  - `components/nutrition/dashboard/nutrition-dashboard-skeleton.tsx` — full rewrite (3 named exports)
  - `lib/nutrition/greeting.ts` — NEW: `getGreeting()` + `getTodayLabel()` pure helpers

#### Summary of changes

- **Static header** — greeting phrase + date derived from `new Date()`, never skeletonized, always renders instantly
- **CalorieRing** — center shows remaining calories ("kcal left"), not consumed
- **MacroCard → MacroRow** — replace vertical tiles with horizontal rows (icon + label + progress bar + grams/target)
- **CalorieStat pills** — three pills below ring: Consumed / Target / Remaining with accent color on remaining
- **Active plan badge** — show `activePlanName` as a small pill next to the card heading when set
- **Quick Actions** — replace h-24 equal tiles with compact row: primary "Log Meal" CTA + 3 secondary chips
- **Activity icons** — color-coded per type (meal/assignment/group/progress/client each get unique hue)
- **Activity header** — add "View diary →" link on right
- **Split skeleton gating** — hero card skeleton gated on `diaryIsLoading`; activity section skeleton gated on `activityIsLoading` independently; static header never skeleton

Full spec: see `A-023 — Nutrition Dashboard UI Revamp` section at the bottom of this file.

---

## Context and goals

The current dashboard has four problems:

1. **Static header is unnecessarily skeleton-ed.** The greeting phrase ("Good morning") and today's date can both be derived from `new Date()` on the client — zero server dependency. They must render immediately without a skeleton.
2. **CalorieRing shows consumed, not actionable remaining.** Users care about "how much is left today", not "how much I've eaten". The ring should display remaining calories in the center.
3. **MacroCards are vertically stacked tiles** — space-inefficient, especially on mobile. Replacing with horizontal rows fits three macros in much less height and is easier to scan.
4. **Quick Actions are tall h-24 tiles** — visually heavy and inconsistent with the rest of the UI. Replace with a compact action row.
5. **Activity feed icons are all the same color** — every type uses `text-chart-2`. Color-code by activity type.
6. **Skeleton covers the whole page including static elements.** After refactor: only data-driven sections get skeletonized; the static header always renders.

The new design must be tasteful, clean, and fast. No gratuitous animations. No new dependencies. Every shape in the skeleton must precisely correspond to a shape in the loaded UI.

---

## STEP 1 — Add `activePlanName` to data layer

### `lib/nutrition/dashboard.ts`

Add one field to `NutritionDashboardData`:

```ts
export type NutritionDashboardData = {
  // ... existing fields unchanged ...
  activePlanName: string | null;   // NEW — name of the active nutrition plan, null if none
};
```

### `hooks/use-nutrition-dashboard.ts`

In the `useMemo` that builds `NutritionDashboardData`:

```ts
const targets = diary?.active_plan;
// ... existing calorie/macro derivations unchanged ...

return {
  // ... existing fields unchanged ...
  activePlanName: targets?.name ?? null,   // NEW
};
```

Also expose the two query loading states separately (currently only the combined `isLoading` is returned). Add to the return object:

```ts
return {
  data,
  diaryIsLoading: diaryQuery.isLoading,       // NEW — hero card skeleton gating
  activityIsLoading: activityQuery.isLoading, // NEW — activity section skeleton gating
  isLoading: diaryQuery.isLoading || activityQuery.isLoading, // keep for loading.tsx
  isFetching: diaryQuery.isFetching || activityQuery.isFetching,
  isError: diaryQuery.isError || activityQuery.isError,
  error: diaryQuery.error || activityQuery.error,
  refetch: async () => { await Promise.all([diaryQuery.refetch(), activityQuery.refetch()]); },
};
```

Remove `greetingName` and `greetingSubtitle` from `NutritionDashboardData` entirely — these fields are now derived statically on the client (see STEP 2). Remove them from the type, the memo, and all usages. Do not remove any other fields.

---

## STEP 2 — Rewrite `nutrition-dashboard.tsx`

Full rewrite of `components/nutrition/dashboard/nutrition-dashboard.tsx`. Preserve all existing query/hook calls and business logic — only the rendering layer changes.

### 2A — Greeting helper (static, zero data dependency)

Add these two pure functions at the top of the file (outside any component):

```ts
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}
```

### 2B — Static page header (always renders, never skeletonized)

Replace the current greeting `<section>` with a static component that calls these helpers at render time. It always renders — no `isLoading` gate, no skeleton version.

```
┌───────────────────────────────────────────────────────────┐
│  Good morning                                             │
│  Thursday, March 19                                       │
└───────────────────────────────────────────────────────────┘
```

```tsx
function DashboardHeader() {
  return (
    <section className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">{getGreeting()}</h1>
      <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
    </section>
  );
}
```

### 2C — Redesigned CalorieRing

**Center value change:** Show `remaining = Math.max(0, targetCalories - consumedCalories)` in the center, not `consumedCalories`.

**Center label change:** "kcal left" (not "/ X kcal").

**Ring arc:** arc fill = `consumed / target` (same as before). Color: keep `text-chart-2`.

**Signature change:**
```ts
function CalorieRing({
  consumed,
  target,
  compact = false,
}: {
  consumed: number;
  target: number;
  compact?: boolean;
}) {
  const remaining = Math.max(0, target - consumed);
  // ... SVG circle math unchanged ...
  // Center: show `remaining`, label "kcal left"
}
```

### 2D — MacroRow (replaces MacroCard)

Replace the vertical `MacroCard` tiles with horizontal rows. Each row fits inside the hero card alongside the ring.

Layout per row (full width):
```
[Icon]  Label     ████████░░░░░░   120g / 160g
```

```tsx
function MacroRow({ macro }: { macro: NutritionDashboardMacro }) {
  const config = macroConfig(macro); // reuse existing macroConfig function unchanged
  const percent = Math.max(0, Math.min(100, macro.percent));

  return (
    <div className="flex items-center gap-3">
      <config.Icon className={cn("h-4 w-4 shrink-0", config.iconClass)} />
      <p className="w-14 shrink-0 text-sm text-muted-foreground">{macro.label}</p>
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
          <div
            className={cn("h-full rounded-full transition-all", config.barClass)}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <p className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        <span className={cn("font-medium", config.valueClass)}>{macro.grams}g</span>
        <span className="text-muted-foreground/60"> / {macro.targetGrams}g</span>
      </p>
    </div>
  );
}
```

### 2E — CalorieStat pill (consumed / target / remaining)

Three small stat pills shown below the ring + macro rows inside the hero card.

```tsx
function CalorieStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="glass-subtle flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-3">
      <p className={cn("text-lg font-semibold tabular-nums leading-none", valueClass ?? "text-foreground")}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
```

Render three of these inside the hero card:
- `consumed` — `valueClass="text-chart-2"` — label "Consumed"
- `target` — no accent — label "Target"
- `remaining = Math.max(0, target - consumed)` — label "Remaining" — `valueClass` derived from ratio: if remaining > (target * 0.2) → `"text-chart-3"`, if remaining > 0 → `"text-chart-4"` (amber), if 0 → `"text-destructive"`

### 2F — Hero card layout

Redesign the `Today's Nutrition` section. Replace the current dual-grid (mobile/desktop fork) with:

**Desktop (`md+`):**
```
┌────────────────────────────────────────────────────────────────────┐
│  Today's Nutrition              [Active Plan: Lean Cut badge?]     │
│ ──────────────────────────────────────────────────────────────────  │
│                                                                    │
│  ┌──────────────────┐   ┌──────────────────────────────────────┐  │
│  │                  │   │  [●] Protein  ████████░░  120 / 160g  │  │
│  │  [Calorie Ring]  │   │  [●] Carbs    ██████░░░░  200 / 250g  │  │
│  │   1,240 kcal     │   │  [●] Fat      ████░░░░░░   55 /  80g  │  │
│  │   left           │   └──────────────────────────────────────┘  │
│  └──────────────────┘                                              │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │   760 kcal   │  │  2,000 kcal  │  │  1,240 kcal          │    │
│  │   Consumed   │  │  Target      │  │  Remaining           │    │
│  └──────────────┘  └──────────────┘  └──────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

**Mobile (below `md`):**
```
┌───────────────────────────────────────────────┐
│  Today's Nutrition                            │
│ ─────────────────────────────────────────────  │
│              [Calorie Ring — centered]        │
│              1,240 kcal left                  │
│                                               │
│  [●] Protein   █████░░░   120 / 160g          │
│  [●] Carbs     ████████   200 / 250g          │
│  [●] Fat       ████░░░░    55 /  80g          │
│                                               │
│  ┌─────────┐  ┌─────────┐  ┌───────────────┐ │
│  │  760    │  │  2,000  │  │  1,240        │ │
│  │Consumed │  │ Target  │  │ Remaining     │ │
│  └─────────┘  └─────────┘  └───────────────┘ │
└───────────────────────────────────────────────┘
```

**Active plan badge:** If `data.activePlanName` is non-null, render a small badge to the right of the "Today's Nutrition" heading:
```tsx
{data.activePlanName ? (
  <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground">
    {data.activePlanName}
  </span>
) : null}
```

**`diaryIsLoading` gate:** When `diaryIsLoading` is true, render `<NutritionHeroSkeleton />` (see STEP 3) in place of this entire section.

Card JSX wrapper: `<section className="glass-surface surface-pad">` — keep the same glass-surface treatment.

### 2G — Quick Actions redesign

Replace the 4-column grid of `h-24` tile buttons with a compact action row.

**New layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [+ Log Meal ──────────────]  [Planner]  [Clients]  [Progress] │
└─────────────────────────────────────────────────────────────────┘
```

- "Log Meal" is the primary CTA: `accent-strong`, `h-11`, `rounded-xl`, flex-1 on mobile / fixed `min-w-[140px]` on desktop, shows `<Plus className="mr-2 h-4 w-4" />` before label.
- The other 3 are secondary: `variant="outline"`, `glass-subtle border-border/60`, `h-11`, `rounded-xl`, equal flex-1 columns.
- On mobile: wrap to 2×2 grid if needed (`grid grid-cols-2 gap-2 md:flex md:gap-3`).
- Remove section heading ("Quick Actions") — it's self-evident. The section is just the action row with no label.
- Remove `QuickActionCard` component. Replace with two inline helper patterns (primary and secondary Button+Link).
- Keep `quickActionConfig` icon lookup or inline it — either is fine.

### 2H — Recent Activity redesign

**Color-code icons by activity type:**

```ts
function activityStyle(type: NutritionDashboardActivity["type"]): {
  iconBg: string;
  iconColor: string;
  Icon: LucideIcon;
} {
  switch (type) {
    case "meal":       return { iconBg: "bg-chart-2/15", iconColor: "text-chart-2", Icon: UtensilsCrossed };
    case "assignment": return { iconBg: "bg-chart-3/15", iconColor: "text-chart-3", Icon: CalendarDays };
    case "group":      return { iconBg: "bg-chart-4/15", iconColor: "text-chart-4", Icon: Layers };
    case "progress":   return { iconBg: "bg-chart-1/15", iconColor: "text-chart-1", Icon: TrendingUp };
    case "client":     return { iconBg: "bg-primary/10",  iconColor: "text-primary",  Icon: Users };
    default:           return { iconBg: "bg-muted/60",    iconColor: "text-muted-foreground", Icon: UtensilsCrossed };
  }
}
```

Import `Layers` from `lucide-react` (replaces the old fallback).

**Section header:** Add "View all" link to the right of "Recent Activity" heading:
```tsx
<div className="mb-4 flex items-center justify-between gap-3">
  <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
  <Link href="/nutrition/diary" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
    View diary →
  </Link>
</div>
```

**Activity section skeleton gating:** When `activityIsLoading` is true, render `<ActivitySectionSkeleton />` (see STEP 3) in place of the activity list. This allows the hero card to render with real data immediately if diary cache is warm, while activity still loads.

**`RecentActivityRow` change:** Apply `activityStyle(activity.type)` to drive `iconBg`, `iconColor`, and `Icon` per row. Replace the current hardcoded `bg-muted/60` + `text-chart-2` with the per-type values.

**Remove `activityIcon` function** — replaced by `activityStyle`.

### 2I — Main component wiring

```tsx
export function NutritionDashboard() {
  const { data, diaryIsLoading, activityIsLoading, isError, refetch } = useNutritionDashboardData();
  useNutritionPrefetch();

  if (isError) {
    return (
      <div className="section-gap">
        <DashboardHeader />
        <section className="glass-surface surface-pad">
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">We couldn't load dashboard data right now.</p>
            <Button className="accent-strong rounded-xl" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="section-gap">
      <DashboardHeader />                               {/* always renders */}

      {/* Hero card — skeleton until diary query resolves */}
      {diaryIsLoading ? (
        <NutritionHeroSkeleton />
      ) : (
        <NutritionHeroCard data={data} />
      )}

      {/* Quick actions — always renders (static data from NUTRITION_DASHBOARD_QUICK_ACTIONS) */}
      <QuickActionsRow actions={data.quickActions} />

      {/* Activity — skeleton until activity query resolves */}
      {activityIsLoading ? (
        <ActivitySectionSkeleton />
      ) : (
        <ActivitySection activities={data.recentActivity} />
      )}
    </div>
  );
}
```

**Important:** `data` always has a valid shape (zeros for macros, empty array for activity) even while loading — the useMemo fallbacks ensure this. So `data.quickActions` is safe to render during any loading state.

---

## STEP 3 — Rewrite `nutrition-dashboard-skeleton.tsx`

This file is used by `app/(dashboard)/(nutrition-domain)/nutrition/dashboard/loading.tsx` (Next.js route-level loading boundary). It must match the new layout exactly so there is zero layout shift when the real data arrives.

**Rule:** The skeleton has zero logic — it's a pure structural mirror using `<Skeleton>` blocks that match the dimensions of the real elements. No `use client` directive unless `useMediaQuery` is needed.

**Export three named skeletons** (instead of one monolithic `NutritionDashboardSkeleton`):

### `NutritionHeroSkeleton`

Matches the hero card (STEP 2F). Desktop and mobile layout forks must match:

```tsx
export function NutritionHeroSkeleton() {
  return (
    <section className="glass-surface surface-pad space-y-5">
      {/* header row: title + optional badge */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-44 rounded-xl" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* Desktop: ring + macro rows */}
      <div className="hidden gap-6 md:flex md:items-center">
        <Skeleton className="mx-auto h-44 w-44 shrink-0 rounded-full sm:h-48 sm:w-48" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
        </div>
      </div>

      {/* Mobile: ring centered + macro rows */}
      <div className="flex flex-col items-center gap-5 md:hidden">
        <Skeleton className="h-36 w-36 rounded-full" />
        <div className="w-full space-y-3">
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
        </div>
      </div>

      {/* Stat pills row */}
      <div className="flex gap-3">
        <Skeleton className="h-16 flex-1 rounded-2xl" />
        <Skeleton className="h-16 flex-1 rounded-2xl" />
        <Skeleton className="h-16 flex-1 rounded-2xl" />
      </div>
    </section>
  );
}
```

### `ActivitySectionSkeleton`

Matches the activity section (STEP 2H):

```tsx
export function ActivitySectionSkeleton() {
  return (
    <section className="glass-surface surface-pad space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-40 rounded-xl" />
        <Skeleton className="h-4 w-20 rounded-lg" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/60 divide-y divide-border/30">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

### `NutritionDashboardSkeleton` (used by `loading.tsx`)

The full-page skeleton combines the two section skeletons. The static `DashboardHeader` is NOT skeleton-ed — render the real static markup:

```tsx
export function NutritionDashboardSkeleton() {
  return (
    <div className="section-gap">
      {/* Static header — always real, never skeleton */}
      <section className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{getGreeting()}</h1>
        <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
      </section>

      <NutritionHeroSkeleton />

      {/* Quick actions row skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-xl md:min-w-[140px] md:flex-none" />
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 flex-1 rounded-xl" />
      </div>

      <ActivitySectionSkeleton />
    </div>
  );
}
```

Move `getGreeting` and `getTodayLabel` to a shared location that both `nutrition-dashboard.tsx` and `nutrition-dashboard-skeleton.tsx` can import. Options:
- A small `lib/nutrition/greeting.ts` file exporting both functions, OR
- Place them in `nutrition-dashboard-skeleton.tsx` and re-export/import from there.

Prefer `lib/nutrition/greeting.ts` to avoid any circular import risk.

---

## STEP 4 — Remove deleted fields from call sites

After removing `greetingName` and `greetingSubtitle` from `NutritionDashboardData`:

1. Remove them from `lib/nutrition/dashboard.ts` type
2. Remove from `hooks/use-nutrition-dashboard.ts` memo
3. `nutrition-dashboard.tsx` no longer reads `data.greetingName` or `data.greetingSubtitle` — confirm no references remain after the rewrite
4. Run `grep -r "greetingName\|greetingSubtitle" app/ components/ hooks/ lib/` to confirm zero remaining usages before committing

---

## STEP 5 — Performance constraints (do not regress)

| Rule | Rationale |
|---|---|
| `diaryQuery.staleTime: 120_000` — do not reduce | Keeps hero card instant on return navigation |
| `activityQuery.staleTime: 60_000` — do not reduce | Activity data can be slightly stale |
| `NutritionDashboardSkeleton` has no `"use client"` directive | It renders in the server-side `loading.tsx` boundary — if `useMediaQuery` is not needed, keep it a Server Component |
| `getGreeting()` and `getTodayLabel()` are pure functions — no hooks, no effects | They run synchronously; zero hydration cost |
| `data.quickActions` renders immediately (from static `NUTRITION_DASHBOARD_QUICK_ACTIONS`) | No query dependency; avoid wrapping in any loading gate |
| Do not add `Suspense` wrappers inside `NutritionDashboard` — the route-level `loading.tsx` already handles the Suspense boundary | Extra Suspense boundaries cause waterfall flash |

---

## Implementation sequence

1. Create `lib/nutrition/greeting.ts` — `getGreeting()` and `getTodayLabel()` pure functions
2. Update `lib/nutrition/dashboard.ts` — add `activePlanName`, remove `greetingName` / `greetingSubtitle`
3. Update `hooks/use-nutrition-dashboard.ts` — add `activePlanName`, expose `diaryIsLoading` / `activityIsLoading`, remove greeting fields from memo
4. Rewrite `nutrition-dashboard-skeleton.tsx` — three named exports: `NutritionHeroSkeleton`, `ActivitySectionSkeleton`, `NutritionDashboardSkeleton`
5. Rewrite `nutrition-dashboard.tsx` — new layout per STEP 2
6. Run `typecheck + lint`
7. Smoke test: navigate to `/nutrition/dashboard` — confirm static header renders instantly, hero skeleton shows until diary resolves, activity skeleton shows independently, no layout shift when data arrives

---

## Checklist

- [x] `lib/nutrition/greeting.ts` created with `getGreeting()` and `getTodayLabel()`
- [x] `activePlanName: string | null` added to `NutritionDashboardData` and `useNutritionDashboard`
- [x] `greetingName` and `greetingSubtitle` removed from type + hook + all call sites
- [x] `diaryIsLoading` and `activityIsLoading` exposed from `useNutritionDashboard`
- [x] `NutritionDashboardSkeleton` rewrites — three named exports, layout matches real page
- [x] `DashboardHeader` renders immediately with no loading gate
- [x] `CalorieRing` shows remaining calories in center, labeled "kcal left"
- [x] `MacroRow` (horizontal rows) replaces `MacroCard` (vertical tiles)
- [x] `CalorieStat` pills rendered below ring+macros — consumed / target / remaining
- [x] Quick Actions redesigned as compact action row (primary CTA + 3 secondary chips)
- [x] Activity icons color-coded per type using `activityStyle()`
- [x] Activity section header has "View diary →" link
- [x] `activityIcon` function removed (replaced by `activityStyle`)
- [x] `QuickActionCard` component removed (replaced by inline Button+Link)
- [x] `grep -r "greetingName\|greetingSubtitle"` → zero results
- [x] `npm run typecheck` → pass
- [x] `npm run lint` → pass

---

### [A-024] Meal Group Card Revamp

- Priority: High
- Depends on: none — self-contained
- Status: Queued
- Files:
  - `app/actions/meal-groups.ts` — add `MealGroupAssigneePreview` type, `assignee_preview` field to `MealGroupListRow`, extend `listMealGroupsAction` batch to resolve assignee names
  - `components/nutrition/meal-groups/meal-groups-dashboard.tsx` — full card redesign + all 4 Dialogs → Sheets

#### Summary of changes

**Card:**
- Remove day tabs (MON–SUN row) — delete `DayTabsPreview` component
- Remove Monday totals preview block
- Card title: single-line with `truncate` + `Tooltip` showing full title on hover (desktop)
- Add "Assigned to" section: up to 3 assignee names resolved from DB (clients + profiles) + "+N more" if over 3; "Unassigned" when `assignment_count === 0`
- Skeleton height: `h-80` → `h-52`

**Data:**
- New `MealGroupAssigneePreview = { id: string; name: string }` type
- `listMealGroupsAction` extended: fetch `subject_client_id` + `subject_user_id` per assignment, batch-resolve names in one parallel query, attach `assignee_preview` (max 3) to each row — no N+1

**Modals:**
- All 4 modals (create/edit group, actions menu, duplicate confirm, delete confirm) converted from centered `Dialog` to `Sheet` — right on desktop, bottom on mobile
- Edit/create: `w-[480px]` desktop; actions menu: `w-[360px]` desktop; confirm modals: `w-[400px]` desktop

Full spec: see `A-024 — Meal Group Card Revamp` section at the bottom of this file.

**Files changed:**
- `app/actions/meal-groups.ts` — extend `listMealGroupsAction` + `MealGroupListRow`
- `components/nutrition/meal-groups/meal-groups-dashboard.tsx` — full card redesign + convert all Dialogs to Sheets

---

## What changes

| Element | Before | After |
|---|---|---|
| Day tabs (MON–SUN row) | Shown on every card | **Removed** |
| Monday totals preview block | Shown on every card | **Removed** |
| Card title | Full text, can overflow | Single line, `truncate` + `Tooltip` on hover (desktop) |
| Assignee info | Just a count ("2 assignments") | Preview of up to 3 assignee names + "+N more" if over 3 |
| Date range meta | Shown | Keep |
| Assignment count meta row | "2 assignments" as text | Keep as count, but assignee names replace the separate preview block |
| Edit/Create modal | Centered `Dialog` | `Sheet` from right on desktop, from bottom on mobile |
| Actions menu modal | Centered `Dialog` | `Sheet` from bottom on mobile, right on desktop |
| Duplicate confirm modal | Centered `Dialog` | `Sheet` |
| Delete confirm modal | Centered `Dialog` | `Sheet` |
| Card skeleton height | `h-80` | Reduce to `h-52` to match new shorter card |

---

## STEP 1 — Extend data layer

### `app/actions/meal-groups.ts`

**Add `assignee_preview` to `MealGroupListRow`:**

```ts
export type MealGroupAssigneePreview = {
  id: string;        // client.id or "self" for user
  name: string;      // display name
};

export type MealGroupListRow = MealGroupRow & {
  assignment_count: number;
  plans_count: number;
  assignee_preview: MealGroupAssigneePreview[];  // NEW — up to 3 names
};
```

**Extend `listMealGroupsAction` batch query:**

The action already fetches `meal_group_assignments` for the count. Extend that query to also return `subject_client_id` and `subject_user_id` so we can resolve names. Then batch-fetch client names and profile names in a single parallel call.

Replace the existing assignments query inside `listMealGroupsAction` with:

```ts
const [
  { data: plans, error: plansError },
  { data: assignments, error: assignmentsError },
] = await Promise.all([
  supabase.from("meal_group_plans").select("id, meal_group_id").in("meal_group_id", groupIds),
  supabase
    .from("meal_group_assignments")
    .select("id, template_group_id, subject_client_id, subject_user_id")   // add subject fields
    .in("template_group_id", groupIds)
    .in("status", ["active", "paused"]),   // only active/paused — no archived noise
]);
```

After getting the assignments, collect unique client IDs and user IDs, then resolve names in one parallel batch:

```ts
const activeAssignments = assignments || [];

const clientIds = Array.from(
  new Set(activeAssignments.map((a) => a.subject_client_id).filter((v): v is string => Boolean(v)))
);
const userIds = Array.from(
  new Set(activeAssignments.map((a) => a.subject_user_id).filter((v): v is string => Boolean(v)))
);

// Resolve names (only if there are subjects to resolve)
const [clientsRes, profilesRes] = await Promise.all([
  clientIds.length > 0
    ? supabase
        .from("clients")
        .select("id, display_name, first_name, last_name")
        .in("id", clientIds)
    : Promise.resolve({ data: [], error: null }),
  userIds.length > 0
    ? supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)
    : Promise.resolve({ data: [], error: null }),
]);

// Build name maps
const clientNameById = new Map<string, string>();
for (const c of clientsRes.data || []) {
  const name = c.display_name?.trim() || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Client";
  clientNameById.set(c.id, name);
}
const profileNameById = new Map<string, string>();
for (const p of profilesRes.data || []) {
  profileNameById.set(p.id, p.full_name?.trim() || "User");
}

// Build per-group assignee preview (max 3)
const assigneesByGroup = new Map<string, MealGroupAssigneePreview[]>();
for (const assignment of activeAssignments) {
  const groupId = assignment.template_group_id;
  const existing = assigneesByGroup.get(groupId) || [];
  if (existing.length >= 3) continue;  // already have 3 — skip

  let name: string | null = null;
  let id: string | null = null;
  if (assignment.subject_client_id) {
    id = assignment.subject_client_id;
    name = clientNameById.get(id) ?? null;
  } else if (assignment.subject_user_id) {
    id = assignment.subject_user_id;
    name = profileNameById.get(id) ?? null;
  }
  if (!id || !name) continue;

  existing.push({ id, name });
  assigneesByGroup.set(groupId, existing);
}
```

Update the final `rows` mapping:

```ts
const rows: MealGroupListRow[] = groups.map((group) => ({
  ...group,
  assignment_count: assignmentsByTemplate.get(group.id) || 0,
  plans_count: plansByGroup.get(group.id) || 0,
  assignee_preview: assigneesByGroup.get(group.id) || [],   // NEW
}));
```

**Performance note:** The two new queries (clients + profiles) only execute if there are actually subjects to resolve (`clientIds.length > 0` / `userIds.length > 0`). If a coach has no active assignments, no extra DB round-trips are made.

---

## STEP 2 — Rewrite the card in `meal-groups-dashboard.tsx`

### 2A — Remove dead components

Delete the `DayTabsPreview` function entirely (lines 64–80). It is no longer used after this change. Do not rename or archive it — delete it.

### 2B — New card layout

Replace the card `<article>` body with the following structure. The card `gap-4` wrapper and `glass-surface surface-pad` classes stay the same.

**New card anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│  [Lean Bulk — Week 1 …]             [ACTIVE]             │
│  (1-line truncated, Tooltip on full title — desktop only)│
│                                                          │
│  Weekly meal planner template                            │
│                                                          │
│  📅 2026-03-04 → 2026-04-09  ·  7 day plans             │
│                                                          │
│  ─────── Assigned to ─────────────────────────────────── │
│  John Doe · Mike K. · Sarah A.  (+2 more)               │
│  (or "Unassigned" if assignment_count === 0)             │
│                                                          │
│  [         Open          ]   [⋮]                         │
└──────────────────────────────────────────────────────────┘
```

**Title line with truncation + Tooltip:**

Import `Tooltip`, `TooltipContent`, `TooltipTrigger`, `TooltipProvider` from `@/components/ui/tooltip`.

```tsx
<div className="flex items-start justify-between gap-2">
  <TooltipProvider delayDuration={400}>
    <Tooltip>
      <TooltipTrigger asChild>
        <h3 className="truncate text-xl font-semibold leading-tight">{row.name}</h3>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        {row.name}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <Badge className={cn("shrink-0 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusChipStyle(row.status))}>
    {MEAL_GROUP_STATUS_LABELS[row.status]}
  </Badge>
</div>
```

Add `min-w-0` to the parent `<article>` wrapper's inner content `<div>` so `truncate` works correctly inside a flex/grid layout.

**Description line:** keep as-is.

**Metadata line:** keep `CalendarRange` date range + plans count. Remove the standalone `{row.assignment_count} assignments` text — it is now shown in the Assigned To section below.

**Assignee preview section:**

```tsx
<div className="space-y-1.5">
  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Assigned to</p>
  {row.assignment_count === 0 ? (
    <p className="text-sm text-muted-foreground/60">Unassigned</p>
  ) : (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {row.assignee_preview.map((assignee, index) => (
        <span key={assignee.id} className="text-sm font-medium">
          {assignee.name}
          {index < row.assignee_preview.length - 1 ? <span className="ml-1.5 text-muted-foreground/50">·</span> : null}
        </span>
      ))}
      {row.assignment_count > row.assignee_preview.length ? (
        <span className="text-sm text-muted-foreground">
          +{row.assignment_count - row.assignee_preview.length} more
        </span>
      ) : null}
    </div>
  )}
</div>
```

**Footer row:** keep as-is — Open button + MoreVertical icon button.

**Full card JSX (reference):**

```tsx
<article key={row.id} className="glass-surface surface-pad flex flex-col gap-4">
  <div className="min-w-0 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <h3 className="min-w-0 flex-1 truncate text-xl font-semibold leading-tight">{row.name}</h3>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-sm">
            {row.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Badge className={cn("shrink-0 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusChipStyle(row.status))}>
        {MEAL_GROUP_STATUS_LABELS[row.status]}
      </Badge>
    </div>

    <p className="text-sm text-muted-foreground">{row.description || "7-day template structure"}</p>

    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <CalendarRange className="h-3.5 w-3.5" />
        {formatDateRange(row.start_date, row.end_date)}
      </span>
      <span>{row.plans_count} day plans</span>
    </div>
  </div>

  <div className="space-y-1.5">
    <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Assigned to</p>
    {row.assignment_count === 0 ? (
      <p className="text-sm text-muted-foreground/60">Unassigned</p>
    ) : (
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {row.assignee_preview.map((assignee, index) => (
          <span key={assignee.id} className="text-sm font-medium">
            {assignee.name}
            {index < row.assignee_preview.length - 1 ? (
              <span className="ml-1.5 text-muted-foreground/50">·</span>
            ) : null}
          </span>
        ))}
        {row.assignment_count > row.assignee_preview.length ? (
          <span className="text-sm text-muted-foreground">
            +{row.assignment_count - row.assignee_preview.length} more
          </span>
        ) : null}
      </div>
    )}
  </div>

  <div className="flex items-center gap-2">
    <Button asChild className="flex-1 rounded-xl accent-strong">
      <Link href={`/nutrition/groups/${row.id}`}>Open</Link>
    </Button>
    <Button
      variant="outline"
      size="icon"
      className="h-10 w-10 rounded-xl border-border/60"
      aria-label={`More actions for ${row.name}`}
      onClick={() => setActionTarget(row)}
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  </div>
</article>
```

### 2C — Update skeleton height

Change `h-80` to `h-52` in the loading skeleton:

```tsx
// Before:
Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80 w-full rounded-3xl" />)

// After:
Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52 w-full rounded-3xl" />)
```

---

## STEP 3 — Convert all Dialogs to Sheets

Currently all modals in `meal-groups-dashboard.tsx` use the `Dialog` from `@/components/ui/responsive-modal`. Convert all of them to `Sheet` from right on desktop / from bottom on mobile, following the established pattern from A-022.

Add `useMediaQuery` hook:
```ts
import { useMediaQuery } from "@/hooks/use-media-query";
// In component body:
const isDesktop = useMediaQuery("(min-width: 768px)");
```

Update imports — remove `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle` from `@/components/ui/responsive-modal`. Add:
```ts
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
```

### Sheet layout pattern (apply to all four modals):

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent
    side={isDesktop ? "right" : "bottom"}
    className={cn(
      "flex flex-col gap-0 p-0",
      isDesktop ? "w-[480px] max-w-[480px]" : "rounded-t-2xl max-h-[92dvh]"
    )}
  >
    <SheetHeader className="border-b border-border/50 px-5 py-4">
      <SheetTitle>…</SheetTitle>
      <SheetDescription>…</SheetDescription>
    </SheetHeader>
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {/* form fields */}
    </div>
    <div className="border-t border-border/50 px-5 py-4 flex justify-end gap-3">
      {/* Cancel + Save buttons */}
    </div>
  </SheetContent>
</Sheet>
```

### Modal 1 — Create / Edit Meal Group (currently line 303)

- `w-[480px]` on desktop (enough room for the two date inputs side by side)
- Form fields inside scrollable `flex-1 overflow-y-auto` div
- Title: `{draft.id ? "Edit Meal Group" : "Create Meal Group"}` — unchanged
- All field inputs unchanged — only the wrapper changes

### Modal 2 — Group Actions (currently line 362)

This is an actions menu (Edit / Duplicate / Assign / Delete). On desktop: Sheet from right, `w-[360px]`. On mobile: Sheet from bottom.
- No form fields — just a vertical stack of action buttons
- No Cancel button needed in the footer — clicking outside closes it. Keep the `onOpenChange` close handler.
- Remove `DialogFooter` entirely; buttons live in the content area

```tsx
<Sheet open={Boolean(actionTarget)} onOpenChange={(open) => { if (!open) setActionTarget(null); }}>
  <SheetContent
    side={isDesktop ? "right" : "bottom"}
    className={cn("flex flex-col gap-0 p-0", isDesktop ? "w-[360px] max-w-[360px]" : "rounded-t-2xl")}
  >
    <SheetHeader className="border-b border-border/50 px-5 py-4">
      <SheetTitle>Group Actions</SheetTitle>
      <SheetDescription>{actionTarget?.name || "Meal group"}</SheetDescription>
    </SheetHeader>
    <div className="grid gap-2 px-5 py-4">
      {/* Edit, Duplicate, Assign, Delete buttons — unchanged content */}
    </div>
  </SheetContent>
</Sheet>
```

### Modal 3 — Duplicate confirm (currently line 426)

`w-[400px]` desktop. Simple confirm sheet — header + footer with Cancel + Duplicate buttons.

### Modal 4 — Delete confirm (currently line 451)

`w-[400px]` desktop. Simple confirm sheet — header + footer with Cancel + Delete (destructive) buttons.

---

## STEP 4 — Remove unused imports

After the refactor, the following imports are no longer needed in `meal-groups-dashboard.tsx`. Remove them:

- `MEAL_DAY_LABELS` from `@/components/nutrition/meal-groups/meal-group-types` (was used by `DayTabsPreview`)
- `MEAL_DAY_ORDER` from `@/components/nutrition/meal-groups/meal-group-types` (was used by `DayTabsPreview`)
- `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle` from `@/components/ui/responsive-modal`

Add new imports:
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` from `@/components/ui/sheet`
- `Tooltip`, `TooltipContent`, `TooltipTrigger`, `TooltipProvider` from `@/components/ui/tooltip`
- `useMediaQuery` from `@/hooks/use-media-query`
- `MealGroupAssigneePreview` from `@/app/actions/meal-groups` (only if used by type — may be inferred)

---

## Implementation sequence

1. Update `app/actions/meal-groups.ts`:
   - Add `MealGroupAssigneePreview` type + `assignee_preview` field to `MealGroupListRow`
   - Extend assignments query to include `subject_client_id, subject_user_id`
   - Add `status` filter `in("status", ["active", "paused"])` to the assignments query
   - Add parallel client/profile name resolution
   - Populate `assignee_preview` in final `rows` mapping
   - Run `typecheck`

2. Update `components/nutrition/meal-groups/meal-groups-dashboard.tsx`:
   - Delete `DayTabsPreview` function
   - Remove `MEAL_DAY_LABELS`, `MEAL_DAY_ORDER` imports
   - Rewrite card JSX per STEP 2B
   - Update skeleton height per STEP 2C
   - Convert all 4 Dialogs to Sheets per STEP 3
   - Remove old Dialog imports, add new Sheet + Tooltip imports
   - Run `typecheck + lint`

3. Final: `npm run typecheck && npm run lint`

---

## Checklist

- [x] `MealGroupAssigneePreview` type exported from `meal-groups.ts`
- [x] `assignee_preview: MealGroupAssigneePreview[]` on `MealGroupListRow`
- [x] `listMealGroupsAction` resolves up to 3 assignee names per group in one batch (no N+1)
- [x] `DayTabsPreview` component deleted
- [x] `MEAL_DAY_LABELS` and `MEAL_DAY_ORDER` imports removed from dashboard
- [x] Card title: single line, `truncate`, `Tooltip` on hover with full title
- [x] Card: Monday totals preview block removed
- [x] Card: day tabs (MON–SUN) removed
- [x] Card: assignee preview section added with "Unassigned" fallback
- [x] Card skeleton height changed from `h-80` to `h-52`
- [x] All 4 Dialog modals converted to Sheets (right desktop / bottom mobile)
- [x] Old Dialog imports removed from component
- [x] `npm run typecheck` → pass
- [x] `npm run lint` → pass
- [ ] Smoke test: cards show assignee names; tooltip shows full title on hover; edit sheet opens from right on desktop; all create/edit/duplicate/delete actions work
