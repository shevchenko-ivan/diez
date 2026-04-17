import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AddSongForm } from "@/features/song/components/AddSongForm";
import { getAllArtists } from "@/features/artist/services/artists";

export const metadata = {
  title: "Додати пісню — Diez",
  description: "Додайте нову пісню з акордами до каталогу Diez. Діліться гітарними акордами з українською спільнотою музикантів.",
  robots: { index: false, follow: false },
};

export default async function AddSongPage() {
  const artists = await getAllArtists();

  return (
    <PageShell maxWidth="4xl" footer={false}>
      <Link href="/songs" className="inline-flex items-center gap-1 text-xs mb-8 transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> Каталог
      </Link>

      <div className="te-surface p-10 md:p-14" style={{ borderRadius: "2rem" }}>
        <PageHeader title="Додати пісню" subtitle="Додайте нову пісню до каталогу" />
        <AddSongForm artists={artists} />
      </div>
    </PageShell>
  );
}
