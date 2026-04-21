-- Popularity & discovery fields for artists and songs.
-- Used under-the-hood for ranking; not surfaced directly in UI.

alter table public.artists
  add column if not exists country text,
  add column if not exists deezer_id bigint unique,
  add column if not exists rank_3mo int,
  add column if not exists source_fans bigint,
  add column if not exists source_fetched_at timestamptz;

alter table public.songs
  add column if not exists source_popularity int,
  add column if not exists source_fetched_at timestamptz;

create index if not exists artists_rank_3mo_idx on public.artists (rank_3mo);
create index if not exists artists_source_fans_idx on public.artists (source_fans desc nulls last);
create index if not exists songs_source_popularity_idx on public.songs (source_popularity desc nulls last);
