import { Suspense } from "react";
import { Navbar } from "@/shared/components/Navbar";
import { TeButton } from "@/shared/components/TeButton";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Доступ заборонено",
  server_error: "Помилка сервера",
  invalid_request: "Невірний запит",
  unauthorized_client: "Неавторизований клієнт",
  unsupported_response_type: "Непідтримуваний тип відповіді",
  invalid_scope: "Невірна область доступу",
  temporarily_unavailable: "Сервіс тимчасово недоступний",
  otp_expired: "Код підтвердження закінчився",
  email_not_confirmed: "Електронну пошту не підтверджено",
};

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;
  const message = params?.error
    ? ERROR_MESSAGES[params.error] ?? "Сталася помилка автентифікації"
    : "Сталася невідома помилка.";
  return (
    <p className="text-sm font-medium opacity-60" style={{ color: "var(--text-muted)" }}>
      {message}
    </p>
  );
}

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="w-full max-w-sm te-surface p-10 text-center" style={{ borderRadius: "2rem" }}>
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold uppercase tracking-tighter mb-3" style={{ color: "var(--text)" }}>
          Щось пішло не так
        </h1>
        <Suspense>
          <ErrorContent searchParams={searchParams} />
        </Suspense>
        <TeButton
          shape="pill"
          href="/auth/login"
          className="mt-6 inline-block px-6 py-3 text-xs font-bold tracking-widest"
        >
          ПОВЕРНУТИСЬ
        </TeButton>
      </div>
    </div>
  );
}
