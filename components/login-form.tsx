"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TeButton } from "@/shared/components/TeButton";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/profile");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Помилка входу");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Вхід</h1>
        <p className="text-sm opacity-60" style={{ color: "var(--text-muted)" }}>Введіть свій email та пароль</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-5">
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
        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label htmlFor="password" className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Пароль</label>
            <Link
              href="/auth/forgot-password"
              className="text-xs opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              Забули пароль?
            </Link>
          </div>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {isLoading ? "Вхід..." : "УВІЙТИ"}
        </TeButton>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Ще немає акаунту?{" "}
          <Link href="/auth/sign-up" className="font-bold hover:underline" style={{ color: "var(--text)" }}>
            Реєстрація
          </Link>
        </p>
      </form>
    </div>
  );
}
