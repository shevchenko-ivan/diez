"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Паролі не збігаються");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Помилка реєстрації");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Реєстрація</h1>
        <p className="text-sm opacity-60" style={{ color: "var(--text-muted)" }}>Створіть акаунт Diez</p>
      </div>
      <form onSubmit={handleSignUp} className="space-y-5">
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
          <label htmlFor="password" className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Пароль</label>
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
        <div className="space-y-2">
          <label htmlFor="repeat-password" className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Повторіть пароль</label>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <input
              id="repeat-password"
              type="password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="te-btn-orange w-full py-4 text-xs font-bold tracking-widest"
        >
          {isLoading ? "Реєстрація..." : "ЗАРЕЄСТРУВАТИСЬ"}
        </button>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Вже є акаунт?{" "}
          <Link href="/auth/login" className="font-bold hover:underline" style={{ color: "var(--text)" }}>
            Увійти
          </Link>
        </p>
      </form>
    </div>
  );
}
