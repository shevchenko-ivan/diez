---
trigger: always_on
---

# Diez — SEO Rules

These rules protect the SEO foundation. Every new public page and feature must follow them.
Do not deviate without a documented reason.

---

## 1. Production-only indexing

**Rule:** Crawlers must be blocked on every deployment except production.

- Production is defined by `NEXT_PUBLIC_SITE_URL` being set in the environment.
- `robots.ts` and `sitemap.ts` both read `!!process.env.NEXT_PUBLIC_SITE_URL`.
- If not set → `robots.ts` returns `Disallow: /`, `sitemap.ts` returns `[]`.
- Never set `NEXT_PUBLIC_SITE_URL` on preview, staging, or local environments.

```ts
// ✅ Correct — both files use the same guard
const isProduction = !!process.env.NEXT_PUBLIC_SITE_URL;
if (!isProduction) return []; // sitemap
if (!isProduction) return { rules: { userAgent: "*", disallow: "/" } }; // robots
```

---

## 2. Canonical URLs

**Rule:** Every public indexable page must emit exactly one canonical tag.

- Set `alternates: { canonical: "/path" }` in the page's `metadata` or `generateMetadata`.
- Use relative paths only. They are resolved against `metadataBase` in `app/layout.tsx`.
- `metadataBase` uses `siteUrl` from `lib/utils.ts`, which reads `NEXT_PUBLIC_SITE_URL` first.
- Never hardcode an absolute URL in canonical. Never use `siteUrl` directly in metadata fields — use relative paths and let `metadataBase` resolve them.

```ts
// ✅ Correct
alternates: { canonical: "/songs/obiymy" }

// ❌ Wrong — hardcoded production domain
alternates: { canonical: "https://diez.ua/songs/obiymy" }

// ❌ Wrong — preview URL leaks if NEXT_PUBLIC_SITE_URL is unset
alternates: { canonical: `${siteUrl}/songs/obiymy` }
```

---

## 3. Filtered and search pages

**Rule:** Query params do not change the canonical. The canonical always points to the clean URL.

Pages like `/songs?q=Ocean&sort=popular` must have `canonical: "/songs"`.
Never emit a canonical that includes query params.

```ts
// ✅ Correct — static metadata on /songs listing
export const metadata: Metadata = {
  alternates: { canonical: "/songs" },
  ...
};

// ❌ Wrong — canonical with search params
alternates: { canonical: `/songs?q=${query}` }
```

---

## 4. Metadata requirements per page type

Every public indexable page must export either `metadata` (static) or `generateMetadata` (dynamic) containing:

| Field | Required |
|---|---|
| `title` | Yes |
| `description` | Yes |
| `alternates.canonical` | Yes |
| `openGraph.title` | Yes |
| `openGraph.description` | Yes |
| `openGraph.type` | Yes |
| `openGraph.url` | Yes |

Pages that inherit title/description from root layout still need their own `alternates.canonical`.

```ts
// ✅ Correct — home page only needs canonical; inherits title/description from layout
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// ❌ Wrong — no metadata export at all; no canonical is emitted
export default function HomePage() { ... }
```

---

## 5. Open Graph images

**Rule:** Use content-specific OG images when available. Fall back to `app/opengraph-image.png`.

- Song pages: set `openGraph.images` to `song.coverImage` when it exists.
- Artist pages: defer until `artists.image_url` is available from Supabase.
- Listing pages (`/songs`, `/artists`): inherit `app/opengraph-image.png` via Next.js file hierarchy — no explicit image needed.
- Image paths in `openGraph.images` must be relative (resolved against `metadataBase`).

```ts
// ✅ Correct — song page with conditional cover image
openGraph: {
  ...
  ...(song.coverImage && {
    images: [{ url: song.coverImage, alt: `${song.title} — ${song.artist}` }],
  }),
},

// ❌ Wrong — absolute URL hardcoded; breaks on staging
images: [{ url: "https://diez.ua/songs/obiymy.png" }]
```

---

## 6. OG type values

Use the correct `openGraph.type` per page:

| Page type | Correct `og:type` |
|---|---|
| Home, listing pages | `"website"` |
| Song page | `"article"` |
| Artist page | `"website"` |

Do not use `"profile"` — it requires `profile:first_name` / `profile:last_name` meta properties that are absent.

---

## 7. Structured data (JSON-LD)

**Rule:** Add JSON-LD only where schema.org has a relevant type. Do not invent types.

Current usage:
- `/songs/[slug]` → `MusicComposition` (name, composer, musicalKey, genre, url, inAlbum)
- `/artists/[slug]` → `MusicGroup` (name, url)

Rules:
- Place `<script type="application/ld+json">` as the first child of the page's root element, before `<Navbar />`.
- Use `JSON.stringify` with no indentation (no pretty-print in production HTML).
- All URLs in JSON-LD must be absolute. Use `siteUrl` from `lib/utils.ts`.
- Type the object as `Record<string, unknown>` when it has conditional spread fields.

```ts
// ✅ Correct placement and typing
const jsonLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "MusicComposition",
  name: song.title,
  url: `${siteUrl}/songs/${song.slug}`,  // absolute — JSON-LD requires it
  ...(song.album && { inAlbum: { "@type": "MusicAlbum", name: song.album } }),
};
return (
  <div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <Navbar />
    ...
  </div>
);
```

---

## 8. Sitemap inclusion

**Rule:** Include a URL in `sitemap.ts` only if:
1. The page is publicly accessible without authentication.
2. The page has its own canonical metadata.
3. The content is stable (not search-result or filter-variant pages).

Current inclusions: `/`, `/songs`, `/artists`, `/songs/[slug]`, `/artists/[slug]`

Do NOT include:
- `/admin`, `/profile`, `/add` — protected/authenticated
- `/auth/*` — utility pages
- `/songs?q=...` — filtered variants (canonical points to `/songs`)

When adding a new public page that should be indexed, add it to `sitemap.ts` at the same time.

---

## 9. Robots disallow list

Currently disallowed: `/admin`, `/profile`, `/add`, `/auth/`

**Rule:** Any route that requires authentication or is admin-only must be in the `disallow` list in `robots.ts`. Update both `robots.ts` and `sitemap.ts` together when adding new protected routes.

---

## 10. Internal linking

**Rule:** Every song page must link to the artist page. Every artist page displays all songs by that artist.

- Song header: artist name links to `/artists/[slug]`
- Song page footer: "Ще від [artist]" section shows up to 4 other songs by the same artist
- Artist slug format: `artist.toLowerCase().replace(/\s+/g, "-")`

Do not add internal links to protected, admin, or auth pages.

---

## 11. siteUrl usage rules

`siteUrl` from `lib/utils.ts` resolves: `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → `localhost:3000`

| Use case | Use `siteUrl`? |
|---|---|
| `metadataBase` in layout | Yes |
| `alternates.canonical` in metadata | No — use relative path |
| `openGraph.url` in metadata | No — use relative path |
| `openGraph.images[].url` in metadata | No — use relative path |
| JSON-LD `url` fields | Yes — JSON-LD requires absolute URLs |
| `sitemap.ts` URLs | Yes |
| `robots.ts` sitemap pointer | Yes |

---

## 12. Checklist — adding a new public page

When creating a new public route under `app/`, do all of the following before committing:

- [ ] Export `metadata` or `generateMetadata` with `title`, `description`, `alternates.canonical`, and `openGraph` fields
- [ ] Canonical is a relative path, no query params
- [ ] `openGraph.type` is correct for the page type (see §6)
- [ ] If the page has a content-specific image, set `openGraph.images`
- [ ] Add the URL to `sitemap.ts` if the page should be indexed
- [ ] If the page is protected, add it to the `disallow` list in `robots.ts`
- [ ] If the page uses JSON-LD, URLs in the LD are absolute (via `siteUrl`)
- [ ] Page links to related content (artist ↔ songs) where applicable

---

## 13. Pre-release SEO checklist

Before shipping to production:

- [ ] `NEXT_PUBLIC_SITE_URL` set to the production domain in Vercel env vars (production environment only)
- [ ] `GET /robots.txt` → `Allow: /`, correct `Disallow` entries, `Sitemap:` URL uses production domain
- [ ] `GET /sitemap.xml` → all expected URLs present, all use production domain
- [ ] View source on `/` → `<link rel="canonical" href="https://diez.ua/"/>` present
- [ ] View source on a song page → canonical is `/songs/[slug]`, not a preview URL
- [ ] View source on a song page → `og:image` shows song cover URL (not generic)
- [ ] Paste a song URL into an OG debugger → correct title, description, image
- [ ] Google Rich Results Test on a song page → `MusicComposition` detected, no errors
- [ ] Preview deployment → `GET /robots.txt` returns `Disallow: /` only
- [ ] Preview deployment → `GET /sitemap.xml` returns empty XML
