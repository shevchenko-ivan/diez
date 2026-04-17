import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { Music, Users, Eye, EyeOff, Archive } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasEnvVars } from "@/lib/utils";

export const metadata = {
  title: "Адмін-панель — Diez",
};

async function getStats() {
  if (!hasEnvVars) return { published: 0, drafts: 0, archived: 0, artists: 0, isAdmin: false };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { published: 0, drafts: 0, archived: 0, artists: 0, isAdmin: false };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { published: 0, drafts: 0, archived: 0, artists: 0, isAdmin: false };

  const [{ data: songs }, { data: artists }] = await Promise.all([
    admin.from("songs").select("status"),
    admin.from("artists").select("id"),
  ]);

  const published = songs?.filter((s) => s.status === "published").length ?? 0;
  const drafts = songs?.filter((s) => s.status === "draft").length ?? 0;
  const archived = songs?.filter((s) => s.status === "archived").length ?? 0;

  return { published, drafts, archived, artists: artists?.length ?? 0, isAdmin: true };
}

export default async function AdminPage() {
  const stats = await getStats();

  if (!stats.isAdmin) {
    redirect("/");
  }

  return (
    <PageShell maxWidth="5xl" footer={false}>
      <PageHeader title="Адмін-панель" subtitle="Керування контентом платформи" />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <StatCard icon={<Eye size={18} />} label="Опубліковано" value={stats.published} color="var(--orange)" href="/admin/songs" />
          <StatCard icon={<EyeOff size={18} />} label="Чернетки" value={stats.drafts} color="#6366f1" href="/admin/songs" />
          <StatCard icon={<Archive size={18} />} label="В архіві" value={stats.archived} color="var(--text-muted)" href="/admin/songs?tab=archived" />
          <StatCard icon={<Users size={18} />} label="Виконавці" value={stats.artists} color="#10b981" href="/admin/artists" />
        </div>

        {/* Entity cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <EntityCard
            href="/admin/songs"
            icon={<Music size={32} />}
            title="Пісні"
            description="Додавання, редагування, публікація та видалення пісень"
            count={stats.published + stats.drafts + stats.archived}
            countLabel="всього"
            color="var(--orange)"
          />
          <EntityCard
            href="/admin/artists"
            icon={<Users size={32} />}
            title="Виконавці"
            description="Фото, жанр, біографія та керування виконавцями"
            count={stats.artists}
            countLabel="виконавців"
            color="#10b981"
          />
        </div>
    </PageShell>
  );
}

function StatCard({
  icon, label, value, color, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const content = (
    <>
      <div style={{ color }}>{icon}</div>
      <div>
        <div className="text-3xl font-bold tracking-tighter" style={{ color: "var(--text)" }}>{value}</div>
        <div className="text-xs font-bold tracking-widest uppercase mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.7 }}>{label}</div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="te-surface te-pressable p-5 flex flex-col gap-3" style={{ borderRadius: "1.25rem" }}>
        {content}
      </Link>
    );
  }

  return (
    <div className="te-surface p-5 flex flex-col gap-3" style={{ borderRadius: "1.25rem" }}>
      {content}
    </div>
  );
}

function EntityCard({
  href, icon, title, description, count, countLabel, color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  countLabel: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="te-surface te-pressable p-8 flex flex-col gap-4 group"
      style={{ borderRadius: "1.5rem" }}
    >
      <div className="flex items-start justify-between">
        <div style={{ color }}>{icon}</div>
        <span className="text-xs font-mono font-bold opacity-50" style={{ color: "var(--text-muted)" }}>
          {count} {countLabel}
        </span>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text)" }}>{title}</h2>
        <p className="text-sm leading-snug" style={{ color: "var(--text-muted)", opacity: 0.8 }}>{description}</p>
      </div>
      <div className="text-xs font-bold tracking-widest uppercase mt-auto" style={{ color }}>
        Перейти →
      </div>
    </Link>
  );
}
