export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { Plus } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { BackButton } from "@/shared/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { SongsAdminTable } from "./SongsAdminTable";
import { AdminSongsSearch } from "./AdminSongsSearch";
import { AdminSongsPagination } from "./AdminSongsPagination";

export const metadata = { title: "Пісні — Адмінка | Diez" };

interface AdminSong {
  id: string;
  slug: string;
  title: string;
  artist: string;
  genre: string;
  difficulty: string;
  views: number;
  source_popularity: number | null;
  source_views: number | null;
  status: string;
  created_at: string;
}

const SORT_COLUMNS: Record<string, string> = {
  title: "title",
  artist: "artist",
  genre: "genre",
  difficulty: "difficulty",
  views: "views",
  source_popularity: "source_popularity",
  source_views: "source_views",
  created_at: "created_at",
};

export default async function AdminSongsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string; dir?: string; q?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  const { tab: tabParam, sort: sortParam, dir: dirParam, q: qParam, page: pageParam } = await searchParams;
  const q = (qParam ?? "").trim();
  const PAGE_SIZE = 200;
  const pageNum = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const tab: "published" | "draft" | "archived" =
    tabParam === "archived" ? "archived" :
    tabParam === "draft" ? "draft" : "published";

  const sortKey = sortParam && SORT_COLUMNS[sortParam] ? sortParam : "created_at";
  const sortDir: "asc" | "desc" = dirParam === "asc" ? "asc" : "desc";

  let query = admin
    .from("songs")
    .select("id, slug, title, artist, genre, difficulty, views, source_popularity, source_views, status, created_at", { count: "exact" })
    .eq("status", tab);

  if (q) {
    const escaped = q.replace(/[%,()]/g, "\\$&");
    query = query.or(`title.ilike.%${escaped}%,artist.ilike.%${escaped}%`);
  }

  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: songs, count } = await query
    .order(SORT_COLUMNS[sortKey], { ascending: sortDir === "asc", nullsFirst: false })
    .range(from, to);

  const list = (songs ?? []) as AdminSong[];
  const total = count ?? list.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(pageNum, totalPages);

  return (
    <PageShell footer={false}>
      <div className="mb-8"><BackButton fallback="/admin" /></div>

      <PageHeader
        title="Пісні"
        subtitle={`${total} пісень`}
        action={
          <TeButton
            shape="pill"
            href="/add"
            className="px-5 py-3 flex items-center gap-2 text-xs font-bold tracking-widest shrink-0"
          >
            <Plus size={14} /> ДОДАТИ ПІСНЮ
          </TeButton>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <TeButton
          shape="pill"
          href="/admin/songs"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors ${
            tab === "published" ? "" : "opacity-60 hover:opacity-100"
          }`}
        >
          ОПУБЛІКОВАНІ
        </TeButton>
        <TeButton
          shape="pill"
          href="/admin/songs?tab=draft"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors ${
            tab === "draft" ? "" : "opacity-60 hover:opacity-100"
          }`}
        >
          ЧЕРНЕТКИ
        </TeButton>
        <TeButton
          shape="pill"
          href="/admin/songs?tab=archived"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors ${
            tab === "archived" ? "" : "opacity-60 hover:opacity-100"
          }`}
        >
          АРХІВ
        </TeButton>
      </div>

      <AdminSongsSearch initialQ={q} />

      <SongsAdminTable songs={list} tab={tab === "archived" ? "archived" : "active"} sort={sortKey} dir={sortDir} tabParam={tab} />

      <AdminSongsPagination currentPage={currentPage} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} />
    </PageShell>
  );
}
