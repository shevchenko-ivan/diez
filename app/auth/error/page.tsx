import { Suspense } from "react";
import { Navbar } from "@/shared/components/Navbar";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;
  return (
    <p className="text-sm font-medium opacity-60" style={{ color: "var(--text-muted)" }}>
      {params?.error ? `Код помилки: ${params.error}` : "Сталася невідома помилка."}
    </p>
  );
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="w-full max-w-sm te-surface p-10 text-center" style={{ borderRadius: "2rem" }}>
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold uppercase tracking-tighter mb-3" style={{ color: "var(--text)" }}>
          Щось пішло не так
        </h1>
        <Suspense>
          <ErrorContent searchParams={searchParams} />
        </Suspense>
        <a
          href="/auth/login"
          className="te-btn-orange mt-6 inline-block px-6 py-3 text-xs font-bold tracking-widest"
        >
          ПОВЕРНУТИСЬ
        </a>
      </div>
    </div>
  );
}
