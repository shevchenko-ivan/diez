export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { Plus } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { BackButton } from "@/shared/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ArtistsAdminTable } from "./ArtistsAdminTable";
import { isMissingStatusColumn } from "@/features/artist/lib/status";

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
  const tab: "active" | "archived" | "pending" =
    tabParam === "archived" ? "archived" : tabParam === "pending" ? "pending" : "active";

  const cols = "id, slug, name, photo_url, genre, bio, archived_at, status";

  async function fetchArtists() {
    const base = () => admin.from("artists").select(cols).order("name");
    const res =
      tab === "archived"
        ? await base().not("archived_at", "is", null)
        : tab === "pending"
          ? await base().eq("status", "pending")
          : await base().is("archived_at", null).eq("status", "approved");
    if (!res.error || !isMissingStatusColumn(res.error)) return res.data ?? [];
    // Pre-027 fallback: no status column → archive split only, no pending queue.
    if (tab === "pending") return [];
    const base2 = () =>
      admin.from("artists").select("id, slug, name, photo_url, genre, bio, archived_at").order("name");
    const fb =
      tab === "archived"
        ? await base2().not("archived_at", "is", null)
        : await base2().is("archived_at", null);
    return fb.data ?? [];
  }

  const artists = await fetchArtists();

  // Pending count for the tab badge (0 pre-027).
  const { count: pendingCount } = await admin
    .from("artists")
    .select("id", { head: true, count: "exact" })
    .eq("status", "pending");

  return (
    <PageShell maxWidth="5xl" footer={false}>
      <div className="mb-8"><BackButton fallback="/admin" /></div>

      <PageHeader
        title="Виконавці"
        subtitle={`${artists?.length ?? 0} виконавців`}
        action={
          <TeButton
            shape="pill"
            href="/admin/artists/new"
            className="px-5 py-3 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
          >
            <Plus size={14} /> ДОДАТИ ВИКОНАВЦЯ
          </TeButton>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <TeButton
          shape="pill"
          href="/admin/artists"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors ${
            tab === "active" ? "" : "opacity-60 hover:opacity-100"
          }`}
        >
          АКТИВНІ
        </TeButton>
        <TeButton
          shape="pill"
          href="/admin/artists?tab=pending"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors flex items-center gap-2 ${
            tab === "pending" ? "" : "opacity-60 hover:opacity-100"
          }`}
        >
          НА МОДЕРАЦІЇ
          {!!pendingCount && (
            <span
              className="inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px]"
              style={{ background: "var(--orange)", color: "#fff" }}
            >
              {pendingCount}
            </span>
          )}
        </TeButton>
        <TeButton
          shape="pill"
          href="/admin/artists?tab=archived"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors ${
            tab === "archived" ? "" : "opacity-60 hover:opacity-100"
          }`}
        >
          АРХІВ
        </TeButton>
      </div>

      <ArtistsAdminTable artists={artists ?? []} tab={tab} />
    </PageShell>
  );
}
