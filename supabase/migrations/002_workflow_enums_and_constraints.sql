-- Workflow enforcement upgrades (enums + constraints)
-- This migration is additive and safe to run after 001_initial_schema.sql

-- 1) Event lifecycle statuses
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'documentation_submitted';
ALTER TYPE event_status_enum ADD VALUE IF NOT EXISTS 'rejected';

-- 2) Document review statuses
ALTER TYPE review_status_enum ADD VALUE IF NOT EXISTS 'rejected';

-- 3) Proctor mappings constraints
-- Enforce: an execom can belong to only one proctor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proctor_mappings_unique_execom'
  ) THEN
    ALTER TABLE proctor_mappings
      ADD CONSTRAINT proctor_mappings_unique_execom UNIQUE (execom_id);
  END IF;
END $$;

-- Enforce: 1 proctor -> max 5 mentees (trigger)
CREATE OR REPLACE FUNCTION enforce_proctor_max_mentees()
RETURNS TRIGGER AS $$
DECLARE
  mentee_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mentee_count
  FROM proctor_mappings
  WHERE proctor_id = NEW.proctor_id;

  IF mentee_count >= 5 THEN
    RAISE EXCEPTION 'Proctor % already has maximum 5 mentees', NEW.proctor_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_proctor_max_mentees ON proctor_mappings;
CREATE TRIGGER trg_enforce_proctor_max_mentees
BEFORE INSERT ON proctor_mappings
FOR EACH ROW
EXECUTE FUNCTION enforce_proctor_max_mentees();

-- 4) Proctor updates: one update per execom per bi-weekly period (uniqueness)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proctor_updates_unique_period'
  ) THEN
    ALTER TABLE proctor_updates
      ADD CONSTRAINT proctor_updates_unique_period UNIQUE (proctor_id, execom_id, period_start, period_end);
  END IF;
END $$;

-- 5) Chapter documents require an explicit date tag (Workflow 5)
ALTER TABLE chapter_documents
  ADD COLUMN IF NOT EXISTS document_date DATE;

UPDATE chapter_documents
SET document_date = created_at::date
WHERE document_date IS NULL;

ALTER TABLE chapter_documents
  ALTER COLUMN document_date SET NOT NULL;


