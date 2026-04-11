"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, User } from "lucide-react";

const NAV_LINKS = [
  { href: "/songs", label: "Акорди" },
  { href: "/artists", label: "Виконавці" },
  { href: "/songs?sort=new", label: "Новинки" },
  { href: "/songs?sort=popular", label: "Топ популярних" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 px-6 py-4">
      <nav className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <span style={{ color: "var(--orange)", fontWeight: 500, fontSize: "1.35rem", letterSpacing: "-0.04em" }}>#</span>
          <span style={{ color: "var(--text)", fontWeight: 500, fontSize: "1.35rem", letterSpacing: "-0.04em" }}>DIEZ</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="te-key px-4 py-2 text-sm"
              style={{ color: "var(--text-mid)", fontWeight: 400 }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* User area */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/add"
            className="te-key px-4 py-2 text-sm flex items-center gap-2"
            style={{ color: "var(--text-mid)", fontWeight: 400 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 hidden lg:inline">СТВОРИТИ</span>
            <span className="lg:hidden">Додати</span>
          </Link>
          <Link
            href="/profile"
            className="te-key px-4 py-2 text-sm"
            style={{ color: "var(--text-mid)", fontWeight: 400 }}
          >
            Профіль
          </Link>
          <Link
            href="/admin"
            className="te-key px-4 py-2 text-sm"
            style={{ color: "var(--text-mid)", fontWeight: 400 }}
          >
            Адмінка
          </Link>
          <Link
            href="/auth/login"
            id="nav-login-btn"
            className="te-key px-4 py-2 text-sm"
            style={{ color: "var(--text-mid)", fontWeight: 400 }}
          >
            Увійти
          </Link>
          <Link
            href="/auth/sign-up"
            id="nav-signup-btn"
            className="te-btn-orange px-5 py-2 text-sm font-bold"
          >
            Реєстрація
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          id="mobile-menu-btn"
          className="md:hidden te-key p-2.5"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div
          className="te-surface md:hidden max-w-6xl mx-auto mt-2 p-4 space-y-1"
          style={{ borderRadius: "1.25rem" }}
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ color: "var(--text-mid)" }}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <Link href="/add" className="te-key w-full text-left px-4 py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setOpen(false)}>Додати пісню (СТВОРИТИ)</Link>
            <Link href="/profile" className="te-key w-full text-left px-4 py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setOpen(false)}>Мій профіль</Link>
            <Link href="/admin" className="te-key w-full text-left px-4 py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setOpen(false)}>Адмін-панель</Link>
          </div>
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <Link href="/auth/login" className="te-key flex-1 text-center py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setOpen(false)}>Увійти</Link>
            <Link href="/auth/sign-up" className="te-btn-orange flex-1 text-center py-2.5 text-sm font-bold" onClick={() => setOpen(false)}>Реєстрація</Link>
          </div>
        </div>
      )}
    </header>
  );
}
