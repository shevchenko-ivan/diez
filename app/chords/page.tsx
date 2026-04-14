import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { ChordIdentifier } from "@/features/song/components/ChordIdentifier";

export const metadata: Metadata = {
  title: "Визначити акорд — Diez",
  description:
    "Інтерактивний інструмент для визначення гітарних акордів. Натисніть на гриф, щоб позначити позиції пальців, і дізнайтеся назву акорду.",
  alternates: { canonical: "/chords" },
  openGraph: {
    title: "Визначити акорд — Diez",
    description:
      "Натисніть на гриф, щоб позначити позиції пальців, і дізнайтеся назву акорду.",
    type: "website",
    url: "/chords",
  },
};

export default function ChordsPage() {
  return (
    <PageShell maxWidth="5xl">
      <PageHeader
        title="Визначити акорд"
        subtitle="Натисніть на гриф, щоб позначити позиції пальців"
      />
      <ChordIdentifier />
    </PageShell>
  );
}
