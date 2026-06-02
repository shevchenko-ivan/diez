-- 024_song_title_sort.sql
-- Alphabetical catalogue order ("За алфавітом") sorted by the raw `title`,
-- which clustered punctuation-prefixed titles (#, quotes, «») at the top so
-- the А-Я order was invisible. Add a normalized, immutable sort key:
-- lowercased title with leading non-alphanumeric characters stripped, so the
-- order reflects the first real letter. STORED + indexed because the catalogue
-- is paginated server-side.

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS title_sort text
  GENERATED ALWAYS AS (
    regexp_replace(lower(title), '^[^[:alnum:]]+', '')
  ) STORED;

CREATE INDEX IF NOT EXISTS songs_title_sort_idx ON songs (title_sort);
