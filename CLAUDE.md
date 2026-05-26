# Diez — Project Context

## Product
Diez is a Ukrainian web platform for searching, viewing, and contributing guitar chords.
UI language: Ukrainian (buttons, labels, status text — all in Ukrainian).

## Current priority
Post-launch polish: cover enrichment, lyrics search, artist dedupe, per-page tweaks.
Live at `https://diez.net.ua`.

---

## Working principles
- Be concise and practical
- Prefer simple production-ready solutions
- Do not introduce unnecessary abstractions
- Preserve project consistency — check existing components before creating new ones
- UI texts — Ukrainian

---

## Browser support

Diez targets **Baseline Newly Available** features (e.g. `text-wrap: balance`,
`content-visibility`, `:user-valid`). Custom fallbacks are welcome only if
they fit in ≤20 lines. No polyfills. Features without a graceful fallback
(e.g. CSS Anchor Positioning) — skip until they reach Baseline Widely
Available.

---

## Routes (actual)

Public:
- `/` — home
- `/about`, `/privacy`, `/terms`
- `/songs`, `/songs/[slug]`
- `/artists`, `/artists/[slug]`
- `/chords` — chord identifier
- `/tuner` — guitar tuner (Web Audio)
- `/lists/[slug]` — public playlist view
- `/ui-kit` — internal design system demo

Auth:
- `/auth/login`, `/auth/sign-up`, `/auth/sign-up-success`
- `/auth/forgot-password`, `/auth/update-password`, `/auth/error`

User:
- `/profile`, `/profile/lists`, `/profile/lists/[id]`
- `/add` — submit a song

Admin (`profiles.is_admin = true`):
- `/admin` — dashboard
- `/admin/artists`, `/admin/artists/new`, `/admin/artists/edit`
- `/admin/songs`, `/admin/songs/edit`, `/admin/songs/variants/new`

---

## Data model

### Tables
- **profiles** — 1:1 mirror of `auth.users` (auto-created via `on_auth_user_created` trigger). Holds `is_admin` boolean.
- **artists** — `id, slug, name, photo_url, bio, genre, aliases text[], archived_at, spotify_*`, popularity fields. `aliases` has a GIN index for name-variant lookup.
- **songs** — `id, slug, title, artist (text, not FK), album, genre, key, capo, tempo, difficulty, chords text[], sections jsonb, strumming text[], views, cover_image, cover_color, youtube_id, time_signature, status, submitted_by, reviewed_by, reviewed_at, primary_variant_id (NOT NULL FK → song_variants), lyrics_text (trigger-populated), created_at, updated_at`.
- **song_variants** — alternative arrangements of the same song. `songs.primary_variant_id` points to the default.
- **playlists** — user collections (`private | unlisted | public`). One default per user.
- **playlist_songs** — song↔playlist link with position, optional variant_id, added_at.

### Enums
```
songs.status: draft | pending | published | rejected | archived
difficulty:    easy  | medium  | hard
```

### Notes
- `songs.sections` stored as JSONB (parsed from `[Am]` lyrics syntax).
- `songs.lyrics_text` is denormalized via trigger (migration 017) and GIN-indexed for trigram search. Activated only when `q.length ≥ 3`.
- Artist `aliases` drives: slug resolver, search query expansion, SEO `alternateName`, Deezer photo lookup. See `memory/project_artist_dedupe_aliases.md`.
- Supabase project ID: `gcrjfhwpgpzsqftsbped`.

### Auth & permissions
- Guests: browse published content only.
- Authenticated: save songs into playlists, submit songs.
- Admins: moderate songs, manage artists, edit variants.
- Enforced via RLS + `is_admin` check in server actions.

---

## Architecture

```
app/          routing and page composition only
features/     user actions and business flows (song, artist, playlist, song-submit, …)
entities/     domain entities and shared types
shared/       reusable UI, hooks, utils
lib/supabase/
  client.ts   browser client
  server.ts   server-component client (cookies)
  admin.ts    service-role client (SUPABASE_SERVICE_ROLE_KEY)
scripts/      local-only import / enrichment / audit scripts (in .gitignore)
```

### Server actions
- `features/song/actions/admin.ts` — createSong, updateSong, updateSongStatus, deleteSong, bulk*, createVariant / updateVariant / setPrimaryVariant / deleteVariant.
- `features/artist/actions/admin.ts` — createArtist, updateArtist, updateArtistPhoto, archive/restore/delete + bulk.
- `features/playlist/actions/playlists.ts` — getMyPlaylists, createPlaylist, setSongPlaylists, reorderPlaylistSongs, getSavedSlugs / getSavedVariantId.

---

## Migrations (numbered, applied in prod)

| #   | Purpose |
|-----|---------|
| 001 | Base types (song_status, difficulty), profiles, songs, saved_songs |
| 002 | Admin read policy for songs |
| 003 | `artists` table + slug/name/photo_url/bio/genre |
| 004 | `artists.archived_at` soft-delete |
| 005 | `songs.time_signature` ('4/4' default) |
| 006 | `playlists` + `playlist_songs` (replaces `saved_songs`) |
| 007 | Search indexes (title/artist trigram, status+views, status+created_at) |
| 008 | `song_variants` + `songs.primary_variant_id` |
| 009 | `playlist_songs.variant_id` |
| 010 | `increment_views` RPC |
| 011 | `primary_variant_id` NULL → NOT NULL |
| 013 | `artists.spotify_*` fields |
| 014 | popularity tracking fields |
| 015 | source/view telemetry (scrubbed of vendor names) |
| 016 | `artists.aliases text[]` + GIN index |
| 017 | `songs.lyrics_text` trigger + trigram GIN |

---

## Scope guardrails

Post-launch defaults — do NOT do these unless user explicitly asks:
- Do not redesign existing pages.
- Do not change the data model or add migrations for features not discussed.
- Do not introduce new heavy abstractions (ORM, state libraries, design system replacements).
- Do not over-engineer `/profile` or `/admin`.

Active features (may be extended):
- Tuner (`/tuner`) — Web Audio + procedural Three.js.
- Chord identifier (`/chords`).
- Playlists + public shared lists.
- Song variants.

---

## Gotchas — see `memory/` for full notes
- **Supabase 1000-row cap** → always paginate via `.range()`. Slugs ≠ `slugify(name)` — use `getArtistSlugByName()`. `jsonb::text` is not IMMUTABLE, can't be a GENERATED column. PostgREST `.or()` needs `%,()` escaped.
- **UA keyboard layout** → shortcuts use `e.code` (KeyK/KeyJ/KeyL), not `e.key`.
- **Scripts in `/scripts/`** are gitignored. Import / enrichment / audit helpers live here. Don't publish them, don't mention vendor names in commits or migrations.
- **Cover enrichment pipeline** (4 steps): Deezer-track → iTunes → artist-photo fallback → Deezer-artist search. ~98.5% coverage.
- **Memory index**: `memory/MEMORY.md`.

---

## Model routing
| Task | Model |
|------|-------|
| Batch / architecture / system decisions | Opus 4.6 |
| Single page tweaks | Sonnet 4.6 |
| Utility / checklists | Haiku 4.5 |
