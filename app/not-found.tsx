import { PageShell } from "@/shared/components/PageShell";
import { TeButton } from "@/shared/components/TeButton";

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="te-lcd font-mono-te text-7xl font-bold mb-6 px-8 py-4"
          style={{ letterSpacing: "-0.04em" }}
        >
          404
        </div>
        <h1
          className="text-3xl font-bold uppercase tracking-tighter mb-3"
          style={{ color: "var(--text)" }}
        >
          Сторінку не знайдено
        </h1>
        <p
          className="text-sm font-medium mb-8 opacity-60"
          style={{ color: "var(--text-muted)" }}
        >
          Можливо, посилання застаріло або сторінки більше не існує.
        </p>
        <TeButton shape="pill" href="/" className="px-6 py-3 text-xs font-bold tracking-widest">
          НА ГОЛОВНУ
        </TeButton>
      </div>
    </PageShell>
  );
}
