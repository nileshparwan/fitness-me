# Database Backup and Rollback Playbook

## 1) Create a backup before risky migrations

Run:

```bash
npm run db:backup
```

This creates:

- `supabase/backups/<timestamp>/public_schema.sql`
- `supabase/backups/<timestamp>/public_data.sql`
- `supabase/backups/<timestamp>/MANIFEST.txt`

## 2) Apply migrations

Apply your migration only after backup is complete:

```bash
supabase db push
```

## 3) Roll back from a backup (if needed)

### Automated rollback (requires `psql`)

```bash
SUPABASE_DB_URL='postgresql://...' npm run db:rollback -- <timestamp>
```

Example:

```bash
SUPABASE_DB_URL='postgresql://...' npm run db:rollback -- 20260303213000
```

### Manual rollback (if `psql` is unavailable)

Use Supabase SQL editor / DB tools and run the SQL files from:

- `public_schema.sql`
- `public_data.sql`

in that order.

## Notes

- Always back up first before running schema migrations.
- Keep backup folders in source control **out** of git (or archive them safely).
- For production, prefer running rollback in a maintenance window.
