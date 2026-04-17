import { type Metadata } from "next";
import { PageShell } from "@/shared/components/PageShell";
import { PageHeader } from "@/shared/components/PageHeader";
import { GuitarTuner } from "@/features/tuner/components/GuitarTuner";

export const metadata: Metadata = {
  title: "Тюнер — Diez",
  description: "Хроматичний тюнер для гітари. Увімкніть мікрофон і настройте гітару за стандартним строєм EADGBE.",
  alternates: { canonical: "/tuner" },
  openGraph: {
    title: "Тюнер — Diez",
    description: "Налаштуйте гітару через мікрофон за стандартним строєм EADGBE.",
    type: "website",
    url: "/tuner",
  },
};

export default function TunerPage() {
  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Тюнер"
        subtitle="Стандартний стрій EADGBE — увімкніть мікрофон і грайте"
      />
      <GuitarTuner />
    </PageShell>
  );
}
