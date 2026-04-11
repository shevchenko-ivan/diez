# Diez — Project Context

## Product
Diez is a Ukrainian web platform for searching, viewing, and later contributing guitar chords.
UI language: Ukrainian (buttons, labels, status text — all in Ukrainian).

## Current priority
Batch 3 — UI consistency pass before launch. Backend is ready. Do not change data model or architecture.

---

## MVP goals
- Fast song search
- Readable song page with chords
- Artist pages
- Admin moderation
- Auth + RLS
- Replace mock data with Supabase
- Move mock content into seed

---

## Do not change now
- Do not redesign UI
- Do not add new product features
- Do not add audio search, transpose, tuner, metronome, playlists, AI recognition
- Do not over-engineer profile/dashboard
- Do not change the data model or migrations

---

## Approved routing
- /
- /songs
- /songs/[slug]
- /artists
- /artists/[slug]
- /auth/login
- /auth/sign-up
- /profile
- /add
- /admin

---

## Data model (actual, after Batch 2)

Tables:
- profiles
- artists
- songs
- saved_songs

### Song status values
```
published | draft | archived
```
> ⚠️ Not pending/rejected — those were the original plan, actual implementation uses published/draft/archived.

### Admin gate
```ts
profiles.is_admin = true  // boolean field
```
> ⚠️ Not `profiles.role = 'admin'` — actual implementation uses `is_admin` boolean.

### Notes
- `profiles` 1:1 with `auth.users` (no conflict)
- `songs.lyrics` stored as JSONB (sections + chords parsed from `[Am]` syntax)
- Defer: albums, ratings, tags, comments, versioning, social features

---

## Auth and permissions
- Guests: browse published content only
- Authenticated users: save songs, submit songs
- Admins: moderate songs, manage content
- Access control via RLS + `is_admin` check in server actions

---

## Architecture

```
app/          routing and page composition only
features/     user actions and business flows
entities/     domain entities and types
shared/       reusable UI, utils, Supabase clients
lib/supabase/
  client.ts   browser client
  server.ts   server component client
  admin.ts    service-role client (SUPABASE_SERVICE_ROLE_KEY)
```

---

## Current implementation status

### ✅ Done (Batch 1–2)
- Schema + migrations (001, 002)
- RLS policies (public reads, admin reads via 002_admin_read_policy.sql)
- `lib/supabase/admin.ts` — service-role client
- `features/song/actions/admin.ts` — createSong, updateSongStatus, deleteSong (all with requireAdmin)
- `/add` page — song creation form with genre/key selects, `[Am]` lyrics parsing → JSONB
- `/admin` page — dashboard with real stats, status badges, publish/archive/delete actions
- Admin creates song → immediately published
- Non-admin redirect from /admin

### ⏳ Launch blockers
- [ ] Apply migrations 001 + 002 in Supabase prod
- [ ] Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars
- [ ] `UPDATE profiles SET is_admin = true WHERE email = 'your@email.com'`

### ⏳ Low priority (post-launch)
- Profile saved_songs queries (currently mock)
- Root layout metadata (currently in English)

---

## Batch 3 scope — UI consistency pass

Goal: make existing UI minimal but coherent. No redesign — align patterns across pages.

1. App shell + page headers
2. Button variants (primary / secondary / destructive)
3. Form patterns
4. Status chips/badges (published / draft / archived)
5. Table/list row patterns
6. Card/detail patterns
7. Loading / empty / error states
8. Admin UI consistency

---

## Working style
- Be concise and practical
- Prefer simple production-ready solutions
- Do not introduce unnecessary abstractions
- Preserve project consistency
- When in doubt — check existing components before creating new ones

---

## Model routing (for reference)
| Task | Model |
|------|-------|
| Batch / architecture / system decisions | Opus 4.6 |
| Single page tweaks | Sonnet 4.6 |
| Utility / checklists | Haiku 4.5 |
