export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { Plus } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/shared/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ArtistsAdminTable } from "./ArtistsAdminTable";

export const metadata = { title: "Виконавці — Адмінка | Diez" };

export default async function AdminArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "archived" ? "archived" : "active";

  const query = admin
    .from("artists")
    .select("id, slug, name, photo_url, genre, archived_at")
    .order("name");

  const { data: artists } = tab === "archived"
    ? await query.not("archived_at", "is", null)
    : await query.is("archived_at", null);

  return (
    <PageShell maxWidth="5xl" footer={false}>
      <div className="mb-8"><BackButton fallback="/admin" /></div>

      <PageHeader
        title="Виконавці"
        subtitle={`${artists?.length ?? 0} виконавців`}
        action={
          <Link
            href="/admin/artists/new"
            className="te-btn-orange px-5 py-3 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
          >
            <Plus size={14} /> ДОДАТИ ВИКОНАВЦЯ
          </Link>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <Link
          href="/admin/artists"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors ${
            tab === "active"
              ? "te-btn-orange"
              : "te-key opacity-60 hover:opacity-100"
          }`}
        >
          АКТИВНІ
        </Link>
        <Link
          href="/admin/artists?tab=archived"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors ${
            tab === "archived"
              ? "te-btn-orange"
              : "te-key opacity-60 hover:opacity-100"
          }`}
        >
          АРХІВ
        </Link>
      </div>

      <ArtistsAdminTable artists={artists ?? []} tab={tab} />
    </PageShell>
  );
}
