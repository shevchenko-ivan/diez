/**
 * Shared image-upload limits for everything that travels through a Server
 * Action as multipart FormData (song covers, artist photos).
 *
 * The ceiling is NOT ours to pick freely: Vercel rejects any request whose
 * body exceeds 4.5 MB before Next.js ever runs, so the browser's fetch fails
 * outright ("TypeError: Failed to fetch") instead of receiving a typed error
 * from the action. The old 5 MB limit sat above that cap, which is why users
 * who attached a full-resolution phone photo saw a hard crash — the request
 * never reached the code that would have told them the file was too big.
 *
 * 4 MB leaves ~500 KB of headroom for the rest of the form (lyrics, strumming
 * patterns, multipart boundaries) inside the platform cap.
 *
 * `next.config.ts` sets `serverActions.bodySizeLimit` above this — that knob
 * only raises Next's own limit and cannot lift the platform's.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Human-readable form of MAX_IMAGE_BYTES for UI copy and error messages. */
export const MAX_IMAGE_LABEL = "4 МБ";

/** Files smaller than this are placeholders/corrupt rather than real artwork. */
export const MIN_IMAGE_BYTES = 4 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** «3.7 МБ» — one decimal is enough to see how far over the limit a file is. */
export function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
