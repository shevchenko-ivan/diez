import type { StrumPreset } from "./strum-presets";

/**
 * User-saved strumming presets — kept in localStorage so admins can build a
 * personal library of patterns they reuse across songs without a DB
 * migration. Built-in `STRUM_PRESETS` are unaffected; users see their own
 * presets appended to the gallery.
 */

const STORAGE_KEY = "diez:user-strum-presets";

export function loadUserPresets(): StrumPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: drop anything that doesn't shape-match — old data, manual
    // edits, schema drift. Cheaper than a full validator and good enough.
    return parsed.filter(
      (p): p is StrumPreset =>
        !!p &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.label === "string" &&
        typeof p.noteLength === "string" &&
        Array.isArray(p.strokes),
    );
  } catch {
    return [];
  }
}

function saveAll(list: StrumPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage full / disabled — silently no-op */
  }
}

export function saveUserPreset(preset: Omit<StrumPreset, "id">): StrumPreset {
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const next: StrumPreset = { id, ...preset };
  const list = loadUserPresets();
  list.push(next);
  saveAll(list);
  return next;
}

export function deleteUserPreset(id: string) {
  const list = loadUserPresets().filter((p) => p.id !== id);
  saveAll(list);
}
