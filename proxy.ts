import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Allowlist, not "everything except assets". The proxy runs as its own
  // function invocation on every matched request — with the old catch-all it
  // ran (and refreshed the Supabase session) for every static page, chord
  // cover, sitemap hit and bot crawl: a second invocation per pageview, most
  // of them for guests who have no session at all. It now covers only the
  // routes that read the session on the server or need the login redirect:
  //   • /lists/*, /add      — server-side session reads.
  //   • /admin, /profile,
  //     /ui-kit, /api/revalidate — the protected areas (redirect to login).
  //   • /auth/*             — sign-in flow.
  // Public API routes (/api/search, /api/songs/view) and every static or ISR
  // page bypass it entirely; their personalization is client-side. That now
  // includes /songs/:slug (ISR since 19.09.2026): it was ~730K invocations a
  // month whose only job was a Supabase `getClaims()` for guests and bots
  // with no session at all. Signed-in users' tokens are refreshed by the
  // browser client and by the server actions they call.
  matcher: [
    "/lists/:path*",
    "/add",
    "/auth/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/ui-kit/:path*",
    "/api/revalidate/:path*",
  ],
};
