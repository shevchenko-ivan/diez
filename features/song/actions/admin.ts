"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slugify";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string | null | undefined, label = "ID"): string {
  if (!value || !UUID_RE.test(value)) throw new Error(`Невалідний ${label}`);
  return value;
}

function sanitizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("https://") && !value.startsWith("http://")) return null;
  return value;
}

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Не авторизовано");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Тільки для адміністраторів");
  return user.id;
}

// Matches a single chord token: Am, C#m7, Bbmaj7, F/C, Gsus4, etc.
const CHORD_TOKEN_RE = /^[A-G][b#]?(m|maj|min|dim|aug|sus|add)?[0-9]?(\/[A-G][b#]?)?$/;

function isChordOnlyLine(text: string): boolean {
  const tokens = text.trim().split(/\s+/);
  return tokens.length > 0 && tokens.every((t) => CHORD_TOKEN_RE.test(t));
}

// Check if a line is chord-only (bare tokens or all in [brackets] with no lyrics)
function isChordLine(text: string): boolean {
  const trimmed = text.trim();
  // Bare: "Am  Dm  F"
  if (!trimmed.includes("[") && isChordOnlyLine(trimmed)) return true;
  // Bracketed: "[Am] [Dm] [F]" — remove all [X] and check if only whitespace remains
  const withoutBrackets = trimmed.replace(/\[[^\]]+\]/g, "").trim();
  if (trimmed.includes("[") && withoutBrackets === "") return true;
  return false;
}

// Extract chord names and their column positions from a chord-only line
function extractChordPositions(text: string): { chord: string; col: number }[] {
  const results: { chord: string; col: number }[] = [];
  if (text.includes("[")) {
    const re = /\[([^\]]+)\]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      results.push({ chord: m[1], col: m.index });
    }
  } else {
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      results.push({ chord: m[0], col: m.index });
    }
  }
  return results;
}

// Merge a chord-only line with the lyrics line below it.
// Uses column positions to align chords above the correct words.
function mergeChordAndLyricLines(
  rawChordLine: string,
  rawLyricLine: string,
  allChords: Set<string>,
): { chords: string[]; lyrics: string } {
  const chordPositions = extractChordPositions(rawChordLine);
  const indentMatch = rawLyricLine.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1].length : 0;
  const words = rawLyricLine.trim().split(/\s+/);
  const lyrics = words.join(" ");
  const alignedChords: string[] = new Array(words.length).fill("");

  // Find column of each word in the raw lyric line
  const wordCols: number[] = [];
  let searchFrom = 0;
  for (const word of words) {
    const idx = rawLyricLine.indexOf(word, searchFrom);
    wordCols.push(idx >= 0 ? idx : searchFrom);
    searchFrom = (idx >= 0 ? idx : searchFrom) + word.length;
  }

  const lastWordEnd = words.length > 0
    ? wordCols[words.length - 1] + words[words.length - 1].length
    : 0;

  // Assign each chord to the word it's positioned above.
  // If chord column is within a word's span → that word.
  // If in a gap between words → the next word.
  // If beyond all lyrics → add trailing spacer slots.
  for (const { chord, col } of chordPositions) {
    allChords.add(chord);

    // Chord is beyond all lyrics text — add trailing spacers
    if (words.length > 0 && col >= lastWordEnd) {
      const gap = col - lastWordEnd;
      const targetIdx = words.length + Math.max(0, Math.round(gap / 3));
      while (alignedChords.length <= targetIdx) alignedChords.push("");
      alignedChords[targetIdx] = chord;
      continue;
    }

    let targetWord = 0;
    for (let w = 0; w < words.length; w++) {
      const wordStart = wordCols[w];
      const wordEnd = wordStart + words[w].length;
      if (col >= wordStart && col < wordEnd) {
        targetWord = w;
        break;
      }
      if (col < wordStart) {
        targetWord = w;
        break;
      }
      targetWord = w;
    }
    if (!alignedChords[targetWord]) {
      alignedChords[targetWord] = chord;
    }
  }

  return { chords: alignedChords, lyrics, ...(indent > 0 ? { indent } : {}) };
}

// Parse lyrics+chords text into sections format.
// Supports: [Am]text notation, bare chord lines (Am Dm F),
// and UG-style chord line + lyric line pairs with column alignment.
// Chords are word-aligned: chords[j] corresponds to word j in lyrics.
// Detect explicit section header: "Куплет 1:", "|Приспів|", etc.
// Only these create new sections — empty lines do NOT split sections.
const HEADER_COLON_RE = /^([^[\]]+):\s*$/;
const HEADER_PIPE_RE = /^\|([^|]+)\|\s*$/;

function parseLyricsWithChords(raw: string): {
  sections: { label: string; lines: { chords: string[]; lyrics: string }[] }[];
  chords: string[];
} {
  const allChords = new Set<string>();
  const allLines = raw.split("\n");

  // Group lines into sections based on explicit headers only
  const sectionGroups: { label: string; dataLines: string[] }[] = [];
  let currentGroup: { label: string; dataLines: string[] } | null = null;

  for (const line of allLines) {
    const trimmed = line.trim();

    // Check for explicit section header
    const colonMatch = trimmed.match(HEADER_COLON_RE);
    const pipeMatch = trimmed.match(HEADER_PIPE_RE);

    if (colonMatch || pipeMatch) {
      // Save previous group
      if (currentGroup) sectionGroups.push(currentGroup);
      const label = (colonMatch ? colonMatch[1] : pipeMatch![1]).trim();
      currentGroup = { label, dataLines: [] };
      continue;
    }

    // Skip empty lines (visual break, not a section split)
    if (!trimmed) {
      // Preserve empty lines as markers for spacing
      if (currentGroup && currentGroup.dataLines.length > 0) {
        currentGroup.dataLines.push("");
      }
      continue;
    }

    // Start default section if none exists
    if (!currentGroup) {
      currentGroup = { label: "", dataLines: [] };
    }
    currentGroup.dataLines.push(line);
  }
  if (currentGroup) sectionGroups.push(currentGroup);

  // If no explicit headers, label as empty (no header shown)
  // If only one section with no label, keep it unlabeled
  const sections = sectionGroups.map((group) => {
    const dataLines = group.dataLines.filter((l) => l.trim());

    // Step 1: parse each line individually
    type ParsedLine = { chords: string[]; lyrics: string; raw: string; chordOnly: boolean };
    const parsed: ParsedLine[] = dataLines.map((line) => {
      // Chord-only line (bare or bracketed)
      if (isChordLine(line)) {
        const positions = extractChordPositions(line);
        const chords = positions.map((p) => p.chord);
        chords.forEach((c) => allChords.add(c));
        return { chords, lyrics: "", raw: line, chordOnly: true };
      }

      // [Am]text notation — word-aligned output
      const lineIndentMatch = line.match(/^(\s*)/);
      const lineIndent = lineIndentMatch ? lineIndentMatch[1].length : 0;
      const parts = line.split(/\[([^\]]+)\]/);
      let pendingChord = "";
      const wordChords: { word: string; chord: string }[] = [];

      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          pendingChord = parts[i];
          allChords.add(parts[i]);
        } else {
          const textWords = parts[i].split(/\s+/).filter(Boolean);
          textWords.forEach((word, wIdx) => {
            if (wIdx === 0 && pendingChord) {
              wordChords.push({ word, chord: pendingChord });
              pendingChord = "";
            } else {
              wordChords.push({ word, chord: "" });
            }
          });
        }
      }

      if (pendingChord && wordChords.length > 0) {
        wordChords[wordChords.length - 1].chord = pendingChord;
      }

      const lyrics = wordChords.map((wc) => wc.word).join(" ");
      const chords = wordChords.map((wc) => wc.chord);
      return { chords, lyrics, ...(lineIndent > 0 ? { indent: lineIndent } : {}), raw: line, chordOnly: false };
    });

    // Step 2: merge chord-only + lyrics-only pairs (UG-style)
    const lines: { chords: string[]; lyrics: string }[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const curr = parsed[i];
      const next = parsed[i + 1];

      if (
        curr.chordOnly &&
        next &&
        !next.chordOnly &&
        next.lyrics &&
        next.chords.every((c) => !c)
      ) {
        // Chord line followed by lyrics-only line → merge by column alignment
        lines.push(mergeChordAndLyricLines(curr.raw, next.raw, allChords));
        i++; // skip next line (already merged)
      } else {
        lines.push({ chords: curr.chords, lyrics: curr.lyrics });
      }
    }

    return { label: group.label, lines };
  });

  return { sections, chords: Array.from(allChords) };
}

// ─── Create song ──────────────────────────────────────────────────────────────

export async function createSong(formData: FormData) {
  const adminId = await requireAdmin();

  const title = (formData.get("title") as string)?.trim();
  const artist = (formData.get("artist") as string)?.trim();
  const genre = (formData.get("genre") as string)?.trim() || "Інше";
  const key = (formData.get("key") as string)?.trim() || "Am";
  const difficulty = (formData.get("difficulty") as string) || "easy";
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();

  if (!title || !artist || !lyricsRaw) {
    throw new Error("Заповніть обов'язкові поля: назва, виконавець, текст");
  }

  const slug = slugify(title) || `song-${Date.now()}`;
  const parsed = parseLyricsWithChords(lyricsRaw);

  const admin = createAdminClient();

  // Check slug uniqueness, append timestamp suffix if needed
  const { data: existing } = await admin
    .from("songs")
    .select("slug")
    .eq("slug", slug)
    .single();

  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const { error } = await admin.from("songs").insert({
    slug: finalSlug,
    title,
    artist,
    genre,
    key,
    difficulty,
    chords: parsed.chords,
    sections: { raw: lyricsRaw, sections: parsed.sections },
    status: "published", // Admin-created songs are published immediately in MVP
    submitted_by: adminId,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/");
  revalidatePath(`/songs/${finalSlug}`);
  redirect(`/songs/${finalSlug}`);
}

// ─── Update song status ───────────────────────────────────────────────────────

export async function updateSongStatus(formData: FormData) {
  const adminId = await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");
  const status = formData.get("status") as string;

  if (!status) throw new Error("Відсутні параметри");
  if (!["published", "archived", "draft"].includes(status)) {
    throw new Error("Невалідний статус");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("songs")
    .update({
      status,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", songId);

  if (error) throw new Error(`Помилка оновлення: ${error.message}`);

  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/admin");
  revalidatePath("/");
}

// ─── Update song ──────────────────────────────────────────────────────────────

export async function updateSong(formData: FormData) {
  await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");

  const title = (formData.get("title") as string)?.trim();
  const artist = (formData.get("artist") as string)?.trim();
  const album = (formData.get("album") as string)?.trim() || null;
  const genre = (formData.get("genre") as string)?.trim() || null;
  const key = (formData.get("key") as string)?.trim() || null;
  const capo = formData.get("capo") ? Number(formData.get("capo")) : null;
  const tempo = formData.get("tempo") ? Number(formData.get("tempo")) : null;
  const difficulty = (formData.get("difficulty") as string) || null;
  const status = (formData.get("status") as string) || null;
  const cover_image = sanitizeUrl((formData.get("cover_image") as string)?.trim());
  const cover_color = (formData.get("cover_color") as string)?.trim() || null;
  const youtube_id = (formData.get("youtube_id") as string)?.trim() || null;
  const lyricsRaw = (formData.get("lyrics_with_chords") as string)?.trim();

  if (!title || !artist) throw new Error("Назва та виконавець обов'язкові");

  const parsed = lyricsRaw
    ? parseLyricsWithChords(lyricsRaw)
    : null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("songs")
    .update({
      title, artist, album, genre, key, capo, tempo,
      difficulty, status, cover_image, cover_color, youtube_id,
      ...(parsed ? {
        sections: { raw: lyricsRaw, sections: parsed.sections },
        chords: parsed.chords,
      } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", songId);

  if (error) throw new Error(`Помилка збереження: ${error.message}`);

  revalidatePath("/songs");
  revalidatePath("/admin/songs");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin/songs");
}

// ─── Delete song ──────────────────────────────────────────────────────────────

export async function deleteSong(formData: FormData) {
  await requireAdmin();

  const songId = assertUuid(formData.get("songId") as string, "ID пісні");

  const admin = createAdminClient();
  const { error } = await admin.from("songs").delete().eq("id", songId);

  if (error) throw new Error(`Помилка видалення: ${error.message}`);

  revalidatePath("/songs");
  revalidatePath("/artists");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin/songs");
}
