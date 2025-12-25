-- Enable Row Level Security (RLS) on all tables
-- This migration enables RLS and creates policies to secure all database tables
-- 
-- IMPORTANT: This application uses service role key for all operations, which bypasses RLS.
-- These policies protect against direct API access using the anon key only.

-- ============================================================================
-- 1. ROLES TABLE
-- ============================================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Deny all anon access - roles should only be accessible via service role
-- Service role bypasses RLS, so this only affects anon key access
CREATE POLICY "roles_deny_anon" ON roles
  FOR SELECT
  USING (false); -- Deny all anon key access

-- ============================================================================
-- 2. USERS TABLE
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Deny all anon access - users should only be accessible via service role
CREATE POLICY "users_deny_anon" ON users
  FOR SELECT
  USING (false); -- Deny all anon key access

-- ============================================================================
-- 3. CHAPTERS TABLE
-- ============================================================================
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "chapters_deny_anon" ON chapters
  FOR SELECT
  USING (false);

-- ============================================================================
-- 4. EVENTS TABLE
-- ============================================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "events_deny_anon" ON events
  FOR SELECT
  USING (false);

CREATE POLICY "events_deny_anon_insert" ON events
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "events_deny_anon_update" ON events
  FOR UPDATE
  USING (false);

CREATE POLICY "events_deny_anon_delete" ON events
  FOR DELETE
  USING (false);

-- ============================================================================
-- 5. EVENT_APPROVALS TABLE
-- ============================================================================
ALTER TABLE event_approvals ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "event_approvals_deny_anon" ON event_approvals
  FOR SELECT
  USING (false);

CREATE POLICY "event_approvals_deny_anon_insert" ON event_approvals
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "event_approvals_deny_anon_update" ON event_approvals
  FOR UPDATE
  USING (false);

-- ============================================================================
-- 6. EVENT_ASSIGNMENTS TABLE
-- ============================================================================
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "event_assignments_deny_anon" ON event_assignments
  FOR SELECT
  USING (false);

CREATE POLICY "event_assignments_deny_anon_insert" ON event_assignments
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "event_assignments_deny_anon_update" ON event_assignments
  FOR UPDATE
  USING (false);

-- ============================================================================
-- 7. EVENT_DOCUMENTS TABLE
-- ============================================================================
ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "event_documents_deny_anon" ON event_documents
  FOR SELECT
  USING (false);

CREATE POLICY "event_documents_deny_anon_insert" ON event_documents
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "event_documents_deny_anon_update" ON event_documents
  FOR UPDATE
  USING (false);

-- ============================================================================
-- 8. PROCTOR_MAPPINGS TABLE
-- ============================================================================
ALTER TABLE proctor_mappings ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "proctor_mappings_deny_anon" ON proctor_mappings
  FOR SELECT
  USING (false);

CREATE POLICY "proctor_mappings_deny_anon_insert" ON proctor_mappings
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "proctor_mappings_deny_anon_delete" ON proctor_mappings
  FOR DELETE
  USING (false);

-- ============================================================================
-- 9. PROCTOR_UPDATES TABLE
-- ============================================================================
ALTER TABLE proctor_updates ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "proctor_updates_deny_anon" ON proctor_updates
  FOR SELECT
  USING (false);

CREATE POLICY "proctor_updates_deny_anon_insert" ON proctor_updates
  FOR INSERT
  WITH CHECK (false);

-- ============================================================================
-- 10. CHAPTER_DOCUMENTS TABLE
-- ============================================================================
ALTER TABLE chapter_documents ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "chapter_documents_deny_anon" ON chapter_documents
  FOR SELECT
  USING (false);

CREATE POLICY "chapter_documents_deny_anon_insert" ON chapter_documents
  FOR INSERT
  WITH CHECK (false);

-- ============================================================================
-- 11. NOTIFICATIONS TABLE
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "notifications_deny_anon" ON notifications
  FOR SELECT
  USING (false);

CREATE POLICY "notifications_deny_anon_insert" ON notifications
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "notifications_deny_anon_update" ON notifications
  FOR UPDATE
  USING (false);

-- ============================================================================
-- 12. CALENDAR_BLOCKS TABLE
-- ============================================================================
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;

-- Deny all anon access
CREATE POLICY "calendar_blocks_deny_anon" ON calendar_blocks
  FOR SELECT
  USING (false);

CREATE POLICY "calendar_blocks_deny_anon_insert" ON calendar_blocks
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "calendar_blocks_deny_anon_update" ON calendar_blocks
  FOR UPDATE
  USING (false);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. The application uses service role key (SUPABASE_SERVICE_ROLE_KEY) for all
--    database operations, which BYPASSES RLS completely. These policies ONLY
--    protect against direct API access using the anon key.
--
-- 2. All policies deny anon key access (USING (false)) because:
--    - The application should NEVER use the anon key directly
--    - All database operations go through API routes using service role
--    - This prevents unauthorized direct database access via anon key
--
-- 3. Service role queries will work normally (they bypass RLS)
--    Anon key queries will be blocked (they must pass RLS)
--
-- 4. This is a security best practice: enable RLS and deny anon access when
--    using service role for all operations.
--
-- 5. If you need to allow anon access in the future, you can:
--    - Modify policies to allow specific operations
--    - Use JWT claims if you migrate to Supabase Auth
--    - Create custom functions to check permissions

