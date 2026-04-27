-- ─── Multiple strumming patterns per song ────────────────────────────────────
-- Replaces the single text[] `songs.strumming` with a richer per-section
-- model: each pattern has a name (e.g. "Main Pattern", "Pre-Chorus"), its
-- own tempo and note length (1/4, 1/8, 1/16, plus triplet variants), and
-- an array of strokes carrying direction + accent + mute flags.
--
-- The legacy `songs.strumming` column stays as a compatibility fallback —
-- the viewer reads from this new table when patterns exist, otherwise
-- falls back to the auto-pattern from the legacy column.

CREATE TABLE song_strumming_patterns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position    integer NOT NULL DEFAULT 0,
  name        text NOT NULL DEFAULT 'Main Pattern',
  tempo       integer NOT NULL DEFAULT 100 CHECK (tempo BETWEEN 30 AND 320),
  -- Allowed: 1/4, 1/8, 1/16, plus triplet suffix t (1/4t = quarter-note triplet,
  -- 1/8t = eighth triplet, 1/16t = sixteenth triplet).
  note_length text NOT NULL DEFAULT '1/8' CHECK (
    note_length IN ('1/4','1/8','1/16','1/4t','1/8t','1/16t')
  ),
  -- Each stroke: { d: 'D'|'U', a?: true, m?: true, r?: true }
  --   d — direction (down/up)
  --   a — accent (louder)
  --   m — mute (palm-mute style)
  --   r — rest / skipped slot (timing keeps, no audio)
  strokes     jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX song_strumming_patterns_song_id_idx
  ON song_strumming_patterns (song_id, position);

ALTER TABLE song_strumming_patterns ENABLE ROW LEVEL SECURITY;

-- Public reads: only patterns of published songs.
CREATE POLICY "song_strumming_patterns_select_published"
  ON song_strumming_patterns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM songs s
      WHERE s.id = song_strumming_patterns.song_id AND s.status = 'published'
    )
  );

-- Writes go through the admin layer (service-role only).

CREATE OR REPLACE FUNCTION public.touch_strumming_patterns_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER strumming_patterns_touch_updated_at
  BEFORE UPDATE ON song_strumming_patterns
  FOR EACH ROW EXECUTE PROCEDURE public.touch_strumming_patterns_updated_at();
