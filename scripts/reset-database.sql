-- Database Reset SQL Script
-- 
-- WARNING: This script will DELETE ALL DATA from the database!
-- Use with caution - this cannot be undone.
-- 
-- Run this in Supabase SQL Editor or via psql
-- 
-- This script truncates all tables in the correct order to respect foreign key constraints

-- Disable foreign key checks temporarily (PostgreSQL doesn't support this directly)
-- Instead, we'll truncate in the correct order

BEGIN;

-- Delete all data from child tables first (those with foreign keys)
DELETE FROM notifications;
DELETE FROM proctor_updates;
DELETE FROM proctor_mappings;
DELETE FROM event_documents;
DELETE FROM event_assignments;
DELETE FROM event_approvals;
DELETE FROM calendar_blocks;
DELETE FROM chapter_documents;
DELETE FROM events;

-- Then delete from parent tables
DELETE FROM users;
DELETE FROM chapters;
DELETE FROM roles;

-- Reset sequences if any (for auto-incrementing IDs, though we use UUIDs)
-- Not needed for UUID primary keys, but included for completeness

COMMIT;

-- Verify tables are empty
-- SELECT 'notifications' as table_name, COUNT(*) as row_count FROM notifications
-- UNION ALL
-- SELECT 'proctor_updates', COUNT(*) FROM proctor_updates
-- UNION ALL
-- SELECT 'proctor_mappings', COUNT(*) FROM proctor_mappings
-- UNION ALL
-- SELECT 'event_documents', COUNT(*) FROM event_documents
-- UNION ALL
-- SELECT 'event_assignments', COUNT(*) FROM event_assignments
-- UNION ALL
-- SELECT 'event_approvals', COUNT(*) FROM event_approvals
-- UNION ALL
-- SELECT 'calendar_blocks', COUNT(*) FROM calendar_blocks
-- UNION ALL
-- SELECT 'chapter_documents', COUNT(*) FROM chapter_documents
-- UNION ALL
-- SELECT 'events', COUNT(*) FROM events
-- UNION ALL
-- SELECT 'users', COUNT(*) FROM users
-- UNION ALL
-- SELECT 'chapters', COUNT(*) FROM chapters
-- UNION ALL
-- SELECT 'roles', COUNT(*) FROM roles;

