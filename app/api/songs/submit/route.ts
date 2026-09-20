import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitSong, updateMySubmission, type SubmitResult } from "@/features/song/actions/submit";

/**
 * Stable POST endpoint for the "add song" form.
 *
 * Why a route handler and not the Server Action directly: an action is
 * addressed by an id hashed at build time, and the server only accepts ids
 * present in the build it is running. A tab opened before a deploy posts an id
 * the new server has never seen and gets UnrecognizedActionError — 19 of those
 * in PostHog since June, each one a person who had been typing a song for
 * 20-40 minutes. A URL does not change between deploys, so this whole class of
 * failure disappears for the one form where it actually hurts.
 *
 * The business logic is unchanged: this calls the very same functions the
 * action did. They authenticate the caller themselves (service-role writes
 * behind an explicit actor check), so the endpoint adds no privileges.
 */

export const dynamic = "force-dynamic";

/**
 * Server Actions get an automatic same-origin check; a plain route handler does
 * not, and the Supabase auth cookie is SameSite=Lax — which a cross-site form
 * POST would still carry. So reject anything that isn't same-origin.
 */
function sameOrigin(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin" || fetchSite === "none";
  // Older browsers without Fetch Metadata: fall back to comparing Origin.
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { ok: false, reason: "error", message: "Запит відхилено." } satisfies SubmitResult,
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    // A body that never arrived in full (dropped connection, oversized upload
    // cut off by the platform) lands here rather than as a client TypeError.
    console.error("[api/songs/submit] unreadable body", e);
    return NextResponse.json(
      {
        ok: false,
        reason: "error",
        message: "Не вдалося прочитати надіслані дані — можливо, обірвалося зʼєднання. Текст залишився у формі: спробуйте ще раз.",
      } satisfies SubmitResult,
      { status: 400 },
    );
  }

  const songId = formData.get("songId");
  const result = typeof songId === "string" && songId
    ? await updateMySubmission(songId, null, formData)
    : await submitSong(null, formData);

  // Always 200: the form reads `ok` from the body. A non-2xx would make the
  // browser's own error handling kick in and hide the typed message.
  return NextResponse.json(result);
}

/**
 * "Did my previous attempt actually land?" — asked by the form before it
 * retries a submission that failed with a network error. A fetch TypeError
 * cannot tell "never left the browser" from "arrived, reply lost", and blindly
 * retrying the second case would file the same song twice.
 *
 * Scoped to the caller's own rows and the last five minutes.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ exists: false });

  const title = (request.nextUrl.searchParams.get("title") ?? "").trim();
  const artist = (request.nextUrl.searchParams.get("artist") ?? "").trim();
  if (!title) return NextResponse.json({ exists: false });

  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  let query = admin
    .from("songs")
    .select("id, slug, status, title, artist, created_at")
    .eq("submitted_by", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5);
  if (artist) query = query.eq("artist", artist);
  const { data, error } = await query;
  if (error || !data) return NextResponse.json({ exists: false });

  const hit = data.find((row) => typeof row.title === "string" && row.title.trim() === title);
  if (!hit) return NextResponse.json({ exists: false });
  return NextResponse.json({
    exists: true,
    result: {
      ok: true,
      status: (hit.status as string) === "published" ? "published" : (hit.status as string) === "draft" ? "draft" : "pending",
      slug: hit.slug as string,
      songId: hit.id as string,
    } satisfies SubmitResult,
  });
}
