import { type Metadata } from "next";
import { Navbar } from "@/shared/components/Navbar";
import { SiteFooter } from "@/shared/components/SiteFooter";

export const metadata: Metadata = {
  title: "Політика конфіденційності — Diez",
  description: "Політика конфіденційності Diez. Як ми збираємо, використовуємо та захищаємо ваші персональні дані.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">

        <h1
          className="font-bold mb-2"
          style={{ fontSize: "2rem", letterSpacing: "-0.03em", color: "var(--text)" }}
        >
          Політика конфіденційності
        </h1>
        <p className="mb-10" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Остання редакція: квітень 2026
        </p>

        <div className="space-y-8" style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "var(--text-mid)" }}>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Які дані ми збираємо
            </h2>
            <p>
              При реєстрації ми збираємо адресу електронної пошти та зберігаємо її у захищеній базі даних.
              Ми не збираємо платіжну інформацію, не відстежуємо геолокацію та не продаємо дані третім особам.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Як ми використовуємо дані
            </h2>
            <p>
              Ваша адреса електронної пошти використовується виключно для автентифікації та надсилання
              підтвердження реєстрації. Ми не надсилаємо маркетингових листів без вашої згоди.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Cookies
            </h2>
            <p>
              Сайт використовує технічні cookies для підтримки сесії авторизації.
              Ми не використовуємо рекламні або аналітичні cookies третіх сторін.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Ваші права
            </h2>
            <p>
              Ви маєте право на доступ, виправлення та видалення ваших персональних даних.
              Для запитів звертайтеся:{" "}
              <a href="mailto:hello@diez.ua" style={{ color: "var(--orange)" }}>hello@diez.ua</a>.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Зміни до політики
            </h2>
            <p>
              Ми можемо оновлювати цю політику. Про суттєві зміни ми повідомляємо електронною поштою.
              Дата останньої редакції вказана вгорі цієї сторінки.
            </p>
          </section>

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
