-- ─── Variant tracking in playlists ───────────────────────────────────────────
-- Remember which song variant was active when the user saved the song.
-- ON DELETE SET NULL: if a variant is deleted the song stays in the playlist,
-- just falls back to the primary.

ALTER TABLE playlist_songs
  ADD COLUMN variant_id uuid REFERENCES song_variants(id) ON DELETE SET NULL;
