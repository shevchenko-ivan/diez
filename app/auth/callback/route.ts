import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/profile";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/profile";

  if (!code) {
    redirect(`/auth/error?error=No code provided`);
  }

  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  } catch (e) {
    // redirect() throws NEXT_REDIRECT — re-throw so Next can handle it.
    if (e && typeof e === "object" && "digest" in e) throw e;
    const msg = e instanceof Error ? e.message : "OAuth exchange failed";
    redirect(`/auth/error?error=${encodeURIComponent(msg)}`);
  }

  redirect(next);
}
