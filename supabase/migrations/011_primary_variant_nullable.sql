-- Drop NOT NULL on songs.primary_variant_id.
-- Creating a new song is a two-step insert (song -> variant -> update song.primary_variant_id),
-- so the column must be nullable during bootstrap. FK already guards referential integrity.

ALTER TABLE songs
  ALTER COLUMN primary_variant_id DROP NOT NULL;
