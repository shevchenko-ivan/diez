-- Search reads go through this owner-rights view to sidestep an RLS planner
-- limitation. The anon-role policy on songs ("published OR is_admin") injects
-- an InitPlan subquery into every predicate, and because ILIKE is not
-- leakproof the planner refuses to push search patterns down into the trigram
-- indexes — every suggest keystroke degraded to a ~350ms seq scan over the
-- whole catalogue. The same query through a view owned by postgres (default
-- security-definer semantics, RLS not applied) restores the BitmapOr over
-- songs_title/artist/lyrics_trgm_idx (~50ms).
--
-- Exposure is unchanged: the view is hard-filtered to published rows, which
-- anon can already read in full under RLS.
--
-- NOTE: `select *` snapshots the column list at creation time — recreate the
-- view if a future migration adds a column search needs to read.
create or replace view public.songs_search as
  select * from public.songs where status = 'published';

grant select on public.songs_search to anon, authenticated;
