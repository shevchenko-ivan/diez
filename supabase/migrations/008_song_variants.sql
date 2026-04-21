-- ─── Song variants ────────────────────────────────────────────────────────────
-- Multiple chord/lyric arrangements per song. One is marked primary and is
-- shown by default on /songs/[slug]. Search/lists still return one row per
-- song (from `songs`); the viewer exposes a dropdown to switch variants.

CREATE TABLE song_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  label       text NOT NULL DEFAULT 'Основний',
  sections    jsonb NOT NULL DEFAULT '[]',
  chords      text[] NOT NULL DEFAULT '{}',
  key         text NOT NULL,
  capo        integer,
  tempo       integer,
  strumming   text[],
  views       integer NOT NULL DEFAULT 0,
  author_id   uuid REFERENCES profiles(id),
  status      song_status NOT NULL DEFAULT 'published',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX song_variants_song_id_idx ON song_variants (song_id);
CREATE INDEX song_variants_status_idx ON song_variants (status);

ALTER TABLE song_variants ENABLE ROW LEVEL SECURITY;

-- Public: read published variants whose parent song is also published.
CREATE POLICY "song_variants_select_published" ON song_variants
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM songs s
      WHERE s.id = song_variants.song_id AND s.status = 'published'
    )
  );

-- Writes go through service-role (admin) layer only.

-- ─── Link from songs → primary variant ────────────────────────────────────────

ALTER TABLE songs
  ADD COLUMN primary_variant_id uuid REFERENCES song_variants(id);

-- Backfill: create one variant per existing song from its current fields.
INSERT INTO song_variants (
  id, song_id, label, sections, chords, key, capo, tempo, strumming,
  views, status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  s.id,
  'Основний',
  s.sections,
  s.chords,
  s.key,
  s.capo,
  s.tempo,
  s.strumming,
  s.views,
  s.status,
  s.created_at,
  s.updated_at
FROM songs s;

-- Point each song at its freshly created variant.
UPDATE songs s
SET primary_variant_id = v.id
FROM song_variants v
WHERE v.song_id = s.id;

ALTER TABLE songs
  ALTER COLUMN primary_variant_id SET NOT NULL;

-- ─── Updated-at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_song_variants_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER song_variants_touch_updated_at
  BEFORE UPDATE ON song_variants
  FOR EACH ROW EXECUTE PROCEDURE public.touch_song_variants_updated_at();
