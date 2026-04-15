-- Add soft-delete support for artists
ALTER TABLE artists ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
