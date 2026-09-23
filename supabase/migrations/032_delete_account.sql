-- 032: self-service account deletion (App Store Guideline 5.1.1(v))
--
-- Apple requires an in-app path that deletes the account, not just the session.
-- The iOS app calls this RPC as the logged-in user and then signs out.
--
-- Deleting auth.users cascades to public.profiles, and from there to
-- playlists -> playlist_songs and song_reports.reporter_id. The remaining
-- references are moderation/attribution columns with ON DELETE NO ACTION
-- (songs.submitted_by / reviewed_by, song_variants.author_id,
-- song_reports.resolved_by) — the delete would fail on them, so they are
-- nulled first. All four are nullable; contributed content stays published,
-- just unattributed.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.songs set submitted_by = null where submitted_by = uid;
  update public.songs set reviewed_by = null where reviewed_by = uid;
  update public.song_variants set author_id = null where author_id = uid;
  update public.song_reports set resolved_by = null where resolved_by = uid;

  -- Аватари НЕ чистимо тут: Postgres-рівнем Supabase забороняє прямий delete зі
  -- storage.objects («Direct deletion from storage tables is not allowed»), і
  -- ця спроба валила всю функцію з 42501. Файли прибирає клієнт через Storage
  -- API перед викликом RPC (AuthManager.deleteAccount), best-effort — навіть
  -- якщо не вийде, акаунт має видалитись.
  delete from auth.users where id = uid;
end;
$$;

-- Callable only by a logged-in user; it derives the target from auth.uid(),
-- so it takes no arguments and cannot be pointed at someone else.
revoke execute on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
