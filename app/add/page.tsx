import { Navbar } from "@/shared/components/Navbar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AddSongForm } from "@/features/song/components/AddSongForm";

export const metadata = {
  title: "Додати пісню — Diez",
};

export default function AddSongPage() {
  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/songs" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Каталог
        </Link>

        <div className="te-surface p-10 md:p-14" style={{ borderRadius: "2rem" }}>
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-3 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Додати пісню</h1>
            <p className="text-sm font-medium tracking-wide uppercase opacity-60" style={{ color: "var(--text-muted)" }}>Додайте нову пісню до каталогу</p>
          </div>

          <AddSongForm />
        </div>
      </main>
    </div>
  );
}
