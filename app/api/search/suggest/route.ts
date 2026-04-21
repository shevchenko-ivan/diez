import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasEnvVars } from "@/lib/utils";

export const runtime = "edge";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!hasEnvVars || q.length < 2) return NextResponse.json({ songs: [], artists: [] });

  const like = `%${q}%`;
  const sb = getClient();

  const [songsRes, artistsRes] = await Promise.all([
    sb
      .from("songs")
      .select("slug, title, artist, difficulty, cover_image, cover_color")
      .eq("status", "published")
      .or(
        q.length >= 3
          ? `title.ilike.${like},artist.ilike.${like},lyrics_text.ilike.${like}`
          : `title.ilike.${like},artist.ilike.${like}`,
      )
      .order("views", { ascending: false })
      .limit(6),
    sb
      .from("artists")
      .select("slug, name, photo_url")
      .ilike("name", like)
      .order("name")
      .limit(3),
  ]);

  return NextResponse.json(
    {
      songs: songsRes.data ?? [],
      artists: artistsRes.data ?? [],
    },
    {
      headers: {
        // CDN caches 60s; stale-while-revalidate lets the next request hit instantly
        // while the edge refreshes in the background.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
