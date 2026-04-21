"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "./Toaster";

const MESSAGES: Record<string, string> = {
  meta: "Мета пісні збережено",
  variant: "Варіант збережено",
};

export function SavedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = searchParams.get("saved");
    if (!saved) return;
    const msg = MESSAGES[saved] ?? "Збережено";
    toast(msg);
    // Clean up param from URL without re-render
    const params = new URLSearchParams(searchParams.toString());
    params.delete("saved");
    const newUrl = params.size > 0 ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
