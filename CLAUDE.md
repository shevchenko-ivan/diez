# Diez — Project Context

## Product
Diez is a Ukrainian web platform for searching, viewing, and later contributing guitar chords.
UI language: Ukrainian (buttons, labels, status text — all in Ukrainian).

## Current priority
Post-launch polish. Batch 3 complete. Backend + deploy done.

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

## Data model (actual)

Tables:
- profiles
- songs
- saved_songs

> ⚠️ Таблиці `artists` в схемі немає — артист зберігається як текстове поле `songs.artist`.

### Song status values
```
published | draft | archived
```

### Admin gate
```ts
profiles.is_admin = true  // boolean field
```

### Notes
- `profiles` 1:1 with `auth.users`, створюється автоматично через тригер `on_auth_user_created`
- `songs.sections` stored as JSONB (sections + chords parsed from `[Am]` syntax)
- Supabase project ID: `gcrjfhwpgpzsqftsbped`
- Production URL: `https://diez-ten.vercel.app`
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

## Implementation status

### ✅ Done (Batch 1–2 + Deploy)
- Schema + migrations (001, 002) — applied in prod
- RLS policies (public reads, admin reads)
- `lib/supabase/admin.ts` — service-role client
- `features/song/actions/admin.ts` — createSong, updateSongStatus, deleteSong
- `/add` — song creation form with genre/key selects, `[Am]` lyrics parsing → JSONB
- `/admin` — dashboard with real stats, status badges, publish/archive/delete actions
- Auth: registration + email confirmation
- Profile auto-created via trigger on sign-up
- Search working
- `SUPABASE_SERVICE_ROLE_KEY` в Vercel (Production only)
- `is_admin = true` встановлено для власника
- MVP live: `https://diez-ten.vercel.app`

### ✅ Done (Batch 3 — complete)
- `.te-inset` і `.te-pressable` додані в `globals.css`
- Всі 4 auth форми переписані з shadcn/ui на TE design system
- `forgot-password` і `update-password` сторінки отримали Navbar + фон
- Фікс редіректу `update-password` → `/profile`
- `PageShell`, `PageHeader` — unified app shell і page headers
- `AdminTable`, `DifficultyBadge`, `FormField`, `EmptyState`, `LoadingState`, `ErrorState`, `StatusBadge` — shared компоненти
- `SongCard` — прибрано фейковий рейтинг, уніфіковано мітки складності
- `not-found.tsx` — 404 сторінка
- `/auth/error` — переписано на TE design system, українською
- Home page metadata — title, description, OpenGraph

### ⏳ Low priority (post-launch)
- Seed реальних пісень

---

## Batch 3 scope — UI consistency pass

Goal: make existing UI minimal but coherent. No redesign — align patterns across pages.

1. ✅ App shell + page headers
2. ✅ Button variants — `te-btn-orange` уніфікований в auth формах
3. ✅ Form patterns — auth форми на TE design system
4. ✅ Status chips/badges — `StatusBadge` (5 станів) + `DifficultyBadge`
5. ✅ Table/list row patterns — `AdminTable`, `AdminTh`, `AdminTr`
6. ✅ Card/detail patterns — `SongCard`, `ArtistCard`
7. ✅ Loading / empty / error states — `LoadingState`, `EmptyState`, `ErrorState`
8. ✅ Admin UI consistency — dashboard, таблиці, форми уніфіковані

---

## Working style
- Be concise and practical
- Prefer simple production-ready solutions
- Do not introduce unnecessary abstractions
- Preserve project consistency
- When in doubt — check existing components before creating new ones

---

## Model routing
| Task | Model |
|------|-------|
| Batch / architecture / system decisions | Opus 4.6 |
| Single page tweaks | Sonnet 4.6 |
| Utility / checklists | Haiku 4.5 |
