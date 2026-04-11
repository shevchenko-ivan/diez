# Diez — Project Context

## Product
Diez is a Ukrainian web platform for searching, viewing, and later contributing guitar chords.

## Current priority
Build a production-ready MVP on top of the existing frontend without changing the UI.

## MVP goals
- Fast song search
- Readable song page with chords
- Artist pages
- Admin moderation
- Auth + RLS
- Replace mock data with Supabase
- Move mock content into seed

## Do not change now
- Do not redesign UI
- Do not add new product features
- Do not add audio search, transpose, tuner, metronome, playlists, AI recognition
- Do not over-engineer profile/dashboard

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

## Preferred data model
Use a minimal MVP schema.

Tables:
- profiles
- artists
- songs
- saved_songs

Notes:
- Use `profiles` instead of `users` to avoid conflict with `auth.users`
- Prefer one `songs` table with `status`:
  - pending
  - published
  - rejected
- Defer albums, ratings, tags, comments, versioning, social features

## Auth and permissions
- Guests can browse published content
- Authenticated users can save songs and submit songs
- Admins can moderate songs and manage users
- Prefer RLS-based access control

## Architecture
Keep App Router + feature-based structure.

Suggested direction:
- app/ = routing and page composition
- features/ = user actions and business flows
- entities/ = domain entities
- shared/ = reusable ui, utils, supabase clients

## Backend priorities
1. Schema
2. Auth
3. RLS
4. Seed
5. Replace mock data
6. Admin flows

## Working style
- Be concise and practical
- Prefer simple production-ready solutions
- Do not introduce unnecessary abstractions
- Preserve project consistency