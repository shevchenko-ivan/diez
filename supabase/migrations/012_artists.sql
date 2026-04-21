-- Artists table — replaces the plain text `songs.artist` field.
-- songs.artist stays for backwards compat; new songs.artist_id is nullable FK.
-- Populated by scripts/enrich-artists.ts (Spotify + Wikipedia).

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  photo_url text,
  bio text,
  spotify_id text unique,
  genres text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artists_name_idx on public.artists using gin (to_tsvector('simple', name));

-- Link songs to artists (nullable so existing rows don't break; populated later).
alter table public.songs add column if not exists artist_id uuid references public.artists(id) on delete set null;
create index if not exists songs_artist_id_idx on public.songs (artist_id);

-- Enable RLS — public read, admin write.
alter table public.artists enable row level security;

drop policy if exists "artists read all" on public.artists;
create policy "artists read all" on public.artists for select using (true);

drop policy if exists "artists admin write" on public.artists;
create policy "artists admin write" on public.artists
  for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin));

-- Updated_at trigger.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists artists_set_updated_at on public.artists;
create trigger artists_set_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();
