import { type Metadata } from "next";
import { Navbar } from "@/shared/components/Navbar";
import { SiteFooter } from "@/shared/components/SiteFooter";

export const metadata: Metadata = {
  title: "Умови використання — Diez",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">

        <h1
          className="font-bold mb-2"
          style={{ fontSize: "2rem", letterSpacing: "-0.03em", color: "var(--text)" }}
        >
          Умови використання
        </h1>
        <p className="mb-10" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Остання редакція: квітень 2026
        </p>

        <div className="space-y-8" style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "var(--text-mid)" }}>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Використання сервісу
            </h2>
            <p>
              Diez — безкоштовна платформа для пошуку та перегляду акордів. Використовуючи сервіс,
              ви погоджуєтесь не публікувати неприйнятний контент та дотримуватись авторських прав.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Контент користувачів
            </h2>
            <p>
              Додаючи пісні або акорди, ви підтверджуєте, що маєте право на публікацію цього матеріалу
              або що він є загальнодоступним. Адміністрація залишає за собою право видаляти матеріали,
              що порушують авторські права.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Відповідальність
            </h2>
            <p>
              Сервіс надається «як є». Ми не несемо відповідальності за точність акордів або
              текстів, розміщених користувачами. Якщо ви виявили помилку, повідомте нас.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Зміни до умов
            </h2>
            <p>
              Умови можуть оновлюватись. Продовження використання сервісу після оновлення означає
              прийняття нових умов. З питань:{" "}
              <a href="mailto:hello@diez.ua" style={{ color: "var(--orange)" }}>hello@diez.ua</a>.
            </p>
          </section>

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
