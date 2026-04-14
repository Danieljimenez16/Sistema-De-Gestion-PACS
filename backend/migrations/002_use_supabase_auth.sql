-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Move credential storage to auth.users
-- Run AFTER migrating existing users (see scripts/migrate-users-to-auth.js)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop password_hash — credentials now live in auth.users
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- Drop email from public.users IF you prefer single source of truth.
-- We keep it as a denormalized copy for easy querying (no join needed).
-- Comment out this block if you want to keep the copy:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS email;

-- After this migration:
--   auth.users  → email + password (Supabase Auth manages)
--   public.users → id (= auth.users.id), full_name, role_id,
--                  email (denormalized), is_active, must_change_password
-- ─────────────────────────────────────────────────────────────────────────────
