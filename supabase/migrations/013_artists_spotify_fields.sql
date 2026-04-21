-- Add Spotify enrichment fields to the pre-existing artists table.
alter table public.artists add column if not exists spotify_id text unique;
alter table public.artists add column if not exists genres text[] default '{}';
alter table public.artists add column if not exists updated_at timestamptz not null default now();

drop trigger if exists artists_set_updated_at on public.artists;
create trigger artists_set_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();
