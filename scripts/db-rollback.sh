#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <backup-folder-name-or-path>" >&2
  echo "Example: $0 20260303213000" >&2
  exit 1
fi

ARG_PATH="$1"
if [ -d "$ARG_PATH" ]; then
  BACKUP_DIR="$ARG_PATH"
elif [ -d "supabase/backups/${ARG_PATH}" ]; then
  BACKUP_DIR="supabase/backups/${ARG_PATH}"
else
  echo "Error: backup folder not found: ${ARG_PATH}" >&2
  exit 1
fi

SCHEMA_FILE="${BACKUP_DIR}/public_schema.sql"
DATA_FILE="${BACKUP_DIR}/public_data.sql"

if [ ! -f "$SCHEMA_FILE" ] || [ ! -f "$DATA_FILE" ]; then
  echo "Error: missing backup files in ${BACKUP_DIR}" >&2
  exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Error: SUPABASE_DB_URL is not set." >&2
  echo "Set it to your Postgres connection string, then rerun." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required for automated restore." >&2
  echo "Install PostgreSQL client tools or restore manually from ${BACKUP_DIR}." >&2
  exit 1
fi

read -r -p "This will restore schema and data from ${BACKUP_DIR}. Continue? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Rollback cancelled."
  exit 0
fi

echo "Applying schema backup..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"

echo "Applying data backup..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$DATA_FILE"

echo "Rollback restore complete from ${BACKUP_DIR}."
