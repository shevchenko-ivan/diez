---
trigger: always_on
---

# Diez — Guitar Chords Platform Rules

## Product Overview

Diez is a web platform for searching and sharing guitar chords.

Core functionality:
- Visitors can search and view songs with chords
- Registered users can add and manage songs
- Admin can moderate content and manage users

---

## Core Entities

### Song
- title (string)
- artist (reference)
- album (reference, optional)
- genre (string)
- key (string, optional)
- chords (array of strings)
- lyrics_with_chords (text)
- difficulty (easy / medium / hard)
- created_at (date)
- created_by (user reference)

### Artist
- name (string)
- image (url)
- genres (array)
- songs_count (computed)

### Album
- title (string)
- artist (reference)
- cover (url)
- release_date (date)
- genre (string)

### User
- name
- email
- avatar
- role (user / admin)
- saved_songs (array)
- created_songs (array)

---

## User Roles

### Guest
- Can search songs
- Can view chords
- Cannot create or edit content

### Registered User
- Can add songs
- Can edit own songs
- Can save songs
- Can suggest edits

### Admin
- Full access to all content
- Can approve/reject songs
- Can delete or edit any song
- Can manage users

---

## Core Features

### Search
- Search by song title
- Search by artist
- Filter by genre
- Filter by difficulty
- Fast and simple UX (priority)

### Song Page
- Title + artist
- Chords inline with lyrics
- Save to favorites
- (Future) Transpose chords

### Add Song
- Form with:
  - title
  - artist
  - chords + lyrics editor
  - difficulty
- Validation required
- Can require admin approval (configurable)

### Admin Panel
- List of songs
- Pending approvals
- Users management
- Edit/delete content

---

## Data Relationships

- Song → belongs to Artist
- Song → optionally belongs to Album
- User → creates many Songs
- User → saves many Songs
- Artist → has many Songs
- Album → has many Songs

---

## UX Principles

- Fast access to chords (minimum steps)
- Clean and readable typography
- Mobile-first design
- Focus on musicians (not generic users)
- Reduce friction for adding songs

---

## Technical Stack

Frontend:
- Next.js (App Router)
- React
- TypeScript
- NextUI (UI components)

Backend:
- Next.js API routes or Supabase

Database:
- PostgreSQL (via Supabase)

Auth:
- Supabase Auth

Storage:
- Supabase Storage

---

## Project Structure

Use feature-based structure.

src/
  app/
  features/
    song/
      components/
      hooks/
      services/
      types.ts
    artist/
    album/
    user/
  shared/
    components/
    ui/
    lib/
    constants/
  services/
  store/
  styles/
  types/

---

## Coding Principles

- Use TypeScript everywhere
- Prefer functional components
- Keep components small and reusable
- Separate UI and business logic
- Avoid large files (>200 lines)

### Naming
- Components: PascalCase (SongCard.tsx)
- Hooks: useSomething
- Functions: camelCase
- Constants: UPPER_CASE

### File Rules
- One component per file
- Group files by feature

---

## React & Next.js Rules

- Use App Router
- Prefer Server Components
- Use Client Components only when needed

### Data Fetching
- Use server actions or API routes
- Avoid useEffect for data fetching if possible

### State Management
- Local state → useState
- Server state → fetch or React Query (optional)

---

## UI Rules (NextUI)

- Use NextUI as primary UI library
- Do not recreate existing components
- Extend via composition, not duplication
- Keep UI consistent

### Styling
- Use utility-first approach (Tailwind optional)
- Avoid inline styles
- Keep spacing consistent

---

## Libraries

Core:
- next
- react
- typescript

UI:
- @nextui-org/react
- lucide-react

Forms:
- react-hook-form
- zod

Data:
- @tanstack/react-query (optional)

Backend:
- supabase

Utils:
- clsx
- date-fns

---

## Auth & Permissions

- Use Supabase Auth
- Role-based access:
  - user
  - admin

- Protect admin routes on server level

---

## Content Moderation

- Songs can be:
  - auto-published OR
  - require admin approval

- Admin can:
  - approve
  - edit
  - delete

---

## Code Quality

- Use ESLint and Prettier
- Avoid "any" type
- Avoid console.log in production

### Validation
- Use Zod for all forms

### Error Handling
- Handle API errors gracefully

---

## Performance Rules

- Lazy load heavy components
- Optimize images
- Avoid unnecessary re-renders

---

## Future Features

- Chord transposer
- Auto-scroll
- Metronome
- Tuner
- Playlists
- AI chord recognition

---

## Agent Development Rules

- Follow project structure strictly
- Do not mix business logic with UI
- Reuse components before creating new ones
- Avoid over-engineering
- Write clean, scalable code
- Prioritize performance and simplicity