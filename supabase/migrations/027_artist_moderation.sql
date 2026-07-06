-- Artist moderation: user-submitted artists need approval before they are
-- publicly visible (mirrors song moderation; Apple App Review 1.2).
--
-- status: pending | approved | rejected
--   - existing rows default to 'approved' (all current artists stay visible)
--   - admin-created artists insert without status -> 'approved'
--   - user-submitted artists (submitArtist) insert 'pending'
-- Public reads filter status = 'approved'. Admin sees the 'pending' queue and
-- approves/rejects. 'rejected' is kept for the record (hidden everywhere).

alter table public.artists
  add column if not exists status text not null default 'approved';

create index if not exists artists_status_idx on public.artists (status);

-- Public reads only see approved artists; pending/rejected stay hidden from
-- the REST API. Admin UI and moderation actions go through the service role
-- (bypasses RLS); the "artists admin write" FOR ALL policy still covers
-- session-client admin reads.
drop policy if exists "artists read all" on public.artists;
drop policy if exists "artists_public_read" on public.artists;
create policy "artists_public_read" on public.artists
  for select using (status = 'approved');
