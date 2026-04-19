"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "diez:focusMode";
const EVENT = "diez:focusmode-change";

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useFocusMode(): [boolean, (next: boolean) => void, () => void] {
  // SSR-safe: start false, hydrate from localStorage after mount to avoid mismatch.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(read());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setEnabled(Boolean(detail));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabled(e.newValue === "1");
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const set = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }, []);

  const toggle = useCallback(() => set(!read()), [set]);

  return [enabled, set, toggle];
}
