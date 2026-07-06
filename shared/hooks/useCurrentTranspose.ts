"use client";

import { useEffect, useState } from "react";

// Session-scoped broadcast of the song page's current transpose value.
// SongViewer publishes on every change; SaveHeartButton (rendered in a
// separate client tree in the page header) reads the latest value so the
// playlist row can store the key the user sees at the moment of saving.
// No persistence — value lives only while the song page is mounted.

const EVENT = "diez:transpose-change";

let current = 0;

export function publishTranspose(value: number) {
  current = value;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
  }
}

/** Latest transpose published by the SongViewer on this page (0 if none). */
export function useCurrentTranspose(): number {
  const [value, setValue] = useState(current);

  useEffect(() => {
    setValue(current);
    const onChange = (e: Event) => setValue((e as CustomEvent<number>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return value;
}

/** Imperative read for event handlers that don't need re-renders. */
export function readCurrentTranspose(): number {
  return current;
}

// Convenience for SongViewer: publish on every change, reset on unmount so a
// stale value never leaks into the next song page.
export function usePublishTranspose(value: number) {
  useEffect(() => {
    publishTranspose(value);
  }, [value]);
  useEffect(() => () => publishTranspose(0), []);
}
