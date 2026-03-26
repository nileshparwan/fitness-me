-- ============================================================================
-- Migration: Backfill profiles table from auth.users.raw_user_meta_data
-- Date: 2026-03-24
--
-- Moves user settings data from auth.users.user_metadata into the profiles
-- table (single source of truth). Auth-related flags (is_deleted, has_password,
-- is_blocked, recoverable_until, etc.) are moved in a subsequent migration
-- (20260325100000_move_auth_flags_to_profiles.sql).
--
-- Fields migrated: phone, default_calories, default_carbs, default_fat,
-- default_protein, compact_mode, full_name, bio, avatar_url
-- ============================================================================

-- Re-add settings columns dropped in 20260315101500_profiles_settings_expansion.sql.
-- That migration moved settings to auth.users.user_metadata; this migration moves
-- them back into profiles as the single source of truth.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone             text,
  ADD COLUMN IF NOT EXISTS default_calories  int,
  ADD COLUMN IF NOT EXISTS default_protein   int,
  ADD COLUMN IF NOT EXISTS default_carbs     int,
  ADD COLUMN IF NOT EXISTS default_fat       int,
  ADD COLUMN IF NOT EXISTS compact_mode      boolean NOT NULL DEFAULT false;

-- Backfill profiles from auth.users metadata for any user that has a profile
-- row but is missing the settings values in profiles.
UPDATE profiles p
   SET phone             = COALESCE(p.phone, (m.raw_user_meta_data ->> 'phone')),
       default_calories  = COALESCE(p.default_calories, (m.raw_user_meta_data ->> 'default_calories')::int),
       default_protein   = COALESCE(p.default_protein, (m.raw_user_meta_data ->> 'default_protein')::int),
       default_carbs     = COALESCE(p.default_carbs, (m.raw_user_meta_data ->> 'default_carbs')::int),
       default_fat       = COALESCE(p.default_fat, (m.raw_user_meta_data ->> 'default_fat')::int),
       compact_mode      = COALESCE(p.compact_mode, (m.raw_user_meta_data ->> 'compact_mode')::boolean, false),
       full_name         = COALESCE(p.full_name,
                                    m.raw_user_meta_data ->> 'full_name',
                                    m.raw_user_meta_data ->> 'display_name'),
       bio               = COALESCE(p.bio, m.raw_user_meta_data ->> 'bio'),
       avatar_url        = COALESCE(p.avatar_url, m.raw_user_meta_data ->> 'avatar_url')
  FROM auth.users m
 WHERE m.id = p.id
   AND m.raw_user_meta_data IS NOT NULL;

-- For users in auth.users that do NOT have a profile row yet, create one
-- so the profile is ready when they next log in.
INSERT INTO profiles (id, full_name, bio, avatar_url, phone,
                      default_calories, default_protein, default_carbs, default_fat,
                      compact_mode, role)
SELECT m.id,
       COALESCE(m.raw_user_meta_data ->> 'full_name',
                m.raw_user_meta_data ->> 'display_name'),
       m.raw_user_meta_data ->> 'bio',
       m.raw_user_meta_data ->> 'avatar_url',
       m.raw_user_meta_data ->> 'phone',
       (m.raw_user_meta_data ->> 'default_calories')::int,
       (m.raw_user_meta_data ->> 'default_protein')::int,
       (m.raw_user_meta_data ->> 'default_carbs')::int,
       (m.raw_user_meta_data ->> 'default_fat')::int,
       COALESCE((m.raw_user_meta_data ->> 'compact_mode')::boolean, false),
       CASE
         WHEN LOWER(COALESCE(m.raw_user_meta_data ->> 'role', '')) IN ('admin', 'sysadmin')
           THEN 'sysadmin'::user_role
         ELSE 'user'::user_role
       END
  FROM auth.users m
 WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = m.id)
   AND m.raw_user_meta_data IS NOT NULL;
