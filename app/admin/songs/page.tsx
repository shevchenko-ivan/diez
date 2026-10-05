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
import { isSameSong } from "@/features/song/lib/song-identity";

export const metadata = { title: "Пісні — Адмінка | Diez" };

interface AdminSong {
  id: string;
  slug: string;
  title: string;
  artist: string;
  views: number;
  source_popularity: number | null;
  source_views: number | null;
  status: string;
  created_at: string;
  submitted_by: string | null;
}

interface SubmitterInfo {
  name: string;
  email: string | null;
  total: number;
  approved: number;
}

const SORT_COLUMNS: Record<string, string> = {
  title: "title",
  artist: "artist",
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
  const tab: "published" | "pending" | "draft" | "archived" =
    tabParam === "archived" ? "archived" :
    tabParam === "pending" ? "pending" :
    tabParam === "draft" ? "draft" : "published";

  const sortKey = sortParam && SORT_COLUMNS[sortParam] ? sortParam : "created_at";
  const sortDir: "asc" | "desc" = dirParam === "asc" ? "asc" : "desc";

  // Pending count for the moderation tab badge (separate lightweight query).
  const { count: pendingCount } = await admin
    .from("songs")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  let query = admin
    .from("songs")
    .select("id, slug, title, artist, views, source_popularity, source_views, status, created_at, submitted_by", { count: "exact" })
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

  // Хто запропонував пісню + його історія (скільки подав / скільки схвалено).
  // Показуємо лише на вкладці модерації — у скрейплених пісень submitted_by порожній.
  const submitters: Record<string, SubmitterInfo> = {};
  if (tab === "pending") {
    const submitterIds = [...new Set(
      list.map((s) => s.submitted_by).filter((v): v is string => !!v),
    )];
    if (submitterIds.length > 0) {
      const [{ data: submitterProfiles }, { data: submittedSongs }] = await Promise.all([
        admin.from("profiles").select("id, username, email").in("id", submitterIds),
        // range() піднімає дефолтний ліміт у 1000 рядків, щоб лічильники не брехали
        admin.from("songs").select("submitted_by, status").in("submitted_by", submitterIds).range(0, 9999),
      ]);
      for (const p of submitterProfiles ?? []) {
        submitters[p.id] = {
          name: p.username || p.email?.split("@")[0] || "Без імені",
          email: p.email ?? null,
          total: 0,
          approved: 0,
        };
      }
      for (const s of submittedSongs ?? []) {
        const info = s.submitted_by ? submitters[s.submitted_by] : undefined;
        if (!info) continue;
        info.total += 1;
        if (s.status === "published") info.approved += 1;
      }
    }
  }

  // Пропозиція завжди стає ОКРЕМОЮ піснею з власною адресою — схвалення не
  // замінює існуючу й не додає варіант. Тож на модерації показуємо, якщо
  // така пісня вже опублікована: інакше схвалення непомітно створює дубль.
  const existing: Record<string, { slug: string; title: string }> = {};
  if (tab === "pending" && list.length > 0) {
    const artists = [...new Set(list.map((s) => s.artist))];
    const { data: published } = await admin
      .from("songs")
      .select("slug, title, artist")
      .eq("status", "published")
      .in("artist", artists)
      .range(0, 9999);
    for (const s of list) {
      const match = (published ?? []).find((p) => isSameSong(p, s));
      if (match) existing[s.id] = { slug: match.slug, title: match.title };
    }
  }

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
          href="/admin/songs?tab=pending"
          className={`px-4 py-2 text-xs font-bold tracking-widest rounded-xl transition-colors flex items-center gap-1.5 ${
            tab === "pending" ? "" : "opacity-60 hover:opacity-100"
          }`}
        >
          НА МОДЕРАЦІЇ
          {!!pendingCount && pendingCount > 0 && (
            <span
              className="inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5"
              style={{ minWidth: 18, height: 18, background: "var(--orange)", color: "#fff" }}
            >
              {pendingCount}
            </span>
          )}
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

      {tab === "pending" && (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.55 }}>
          Схвалення публікує пропозицію як <b style={{ color: "var(--text)" }}>окрему нову пісню</b> з власною
          сторінкою. Воно не замінює існуючу пісню і не додає до неї варіант. Якщо така пісня вже є на сайті,
          біля назви буде попередження і помаранчева кнопка «Додати як варіант»: вона переносить
          пропозицію у варіант існуючої пісні (автором лишається той, хто запропонував) і видаляє дубль.
        </p>
      )}

      <SongsAdminTable songs={list} tab={tab === "archived" ? "archived" : "active"} sort={sortKey} dir={sortDir} tabParam={tab} submitters={submitters} existing={existing} />

      <AdminSongsPagination currentPage={currentPage} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} />
    </PageShell>
  );
}
