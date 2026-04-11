-- ─── Artists ──────────────────────────────────────────────────────────────────

CREATE TABLE artists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text UNIQUE NOT NULL,
  name       text NOT NULL,
  photo_url  text,
  bio        text,
  genre      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- Anyone can read artists
CREATE POLICY "artists_public_read" ON artists
  FOR SELECT USING (true);
