-- songs_search (031) runs with owner rights and is a simple, auto-updatable
-- view — and Supabase's default privileges had granted anon/authenticated
-- INSERT/UPDATE/DELETE/TRUNCATE on it. With the public anon key anyone could
-- modify or delete published songs through it, bypassing RLS. Search only
-- ever needs SELECT.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON public.songs_search FROM anon, authenticated;
