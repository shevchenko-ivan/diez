"use client";

import { Search } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";

export function SearchSubmitButton() {
  return (
    <>
      {/* Mobile: icon-only */}
      <span className="md:hidden shrink-0">
        <TeButton shape="pill" type="submit" icon={Search} aria-label="Знайти" title="Знайти" />
      </span>
      {/* Desktop: text label */}
      <span className="hidden md:inline-flex shrink-0">
        <TeButton shape="pill" type="submit" className="px-5 py-3 text-xs font-bold tracking-widest">
          ЗНАЙТИ
        </TeButton>
      </span>
    </>
  );
}
