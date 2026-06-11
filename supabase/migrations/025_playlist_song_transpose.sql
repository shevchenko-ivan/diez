-- Save the on-screen transpose together with the playlist membership so a
-- saved song reopens in the key the user had at the moment of saving.
-- Range: -11..+11 semitones (UI clamps to ±11), 0 = original key.

alter table public.playlist_songs
  add column if not exists transpose smallint not null default 0;
