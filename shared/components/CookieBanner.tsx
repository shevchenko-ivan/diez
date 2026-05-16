"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Consent state ───────────────────────────────────────────────────────────
//
// Persisted in localStorage under `diez:cookie-consent` as JSON:
//   { analytics: boolean, ts: number }
//
// `null` from `readConsent` means the user hasn't chosen yet → show the banner.
// PostHogProvider reads the same key and listens for the
// `diez:consent-changed` custom event to (re-)initialize when the user accepts
// without a page reload.

const STORAGE_KEY = "diez:cookie-consent";

export type CookieConsent = {
  analytics: boolean;
  ts: number;
};

export function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (typeof parsed?.analytics !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(consent: CookieConsent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("diez:consent-changed", { detail: consent }));
  } catch {
    /* localStorage may be disabled — best-effort */
  }
}

// ─── Banner ─────────────────────────────────────────────────────────────────

export function CookieBanner() {
  // `mounted` gate prevents flicker: we render nothing until we've checked
  // localStorage on the client. Without it, SSR would always emit the banner
  // and then hide it on hydration, which causes a 1-frame flash for returning
  // users.
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Toggle state inside the settings modal. Reflects what the user is about
  // to save, not the persisted value — defaults to ON per project decision.
  const [analyticsToggle, setAnalyticsToggle] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (readConsent() === null) setOpen(true);
  }, []);

  function commit(analytics: boolean) {
    writeConsent({ analytics, ts: Date.now() });
    setOpen(false);
    setSettingsOpen(false);
  }

  if (!mounted || !open) return null;

  return (
    <>
      {/* ── Bottom-fixed banner ──────────────────────────────────────── */}
      <div
        role="dialog"
        aria-label="Згода на cookies"
        aria-describedby="cookie-banner-text"
        // High z-index so it floats above the footer + sticky elements,
        // below auth modals (which use 100+).
        // `position: fixed` + transform animation keeps it out of layout
        // flow → zero CLS impact on LCP measurement.
        className="cookie-banner"
        style={{
          position: "fixed",
          // Inset bumped on mobile to clear the Next.js dev tools puck and
          // any iOS home-indicator inset. Outer container handles centering
          // via marginInline:auto so the maxWidth still works on desktop.
          left: 12,
          right: 12,
          bottom: "max(12px, env(safe-area-inset-bottom))",
          zIndex: 60,
          padding: "14px 18px",
          borderRadius: "1.25rem",
          background: "var(--surface)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08)",
          border: "1px solid var(--surface-dk, rgba(0,0,0,0.06))",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          rowGap: 12,
          columnGap: 16,
          animation: "cookie-banner-in 280ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
          maxWidth: 880,
          marginInline: "auto",
        }}
      >
        <p
          id="cookie-banner-text"
          style={{
            fontSize: "0.85rem",
            color: "var(--text)",
            lineHeight: 1.5,
            margin: 0,
            flex: "1 1 360px",
          }}
        >
          Diez використовує cookies для аналітики. Деталі в{" "}
          <Link
            href="/privacy"
            style={{ color: "var(--text)", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            Політиці конфіденційності
          </Link>
          .
        </p>

        <div
          // On narrow viewports flex-wrap pushes this onto its own line,
          // and we want the two controls to span full width and stay aligned
          // — `justifyContent: space-between` puts the link on the left and
          // the primary button on the right, which is the same hierarchy as
          // the desktop layout. `flex: 1 1 auto` lets the row claim the new
          // line without leaving an awkward gap.
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flex: "0 1 auto",
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAnalyticsToggle(readConsent()?.analytics ?? true);
              setSettingsOpen(true);
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--text-muted)",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Налаштування
          </button>
          <button
            type="button"
            onClick={() => commit(true)}
            // Primary "Прийняти" — the visual anchor. Orange to match the
            // brand accent + slightly larger than the surrounding text so it
            // reads as the obvious next action.
            style={{
              background: "var(--orange)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.02em",
              boxShadow: "0 2px 8px rgba(255, 140, 60, 0.35)",
            }}
          >
            Прийняти
          </button>
        </div>
      </div>

      {/* ── Settings modal ──────────────────────────────────────────── */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Налаштування cookies"
          // Backdrop. Clicking it closes only the modal, NOT commits anything
          // — the banner stays so the user is still asked to pick.
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            animation: "cookie-modal-in 200ms ease-out both",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "1.5rem",
              padding: "28px 28px 20px",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                Налаштування cookies
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Закрити налаштування"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  color: "var(--text-muted)",
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* ── Necessary (locked) ──────────────────────────────── */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "0.75rem",
                background: "var(--surface-dk, rgba(0,0,0,0.04))",
                marginTop: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
                  Обов'язкові
                </span>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--orange)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Завжди увімкнено
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                Без них сайт не працюватиме: авторизація, налаштування теми, збережені плейлисти.
              </p>
            </div>

            {/* ── Analytics (toggle) ──────────────────────────────── */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "0.75rem",
                background: "var(--surface-dk, rgba(0,0,0,0.04))",
                marginTop: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 12 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
                  Аналітика
                </span>
                <Toggle checked={analyticsToggle} onChange={setAnalyticsToggle} ariaLabel="Аналітика" />
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                Анонімно — які сторінки переглядають, де виникають складнощі. Допомагає покращувати Diez.
              </p>
            </div>

            {/* ── Action row ──────────────────────────────────────── */}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => commit(false)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Відхилити всі
              </button>
              <button
                type="button"
                onClick={() => commit(analyticsToggle)}
                style={{
                  background: "var(--orange)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 24px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                  boxShadow: "0 2px 8px rgba(255, 140, 60, 0.35)",
                }}
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations declared inline so we don't have to wire a new global
          stylesheet — banner is the only consumer. */}
      <style jsx global>{`
        @keyframes cookie-banner-in {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes cookie-modal-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── Toggle switch ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 24,
        borderRadius: 999,
        background: checked ? "var(--orange)" : "rgba(0, 0, 0, 0.18)",
        border: "none",
        position: "relative",
        cursor: "pointer",
        transition: "background-color 160ms ease",
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 19 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#FFFFFF",
          transition: "left 160ms cubic-bezier(0.2, 0.7, 0.2, 1)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}
