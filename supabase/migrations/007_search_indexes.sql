-- ─── Search + sort indexes ───────────────────────────────────────────────────
-- Goal: faster catalog sorts and ILIKE-based search on songs.title / songs.artist.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes cover ILIKE '%q%' used by /api/search/suggest and /songs.
CREATE INDEX IF NOT EXISTS songs_title_trgm_idx
  ON songs USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS songs_artist_trgm_idx
  ON songs USING gin (artist gin_trgm_ops);

-- Catalog listings filter by status and sort by views / created_at.
CREATE INDEX IF NOT EXISTS songs_status_views_idx
  ON songs (status, views DESC);

CREATE INDEX IF NOT EXISTS songs_status_created_idx
  ON songs (status, created_at DESC);

-- playlist_songs lookups by song_id (getSavedSlugs, setSongPlaylists membership).
CREATE INDEX IF NOT EXISTS playlist_songs_song_idx
  ON playlist_songs (song_id);
