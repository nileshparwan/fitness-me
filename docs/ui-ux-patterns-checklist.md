# Fitness Product UI/UX Patterns Checklist

## Research sources
- Strava product patterns: activity feed summaries, segmented analysis views, and quick activity actions.
- MyFitnessPal product patterns: fast food logging, progressive nutrition detail, daily goal bars.
- Strong/Hevy patterns: set-by-set rapid logging, low-friction exercise flow, rest/time visibility.
- Fitbit/Garmin Connect patterns: readiness/recovery summary cards and trend-first dashboards.
- Trainerize/TrueCoach patterns: roster-first coach workspace, assignment workflows, check-in review loops.

## Implementation checklist used in this app
1. Navigation and information architecture
- Keep app shell stable and predictable.
- Separate self-tracking and coach tools; coach tools are available to any signed-in user.
- Use short, action-oriented page titles and clear section headers.

2. Workout logging UX
- Favor fast logging with minimal required fields.
- Support mixed strength + cardio in one session.
- Show slot/time/location at log time, not buried in advanced settings.
- Preserve sequence and context for plan-linked sessions.

3. Plan assignment UX
- Distinguish template library from client assignments.
- Snapshot template sessions during assignment so edits do not retroactively mutate history.
- Show next session and today’s logged sessions together in client training view.

4. Client roster UX
- Provide search + status filters + compact tabular roster.
- Surface operational context in roster rows: next session and today session count.
- Keep primary actions one click away (open profile, assign plan, log session).

5. Check-ins UX
- Keep check-ins status-driven (`pending` -> `reviewed` -> `actioned`).
- Allow urgent flagging.
- Keep review actions inline in the check-in list.

6. Progress and analytics UX
- Lead with high-signal cards and concise trend tables.
- Use skeleton loading and avoid layout shift for perceived performance.
- Keep detail drill-down on-demand to avoid heavy initial render cost.

7. Payments UX
- Record-only workflow (no payment gateway coupling).
- Highlight actionable alerts: overdue, period ending, no active paid period.
- Archive instead of delete for auditability.

8. Performance and quality
- Prefer server actions for writes with validation.
- Use React Query for cached reads and selective invalidation.
- Keep interactive components client-side only where needed.
- Provide loading, empty, and error states on all major surfaces.

