-- User-submissions infrastructure (referenced by features/song/actions/reports.ts,
-- app/admin/reports and the profile/home "Додані пісні" sections):
--   1. song_reports — UGC complaint queue (App Review 1.2): users file reports,
--      admins triage them at /admin/reports. Reporters can only INSERT their
--      own rows; all reads go through the service role.
--   2. profiles.is_blocked — submission ban flag toggled from report resolution.
--   3. songs: authors may read their own rows in ANY status, so their
--      draft/pending/rejected submissions are visible to them (RLS previously
--      exposed only status = 'published' to non-admins).

create table if not exists public.song_reports (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open', -- open | resolved | dismissed
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists song_reports_status_idx
  on public.song_reports (status, created_at desc);

alter table public.song_reports enable row level security;

-- Reporters may only file reports as themselves. No SELECT policy on purpose:
-- the admin queue reads through the service role, which bypasses RLS.
drop policy if exists song_reports_insert_own on public.song_reports;
create policy song_reports_insert_own on public.song_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- Ban flag for submitters (set by admins from /admin/reports "block" action).
alter table public.profiles
  add column if not exists is_blocked boolean not null default false;

-- Authors see their own submissions regardless of status.
drop policy if exists songs_select_own on public.songs;
create policy songs_select_own on public.songs
  for select to authenticated
  using (submitted_by = auth.uid());
