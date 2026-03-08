# Client Portal UX Pattern Checklist

This checklist was used for the Client Portal implementation, based on patterns from TrueCoach, Trainerize/Everfit, and MyFitnessPal manual diary flows.

## Layout and navigation
- Keep the client portal focused on daily execution: `today`, `next session`, `tasks`, and `logs`.
- Keep module navigation flat and visible at the top to reduce taps.
- Hide disabled modules from navigation to avoid dead-end clicks.
- Show read-only status clearly with a persistent banner when module access is `read_only`.

## Logging workflows
- Workout logging: one fast form with date, slot, and location, then history table.
- Training plan progression: clear pending/completed state with one-tap log action.
- Nutrition diary: meal slots by type (breakfast/lunch/dinner/snacks/other).
- Nutrition actions: quick add, copy from date, recent items, and favorites.
- Steps tracking: one day at a time with explicit date and save.

## Coach-controlled delivery
- Coach configures credentials and module-level access from one access tab.
- Coach creates tasks and controls note visibility (`private` vs `visible_to_client`).
- Client only sees notes explicitly marked visible.

## Feedback and reliability
- Show loading skeletons for every module view.
- Use immediate toast feedback for save/update actions.
- Keep empty states explicit (no tasks, no workouts, no plan).
- Keep all access checks server-side in layout/page guards and write actions.

