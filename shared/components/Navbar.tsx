"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown, User, LogOut, Shield, Plus, Moon, Sun, Palette, ListMusic } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/shared/components/ThemeProvider";
import { TeButton } from "@/shared/components/TeButton";
import { useHaptics } from "@/shared/hooks/useHaptics";

const NAV_LINKS = [
  { href: "/",                  label: "Головна" },
  { href: "/artists",           label: "Виконавці" },
  { href: "/tuner",             label: "Тюнер" },
  { href: "/chords",            label: "Визначити акорд" },
];

interface NavUser {
  email: string;
  isAdmin: boolean;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navUser, setNavUser] = useState<NavUser | null | "loading">("loading");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHaptics();

  const closeDropdown = () => {
    trigger("light");
    setDropdownOpen(false);
  };

  useEffect(() => {
    const sb = createClient();

    async function load() {
      try {
        // getSession reads from localStorage — no network call, instant
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) { setNavUser(null); return; }

        const { data: profile } = await sb
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        setNavUser({ email: session.user.email ?? "", isAdmin: !!profile?.is_admin });
      } catch {
        setNavUser(null);
      }
    }

    load();

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (!session) { setNavUser(null); return; }
      setNavUser({ email: session.user.email ?? "", isAdmin: false });
      // refetch is_admin in background
      sb.from("profiles").select("is_admin").eq("id", session.user.id).single()
        .then(({ data }) => setNavUser({ email: session.user.email ?? "", isAdmin: !!data?.is_admin }));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    setDropdownOpen(false);
    window.location.href = "/";
  }

  const isLoggedIn = navUser !== "loading" && navUser !== null;
  const isAdmin = isLoggedIn && (navUser as NavUser).isAdmin;
  const userEmail = isLoggedIn ? (navUser as NavUser).email : "";
  const userInitial = userEmail ? userEmail[0].toUpperCase() : "?";

  const { isDark, toggle } = useTheme();

  return (
    <header className="px-6 py-4">
      <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0">
          <span style={{ color: "var(--orange)", fontWeight: 500, fontSize: "1.35rem", letterSpacing: "-0.04em" }}>#</span>
          <span style={{ color: "var(--text)", fontWeight: 500, fontSize: "1.35rem", letterSpacing: "-0.04em" }}>DIEZ</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="px-3 py-2 text-sm transition-colors hover:opacity-70" style={{ color: "var(--text-mid)", fontWeight: 400 }}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop right area */}
        <div className="hidden md:flex items-center gap-3">

          <TeButton
            shape="pill"
            onClick={toggle}
            className="p-2.5"
            title={isDark ? "Світла тема" : "Темна тема"}
          >
            {isDark
              ? <Sun size={15} style={{ color: "var(--text-muted)" }} />
              : <Moon size={15} style={{ color: "var(--text-muted)" }} />
            }
          </TeButton>

          {navUser === "loading" ? (
            /* Skeleton */
            <div className="w-8 h-8 rounded-full te-inset animate-pulse" />
          ) : !isLoggedIn ? (
            /* Guest */
            <>
              <TeButton shape="pill" href="/auth/login" className="px-4 py-2 text-sm" style={{ color: "var(--text-mid)", fontWeight: 400 }}>
                Увійти
              </TeButton>
              <TeButton shape="pill" href="/auth/sign-up" className="px-5 py-2 text-sm font-bold">
                Реєстрація
              </TeButton>
            </>
          ) : (
            /* Logged-in user dropdown */
            <div className="relative" ref={dropdownRef}>
              <TeButton
                shape="pill"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5"
                style={{ borderRadius: "3rem" }}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "var(--orange)" }}
                >
                  {userInitial}
                </div>
                <span className="text-sm font-medium max-w-[120px] truncate" style={{ color: "var(--text)" }}>
                  {userEmail.split("@")[0]}
                </span>
                <ChevronDown size={13} style={{ color: "var(--text-muted)", transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </TeButton>

              {/* Dropdown */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 te-surface overflow-hidden"
                  style={{ borderRadius: "1.25rem", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 100 }}
                >
                  {/* Email header */}
                  <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <p className="text-xs opacity-50 truncate" style={{ color: "var(--text-muted)" }}>{userEmail}</p>
                  </div>

                  <div className="py-1">
                    <Link href="/add" onClick={closeDropdown}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                      style={{ color: "var(--orange)" }}
                    >
                      <Plus size={15} style={{ color: "var(--orange)" }} /> Створити пісню
                    </Link>

                    <Link href="/profile" onClick={closeDropdown}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                      style={{ color: "var(--text)" }}
                    >
                      <User size={15} style={{ color: "var(--text-muted)" }} /> Профіль
                    </Link>

                    <Link href="/profile/lists" onClick={closeDropdown}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                      style={{ color: "var(--text)" }}
                    >
                      <ListMusic size={15} style={{ color: "var(--text-muted)" }} /> Мої списки
                    </Link>

                    {isAdmin && (
                      <Link href="/admin" onClick={closeDropdown}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                        style={{ color: "var(--text)" }}
                      >
                        <Shield size={15} style={{ color: "var(--orange)" }} />
                        <span>Адмін-панель</span>
                      </Link>
                    )}

                    {isAdmin && (
                      <Link href="/ui-kit" onClick={closeDropdown}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                        style={{ color: "var(--text)" }}
                      >
                        <Palette size={15} style={{ color: "var(--text-muted)" }} />
                        <span>UI Kit</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t py-1" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <button onClick={() => { trigger("warning"); signOut(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <LogOut size={15} /> Вийти
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile right: theme + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <TeButton shape="pill" onClick={toggle} className="p-2.5" title={isDark ? "Світла тема" : "Темна тема"}>
            {isDark
              ? <Sun size={15} style={{ color: "var(--text-muted)" }} />
              : <Moon size={15} style={{ color: "var(--text-muted)" }} />
            }
          </TeButton>
          <TeButton shape="pill" className="p-2.5" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </TeButton>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="te-surface md:hidden max-w-6xl mx-auto mt-2 p-4 space-y-1" style={{ borderRadius: "1.25rem" }}>
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href}
              className="block px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ color: "var(--text-mid)" }}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <div className="flex flex-col gap-2 pt-3 mt-1 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <TeButton shape="pill" href="/add" className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold" style={{ color: "var(--orange)" }} onClick={() => setMobileOpen(false)}>
              <Plus size={14} /> Створити пісню
            </TeButton>

            {isLoggedIn ? (
              <>
                <TeButton shape="pill" href="/profile" className="px-4 py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setMobileOpen(false)}>Профіль</TeButton>
                <TeButton shape="pill" href="/profile/lists" className="px-4 py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setMobileOpen(false)}>Мої списки</TeButton>
                {isAdmin && (
                  <TeButton shape="pill" href="/admin" className="px-4 py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setMobileOpen(false)}>Адмін-панель</TeButton>
                )}
                {isAdmin && (
                  <TeButton shape="pill" href="/ui-kit" className="px-4 py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setMobileOpen(false)}>UI Kit</TeButton>
                )}
                <TeButton shape="pill" onClick={() => { signOut(); setMobileOpen(false); }}
                  className="text-left px-4 py-2.5 text-sm font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Вийти
                </TeButton>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <TeButton shape="pill" href="/auth/login" className="flex-1 text-center py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }} onClick={() => setMobileOpen(false)}>Увійти</TeButton>
                <TeButton shape="pill" href="/auth/sign-up" className="flex-1 text-center py-2.5 text-sm font-bold" onClick={() => setMobileOpen(false)}>Реєстрація</TeButton>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
