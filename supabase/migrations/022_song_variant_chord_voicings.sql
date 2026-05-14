-- Per-variant chord voicing overrides.
--
-- Lets an admin pick which fingering from CHORD_DB shows up by default for
-- each chord that appears in a variant's lyrics. Stored as a map of
-- chord name -> voicing index, e.g. {"Bb6": 0, "A7": 2}. Empty by default;
-- when the map lacks an entry the viewer falls back to index 0.
-- A signed-in user can still flip voicings locally (localStorage); the
-- admin map seeds the initial choice when no local override exists.

ALTER TABLE song_variants
  ADD COLUMN IF NOT EXISTS chord_voicings jsonb NOT NULL DEFAULT '{}'::jsonb;
