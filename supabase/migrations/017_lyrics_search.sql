-- ─── Full-text search in song lyrics ─────────────────────────────────────────
-- Goal: let users find songs by typing part of the lyrics/chorus.
-- We keep a denormalised `lyrics_text` column maintained by a trigger and
-- index it with trigram so ILIKE '%q%' is fast.

alter table songs add column if not exists lyrics_text text not null default '';

create or replace function songs_extract_lyrics() returns trigger as $$
declare
  section jsonb;
  line jsonb;
  parts text[] := '{}';
begin
  if jsonb_typeof(new.sections) = 'array' then
    for section in select jsonb_array_elements(new.sections)
    loop
      if jsonb_typeof(section->'lines') = 'array' then
        for line in select jsonb_array_elements(section->'lines')
        loop
          parts := parts || coalesce(line->>'lyrics', '');
        end loop;
      end if;
    end loop;
  end if;
  -- Fallback: if structure is non-standard, index the raw JSON text so
  -- ILIKE still hits any lyric-like content.
  if array_length(parts, 1) is null then
    new.lyrics_text := coalesce(new.sections::text, '');
  else
    new.lyrics_text := array_to_string(parts, ' ');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists songs_extract_lyrics_trg on songs;
create trigger songs_extract_lyrics_trg
  before insert or update of sections on songs
  for each row execute function songs_extract_lyrics();

-- Backfill existing rows: touching `sections` fires the trigger.
update songs set sections = sections;

create index if not exists songs_lyrics_trgm_idx
  on songs using gin (lyrics_text gin_trgm_ops);
