import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// Dev/admin helper to invalidate cached song queries after bulk scripts.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const tag = url.searchParams.get("tag") ?? "songs";
  revalidateTag(tag);
  return NextResponse.json({ ok: true, tag });
}
