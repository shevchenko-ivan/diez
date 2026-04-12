"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  // Tracks whether the user manually overrode the theme this session.
  // When true, OS changes are ignored until next page load.
  const manualRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // Sync icon state with current OS preference on mount
    setIsDark(mq.matches);

    const onOsChange = (e: MediaQueryListEvent) => {
      if (!manualRef.current) {
        // No manual override — follow OS via CSS @media (no attribute needed)
        setIsDark(e.matches);
        document.documentElement.removeAttribute("data-theme");
      }
    };
    mq.addEventListener("change", onOsChange);
    return () => mq.removeEventListener("change", onOsChange);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    manualRef.current = true;
    // Set explicit attribute so it overrides the CSS @media rule
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
