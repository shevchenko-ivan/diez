-- Per-variant CUSTOM chord voicings (admin-drawn shapes).
--
-- Complements 022's chord_voicings (which only stores a preset INDEX per
-- chord). Here we store a full hand-drawn shape per chord so an admin can
-- create a voicing that isn't in CHORD_DB. Map of chord name -> ChordDef:
--   { "Am": { "strings": [-1,0,2,2,1,0], "baseFret": 1 } }
-- where strings = [low E, A, D, G, B, high E], -1 = muted, 0 = open, n = fret.
--
-- In the viewer the custom shape is appended to that chord's voicing list, so
-- chord_voicings can point its default index at it like any preset.
-- Empty by default; the public viewer just shows presets when absent.

ALTER TABLE song_variants
  ADD COLUMN IF NOT EXISTS custom_voicings jsonb NOT NULL DEFAULT '{}'::jsonb;
