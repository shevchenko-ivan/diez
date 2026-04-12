import { type Metadata } from "next";
import { Navbar } from "@/shared/components/Navbar";
import { SiteFooter } from "@/shared/components/SiteFooter";

export const metadata: Metadata = {
  title: "Про Diez — Українська база акордів",
  description: "Diez — відкрита платформа для пошуку акордів українських та зарубіжних пісень. Створено музикантами для музикантів.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-16">

        <h1
          className="font-bold mb-6"
          style={{ fontSize: "2rem", letterSpacing: "-0.03em", color: "var(--text)" }}
        >
          Про Diez
        </h1>

        <div className="space-y-5" style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--text-mid)" }}>
          <p>
            <strong style={{ color: "var(--text)" }}>Diez</strong> — це відкрита платформа для пошуку акордів та текстів пісень.
            Наш каталог охоплює українську та зарубіжну музику — від класики до сучасного інді.
          </p>
          <p>
            Ми прагнемо зробити навчання гри на гітарі простим і доступним.
            Жодної реєстрації для перегляду акордів, жодного зайвого шуму — лише пісні та акорди.
          </p>
          <p>
            Платформа знаходиться в активному розвитку. Якщо ви хочете додати пісню або
            виправити акорди — скористайтеся формою{" "}
            <a href="/add" style={{ color: "var(--orange)" }}>«Додати пісню»</a>.
          </p>
          <p>
            Питання та пропозиції:{" "}
            <a href="mailto:hello@diez.ua" style={{ color: "var(--orange)" }}>
              hello@diez.ua
            </a>
          </p>
        </div>

      </main>
      <SiteFooter />
    </div>
  );
}
