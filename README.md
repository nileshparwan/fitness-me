## Fitness Tracker

Production Next.js App Router project using Supabase (Postgres + Auth + RLS), Server Actions, and TanStack Query.

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Client Portal Auth (Non-Supabase Users)

This project supports a **client portal** for clients who are not Supabase auth users.

- Clients authenticate with `username + password` stored in `public.client_auth`.
- Passwords are hashed with `bcryptjs`.
- Portal sessions are server-managed via `public.client_sessions` and an `httpOnly` cookie (`client_portal_session`).
- All client portal reads/writes run through server actions using the service role client.
- Module access is enforced by `public.client_feature_access` and server-side guards.

## Coach-Controlled Module Access

Per client, coach can configure module access level:
- `disabled`: hidden/no access
- `read_only`: visible, writes blocked
- `enabled`: full read/write

Modules: workouts, training plan, meal plan, meal logging, steps tracking, goals, check-ins, coach notes, tasks.

## Migration

Apply latest migrations:

```bash
supabase db push
```

Key migration for this feature:
- `supabase/migrations/20260305190000_client_portal_auth_and_feature_access.sql`

## UX Checklist

Client portal UX checklist used in this implementation:
- `docs/client-portal-ux-checklist.md`
