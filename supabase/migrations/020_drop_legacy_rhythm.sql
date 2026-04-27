-- Drop legacy single-pattern rhythm fields.
--
-- Replaced by the rich `song_strumming_patterns` table (migration 019), which
-- stores multiple per-song patterns each with their own tempo, note length,
-- and stroke list. The old `tempo` + `strumming` columns on `songs` and
-- `song_variants` are no longer read or written.

ALTER TABLE songs
  DROP COLUMN IF EXISTS tempo,
  DROP COLUMN IF EXISTS strumming;

ALTER TABLE song_variants
  DROP COLUMN IF EXISTS tempo,
  DROP COLUMN IF EXISTS strumming;
