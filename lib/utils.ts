import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Canonical site URL. Set NEXT_PUBLIC_SITE_URL in production to avoid
// Vercel preview URLs appearing in sitemaps and JSON-LD.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * Serialize an object for embedding in an inline `<script type="application/ld+json">`.
 *
 * `JSON.stringify` does NOT escape `<` characters, so a string containing the
 * literal sequence `</script>` would prematurely close the script tag and let
 * an attacker inject markup. All Diez JSON-LD data is admin-controlled today
 * (RLS blocks non-admin writes) so the risk is theoretical, but the fix is
 * five characters and removes a foot-gun if RLS is ever relaxed or a future
 * field starts mirroring user-submitted text.
 *
 * Replacing `<` with its `<` unicode escape is the OWASP-recommended
 * mitigation — parses identically in any JSON consumer but can never break
 * out of the surrounding `</script>` boundary.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
