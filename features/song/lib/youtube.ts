/** Pull the 11-char YouTube video id out of a URL or a bare id. */
export function extractYoutubeId(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  // Bare ID — 11 chars of [A-Za-z0-9_-]
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  // Try to pull from a URL
  const m =
    v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
