# Cleanup Report — 2026-03-09

## Phase 1 Audit Summary

### Tooling used
- `knip` for static unused exports/types/functions inventory
- `rg` for cross-reference validation
- custom table-reference scan across `app/`, `components/`, `hooks/`, `lib/`, `stores/`, `utils/`, `scripts/`, and `supabase/migrations`

### Candidate findings (before cleanup)
- Unused exports/functions/types were reported across:
  - `app/actions/*`
  - `hooks/*`
  - `lib/*`
  - `stores/*`
  - `components/ui/*` export surface
- Unused/weakly linked route candidate:
  - `/admin/system` appeared unlinked from in-app route strings (kept; direct admin route can still be valid)
- Unused file candidates from naive import graph:
  - `components/nutrition/download-nutrition-button.tsx`
  - `components/support/comment-composer.tsx`
  - `components/workout/workout-pdf-document.tsx`
  - `lib/ai/openai.ts`
  - `utils/env/index.ts`
  - Result: retained after deeper check (dynamic imports, script entrypoint, and side-effect imports)

### Database usage audit
- Parsed 43 typed tables from `types/database.ts`
- Cross-checked references in runtime code + migrations
- Result:
  - **0 tables** with zero references
  - **0 tables** with only trivial references
- Column-level hard-delete candidates were **not** considered safe due broad `select("*")` usage and shared table reuse across multiple domains/actions.

## Phase 2 Safe Code Cleanup Applied

### Removed dead server/action paths and stale query keys
- Removed unused action `listMealPlansAction` and its schema.
- Removed unused action `listRecentMealItemsAction` and its schema/type.
- Removed now-dead query key paths:
  - `nutritionKeys.recent`
  - `nutritionKeys.recentList`
  - `nutritionKeys.plansList`

### Removed unused hooks/selectors/exports
- Removed unused hooks:
  - `useNutritionDiaryData`
  - `useNutritionSharedQueries`
  - `useRecentMealItems`
- Removed unused Zustand selectors:
  - `useNutritionDiaryFilters`
  - `useNutritionPlannerFilters`
  - `useSetNutritionPlannerFilters`
  - `useNutritionViewMode`
  - `useNutritionNavigationSource`
- Reduced unused export surface for internal-only types/utils in several files.
- Pruned unused UI primitive exports/components from:
  - `components/ui/alert-dialog.tsx`
  - `components/ui/avatar.tsx`
  - `components/ui/badge.tsx`
  - `components/ui/calendar.tsx`
  - `components/ui/card.tsx`
  - `components/ui/command.tsx`
  - `components/ui/dialog.tsx`
  - `components/ui/dropdown-menu.tsx`
  - `components/ui/form.tsx`
  - `components/ui/popover.tsx`
  - `components/ui/responsive-modal.tsx`
  - `components/ui/scroll-area.tsx`
  - `components/ui/select.tsx`
  - `components/ui/sheet.tsx`
  - `components/ui/sidebar.tsx`
  - `components/ui/table.tsx`
  - `components/ui/tabs.tsx`

### Internalized unused exported types/functions
- Converted multiple unused exported types/functions to internal (non-exported) declarations where usage was file-local.
- Removed truly unused helper functions from auth role module.

## Phase 3/4 Database Cleanup Decision

### Why no destructive DB migration was generated
- No table met safe-drop criteria:
  - all tables are referenced in code and/or migrations
- Column-level removals were not safe to automate due:
  - widespread wildcard selects
  - shared cross-feature tables
  - inability to prove production nullability/usage without live DB telemetry + contract review

## Validation
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run test` passed

## Deferred High-Risk Candidates
- `types/database.ts` generated helper exports (`Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`, `Constants`) retained intentionally.
- `pako` shows as unused in static analysis but dependency cleanup was explicitly out-of-scope for this task.
