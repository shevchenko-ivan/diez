import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  // Wrap in try/catch: a stale/missing refresh token otherwise throws and
  // surfaces as a 500 (e.g. after failed OAuth attempts on mobile Safari).
  let user: unknown = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims ?? null;
  } catch {
    user = null;
  }

  // Default-allow: only truly private areas force the login redirect.
  //
  // This used to be a default-deny allowlist (publicPaths) — and every URL
  // NOT on the list, including any mistyped or stale external link, answered
  // 307 → /auth/login rendering «Вхід — Diez» with HTTP 200. To crawlers
  // that's a soft-404 factory: Google filed each hit under «Page with
  // redirect» instead of dropping it, and guests never saw the real 404
  // page. Unknown paths now fall through to Next's not-found route and
  // return an honest 404 status.
  //
  // Safe by design: the redirect here is UX, not the security boundary —
  // /admin re-checks is_admin server-side (app/admin/page.tsx), /profile
  // re-checks the session (app/profile/page.tsx), and RLS guards the data
  // itself. `/ui-kit` stays gated so the internal design playground never
  // renders to guests (robots.txt additionally Disallows it — the pair keeps
  // it out of the index without a crawlable redirect chain).
  //
  // `/api/*` keeps the old private-by-default behavior for every route
  // except the guest endpoints (search autocomplete + view counter) — a new
  // API route must opt IN to being public here.
  const path = request.nextUrl.pathname;
  const inPrefix = (p: string) => path === p || path.startsWith(`${p}/`);
  const publicApi = ["/api/search", "/api/songs/view"];
  const isProtected =
    ["/admin", "/profile", "/ui-kit"].some(inPrefix) ||
    (inPrefix("/api") && !publicApi.some(inPrefix));

  if (isProtected && !user) {
    // Protected route — redirect to login, remembering where to return.
    const url = request.nextUrl.clone();
    const original = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = "/auth/login";
    url.search = "";
    url.searchParams.set("next", original);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
