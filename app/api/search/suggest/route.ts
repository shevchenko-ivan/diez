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
      .or(`title.ilike.${like},artist.ilike.${like}`)
      .order("views", { ascending: false })
      .limit(6),
    sb
      .from("artists")
      .select("slug, name, photo_url")
      .ilike("name", like)
      .order("name")
      .limit(3),
  ]);

  return NextResponse.json({
    songs: songsRes.data ?? [],
    artists: artistsRes.data ?? [],
  });
}
