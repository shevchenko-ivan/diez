import { type Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/shared/components/Navbar";
import { SiteFooter } from "@/shared/components/SiteFooter";

export const metadata: Metadata = {
  title: "Авторські права — Diez",
  description:
    "Як подати скаргу правовласника. Процедура повідомлення про порушення, обовʼязкові поля, термін відповіді та політика щодо повторних порушників.",
  alternates: { canonical: "/copyright" },
};

// Standalone copyright/takedown page. Rights-holders Google "<site> DMCA"
// or "<site> copyright" — making the procedure discoverable here means they
// file a notice instead of going straight to lawyers / hosting providers.
export default function CopyrightPage() {
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
          Авторські права
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
              Diez поважає авторські права. Сервіс — це{" "}
              <strong>індекс і агрегація</strong> загальнодоступної інформації про музичні
              твори (тексти, акорди, метадані). Авторські права на тексти й мелодії пісень
              належать відповідним правовласникам — Diez не претендує на ці права.
            </p>
            <p className="mt-3">
              Ця сторінка пояснює, як правовласники можуть повідомити про матеріал, що
              порушує їх права, і отримати його видалення з сервісу.
            </p>
            <p className="mt-3">
              Навчальні статті в розділі <Link href="/learn" style={{ color: "var(--orange-text)" }}>«Навчання»</Link>{" "}
              є оригінальним контентом Diez. Якщо в статті використано істотний фрагмент
              зовнішнього джерела, ми зазначаємо його у блоці «Джерела» внизу статті.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Як подати скаргу
            </h2>
            <p className="mb-3">
              Надішліть повідомлення на email{" "}
              <a
                href="mailto:copyright@diez.net.ua"
                style={{ color: "var(--orange-text)" }}
              >
                copyright@diez.net.ua
              </a>{" "}
              з темою «Скарга про порушення авторських прав» («Copyright complaint»).
              Повідомлення має містити:
            </p>
            <ol className="space-y-2 list-decimal pl-5">
              <li>
                <strong>Опис твору</strong>, права на який, на вашу думку, порушено
                (назва пісні, виконавець, рік).
              </li>
              <li>
                <strong>Точне посилання</strong> на сторінку Diez, де розміщений матеріал
                (наприклад, <code>https://diez.net.ua/songs/&lt;slug&gt;</code>). Бажано вказати
                всі сторінки.
              </li>
              <li>
                <strong>Підтвердження ваших прав</strong> — ким ви є відносно твору
                (правовласник, ліцензіат, представник), посилання на свідоцтво, договір
                або інший документ, що підтверджує ваші повноваження.
              </li>
              <li>
                <strong>Контактна інформація</strong> — ПІБ або назва організації, email,
                номер телефону (опціонально), адреса для офіційного листування.
              </li>
              <li>
                <strong>Заява про сумлінне переконання</strong>: «Я сумлінно переконаний,
                що використання зазначеного матеріалу не санкціоноване правовласником,
                його представником або законом».
              </li>
              <li>
                <strong>Заява про достовірність</strong>: «Інформація в цьому повідомленні
                є достовірною, і я є правовласником або уповноваженим діяти від його
                імені».
              </li>
              <li>
                <strong>Підпис</strong> — електронний (повне імʼя) або фізичний (скан).
              </li>
            </ol>
            <p className="mt-3">
              Без зазначених елементів повідомлення може бути відхилено або відкладено.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Термін розгляду
            </h2>
            <p>
              Скарги розглядаються протягом <strong>48 годин</strong> з моменту отримання.
              Якщо повідомлення відповідає всім вимогам, матеріал видаляється або
              блокується на час перевірки. Ми повідомимо вас email-листом про статус
              скарги.
            </p>
            <p className="mt-3">
              Для термінових випадків (явне порушення, шкода репутації) ми намагаємось
              реагувати швидше — у межах робочого дня.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Зустрічне повідомлення (counter-notice)
            </h2>
            <p>
              Якщо ваш матеріал було видалено помилково, ви можете подати зустрічне
              повідомлення на той самий email. Повідомлення має містити:
            </p>
            <ol className="space-y-2 list-decimal pl-5 mt-2">
              <li>Опис матеріалу та URL, де він був до видалення.</li>
              <li>
                Заяву під присягою про сумлінне переконання, що матеріал було видалено
                помилково.
              </li>
              <li>Ваші ПІБ, контактну інформацію та згоду на юрисдикцію України.</li>
              <li>Підпис.</li>
            </ol>
            <p className="mt-3">
              Ми перенаправляємо зустрічне повідомлення скаржнику. Якщо протягом 14 днів
              скаржник не звернеться до суду — матеріал може бути відновлений.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Повторні порушники
            </h2>
            <p>
              Користувачі, які додавали матеріали з повторними обґрунтованими скаргами на
              порушення авторських прав, втрачають доступ до сервісу без права відновлення.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Хибні скарги
            </h2>
            <p>
              Подання завідомо неправдивого повідомлення про порушення авторських прав є
              правопорушенням і може спричинити юридичну відповідальність, включно з
              відшкодуванням збитків особі, чий матеріал було помилково видалено, та
              витрат адміністрації сервісу.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-2" style={{ fontSize: "1rem", color: "var(--text)" }}>
              Контакт
            </h2>
            <p>
              Усі повідомлення про порушення авторських прав — на{" "}
              <a
                href="mailto:copyright@diez.net.ua"
                style={{ color: "var(--orange-text)" }}
              >
                copyright@diez.net.ua
              </a>
              . Інші питання — <Link href="/terms" style={{ color: "var(--orange-text)" }}>Умови використання</Link>{" "}
              та <Link href="/privacy" style={{ color: "var(--orange-text)" }}>Політика конфіденційності</Link>.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
