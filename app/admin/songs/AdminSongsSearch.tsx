"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

export function AdminSongsSearch({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initialQ);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const h = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      const trimmed = value.trim();
      if (trimmed) sp.set("q", trimmed); else sp.delete("q");
      if ((sp.get("q") ?? "") !== initialQ) sp.delete("page");
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 250);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative mb-4">
      <Search
        size={16}
        className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Пошук за назвою або виконавцем…"
        className="te-inset w-full pl-10 pr-10 py-3 text-sm rounded-xl outline-none"
        style={{ color: "var(--text)" }}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100"
          aria-label="Очистити"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
