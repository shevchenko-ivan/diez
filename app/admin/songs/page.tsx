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

export const metadata = { title: "Пісні — Адмінка | Diez" };

interface AdminSong {
  id: string;
  slug: string;
  title: string;
  artist: string;
  genre: string;
  difficulty: string;
  views: number;
  status: string;
  created_at: string;
}

export default async function AdminSongsPage({
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
    .from("songs")
    .select("id, slug, title, artist, genre, difficulty, views, status, created_at")
    .order("created_at", { ascending: false });

  const { data: songs } = tab === "archived"
    ? await query.eq("status", "archived")
    : await query.neq("status", "archived");

  const list = (songs ?? []) as AdminSong[];

  return (
    <PageShell footer={false}>
      <div className="mb-8"><BackButton fallback="/admin" /></div>

      <PageHeader
        title="Пісні"
        subtitle={`${list.length} пісень`}
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
            tab === "active" ? "" : "opacity-60 hover:opacity-100"
          }`}
        >
          АКТИВНІ
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

      <SongsAdminTable songs={list} tab={tab} />
    </PageShell>
  );
}
