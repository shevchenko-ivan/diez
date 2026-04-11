export const dynamic = "force-dynamic";

import { Navbar } from "@/shared/components/Navbar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AddArtistForm } from "@/features/artist/components/AddArtistForm";

export const metadata = { title: "Додати артиста — Diez" };

export default function NewArtistPage() {
  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <Link href="/admin/artists" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
          <ArrowLeft size={14} /> Артисти
        </Link>

        <div className="te-surface p-10" style={{ borderRadius: "2rem" }}>
          <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
            Новий артист
          </h1>
          <p className="text-sm opacity-60 mb-10" style={{ color: "var(--text-muted)" }}>
            Додайте виконавця з фото та інформацією
          </p>

          <AddArtistForm />
        </div>
      </main>
    </div>
  );
}
