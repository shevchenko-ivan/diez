-- External view count captured from the original source.
alter table public.songs
  add column if not exists source_views int;

create index if not exists songs_source_views_idx
  on public.songs (source_views desc nulls last);
