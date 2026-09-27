"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Song } from "../types";
import { applyVariant } from "../lib/variants";
import { takeBeginnerEntry } from "../lib/beginner-entry";
import { getSongSaveStateForSlug } from "@/features/playlist/actions/playlists";
import { SongViewer } from "./SongViewer";
import { SongActions } from "./SongActions";
import { VariantSwitcher } from "./VariantSwitcher";
import { FocusModeToggle } from "./FocusModeToggle";
import { TabsToggleButton } from "./TabsToggleButton";
import { AdminOnly } from "@/shared/components/AdminOnly";
import { TeButton } from "@/shared/components/TeButton";

// ─── Why this file exists ────────────────────────────────────────────────────
// /songs/[slug] is served from the ISR cache — the same HTML for everyone.
// Everything that used to make the page render per request now resolves in
// the browser, after hydration:
//   • `?v=` (variant) and `?t=` (transpose) from the URL,
//   • the signed-in user's saved variant / key / heart (cookie-gated: guests
//     and crawlers never make the request),
//   • the admin «Редагувати» link (<AdminOnly>, same as artist pages).
// The server renders the primary variant at transpose 0; the client upgrades
// from there. For a shared `?v=`/`?t=` link (or a signed-in user's saved
// arrangement) that means the primary arrangement is visible until the JS
// has loaded and hydrated (plus the server-action round trip for saved
// state) — a second or two on a slow phone — and then swaps. Plain visits,
// the overwhelming majority, never change after first paint.

type UrlParams = { v: string | null; t: number | null };
type SavedState = { isSaved: boolean; variantId: string | null; transpose: number };

interface SongPageState {
  /** Base song with the active variant applied. */
  song: Song;
  /** Key to open with: `?t=` wins, then the user's saved key, else 0. */
  transpose: number;
  /** True once ?v= and (for signed-in users) the saved state are resolved —
   *  the viewer waits for it before counting a view. */
  ready: boolean;
  /** Opened from «Для початківців» — start with the beginner toggle on. */
  autoBeginner: boolean;
}

const SongPageContext = createContext<SongPageState | null>(null);

function useSongPage(): SongPageState {
  const ctx = useContext(SongPageContext);
  if (!ctx) throw new Error("useSongPage must be used inside <SongPageProvider>");
  return ctx;
}

const clampTranspose = (n: number) => Math.max(-11, Math.min(11, n));

// Same fallback as applyVariant: unknown/missing id → primary → first.
function resolveVariantId(song: Song, variantId: string | undefined): string | undefined {
  const variants = song.variants;
  if (!variants || variants.length === 0) return undefined;
  return (
    (variantId && variants.find((v) => v.id === variantId)?.id) ||
    (variants.find((v) => v.isPrimary) ?? variants[0]).id
  );
}

// Reads ?v / ?t. `useSearchParams` on a statically rendered route has to sit
// under a Suspense boundary, and everything inside that boundary is
// client-rendered — so it lives in this null-rendering leaf, and the lyrics
// above it stay in the SSR HTML for crawlers.
function UrlParamsSync({ onChange }: { onChange: (p: UrlParams) => void }) {
  const searchParams = useSearchParams();
  const v = searchParams.get("v");
  const tRaw = searchParams.get("t");
  useEffect(() => {
    const t = tRaw !== null ? parseInt(tRaw, 10) : NaN;
    onChange({ v, t: Number.isFinite(t) ? clampTranspose(t) : null });
  }, [v, tRaw, onChange]);
  return null;
}

export function SongPageProvider({ baseSong, children }: { baseSong: Song; children: ReactNode }) {
  const [url, setUrl] = useState<UrlParams>({ v: null, t: null });
  const [urlReady, setUrlReady] = useState(false);
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [savedReady, setSavedReady] = useState(false);
  const [autoBeginner, setAutoBeginner] = useState(false);
  const [entryVariantId, setEntryVariantId] = useState<string | null>(null);

  // Came here from the «Для початківців» list? (sessionStorage, read once —
  // a reload or the next visit opens the song normally.) The list may point
  // at an easier variant than the primary one.
  useEffect(() => {
    const entry = takeBeginnerEntry(baseSong.slug);
    if (!entry) return;
    queueMicrotask(() => {
      if (entry.variantId) setEntryVariantId(entry.variantId);
      setAutoBeginner(true);
    });
  }, [baseSong.slug]);

  // Same-value updates keep the previous object, so a plain visit (no ?v/?t)
  // doesn't re-render the whole lyric tree once more after hydration.
  const handleUrl = useCallback((p: UrlParams) => {
    setUrl((prev) => (prev.v === p.v && prev.t === p.t ? prev : p));
    setUrlReady(true);
  }, []);

  // Saved variant / key — only for someone who is signed in. The Supabase
  // auth cookie is the cheap client-side tell; without it there is no request
  // at all (this is what keeps bot traffic free). The heart itself upgrades
  // through SavedSlugsProvider, exactly like on every other static page.
  useEffect(() => {
    let disposed = false;
    if (!/(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(document.cookie)) {
      // Guest: nothing to fetch. Resolved in a microtask, not synchronously in
      // the effect body, so it batches with the URL-params update.
      queueMicrotask(() => {
        if (!disposed) setSavedReady(true);
      });
      return () => {
        disposed = true;
      };
    }
    getSongSaveStateForSlug(baseSong.slug)
      .then((state) => {
        if (!disposed) setSaved(state);
      })
      .catch(() => {
        /* personalization is best-effort */
      })
      .finally(() => {
        if (!disposed) setSavedReady(true);
      });
    return () => {
      disposed = true;
    };
  }, [baseSong.slug]);

  // ?v= takes priority; then the easier variant «Для початківців» sent us to;
  // then the variant the user previously saved; then primary.
  const variantId = url.v ?? entryVariantId ?? saved?.variantId ?? undefined;
  // Memoized on the resolved id, not on the url/saved objects, so `song`
  // keeps its identity (and the viewer skips a render) when nothing changed.
  const song = useMemo(() => applyVariant(baseSong, variantId), [baseSong, variantId]);
  // ?t= (playlist links, sharing) wins over the key stored with the save.
  // The saved key belongs to the saved variant: another arrangement usually
  // sits in a different key, so switching to it opens at 0, not at +2.
  const savedKeyApplies =
    !!saved && resolveVariantId(baseSong, saved.variantId ?? undefined) === song.activeVariantId;
  const transpose = url.t ?? (savedKeyApplies ? clampTranspose(saved.transpose) : 0);
  const ready = urlReady && savedReady;
  const value = useMemo<SongPageState>(
    () => ({ song, transpose, ready, autoBeginner }),
    [song, transpose, ready, autoBeginner],
  );

  return (
    <SongPageContext.Provider value={value}>
      <Suspense fallback={null}>
        <UrlParamsSync onChange={handleUrl} />
      </Suspense>
      {children}
    </SongPageContext.Provider>
  );
}

// Admin-only «Редагувати». Decided on the client (<AdminOnly>) so the page
// stays cacheable; guests pay nothing. `song.id` is populated by
// getSongBySlug for exactly this link.
function AdminSongEditButton({ placement }: { placement: "header" | "sheet" }) {
  const { song } = useSongPage();
  if (!song.id) return null;
  const href = `/admin/songs/edit?id=${song.id}&from=song${song.activeVariantId ? `&variant=${song.activeVariantId}` : ""}`;
  return (
    <AdminOnly>
      {placement === "header" ? (
        <span className="hidden lg:inline-flex">
          <TeButton href={href} title="Редагувати" style={{ width: 36, height: 36, color: "var(--orange)" }}>
            <Pencil size={14} />
          </TeButton>
        </span>
      ) : (
        // Mobile/tablet: full-width button at the bottom of the tools sheet.
        <TeButton
          shape="pill"
          href={href}
          className="w-full py-2 text-xs font-bold justify-center gap-2"
          style={{ borderRadius: "1rem", color: "var(--orange)" }}
        >
          <Pencil size={14} />
          Редагувати
        </TeButton>
      )}
    </AdminOnly>
  );
}

/** Right column of the page header: variant switcher (md+), admin edit,
 *  focus mode, tabs toggle, save + share. */
export function SongHeaderActions() {
  const { song } = useSongPage();
  return (
    <div className="flex items-center gap-1.5 justify-end">
      {song.variants && song.variants.length > 0 && (
        <span className="hidden md:inline-flex">
          <VariantSwitcher variants={song.variants} activeVariantId={song.activeVariantId} />
        </span>
      )}
      <AdminSongEditButton placement="header" />
      <span className="hidden lg:inline-flex">
        <FocusModeToggle />
      </span>
      {song.sections.some((s) => s.tab) && <TabsToggleButton />}
      <SongActions slug={song.slug} variantId={song.activeVariantId} />
    </div>
  );
}

/** Mobile-only variant switcher row (avoids overlap with the stacked title). */
export function MobileVariantRow() {
  const { song } = useSongPage();
  if (!song.variants || song.variants.length === 0) return null;
  return (
    <div className="md:hidden flex justify-center mb-4">
      <VariantSwitcher variants={song.variants} activeVariantId={song.activeVariantId} />
    </div>
  );
}

/** The viewer. Deliberately NOT keyed by variant: on main a variant switch
 *  was a same-route navigation, which React reconciles in place — font size,
 *  an open tuner or a playing video all survive. (Transpose does not: the
 *  viewer resets it on a variant switch, see SongViewer.) SongViewer
 *  follows `song`/`initialTranspose` prop changes, and useVoicings re-seeds on
 *  a new chordVoicings object, so the same holds here. */
export function ActiveSongViewer() {
  const { song, transpose, ready, autoBeginner } = useSongPage();
  return (
    <SongViewer
      song={song}
      initialTranspose={transpose}
      autoBeginner={autoBeginner}
      trackView={ready}
      editSlot={<AdminSongEditButton placement="sheet" />}
    />
  );
}
