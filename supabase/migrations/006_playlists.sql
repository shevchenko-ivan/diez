-- ─── Playlists ────────────────────────────────────────────────────────────────
-- Custom favourite lists. Replaces the flat `saved_songs` table.
-- Each user gets a default list (`is_default = true`) named "Подобається".

CREATE TYPE playlist_visibility AS ENUM (
  'private',   -- only owner can see
  'unlisted',  -- anyone with the link
  'public'     -- listed publicly
);

-- ─── Slug generator (URL-safe, 10 chars, base36) ─────────────────────────────
-- Not cryptographically strong, but collision chance is ~10^-15 at our scale.

CREATE OR REPLACE FUNCTION public.gen_playlist_slug()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result   text := '';
  i        int;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(alphabet, (floor(random() * 36) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE playlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug        text UNIQUE NOT NULL DEFAULT gen_playlist_slug(),
  name        text NOT NULL,
  description text,
  visibility  playlist_visibility NOT NULL DEFAULT 'private',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX playlists_owner_id_idx ON playlists (owner_id);
CREATE INDEX playlists_slug_idx ON playlists (slug);
-- Only one default per user.
CREATE UNIQUE INDEX playlists_one_default_per_user
  ON playlists (owner_id) WHERE is_default;

CREATE TABLE playlist_songs (
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id     uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position    integer NOT NULL DEFAULT 0,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, song_id)
);

CREATE INDEX playlist_songs_playlist_idx ON playlist_songs (playlist_id, position);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

-- Read: owner always; public — anyone; unlisted — anyone (filter by slug at app layer).
CREATE POLICY "playlists_select" ON playlists
  FOR SELECT USING (
    auth.uid() = owner_id
    OR visibility IN ('public', 'unlisted')
  );

CREATE POLICY "playlists_insert_own" ON playlists
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "playlists_update_own" ON playlists
  FOR UPDATE USING (auth.uid() = owner_id);

-- Forbid deleting the default list.
CREATE POLICY "playlists_delete_own_non_default" ON playlists
  FOR DELETE USING (auth.uid() = owner_id AND is_default = false);

-- playlist_songs: follows parent playlist's read/write semantics.
CREATE POLICY "playlist_songs_select" ON playlist_songs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists p
      WHERE p.id = playlist_id
        AND (p.owner_id = auth.uid() OR p.visibility IN ('public', 'unlisted'))
    )
  );

CREATE POLICY "playlist_songs_insert_own" ON playlist_songs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "playlist_songs_update_own" ON playlist_songs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "playlist_songs_delete_own" ON playlist_songs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.owner_id = auth.uid())
  );

-- ─── Trigger: create default playlist for every new profile ──────────────────

CREATE OR REPLACE FUNCTION public.handle_new_profile_playlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.playlists (owner_id, name, is_default, visibility)
  VALUES (NEW.id, 'Подобається', true, 'private');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_playlist
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_profile_playlist();

-- ─── Data migration: saved_songs → default playlists ─────────────────────────

DO $$
DECLARE
  u record;
  pl_id uuid;
  pos int;
  s record;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM saved_songs LOOP
    -- Ensure a default playlist exists for this user.
    SELECT id INTO pl_id FROM playlists
     WHERE owner_id = u.user_id AND is_default = true;

    IF pl_id IS NULL THEN
      INSERT INTO playlists (owner_id, name, is_default, visibility)
      VALUES (u.user_id, 'Подобається', true, 'private')
      RETURNING id INTO pl_id;
    END IF;

    pos := 0;
    FOR s IN
      SELECT song_id, created_at FROM saved_songs
       WHERE user_id = u.user_id
       ORDER BY created_at ASC
    LOOP
      INSERT INTO playlist_songs (playlist_id, song_id, position, added_at)
      VALUES (pl_id, s.song_id, pos, s.created_at)
      ON CONFLICT DO NOTHING;
      pos := pos + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- ─── Backfill: default playlists for existing users without saves ────────────

INSERT INTO playlists (owner_id, name, is_default, visibility)
SELECT p.id, 'Подобається', true, 'private'
  FROM profiles p
 WHERE NOT EXISTS (
   SELECT 1 FROM playlists pl
    WHERE pl.owner_id = p.id AND pl.is_default = true
 );

-- ─── Drop the legacy table ───────────────────────────────────────────────────

DROP TABLE saved_songs;
