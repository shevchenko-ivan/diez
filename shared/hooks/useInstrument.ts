"use client";

import { useCallback, useEffect, useState } from "react";

export type Instrument = "guitar" | "ukulele" | "piano";

const STORAGE_KEY = "diez:instrument";
const EVENT = "diez:instrument-change";

function parse(v: string | null): Instrument {
  if (v === "ukulele" || v === "piano") return v;
  return "guitar";
}

function read(): Instrument {
  if (typeof window === "undefined") return "guitar";
  try {
    return parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return "guitar";
  }
}

export function useInstrument(): [Instrument, (next: Instrument) => void] {
  const [value, setValue] = useState<Instrument>("guitar");

  useEffect(() => {
    setValue(read());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<Instrument>).detail;
      if (detail === "guitar" || detail === "ukulele" || detail === "piano") setValue(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setValue(parse(e.newValue));
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const set = useCallback((next: Instrument) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }, []);

  return [value, set];
}
