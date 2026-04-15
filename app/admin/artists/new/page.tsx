export const dynamic = "force-dynamic";

import { PageShell } from "@/shared/components/PageShell";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AddArtistForm } from "@/features/artist/components/AddArtistForm";

export const metadata = { title: "Додати виконавця — Diez" };

export default function NewArtistPage() {
  return (
    <PageShell maxWidth="2xl" footer={false}>
      <Link href="/admin/artists" className="te-key inline-flex items-center gap-2 px-4 py-2 text-xs mb-8">
        <ArrowLeft size={14} /> Виконавці
      </Link>

      <div className="te-surface p-10" style={{ borderRadius: "2rem" }}>
        <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          Новий виконавець
        </h1>
        <p className="text-sm font-medium opacity-60 mb-10" style={{ color: "var(--text-muted)" }}>
          Додайте виконавця з фото та інформацією
        </p>

        <AddArtistForm />
      </div>
    </PageShell>
  );
}
