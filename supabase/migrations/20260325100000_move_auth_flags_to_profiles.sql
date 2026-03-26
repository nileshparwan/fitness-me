-- ============================================================================
-- Migration: Move auth-related flags from user_metadata to profiles
-- Date: 2026-03-25
--
-- Supabase's auth.users is shared across all projects in the same instance.
-- Storing app-specific flags (is_deleted, has_password, is_blocked, etc.) in
-- user_metadata bleeds data across projects. This migration moves those flags
-- to the profiles table, which is project-scoped.
--
-- Fields moved: is_deleted, deleted_at, recoverable_until, restored_at,
-- deletion_reason, has_password, password_configured_at, is_blocked
-- ============================================================================

-- ── Add new columns to profiles ─────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_deleted       boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS recoverable_until timestamptz,
  ADD COLUMN IF NOT EXISTS restored_at      timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason  text,
  ADD COLUMN IF NOT EXISTS has_password     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_configured_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_blocked       boolean      NOT NULL DEFAULT false;

-- ── Backfill from auth.users metadata ───────────────────────────────────────
UPDATE profiles p
   SET is_deleted          = COALESCE((m.raw_user_meta_data ->> 'is_deleted')::boolean, false),
       deleted_at          = (m.raw_user_meta_data ->> 'deleted_at')::timestamptz,
       recoverable_until   = (m.raw_user_meta_data ->> 'recoverable_until')::timestamptz,
       restored_at         = (m.raw_user_meta_data ->> 'restored_at')::timestamptz,
       deletion_reason     = m.raw_user_meta_data ->> 'deletion_reason',
       has_password        = COALESCE((m.raw_user_meta_data ->> 'has_password')::boolean, false),
       password_configured_at = (m.raw_user_meta_data ->> 'password_configured_at')::timestamptz,
       is_blocked          = CASE
                               WHEN m.banned_until IS NOT NULL AND m.banned_until > now() THEN true
                               ELSE false
                             END
  FROM auth.users m
 WHERE m.id = p.id;

-- ── For auth users without a profile row, create one with flags ─────────────
-- (Extends the existing backfill migration to also include auth flags)
INSERT INTO profiles (id, full_name, role, is_deleted, deleted_at, recoverable_until,
                      restored_at, deletion_reason, has_password, password_configured_at, is_blocked)
SELECT m.id,
       COALESCE(m.raw_user_meta_data ->> 'full_name',
                m.raw_user_meta_data ->> 'display_name'),
       CASE
         WHEN LOWER(COALESCE(m.raw_user_meta_data ->> 'role', '')) IN ('admin', 'sysadmin')
           THEN 'sysadmin'::user_role
         ELSE 'user'::user_role
       END,
       COALESCE((m.raw_user_meta_data ->> 'is_deleted')::boolean, false),
       (m.raw_user_meta_data ->> 'deleted_at')::timestamptz,
       (m.raw_user_meta_data ->> 'recoverable_until')::timestamptz,
       (m.raw_user_meta_data ->> 'restored_at')::timestamptz,
       m.raw_user_meta_data ->> 'deletion_reason',
       COALESCE((m.raw_user_meta_data ->> 'has_password')::boolean, false),
       (m.raw_user_meta_data ->> 'password_configured_at')::timestamptz,
       CASE
         WHEN m.banned_until IS NOT NULL AND m.banned_until > now() THEN true
         ELSE false
       END
  FROM auth.users m
 WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = m.id);
