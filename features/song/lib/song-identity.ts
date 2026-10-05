// Loose identity of a song for duplicate detection: case, Latin/Cyrillic «i»,
// punctuation and spacing don't make two songs different («Люди, як кораблі»
// = «люди як кораблі»).
export function normSongKey(t: string): string {
  return t.toLowerCase().replace(/i/g, "і").replace(/[’'`ʼ.,!?«»"()\-–—]/g, "").replace(/\s+/g, " ").trim();
}

export function isSameSong(
  a: { title: string; artist: string },
  b: { title: string; artist: string },
): boolean {
  return normSongKey(a.artist) === normSongKey(b.artist) && normSongKey(a.title) === normSongKey(b.title);
}
