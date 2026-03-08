# Manual Meal Tracking UX Checklist

Based on a UI pattern review of Strava, MyFitnessPal, Strong/Hevy, Fitbit/Garmin, and Trainerize/TrueCoach product surfaces, this implementation follows:

1. Daily diary-first layout
- Date picker at top.
- Sections grouped by meal type (`breakfast`, `lunch`, `dinner`, `snacks`, `other`).
- Fast read of per-meal totals and day totals.

2. Lowest-friction manual logging
- Primary `Add Item` flow with item name + optional macros.
- `Quick Add` flow for macro/calorie-only entries.
- Minimal required fields for speed.

3. Reuse patterns that reduce repeated typing
- `Recent Items` panel (last logged item templates).
- `Favorites` panel (saved templates).
- `Copy yesterday` and `Copy from date` utilities.

4. Targets vs actual visibility
- Daily calorie/macro progress bars only when an active plan exists.
- Total-only mode when no active plan exists.

5. Coach/client operational view
- Same diary UX for client nutrition logging.
- Client 7-day adherence summary card.
- Plan assignment from coach template to client snapshot.

6. Mobile + desktop behavior
- Compact controls.
- Scroll-safe tables.
- No heavy chart dependencies; lightweight bars only.

7. Scope guardrails (manual-only for this phase)
- No barcode scanning.
- No receipt import.
- No photo recognition.
- No external food database integration.
- No automated nutrient extraction.

8. Meal group planner patterns
- Weekly template structure (`meal_group`) with fixed 7-day plans (`mon..sun`).
- Day segmented control for fast switching between weekday plans.
- Meal item rows with icon-only visual language (no food photos).
- Manual macro calibration using slider + numeric input, with small preset nudges.
