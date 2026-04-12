"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function getCurrentIsDark(): boolean {
  const stored = localStorage.getItem("theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(isDark: boolean, manual: boolean) {
  if (manual) {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  } else {
    // No stored pref — remove attribute and let CSS @media handle it
    document.documentElement.removeAttribute("data-theme");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark = getCurrentIsDark();
    setIsDark(dark);
    // Only set attribute if there's a manual override; otherwise let CSS @media work
    if (stored === "dark" || stored === "light") {
      applyTheme(dark, true);
    }

    // Sync icon with OS changes when no manual override is stored
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOsChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener("change", onOsChange);
    return () => mq.removeEventListener("change", onOsChange);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    applyTheme(next, true);
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
