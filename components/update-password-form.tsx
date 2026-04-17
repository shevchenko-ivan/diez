"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TeButton } from "@/shared/components/TeButton";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/profile");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Сталася помилка");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "var(--text)" }}>Новий пароль</h1>
        <p className="text-sm opacity-60" style={{ color: "var(--text-muted)" }}>Введіть новий пароль для вашого акаунту</p>
      </div>
      <form onSubmit={handleUpdatePassword} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="password" className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>Новий пароль</label>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <input
              id="password"
              type="password"
              placeholder="Мінімум 6 символів"
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
        <TeButton
          shape="pill"
          type="submit"
          disabled={isLoading}
          className="w-full py-4 text-xs font-bold tracking-widest"
        >
          {isLoading ? "Зберігаємо..." : "ЗБЕРЕГТИ ПАРОЛЬ"}
        </TeButton>
      </form>
    </div>
  );
}
