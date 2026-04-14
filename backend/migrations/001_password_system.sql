-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001: Password change system
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Flag: user must change password on next login
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Track each password change (for 2/month rate limiting)
CREATE TABLE IF NOT EXISTS password_change_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pcl_user_changed
  ON password_change_log (user_id, changed_at DESC);

-- 3. Password change requests (admin workflow when user hits 3/month limit)
--    3NF: every non-key column depends solely on the PK (id).
--    user_id → FK to users, resolved_by → FK to users; no transitive deps.
CREATE TABLE IF NOT EXISTS password_change_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'resolved')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pcr_status
  ON password_change_requests (status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pcr_user_status
  ON password_change_requests (user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3NF analysis of existing schema (no changes needed — already normalised)
-- ─────────────────────────────────────────────────────────────────────────────
-- users           : role_id → roles                               ✓ 3NF
-- assets          : asset_type_id → asset_types                   ✓ 3NF
--                   brand_id → brands                             ✓ 3NF
--                   status_id → asset_statuses                    ✓ 3NF
--                   location_id → locations                       ✓ 3NF
--                   area_id → areas                               ✓ 3NF
--                   responsible_user_id → users                   ✓ 3NF
-- locations       : area_id → areas                               ✓ 3NF
-- licenses        : created_by_user_id → users                    ✓ 3NF
-- license_assigs  : license_id → licenses                         ✓ 3NF
--                   asset_id → assets                             ✓ 3NF
--                   user_id → users                               ✓ 3NF
--                   created_by → users                            ✓ 3NF
-- status_history  : asset_id → assets                             ✓ 3NF
--                   previous_status_id → asset_statuses           ✓ 3NF
--                   new_status_id → asset_statuses                ✓ 3NF
--                   changed_by → users                            ✓ 3NF
-- audit_events    : performed_by → users                          ✓ 3NF
-- ─────────────────────────────────────────────────────────────────────────────
