# Diez

**Diez** is a Ukrainian web platform for searching, viewing and contributing guitar chords.

🌐 **Live:** [diez.net.ua](https://diez.net.ua)

## Features

- **Songs and chords** — lyrics with chords above the words, key, capo, tempo, difficulty and strumming patterns.
- **Song variants** — several arrangements of the same song, with one marked as primary.
- **Artists** — artist pages with photos, bios and name aliases for search.
- **Search** — by song title, artist and lyrics (trigram search).
- **Playlists** — personal collections that can be private, unlisted or public.
- **Chord identifier** — find a chord by its fingering.
- **Guitar tuner** — works in the browser through the Web Audio API.
- **Community submissions** — users add songs, admins review and publish them.
- **Admin dashboard** — manage songs, variants and artists.

## Tech stack

- [Next.js](https://nextjs.org) (App Router), React, TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres, auth, storage
- [Cloudflare Workers](https://workers.cloudflare.com) via [OpenNext](https://opennext.js.org/cloudflare)

## Project structure

```
app/         routes (pages, layouts, API)
features/    feature modules: song, artist, playlist, profile, tuner, learn, home
components/  shared UI components
lib/         helpers and Supabase clients
supabase/    database migrations and seed data
```

## Getting started

Requirements: Node.js 20+ and a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase keys:

   ```bash
   cp .env.example .env.local
   ```

3. Apply the migrations from `supabase/migrations` to your database.

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the Next.js app |
| `npm run lint` | Run ESLint |
| `npm run cf:preview` | Build and preview the Cloudflare Worker locally |
| `npm run cf:deploy` | Build and deploy to Cloudflare |

## Author

Made by [Ivan Shevchenko](https://github.com/shevchenko-ivan).
