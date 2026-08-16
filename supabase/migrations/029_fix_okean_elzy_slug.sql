-- «Океан Ельзи»: the artist slug was mangled by an early transliterator
-- (apostrophe → character code): okyean-el697zy. Rename to the clean slug.
-- The app ships a permanent redirect for the old slug (LEGACY_ARTIST_SLUGS),
-- so bookmarks and external links keep working after this rename.
-- Guarded so a re-run (or an already-existing clean slug) is a no-op.

update public.artists
set slug = 'okean-elzy'
where slug = 'okyean-el697zy'
  and not exists (select 1 from public.artists where slug = 'okean-elzy');
