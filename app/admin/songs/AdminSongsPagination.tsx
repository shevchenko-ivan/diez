"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export function AdminSongsPagination({ currentPage, totalPages, total, pageSize }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const sp = new URLSearchParams(params.toString());
    if (p === 1) sp.delete("page");
    else sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const pages = buildPageList(currentPage, totalPages);
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
      <p className="text-xs opacity-60" style={{ color: "var(--text-muted)" }}>
        {from}–{to} з {total}
      </p>
      <nav className="flex items-center gap-1">
        {currentPage > 1 ? (
          <Link
            href={hrefFor(currentPage - 1)}
            className="te-pill-btn p-2 rounded-xl opacity-70 hover:opacity-100"
            aria-label="Попередня"
          >
            <ChevronLeft size={14} />
          </Link>
        ) : (
          <span className="p-2 rounded-xl opacity-30"><ChevronLeft size={14} /></span>
        )}

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-xs opacity-50">…</span>
          ) : p === currentPage ? (
            <span
              key={p}
              className="te-pill-btn px-3 py-1.5 text-xs font-bold"
              style={{ background: "var(--orange)", color: "white" }}
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={hrefFor(p)}
              className="te-pill-btn px-3 py-1.5 text-xs font-bold opacity-70 hover:opacity-100"
            >
              {p}
            </Link>
          )
        )}

        {currentPage < totalPages ? (
          <Link
            href={hrefFor(currentPage + 1)}
            className="te-pill-btn p-2 rounded-xl opacity-70 hover:opacity-100"
            aria-label="Наступна"
          >
            <ChevronRight size={14} />
          </Link>
        ) : (
          <span className="p-2 rounded-xl opacity-30"><ChevronRight size={14} /></span>
        )}
      </nav>
    </div>
  );
}
