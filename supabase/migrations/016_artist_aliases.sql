-- Artist aliases for search / SEO.
-- Stores alternative spellings (transliteration, Latin/Cyrillic, common misspellings)
-- so on-site search and Google index both variants but only one artist card exists.
alter table artists
  add column if not exists aliases text[] not null default '{}';

-- Index for ilike-style alias lookup (gin on array + text pattern).
create index if not exists artists_aliases_gin on artists using gin (aliases);
