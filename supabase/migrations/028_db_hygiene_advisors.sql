-- 028: DB hygiene per Supabase advisors
-- 1) covering indexes for hot foreign keys
-- 2) RLS initplan: wrap auth.uid() in a scalar subquery so it is evaluated
--    once per statement instead of once per row
-- 3) pin search_path on our functions (mutable search_path warning)
-- 4) lock down SECURITY DEFINER functions from the public API surface

-- 1. FK indexes ------------------------------------------------------------

create index if not exists playlist_songs_variant_id_idx
  on public.playlist_songs (variant_id);
create index if not exists song_reports_song_id_idx
  on public.song_reports (song_id);
create index if not exists song_reports_reporter_id_idx
  on public.song_reports (reporter_id);
create index if not exists songs_submitted_by_idx
  on public.songs (submitted_by);

-- 2. RLS initplan ----------------------------------------------------------

alter policy profiles_select_own on public.profiles
  using ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles
  using ((select auth.uid()) = id);

alter policy songs_select_admin_all on public.songs
  using (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and profiles.is_admin = true
  ));
alter policy songs_select_own on public.songs
  using (submitted_by = (select auth.uid()));

alter policy playlists_select on public.playlists
  using (
    (select auth.uid()) = owner_id
    or visibility in ('public', 'unlisted')
  );
alter policy playlists_insert_own on public.playlists
  with check ((select auth.uid()) = owner_id);
alter policy playlists_update_own on public.playlists
  using ((select auth.uid()) = owner_id);
alter policy playlists_delete_own_non_default on public.playlists
  using ((select auth.uid()) = owner_id and is_default = false);

alter policy playlist_songs_select on public.playlist_songs
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_songs.playlist_id
      and (p.owner_id = (select auth.uid())
           or p.visibility in ('public', 'unlisted'))
  ));
alter policy playlist_songs_insert_own on public.playlist_songs
  with check (exists (
    select 1 from public.playlists p
    where p.id = playlist_songs.playlist_id
      and p.owner_id = (select auth.uid())
  ));
alter policy playlist_songs_update_own on public.playlist_songs
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_songs.playlist_id
      and p.owner_id = (select auth.uid())
  ));
alter policy playlist_songs_delete_own on public.playlist_songs
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_songs.playlist_id
      and p.owner_id = (select auth.uid())
  ));

alter policy "artists admin write" on public.artists
  using (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and profiles.is_admin
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and profiles.is_admin
  ));

alter policy song_reports_insert_own on public.song_reports
  with check (reporter_id = (select auth.uid()));

-- 3. Pin search_path -------------------------------------------------------

alter function public.gen_playlist_slug() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.songs_extract_lyrics() set search_path = public;
alter function public.touch_song_variants_updated_at() set search_path = public;
alter function public.touch_strumming_patterns_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.handle_new_profile_playlist() set search_path = public;

-- 4. SECURITY DEFINER lockdown ---------------------------------------------
-- Trigger functions fire regardless of the caller's EXECUTE privilege, and
-- increment_variant_views is only called through the service-role client
-- (app/api/songs/view) — none of these belong on the anon/authenticated
-- RPC surface.

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
revoke execute on function public.handle_new_profile_playlist()
  from public, anon, authenticated;
revoke execute on function public.increment_variant_views(uuid)
  from public, anon, authenticated;
grant execute on function public.increment_variant_views(uuid) to service_role;
