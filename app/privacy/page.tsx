import { type Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/shared/components/Navbar";
import { SiteFooter } from "@/shared/components/SiteFooter";

export const metadata: Metadata = {
  title: "Політика конфіденційності — Diez",
  description:
    "Як Diez збирає, використовує та захищає ваші персональні дані. Інформація про cookies, аналітику, права користувачів і контакти.",
  alternates: { canonical: "/privacy" },
};

// All references are to "сервіс Diez" / "адміністрація" — no individual is
// named, consistent with the project's anonymous-operator stance. Email
// addresses route through diez.net.ua aliases (Cloudflare Email Routing or
// similar forwarder) so a personal mailbox isn't exposed.
export default function PrivacyPage() {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-2xl mx-auto w-full px-6 py-16"
      >
        <h1
          className="font-bold mb-2"
          style={{ fontSize: "2rem", letterSpacing: "-0.03em", color: "var(--text)" }}
        >
          Політика конфіденційності
        </h1>
        <p className="mb-10" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Остання редакція: травень 2026
        </p>

        <div
          className="space-y-8"
          style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "var(--text-mid)" }}
        >
          <section>
            <p>
              Diez («сервіс», «ми») — онлайн-платформа для пошуку та перегляду гітарних
              акордів за адресою <strong>diez.net.ua</strong>. Ця Політика пояснює, які дані
              ми збираємо, як їх використовуємо та які у вас є права. Користуючись сервісом,
              ви приймаєте умови цієї Політики.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Які дані ми збираємо
            </h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong>Дані облікового запису</strong> — адреса електронної пошти, коли ви
                реєструєтесь. Якщо ви входите через Google, ми також отримуємо ваше ім'я
                профілю та аватарку.
              </li>
              <li>
                <strong>Дії на сайті</strong> — збережені пісні, плейлисти, налаштування
                теми оформлення.
              </li>
              <li>
                <strong>Аналітика</strong> — за вашою згодою (cookie-банер) ми збираємо
                знеособлену статистику переглядів сторінок, кліків та помилок. Без згоди
                аналітика не запускається.
              </li>
              <li>
                <strong>Технічні дані</strong> — IP-адреса, тип браузера, ОС — у логах
                хостинг-провайдера. Використовується для діагностики помилок і захисту від
                зловживань.
              </li>
            </ul>
            <p className="mt-3">
              Ми <strong>не збираємо</strong> платіжну інформацію, не відстежуємо
              геолокацію (точніше за країну), не продаємо дані третім особам.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Як ми використовуємо дані
            </h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>Для роботи сервісу (вхід, збереження плейлистів, синхронізація між пристроями).</li>
              <li>Для покращення сервісу (знеособлено: які функції популярні, де виникають помилки).</li>
              <li>Для зв'язку з вами щодо технічних питань або зміни умов.</li>
            </ul>
            <p className="mt-3">
              Ми <strong>не використовуємо</strong> ваші дані для реклами та не передаємо їх
              рекламним мережам.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Cookies
            </h2>
            <p className="mb-2">
              Сервіс використовує два типи cookies:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong>Обов'язкові</strong> — підтримка сесії авторизації, налаштування
                теми оформлення. Без них сервіс не працюватиме. Не вимагають згоди.
              </li>
              <li>
                <strong>Аналітичні</strong> — знеособлені метрики переглядів. Запускаються
                тільки після вашої явної згоди в cookie-банері. Ви можете відкликати згоду
                в будь-який момент — очистити cookies браузера або написати на контактну
                адресу нижче.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Сторонні сервіси (data processors)
            </h2>
            <p className="mb-2">
              Diez використовує такі сторонні сервіси, які можуть оброблювати ваші дані як
              «оператори»:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong>Supabase</strong> (база даних, авторизація) — зберігає email,
                збережені пісні. Серверне розташування: Європа.
              </li>
              <li>
                <strong>Vercel</strong> (хостинг сайту) — обробляє запити, веде технічні
                логи (IP, час, шлях).
              </li>
              <li>
                <strong>PostHog</strong> (аналітика) — збирає знеособлені події. Тільки за
                вашою згодою. Серверне розташування: ЄС.
              </li>
              <li>
                <strong>Google</strong> — якщо ви входите через Google-акаунт. Ми отримуємо
                лише email, ім'я та аватарку.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Зберігання даних
            </h2>
            <p>
              Дані облікового запису зберігаються, доки активний ваш акаунт. Якщо ви
              видаляєте акаунт — пов'язані дані видаляються протягом 30 днів. Аналітичні
              події зберігаються до 12 місяців, потім видаляються автоматично. Технічні
              логи хостинга — до 30 днів.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Ваші права
            </h2>
            <p className="mb-2">
              Згідно з Законом України «Про захист персональних даних» та GDPR (якщо ви в ЄС),
              ви маєте право:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Отримати копію ваших даних (data portability).</li>
              <li>Виправити неточні дані.</li>
              <li>Видалити акаунт і всі пов'язані дані.</li>
              <li>Відкликати згоду на аналітику.</li>
              <li>Подати скаргу до Уповноваженого Верховної Ради України з прав людини.</li>
            </ul>
            <p className="mt-3">
              Для запитів пишіть на{" "}
              <a
                href="mailto:privacy@diez.net.ua"
                style={{ color: "var(--orange-text)" }}
              >
                privacy@diez.net.ua
              </a>
              . Ми відповідаємо протягом 30 днів.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Безпека
            </h2>
            <p>
              Передача даних відбувається через HTTPS. Паролі зберігаються у вигляді
              хешів (bcrypt) — навіть адміністрація сервісу не має доступу до них.
              Доступ до бази даних обмежений Row-Level Security: користувачі бачать лише
              свої власні плейлисти та збережені пісні.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Зміни до Політики
            </h2>
            <p>
              Ми можемо оновлювати цю Політику. Дата останньої редакції вказана зверху.
              Про суттєві зміни ми попередимо банером на сайті або електронною поштою (якщо
              ви маєте акаунт). Продовження користування сервісом після оновлення означає
              прийняття нових умов.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Контакти
            </h2>
            <p>
              Сервіс експлуатується анонімним оператором. Для зв'язку щодо персональних
              даних — <a href="mailto:privacy@diez.net.ua" style={{ color: "var(--orange-text)" }}>privacy@diez.net.ua</a>.
              Для скарг правовласників — <Link href="/copyright" style={{ color: "var(--orange-text)" }}>сторінка про авторські права</Link>.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
