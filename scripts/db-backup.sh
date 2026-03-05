#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: Supabase CLI is required." >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_DIR="supabase/backups/${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo "Creating backup in ${BACKUP_DIR} ..."

supabase db dump --linked --schema public --file "${BACKUP_DIR}/public_schema.sql"
supabase db dump --linked --data-only --schema public --file "${BACKUP_DIR}/public_data.sql"

if [ -f "supabase/migrations/20260303213000_roles_and_athlete_monitoring_overhaul.sql" ]; then
  cp "supabase/migrations/20260303213000_roles_and_athlete_monitoring_overhaul.sql" "${BACKUP_DIR}/migration_snapshot.sql"
fi

cat > "${BACKUP_DIR}/MANIFEST.txt" <<MANIFEST
backup_created_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
source=linked_project
schema_file=public_schema.sql
data_file=public_data.sql
MANIFEST

echo "Backup complete: ${BACKUP_DIR}"
echo "Next step (safe rollback playbook): docs/rollback-playbook.md"
