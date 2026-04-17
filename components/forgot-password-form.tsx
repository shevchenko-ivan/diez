"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";
import { TeButton } from "@/shared/components/TeButton";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Сталася помилка");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Перевірте пошту</h1>
          <p className="text-sm opacity-60" style={{ color: "var(--text-muted)" }}>Інструкції зі скидання паролю надіслано</p>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Якщо ви реєструвались через email та пароль — отримаєте листа зі скидання паролю.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}
        >
          Повернутись до входу
        </Link>
      </div>
    );
  }

  return (
    <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Забули пароль?</h1>
        <p className="text-sm opacity-60" style={{ color: "var(--text-muted)" }}>Введіть email — надішлемо посилання для скидання</p>
      </div>
      <form onSubmit={handleForgotPassword} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Email</label>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
        <TeButton
          shape="pill"
          type="submit"
          disabled={isLoading}
          className="w-full py-4 text-xs font-bold tracking-widest"
        >
          {isLoading ? "Надсилаємо..." : "НАДІСЛАТИ ЛИСТА"}
        </TeButton>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Згадали пароль?{" "}
          <Link href="/auth/login" className="font-bold hover:underline" style={{ color: "var(--text)" }}>
            Увійти
          </Link>
        </p>
      </form>
    </div>
  );
}
