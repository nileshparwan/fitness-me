# Nutrition Progress Handoff (Implementation + Proposal)

**Date:** March 20, 2026  
**Owner:** Engineer (Codex)  
**Audience:** Architect (Claude) for GO / sequencing

## 1) Completed Implementation Recap (already shipped)

### Step 1: A-025 baseline implementation
- Replaced legacy nutrition progress action and UI with `meal_logs` + `meal_log_items`-driven analytics.
- Added full sectioned progress page with:
  - range controls,
  - stats,
  - daily calories,
  - macros vs targets,
  - fiber,
  - compliance score,
  - meal breakdown,
  - top foods,
  - deficit/surplus,
  - day-of-week analysis,
  - daily detail table,
  - logging calendar,
  - meal timing,
  - macro distribution,
  - micronutrient placeholder.

### Step 2: Visual/performance parity pass
- Aligned visuals to reference direction:
  - dark surface hierarchy,
  - explicit chart color palette,
  - improved controls/header composition.
- Improved render performance by disabling chart animation where appropriate.
- Kept non-blocking loading with section skeletons and `keepPreviousData`.

### Step 3: Chart stability + readability hardening
- Removed bright hover overlays from charts.
- Forced tooltip text contrast for dark backgrounds.
- Replaced risky SVG color expressions with explicit hex constants to avoid black fallback rendering.

### Step 4: Compare switch implementation
- Removed non-functional `All Training` dropdown.
- Implemented compare mode:
  - fetches previous period of equal length,
  - aligns by day offset,
  - overlays dashed previous-period lines on calories and macro charts.

### Step 5: UX polish
- Improved macro distribution presentation.
- Improved logging calendar low-signal contrast (`logged_no_target`, `not_logged`).
- Revamped insights layout to reduce “card everywhere” density.

## 2) Current State Audit (what the app does today)

## 2.1 Compliance
- There is a **compliance score**, not a separate “compliance store.”
- Compliance is computed server-side in `app/actions/nutrition-progress.ts` on read.
- Rule currently used:
  - day is compliant when intake is within ±15% of target for calories, protein, carbs, and fat.
- Overall compliance = average of per-macro/per-calorie compliance percentages.

## 2.2 Target source used for compliance
- Targets are read from active `fitness_goals` (`daily_calories`, `protein_target`, `carbs_target`, `fat_target`).
- If no active goal exists, target source = `none`, compliance appears as not target-driven.

## 2.3 Micronutrient tracking
- Not implemented in nutrition tracking pipeline yet.
- UI currently shows explicit placeholder indicating micronutrient tracking is not connected.
- Existing meal item schema primarily stores macros/fiber, not a full micronutrient profile.

## 3) Competitive Research (for architecture direction)

## 3.1 MyFitnessPal (goal customization + target history behavior)
- Users can customize macro and additional nutrient goals.
- Macro goals can be percent-based; higher-control options allow gram-level precision.
- Goal changes affect current/future logs, not historical goals by default.
- Sources:
  - https://support.myfitnesspal.com/hc/en-us/articles/360032274432-Can-I-customize-my-nutritional-goals
  - https://support.myfitnesspal.com/hc/en-us/articles/360032624071-Can-I-change-my-calorie-goal-without-affecting-my-historical-entries
  - https://support.myfitnesspal.com/hc/en-us/articles/360032272532-What-is-the-Nutrient-Dashboard-feature-of-MyFitnessPal-Premium

## 3.2 Cronometer (micronutrient targets + scores + contributors)
- Supports customizable macro and micronutrient targets, including min/max thresholds.
- Provides nutrition score groups (vitamins, minerals, electrolytes, etc.).
- Shows top nutrient contributors and data quality context.
- Sources:
  - https://support.cronometer.com/hc/en-us/articles/360060170532-Nutrient-Targets
  - https://support.cronometer.com/hc/en-us/articles/360018069532-Nutrient-Targets-Summary
  - https://support.cronometer.com/hc/en-us/articles/360042110112-Nutrition-Scores
  - https://support.cronometer.com/hc/en-us/articles/44414065586836-How-are-Nutrition-Scores-calculated
  - https://support.cronometer.com/hc/en-us/articles/360000329986-Are-there-nutrients-missing-from-Cronometer

## 3.3 MacroFactor (check-in loop + adaptive coaching)
- Uses recurring check-ins and coaching modules to adjust targets over time.
- Prioritizes adherence-aware guidance and low-friction periodic updates.
- Source:
  - https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules

## 4) Proposed Implementation (requires architect GO)

## Phase A — Macro compliance correctness + scalability

### Step A1: Effective-date target history
- Add table `nutrition_target_history`:
  - `id`
  - `subject_user_id` / `subject_client_id`
  - `source_type` (`fitness_goal`, `plan_assignment`, `manual_override`)
  - `calories`, `protein_g`, `carbs_g`, `fat_g`
  - `effective_from`, `effective_to` (nullable open-ended)
  - `created_by_user_id`, `created_at`
- Why:
  - per-day compliance should use target active on that day, not only current target.

### Step A2: Target precedence contract
- Resolve targets per day in this order:
  1. daily manual override,
  2. active assignment/plan target,
  3. fitness goal target,
  4. none.
- Persist the resolved source to aid debugging and UI tooltips.

### Step A3: Daily compliance fact table
- Add `daily_macro_compliance`:
  - subject/date key,
  - resolved targets,
  - actuals,
  - per-metric compliance flags,
  - overall day compliance,
  - `basis` metadata (`complete_log`, `partial_log`, `missing_target`).
- Update via worker/event on meal log mutations.
- Keep progress page read path cheap and deterministic.

### Step A4: UX updates
- Add explanation tooltip on compliance: tolerance and data basis.
- Add “partial log” handling to avoid false-compliance from incomplete diaries.

### Step A5: Acceptance criteria
- Historical target changes do not retroactively distort prior-day compliance.
- Compare mode and trends remain stable after target updates.
- Query count and page latency stay within current budget.

## Phase B — Micronutrient tracking foundation

### Step B1: Data model
- Add `food_nutrient_profiles` (reference per 100g / per serving).
- Add `meal_log_item_nutrients` (snapshot per logged item at log time).
- Add `daily_nutrient_totals` (subject/date aggregate).
- Add `nutrition_nutrient_targets` (subject, nutrient, min/max, effective dates).

### Step B2: Ingestion model
- Resolve nutrient profile when item is logged (provider or curated source).
- Snapshot nutrient values into `meal_log_item_nutrients` (immutability for historical consistency).

### Step B3: Aggregation
- Worker computes `daily_nutrient_totals` incrementally on meal item create/update/delete.
- Materialize weekly/monthly rollups as needed for charts.

### Step B4: Scoring (Cronometer-style, simplified v1)
- Add grouped scores:
  - Vitamins,
  - Minerals,
  - Electrolytes,
  - All Targets.
- Score rule:
  - hit minimum and stay below maximum = full contribution.
- Show top contributing foods for low/high nutrients.

### Step B5: Coach + user workflows
- Coach can set/override micronutrient targets per client.
- User sees daily adherence and deficiencies.
- Coach dashboard highlights at-risk nutrients across client roster.

### Step B6: Performance + safety
- Read from aggregate tables, not raw joins, on dashboard routes.
- Keep RLS subject-scoped exactly like current nutrition domain.

## Phase C — Rollout sequence
- Migration set 1: target history + daily compliance facts.
- App release 1: compliance read path switched to fact table.
- Migration set 2: micronutrient tables.
- App release 2: micronutrient capture + aggregates.
- App release 3: micronutrient UI and coach controls.

## 5) Architect GO decisions needed
- Approve target precedence order (A2).
- Approve whether compliance facts are computed synchronously or worker-first.
- Approve micronutrient source strategy:
  - internal curated DB only (v1), or
  - external provider integration in v1.
- Approve v1 score groups for micronutrients.
