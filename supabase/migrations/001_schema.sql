-- ─── Types ────────────────────────────────────────────────────────────────────

CREATE TYPE song_status AS ENUM (
  'draft',
  'pending',
  'published',
  'rejected',
  'archived'
);

CREATE TYPE difficulty_level AS ENUM (
  'easy',
  'medium',
  'hard'
);

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Mirrors auth.users. Created automatically via trigger on sign-up.

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  username   text,
  is_admin   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile; admins can read all.
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile.
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─── Trigger: create profile on sign-up ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── Songs ────────────────────────────────────────────────────────────────────

CREATE TABLE songs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  artist        text NOT NULL,
  album         text,
  genre         text NOT NULL,
  key           text NOT NULL,
  capo          integer,
  tempo         integer,
  difficulty    difficulty_level NOT NULL DEFAULT 'easy',
  chords        text[] NOT NULL DEFAULT '{}',
  views         integer NOT NULL DEFAULT 0,
  -- sections: array of { label: string, lines: { chords: string[], lyrics: string }[] }
  sections      jsonb NOT NULL DEFAULT '[]',
  strumming     text[],
  cover_image   text,
  cover_color   text,
  youtube_id    text,
  status        song_status NOT NULL DEFAULT 'published',
  submitted_by  uuid REFERENCES profiles(id),
  reviewed_by   uuid REFERENCES profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read published songs.
CREATE POLICY "songs_select_published" ON songs
  FOR SELECT USING (status = 'published');

-- Only service role (admins) can insert/update/delete — enforced at application
-- layer via the service role key. No user-facing write policies in MVP.

CREATE INDEX songs_slug_idx ON songs (slug);
CREATE INDEX songs_artist_idx ON songs (artist);
CREATE INDEX songs_status_idx ON songs (status);

-- ─── Saved songs ──────────────────────────────────────────────────────────────

CREATE TABLE saved_songs (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id    uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, song_id)
);

ALTER TABLE saved_songs ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own saved songs.
CREATE POLICY "saved_songs_select_own" ON saved_songs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_songs_insert_own" ON saved_songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_songs_delete_own" ON saved_songs
  FOR DELETE USING (auth.uid() = user_id);
