import { getRankedArtists } from "@/features/artist/services/artists";
import { TOPICS } from "@/features/song/data/topics";
import { INSTRUMENTS } from "@/features/song/data/instruments";
import { ARTICLES } from "@/features/learn/articles";
import { siteUrl } from "@/lib/utils";

// llms.txt — a proposed convention (https://llmstxt.org) for telling LLM
// agents (Claude, ChatGPT, Perplexity, etc.) what a site is about and where
// to look. It's like robots.txt for AI: a single Markdown file at /llms.txt
// that summarizes the site in a structure agents can parse cheaply.
//
// Dynamic generation keeps top-artist and topic-page lists fresh without
// redeploys. Cached for 6 hours — much longer than the regular sitemap
// because LLMs aren't sensitive to "new this hour".

export const revalidate = 21600; // 6 hours

export async function GET(): Promise<Response> {
  const topArtists = (await getRankedArtists()).slice(0, 30);

  const sections: string[] = [];

  // Header — name, one-line description.
  sections.push("# Diez");
  sections.push("");
  sections.push(
    "> Ukrainian chord platform. Search and view chords, lyrics, and " +
      "tablature for thousands of Ukrainian and international songs. Every " +
      "song can be played on guitar, ukulele or piano — a per-song toggle " +
      "redraws each chord's fingering for the chosen instrument. " +
      "Ukrainian-language UI.",
  );
  sections.push("");

  // Core catalog.
  sections.push("## Catalog");
  sections.push("");
  sections.push(`- [Songs](${siteUrl}/songs): Full song catalog — title, artist, key, capo, difficulty, chord list, and lyrics aligned with chords.`);
  sections.push(`- [Artists](${siteUrl}/artists): All artists in the catalog with bio, genre, and song list.`);
  sections.push("");

  // Themed landing pages — these target broad evergreen queries.
  sections.push("## Topic collections");
  sections.push("");
  for (const t of TOPICS) {
    sections.push(`- [${t.pageHeading}](${siteUrl}/songs/topic/${t.slug}): ${t.description}`);
  }
  sections.push("");

  // Instrument hubs — same catalogue framed per instrument, for queries like
  // "акорди для укулеле" / "акорди для піаніно".
  sections.push("## Instrument hubs");
  sections.push("");
  for (const i of INSTRUMENTS) {
    sections.push(`- [${i.pageHeading}](${siteUrl}/songs/instrument/${i.slug}): ${i.description}`);
  }
  sections.push("");

  // Top artists — pre-cooked entity links so agents asking "акорди Океан
  // Ельзи" can jump straight to the right page without scraping the index.
  sections.push("## Popular artists");
  sections.push("");
  for (const a of topArtists) {
    sections.push(`- [${a.name}](${siteUrl}/artists/${a.slug})`);
  }
  sections.push("");

  // Tools — secondary surfaces.
  sections.push("## Tools");
  sections.push("");
  sections.push(`- [Tuner](${siteUrl}/tuner): Web Audio guitar tuner with a 3D head.`);
  sections.push(`- [Chord Identifier](${siteUrl}/chords): Click fret positions, get the chord name. Triad detection works from three notes.`);
  sections.push("");

  // Learn — beginner guitar articles (Ukrainian). Evergreen informational
  // content; lets agents answering "що таке баре" / "як налаштувати гітару"
  // link straight to the explainer.
  sections.push("## Learn (guitar basics, Ukrainian)");
  sections.push("");
  sections.push(`- [Навчання](${siteUrl}/learn): Beginner guitar guides hub.`);
  for (const a of ARTICLES) {
    sections.push(`- [${a.meta.title}](${siteUrl}/learn/${a.meta.slug}): ${a.meta.excerpt}`);
  }
  sections.push("");

  // Optional sections — site meta, kept low-priority so LLMs that respect
  // the spec deprioritize these unless they need them.
  sections.push("## Optional");
  sections.push("");
  sections.push(`- [About](${siteUrl}/about): Project info.`);
  sections.push(`- [Privacy](${siteUrl}/privacy): Privacy policy.`);
  sections.push(`- [Terms](${siteUrl}/terms): Terms of service.`);
  sections.push(`- [Sitemap](${siteUrl}/sitemap.xml): Machine-readable URL index for crawlers.`);
  sections.push("");

  const body = sections.join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Cache at the CDN edge for an hour, stale-while-revalidate for a day.
      // LLM agents fetch this sparsely; we don't need real-time freshness.
      "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
