"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap, RotateCw, Lock, Flower2, Timer,
  Square, Search, Home, ArrowLeft, Scissors, Settings,
} from "lucide-react";
import { AdjusterButton } from "@/shared/components/AdjusterButton";
import { ControlBlock } from "@/shared/components/ControlBlock";
import { TeButton } from "@/shared/components/TeButton";

// ─── Layout helpers (kit-only) ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2
        className="uppercase tracking-widest mb-6 pb-2"
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          letterSpacing: "0.15em",
          borderBottom: "1px solid var(--surface-dk)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-2 text-center font-mono"
      style={{ fontSize: "0.55rem", color: "var(--text-muted)", letterSpacing: "0.05em" }}
    >
      {children}
    </p>
  );
}

function Row({ children, gap = 3 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div className={`flex flex-wrap items-end gap-${gap}`}>
      {children}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center">{children}</div>;
}

// ─── Atomic Design tiers ──────────────────────────────────────────────────────

const TIERS = [
  {
    id: "tokens",
    eyebrow: "Tier 0",
    title: "Tokens",
    description:
      "Дизайн-токени: кольори, типографіка, поверхні, тіні, декоративні текстури. Не комбінуються — задають візуальну мову, з якої будується все інше.",
  },
  {
    id: "atoms",
    eyebrow: "Tier 1",
    title: "Atoms",
    description:
      "Найменші функціональні UI-примітиви: одна кнопка, один інпут, один badge. Не діляться далі без втрати сенсу.",
  },
  {
    id: "molecules",
    eyebrow: "Tier 2",
    title: "Molecules",
    description:
      "Невеликі композиції з атомів з одним призначенням: сегментований контроль, control-block (label + ±-кнопки + readout), LCD-індикатор, рядок pill-кнопок.",
  },
  {
    id: "organisms",
    eyebrow: "Tier 3",
    title: "Organisms",
    description:
      "Цільні composite-компоненти, які можна вставити у сторінку як є: SongCard, ArtistCard, FilterCard, повна recorder-панель.",
  },
] as const;

type TierId = typeof TIERS[number]["id"];

function Group({ id, children }: { id: TierId; children: React.ReactNode }) {
  const tier = TIERS.find((t) => t.id === id)!;
  return (
    <div id={id} className="mb-24 scroll-mt-24">
      <div className="mb-10 pb-5 border-b" style={{ borderColor: "var(--surface-dk)" }}>
        <p className="font-mono uppercase" style={{ fontSize: "0.55rem", color: "var(--orange)", fontWeight: 700, letterSpacing: "0.18em" }}>
          {tier.eyebrow}
        </p>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 4 }}>
          {tier.title}
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8, maxWidth: 640, lineHeight: 1.55 }}>
          {tier.description}
        </p>
      </div>
      {children}
    </div>
  );
}

function TierNav() {
  return (
    <nav className="hidden md:inline-flex te-control-pill" style={{ padding: 3 }}>
      {TIERS.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          className="te-control-pill-btn font-bold uppercase"
          style={{
            fontSize: "0.62rem",
            letterSpacing: "0.12em",
            color: "var(--text-mid)",
            minWidth: 78,
            height: 32,
            padding: "0 14px",
          }}
        >
          {t.title}
        </a>
      ))}
    </nav>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UIKitPage() {
  const [ledActive, setLedActive] = useState(false);
  const [pillActive, setPillActive] = useState<"a" | "b" | "c">("a");
  const [flashOn, setFlashOn] = useState(false);
  const [locked, setLocked] = useState(false);
  const [recording, setRecording] = useState(true);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header — physical device top panel */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between gap-6 px-8 py-4"
        style={{
          background: "var(--surface)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.6) inset, " +
            "0 -1px 0 rgba(0,0,0,0.06) inset, " +
            "0 6px 12px -4px rgba(0,0,0,0.18), " +
            "0 1px 0 rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/" className="te-pill-btn px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
            ← Назад
          </Link>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em" }}>
            <span style={{ color: "var(--orange)" }}>#</span>DIEZ UI Kit
          </span>
        </div>
        <TierNav />
        <span className="font-mono flex-shrink-0" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
          TE Design System · Atomic
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TIER 0 — TOKENS                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Group id="tokens">

          {/* Colors */}
          <Section title="Colors — CSS Variables">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {[
                { name: "--bg",         hex: "#F2F2F2", label: "bg" },
                { name: "--surface",    hex: "#F8F8F8", label: "surface" },
                { name: "--surface-hi", hex: "#FFFFFF", label: "surface-hi" },
                { name: "--surface-dk", hex: "#EBEBEB", label: "surface-dk" },
                { name: "--panel",      hex: "#1A1917", label: "panel" },
                { name: "--orange",     hex: "#FF8800", label: "orange" },
                { name: "--red",        hex: "#FF4444", label: "red" },
                { name: "--navy",       hex: "#1A1F3A", label: "navy" },
              ].map((c) => (
                <div key={c.name} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-full aspect-square rounded-xl border"
                    style={{
                      background: c.hex,
                      borderColor: "rgba(0,0,0,0.06)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  />
                  <span className="font-mono text-center" style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>
                    {c.label}
                  </span>
                  <span className="font-mono text-center" style={{ fontSize: "0.5rem", color: "var(--text-muted)", opacity: 0.6 }}>
                    {c.hex}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-6 mt-6">
              {[
                { val: "var(--text)",       label: "--text",       sample: "Текст" },
                { val: "var(--text-mid)",   label: "--text-mid",   sample: "Текст" },
                { val: "var(--text-muted)", label: "--text-muted", sample: "Текст" },
                { val: "var(--orange)",     label: "--orange",     sample: "Текст" },
              ].map((t) => (
                <div key={t.label} className="flex flex-col gap-1">
                  <span style={{ fontSize: "1.1rem", fontWeight: 600, color: t.val }}>{t.sample}</span>
                  <span className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>{t.label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Typography */}
          <Section title="Typography">
            <div className="space-y-4">
              {[
                { size: "2.25rem", weight: 800, label: "H1 / 36px / 800",    sample: "Акорди для душі" },
                { size: "1.5rem",  weight: 700, label: "H2 / 24px / 700",    sample: "Зараз грають найчастіше" },
                { size: "1.25rem", weight: 700, label: "H3 / 20px / 700",    sample: "Стара фотографія" },
                { size: "1rem",    weight: 500, label: "Body / 16px / 500",  sample: "Пісня про кохання та розставання" },
                { size: "0.875rem",weight: 400, label: "Small / 14px / 400", sample: "Океан Ельзи · Поп-рок · Am" },
                { size: "0.75rem", weight: 400, label: "XS / 12px / 400",    sample: "Складність: легка · 1 234 перегляди" },
                { size: "0.65rem", weight: 700, label: "Label / 10px / 700 / uppercase", sample: "АКОРДИ · KEY · BPM · CAPO", upper: true },
              ].map((t) => (
                <div key={t.label} className="flex items-baseline gap-6">
                  <span
                    className="flex-1"
                    style={{
                      fontSize: t.size,
                      fontWeight: t.weight,
                      color: "var(--text)",
                      textTransform: t.upper ? "uppercase" : undefined,
                      letterSpacing: t.upper ? "0.1em" : undefined,
                    }}
                  >
                    {t.sample}
                  </span>
                  <span className="font-mono flex-shrink-0" style={{ fontSize: "0.55rem", color: "var(--text-muted)", minWidth: 200 }}>
                    {t.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 te-lcd inline-block px-4 py-3" style={{ borderRadius: "0.75rem" }}>
              <span className="font-mono-te" style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
                03:47
              </span>
              <span className="font-mono-te ml-4" style={{ fontSize: "0.75rem" }}>
                JetBrains Mono — font-mono-te
              </span>
            </div>
          </Section>

          {/* Surfaces */}
          <Section title="Surfaces">
            <Row gap={4}>
              <Cell>
                <div className="te-surface w-40 h-24 rounded-2xl" />
                <Label>.te-surface</Label>
              </Cell>
              <Cell>
                <div className="te-inset w-40 h-24 rounded-2xl" />
                <Label>.te-inset</Label>
              </Cell>
              <Cell>
                <div className="te-socket w-40 h-24 rounded-2xl" />
                <Label>.te-socket</Label>
              </Cell>
              <Cell>
                <div className="te-lcd w-40 h-24 rounded-2xl" />
                <Label>.te-lcd</Label>
              </Cell>
            </Row>
          </Section>

          {/* Shadows */}
          <Section title="Shadows — Box Shadow Reference">
            <Row gap={8}>
              {[
                { label: "--sh-physical",         cls: "te-surface" },
                { label: "--sh-socket (inset)",   cls: "te-inset"   },
                { label: "--sh-physical-pressed", cls: "te-knob"    },
              ].map((s) => (
                <Cell key={s.label}>
                  <div className={`${s.cls} w-24 h-24 rounded-2xl`} />
                  <Label>{s.label}</Label>
                </Cell>
              ))}
              <Cell>
                <div
                  className="te-surface w-24 h-24 rounded-2xl"
                  style={{ boxShadow: "var(--sh-glow-orange)", outline: "2px solid var(--orange)" }}
                />
                <Label>--sh-glow-orange</Label>
              </Cell>
            </Row>
          </Section>

          {/* Decorative */}
          <Section title="Decorative">
            <Row gap={6}>
              <Cell>
                <div className="te-grille w-32 h-16 rounded-xl" />
                <Label>.te-grille — speaker dots</Label>
              </Cell>
              <Cell>
                <div className="te-surface w-32 h-16 rounded-xl overflow-hidden">
                  <div className="te-grille w-full h-full" />
                </div>
                <Label>.te-grille on te-surface</Label>
              </Cell>
            </Row>
          </Section>

        </Group>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TIER 1 — ATOMS                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Group id="atoms">

          {/* Unified TeButton — matrix of shape × size × tone × state */}
          <Section title="TeButton — unified key primitive">
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 20, maxWidth: 680, lineHeight: 1.5 }}>
              Один компонент для всіх натискних поверхонь у TE-стилі. Пропси:{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>shape</code>,{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>size</code>,{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>tone</code>,{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>active</code>,{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>icon</code> (або{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>children</code>),{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>href</code>.
            </p>

            {/* shape: circle ─────────────────────────────── */}
            <p className="te-label mb-3">shape=&quot;circle&quot; — round physical key</p>
            <Row gap={4}>
              <Cell>
                <TeButton icon={RotateCw} aria-label="Rotate" />
                <Label>default · md</Label>
              </Cell>
              <Cell>
                <TeButton icon={Flower2} size="sm" aria-label="Macro" />
                <Label>size=&quot;sm&quot;</Label>
              </Cell>
              <Cell>
                <TeButton icon={Timer} size="lg" aria-label="Timer" />
                <Label>size=&quot;lg&quot;</Label>
              </Cell>
              <Cell>
                <TeButton
                  icon={Zap}
                  active={flashOn}
                  onClick={() => setFlashOn(!flashOn)}
                  aria-label="Flash"
                />
                <Label>active toggle</Label>
              </Cell>
              <Cell>
                <TeButton
                  icon={Lock}
                  iconSize={16}
                  active={locked}
                  onClick={() => setLocked(!locked)}
                  aria-label="Lock"
                />
                <Label>active toggle</Label>
              </Cell>
              <Cell>
                <TeButton tone="red" aria-label="Record">
                  <span className="block rounded-full" style={{ width: 14, height: 14, background: "#fff" }} />
                </TeButton>
                <Label>tone=&quot;red&quot;</Label>
              </Cell>
              <Cell>
                <TeButton size="sm" aria-label="Decrement">−</TeButton>
                <Label>children=&quot;−&quot; · sm</Label>
              </Cell>
              <Cell>
                <TeButton size="sm" aria-label="Increment">+</TeButton>
                <Label>children=&quot;+&quot; · sm</Label>
              </Cell>
            </Row>

            {/* shape: pill ───────────────────────────────── */}
            <p className="te-label mb-3 mt-8">shape=&quot;pill&quot; — wide key (label and/or icon)</p>
            <Row gap={4}>
              <Cell>
                <button className="te-pill-btn">Зберегти пісню</button>
                <Label>label only · md</Label>
              </Cell>
              <Cell>
                <button className="te-pill-btn" style={{ color: "var(--orange)" }}>+ Створити</button>
                <Label>orange label</Label>
              </Cell>
              <Cell>
                <button className="te-pill-btn" style={{ color: "var(--red)" }}>Видалити</button>
                <Label>danger label</Label>
              </Cell>
              <Cell>
                <button className="te-pill-btn" disabled style={{ opacity: 0.35, cursor: "default" }}>Disabled</button>
                <Label>disabled</Label>
              </Cell>
              <Cell>
                <TeButton shape="pill" icon={Search} aria-label="Search" />
                <Label>icon-only · md</Label>
              </Cell>
              <Cell>
                <TeButton shape="pill" size="sm" icon={Search} aria-label="Search small" />
                <Label>icon-only · sm</Label>
              </Cell>
              <Cell>
                <TeButton shape="pill" size="lg" icon={Settings} aria-label="Options big" />
                <Label>icon-only · lg</Label>
              </Cell>
            </Row>
          </Section>

          {/* Experimental — Geekstrange push button (comparison only) */}
          <Section title="Experimental — Geekstrange push button">
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16, maxWidth: 620, lineHeight: 1.5 }}>
              Порівняльний зразок iз{" "}
              <a
                href="https://codepen.io/Geekstrange/pen/ogjjZEy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--orange)", textDecoration: "underline" }}
              >
                CodePen Geekstrange
              </a>
              . Кольори адаптовано до нашої теплої палітри. Не поширюється по сайту — тільки для живого порівняння з поточним{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>.te-pill-btn</code>.
            </p>
            <Row gap={4}>
              <Cell>
                <button className="geek-btn">
                  <span className="geek-btn-outer">
                    <span className="geek-btn-inner">
                      <span>Зберегти пісню</span>
                    </span>
                  </span>
                </button>
                <Label>label only · md</Label>
              </Cell>
              <Cell>
                <button className="geek-btn">
                  <span className="geek-btn-outer">
                    <span className="geek-btn-inner">
                      <span style={{ color: "var(--orange)", WebkitBackgroundClip: "initial", backgroundClip: "initial", backgroundImage: "none" }}>+ Створити</span>
                    </span>
                  </span>
                </button>
                <Label>orange label</Label>
              </Cell>
              <Cell>
                <button className="geek-btn">
                  <span className="geek-btn-outer">
                    <span className="geek-btn-inner">
                      <span style={{ color: "var(--red)", WebkitBackgroundClip: "initial", backgroundClip: "initial", backgroundImage: "none" }}>Видалити</span>
                    </span>
                  </span>
                </button>
                <Label>danger label</Label>
              </Cell>
              <Cell>
                <button className="geek-btn">
                  <span className="geek-btn-outer">
                    <span className="geek-btn-inner">
                      <span>Натисни</span>
                    </span>
                  </span>
                </button>
                <Label>.geek-btn</Label>
              </Cell>
            </Row>

            <style>{`
              .geek-btn {
                all: unset;
                cursor: pointer;
                -webkit-tap-highlight-color: rgba(0,0,0,0);
                position: relative;
                display: inline-block;
                font-size: 0.78rem;
                border-radius: 999vw;
                background-color: #B8B1A0;
                box-shadow:
                  -0.12em -0.12em 0.18em -0.075em rgba(50, 45, 35, 0.15),
                  0.03em 0.03em 0.08em 0 rgba(50, 45, 35, 0.08);
              }
              .geek-btn::after {
                content: "";
                position: absolute;
                z-index: 0;
                width: calc(100% + 0.3em);
                height: calc(100% + 0.3em);
                top: -0.15em;
                left: -0.15em;
                border-radius: inherit;
                background: linear-gradient(-135deg, rgba(50, 45, 35, 0.25), transparent 20%, transparent 100%);
                filter: blur(0.0125em);
                opacity: 0.2;
                mix-blend-mode: multiply;
              }
              .geek-btn-outer {
                position: relative;
                z-index: 1;
                display: block;
                border-radius: inherit;
                transition: box-shadow 300ms ease;
                will-change: box-shadow;
                box-shadow:
                  0 0.04em 0.08em -0.01em rgba(50, 45, 35, 0.35),
                  0 0.01em 0.02em -0.01em rgba(50, 45, 35, 0.2),
                  0.1em 0.22em 0.18em -0.02em rgba(50, 45, 35, 0.15);
              }
              .geek-btn:hover .geek-btn-outer {
                box-shadow:
                  0 0 0 0 rgba(50, 45, 35, 0.35),
                  0 0 0 0 rgba(50, 45, 35, 0.2),
                  0 0 0 0 rgba(50, 45, 35, 0.15);
              }
              .geek-btn-inner {
                position: relative;
                z-index: 1;
                display: block;
                border-radius: inherit;
                padding: 0.7em 1.4em;
                background-image: linear-gradient(135deg, #F5F1E7, #CAC4B7);
                transition:
                  box-shadow 300ms ease,
                  clip-path 250ms ease,
                  background-image 250ms ease,
                  transform 250ms ease;
                will-change: box-shadow, clip-path, background-image, transform;
                overflow: clip;
                clip-path: inset(0 0 0 0 round 999vw);
                box-shadow:
                  0 0 0 0 inset rgba(50, 45, 35, 0.06),
                  -0.04em -0.04em 0.06em 0 inset rgba(50, 45, 35, 0.12),
                  0 0 0 0 inset rgba(50, 45, 35, 0.06),
                  0 0 0.06em 0.2em inset rgba(255, 248, 232, 0.4),
                  0.025em 0.05em 0.1em 0 inset #FBF7ED,
                  0.1em 0.1em 0.12em inset rgba(255, 248, 232, 0.3),
                  -0.06em -0.22em 0.3em 0.12em inset rgba(50, 45, 35, 0.14);
              }
              .geek-btn:hover .geek-btn-inner {
                clip-path: inset(
                  clamp(1px, 0.0625em, 2px) clamp(1px, 0.0625em, 2px)
                    clamp(1px, 0.0625em, 2px) clamp(1px, 0.0625em, 2px) round 999vw
                );
                box-shadow:
                  0.04em 0.06em 0.12em 0 inset rgba(50, 45, 35, 0.14),
                  -0.02em -0.02em 0.06em 0.02em inset rgba(50, 45, 35, 0.08),
                  0.1em 0.12em 0.2em 0 inset rgba(50, 45, 35, 0.08),
                  0 0 0.05em 0.35em inset rgba(255, 248, 232, 0.25),
                  0 0 0 0 inset #FBF7ED,
                  0.1em 0.1em 0.12em inset rgba(255, 248, 232, 0.3),
                  -0.04em -0.08em 0.2em 0.08em inset rgba(50, 45, 35, 0.06);
              }
              .geek-btn .geek-btn-inner span {
                position: relative;
                z-index: 4;
                font-family: inherit;
                letter-spacing: -0.03em;
                font-weight: 600;
                color: rgba(0, 0, 0, 0);
                background-image: linear-gradient(135deg, #3E3A32, #65605A);
                -webkit-background-clip: text;
                background-clip: text;
                transition: transform 250ms ease;
                display: block;
                will-change: transform;
                text-shadow: rgba(30, 25, 15, 0.1) 0 0 0.1em;
              }
              .geek-btn:hover .geek-btn-inner span { transform: scale(0.975); }
              .geek-btn:active .geek-btn-inner { transform: scale(0.975); }
            `}</style>
          </Section>

          {/* Knobs ─ rotary primitive ─────────────────────────────────────── */}
          <Section title="Knobs — .te-knob (rotary / continuous)">
            <Row gap={4}>
              <Cell>
                <div className="te-knob w-7 h-7" />
                <Label>sm · 28px</Label>
              </Cell>
              <Cell>
                <div className="te-knob w-10 h-10" />
                <Label>md · 40px</Label>
              </Cell>
              <Cell>
                <div className="te-knob w-14 h-14" />
                <Label>lg · 56px</Label>
              </Cell>
            </Row>
          </Section>

          {/* Chips & Badges */}
          <Section title="Chips &amp; Badges">
            <Row gap={3}>
              {[
                { dot: "#10b981", label: "Easy" },
                { dot: "#f59e0b", label: "Medium" },
                { dot: "#ef4444", label: "Hard" },
              ].map((d) => (
                <Cell key={d.label}>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 te-inset" style={{ borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.dot, display: "inline-block" }} />
                    <span className="font-mono-te uppercase" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                      {d.label}
                    </span>
                  </div>
                  <Label>difficulty · {d.label.toLowerCase()}</Label>
                </Cell>
              ))}

              {[
                { bg: "#10b981", label: "Опублікована" },
                { bg: "#9C9C9C", label: "Чернетка" },
                { bg: "#6b7280", label: "Архів" },
              ].map((s) => (
                <Cell key={s.label}>
                  <span
                    className="px-2.5 py-1 text-white font-bold uppercase"
                    style={{ background: s.bg, borderRadius: 8, fontSize: "0.6rem", letterSpacing: "0.08em" }}
                  >
                    {s.label}
                  </span>
                  <Label>status · {s.label}</Label>
                </Cell>
              ))}

              {["KEY Am", "CAPO 2", "BPM 120"].map((chip) => (
                <Cell key={chip}>
                  <div className="te-lcd font-mono-te px-3 py-1 flex items-center gap-1.5" style={{ fontSize: "0.72rem" }}>
                    <span style={{ color: "var(--panel-text)", opacity: 0.4, fontSize: "0.58rem" }}>
                      {chip.split(" ")[0]}
                    </span>
                    <span style={{ color: "var(--panel-text)" }}>{chip.split(" ")[1]}</span>
                  </div>
                  <Label>.te-lcd chip</Label>
                </Cell>
              ))}
            </Row>

            <div className="mt-8 flex items-center gap-6">
              <Cell>
                <button onClick={() => setLedActive(!ledActive)} className="flex items-center gap-2">
                  <span className={`te-led ${ledActive ? "te-led-active" : ""}`} />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {ledActive ? "Active" : "Inactive"} — click to toggle
                  </span>
                </button>
                <Label>.te-led / .te-led-active</Label>
              </Cell>
            </div>
          </Section>

          {/* Form atoms — single primitives */}
          <Section title="Form Atoms — Single Primitives">
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16, maxWidth: 620, lineHeight: 1.5 }}>
              Чисті інпут-примітиви: <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>.field-input</code> всередині{" "}
              <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>.te-inset</code>. Без label — це окрема атомарна одиниця, що компонується у molecule (Labeled Field) і organism (Form).
            </p>
            <Row gap={6}>
              <div className="flex flex-col gap-2" style={{ width: 220 }}>
                <div className="te-inset px-4 py-3 rounded-xl">
                  <input className="field-input w-full" placeholder="Введіть текст..." style={{ color: "var(--text)" }} />
                </div>
                <Label>&lt;input&gt; · text</Label>
              </div>
              <div className="flex flex-col gap-2" style={{ width: 220 }}>
                <div className="te-inset px-4 py-3 rounded-xl">
                  <select className="field-input bg-transparent w-full" style={{ color: "var(--text)" }}>
                    <option>Am</option><option>Em</option><option>C</option>
                  </select>
                </div>
                <Label>&lt;select&gt;</Label>
              </div>
              <div className="flex flex-col gap-2" style={{ width: 320 }}>
                <div className="te-inset px-4 py-3 rounded-xl">
                  <textarea
                    className="field-input resize-none w-full"
                    rows={3}
                    placeholder="[Am]Слова з акордами..."
                    style={{ color: "var(--text)" }}
                  />
                </div>
                <Label>&lt;textarea&gt;</Label>
              </div>
            </Row>
          </Section>

        </Group>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TIER 2 — MOLECULES                                                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Group id="molecules">

          {/* Segmented control */}
          <Section title="Segmented Control — .te-control-pill">
            <div className="te-control-pill">
              {(["a", "b", "c"] as const).map((v, i) => (
                <button
                  key={v}
                  className="te-control-pill-btn text-xs font-bold"
                  onClick={() => setPillActive(v)}
                  style={{
                    color: pillActive === v ? "var(--orange)" : "var(--text-muted)",
                    fontWeight: pillActive === v ? 700 : 400,
                  }}
                >
                  {["Легко", "Середньо", "Складно"][i]}
                </button>
              ))}
            </div>
            <Label>label + ± of buttons sharing one container</Label>
          </Section>

          {/* ControlBlock + AdjusterButton */}
          <Section title="Control Block — Labeled ± Adjuster">
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16, maxWidth: 620, lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text)" }}>&lt;ControlBlock /&gt;</strong> + 2×{" "}
              <strong style={{ color: "var(--text)" }}>&lt;AdjusterButton /&gt;</strong> + readout.
              Use for transpose, capo, font size, scroll speed, BPM.
            </p>
            <Row gap={6}>
              <div>
                <ControlBlock label="Транспонування" className="w-[180px]">
                  <div className="flex items-center justify-between">
                    <AdjusterButton aria-label="Transpose down">−</AdjusterButton>
                    <span className="font-mono-te font-bold text-base" style={{ color: "var(--text)" }}>+2</span>
                    <AdjusterButton aria-label="Transpose up">+</AdjusterButton>
                  </div>
                </ControlBlock>
                <Label>transpose</Label>
              </div>
              <div>
                <ControlBlock label="Розмір шрифту" className="w-[180px]">
                  <div className="flex items-center justify-between">
                    <AdjusterButton style={{ fontSize: "0.7rem" }} aria-label="Decrease font size">A−</AdjusterButton>
                    <span className="font-mono-te font-bold text-base" style={{ color: "var(--text)" }}>16</span>
                    <AdjusterButton style={{ fontSize: "0.8rem" }} aria-label="Increase font size">A+</AdjusterButton>
                  </div>
                </ControlBlock>
                <Label>font size</Label>
              </div>
              <div>
                <div className="te-surface p-3 rounded-2xl flex items-center gap-3" style={{ width: 180 }}>
                  <div className="te-knob w-12 h-12 flex-shrink-0" />
                  <div>
                    <p className="te-label">Volume</p>
                    <p className="font-mono-te font-bold" style={{ color: "var(--text)" }}>75%</p>
                  </div>
                </div>
                <Label>knob + readout</Label>
              </div>
            </Row>
          </Section>

          {/* Labeled physical key */}
          <Section title="Labeled Physical Key — icon-btn + caption">
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-1.5">
                <TeButton size="lg" aria-label="Stop">
                  <Square size={16} strokeWidth={2} fill="currentColor" />
                </TeButton>
                <span className="font-mono-te text-[10px] font-bold" style={{ letterSpacing: "0.08em", color: "var(--text-mid)" }}>
                  STOP
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <TeButton
                  size="lg"
                  tone="red"
                  onClick={() => setRecording(!recording)}
                  aria-label="Record / Pause"
                >
                  <span className="block rounded-full" style={{ width: 14, height: 14, background: "#fff" }} />
                </TeButton>
                <span className="font-mono-te text-[10px] font-bold" style={{ letterSpacing: "0.08em", color: "var(--text-mid)" }}>
                  REC/PAUSE
                </span>
              </div>
            </div>
          </Section>

          {/* Recorder LCD */}
          <Section title="Recorder LCD — REC indicator + timecode">
            <div className="te-lcd-camera flex flex-col" style={{ width: 260, padding: "0.9rem 1.1rem", borderRadius: "1rem" }}>
              <div className="flex items-center justify-between mb-4" style={{ fontSize: "0.68rem" }}>
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: recording ? "#FF4444" : "rgba(255,255,255,0.2)",
                      boxShadow: recording ? "0 0 6px rgba(255,68,68,0.7)" : "none",
                    }}
                  />
                  <span style={{ color: recording ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "0.05em" }}>
                    REC
                  </span>
                </div>
                <span className="te-lcd-pill" style={{ fontSize: "0.6rem" }}>HD</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>3/10</span>
              </div>
              <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", marginBottom: 8, letterSpacing: "0.03em" }}>
                96.00 kHz · 24 bit
              </div>
              <div className="flex items-baseline gap-1" style={{ color: "var(--panel-text)" }}>
                <span style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>01</span>
                <span style={{ fontSize: "0.65rem", opacity: 0.6, marginRight: 6 }}>H</span>
                <span style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>04</span>
                <span style={{ fontSize: "0.65rem", opacity: 0.6, marginRight: 6 }}>M</span>
                <span style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>25</span>
                <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>S</span>
              </div>
            </div>
          </Section>

          {/* Pill button row */}
          <Section title="Pill Button Row — .te-pill-btn cluster">
            <Row gap={3}>
              <TeButton shape="pill" icon={Search} aria-label="Search" />
              <button className="te-pill-btn">
                <Home size={13} strokeWidth={2} style={{ opacity: 0.7 }} />
                HOME
              </button>
              <button className="te-pill-btn">
                <ArrowLeft size={13} strokeWidth={2} style={{ opacity: 0.7 }} />
                BACK
              </button>
              <button className="te-pill-btn">
                <Scissors size={13} strokeWidth={2} style={{ opacity: 0.7 }} />
                DIVIDE
              </button>
              <button className="te-pill-btn">
                <Settings size={13} strokeWidth={2} style={{ opacity: 0.7 }} />
                OPTIONS
              </button>
            </Row>
          </Section>

          {/* Search bar */}
          <Section title="Search Bar — input + action">
            <div className="te-inset flex items-center gap-3 px-4 py-3 rounded-full max-w-md">
              <Search size={14} strokeWidth={2} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                className="field-input flex-1"
                placeholder="Шукайте: Океан Ельзи, Бумбокс..."
                style={{ color: "var(--text)" }}
              />
              <button className="te-btn-orange px-4 py-1.5 text-xs font-bold uppercase tracking-widest flex-shrink-0">
                Знайти
              </button>
            </div>
          </Section>

          {/* Labeled field */}
          <Section title="Labeled Field — label + input atom">
            <Row gap={6}>
              <div style={{ width: 240 }}>
                <label className="te-label block mb-2">Назва пісні</label>
                <div className="te-inset px-4 py-3 rounded-xl">
                  <input className="field-input w-full" placeholder="Введіть назву..." style={{ color: "var(--text)" }} />
                </div>
              </div>
              <div style={{ width: 240 }}>
                <label className="te-label block mb-2">Тональність</label>
                <div className="te-inset px-4 py-3 rounded-xl">
                  <select className="field-input bg-transparent w-full" style={{ color: "var(--text)" }}>
                    <option>Am</option><option>Em</option><option>C</option>
                  </select>
                </div>
              </div>
            </Row>
          </Section>

        </Group>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TIER 3 — ORGANISMS                                                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Group id="organisms">

          {/* Cards */}
          <Section title="Cards">
            <Row gap={4}>
              {/* Song card */}
              <div>
                <div className="te-surface te-pressable rounded-2xl overflow-hidden" style={{ width: 180 }}>
                  <div className="te-inset aspect-square" style={{ borderRadius: "0.75rem 0.75rem 0 0" }}>
                    <div className="w-full h-full" style={{ background: "linear-gradient(145deg, #C8D5E8CC, #C8D5E866)" }} />
                  </div>
                  <div className="p-3">
                    <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text)" }}>Стара фотографія</p>
                    <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 8 }}>Океан Ельзи</p>
                    <div className="flex gap-1.5">
                      <div className="te-lcd font-mono-te px-2 py-0.5" style={{ fontSize: "0.65rem", color: "var(--panel-text)" }}>Am</div>
                      <div className="te-lcd font-mono-te px-2 py-0.5" style={{ fontSize: "0.65rem", color: "var(--panel-text)" }}>Em</div>
                    </div>
                  </div>
                </div>
                <Label>SongCard</Label>
              </div>

              {/* Artist card */}
              <div>
                <div className="te-surface te-pressable rounded-2xl p-4" style={{ width: 220 }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="flex items-center justify-center flex-shrink-0 font-bold"
                      style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: "linear-gradient(145deg, #FFD4A6, #FFA552)",
                        color: "#fff", fontSize: "1.1rem",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.08)",
                      }}
                    >
                      ОЕ
                    </div>
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Океан Ельзи</p>
                      <p style={{ fontSize: "0.65rem", color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Рок</p>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>24 пісень у каталозі</p>
                </div>
                <Label>ArtistCard</Label>
              </div>

              {/* Filter card */}
              <div>
                <div className="te-surface te-pressable flex flex-col p-4" style={{ borderRadius: "1.25rem", width: 130, height: 110 }}>
                  <div className="te-icon-btn mb-auto" style={{ width: 36, height: 36, fontSize: "1.1rem" }}>
                    🌱
                  </div>
                  <p className="font-bold mt-3 leading-tight" style={{ fontSize: "0.75rem", letterSpacing: "0.02em", color: "var(--text)" }}>
                    Для новачків
                  </p>
                </div>
                <Label>FilterCard</Label>
              </div>
            </Row>
          </Section>

          {/* Song form — composed from atoms + molecules */}
          <Section title="Song Form — composed from labeled fields">
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16, maxWidth: 620, lineHeight: 1.5 }}>
              Композиція з 5 <strong style={{ color: "var(--text)" }}>Labeled Field</strong> molecules (label + input/select/textarea atoms) у grid layout.
              Реальний приклад — форма додавання пісні на <code style={{ fontSize: "0.7rem", background: "var(--surface-dk)", padding: "1px 5px", borderRadius: 4 }}>/add</code>.
            </p>
            <div className="te-surface p-6 rounded-2xl max-w-2xl">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="te-label block mb-2">Назва пісні</label>
                  <div className="te-inset px-4 py-3 rounded-xl">
                    <input className="field-input w-full" placeholder="Введіть назву..." style={{ color: "var(--text)" }} />
                  </div>
                </div>
                <div>
                  <label className="te-label block mb-2">Виконавець</label>
                  <div className="te-inset px-4 py-3 rounded-xl">
                    <input className="field-input w-full" placeholder="Океан Ельзи..." style={{ color: "var(--text)" }} />
                  </div>
                </div>
                <div>
                  <label className="te-label block mb-2">Тональність</label>
                  <div className="te-inset px-4 py-3 rounded-xl">
                    <select className="field-input bg-transparent w-full" style={{ color: "var(--text)" }}>
                      <option>Am</option><option>Em</option><option>C</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="te-label block mb-2">Складність</label>
                  <div className="te-inset px-4 py-3 rounded-xl">
                    <select className="field-input bg-transparent w-full" style={{ color: "var(--text)" }}>
                      <option>easy</option><option>medium</option><option>hard</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="te-label block mb-2">Текст із акордами</label>
                  <div className="te-inset px-4 py-3 rounded-xl">
                    <textarea
                      className="field-input resize-none w-full"
                      rows={4}
                      placeholder="[Am]Слова пісні [Em]із акордами [C]у дужках..."
                      style={{ color: "var(--text)" }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button className="te-pill-btn">Скасувати</button>
                <button className="te-btn-orange px-6 py-2 text-xs font-bold uppercase tracking-widest" style={{ borderRadius: 999 }}>
                  Зберегти
                </button>
              </div>
            </div>
            <Label>SongForm — повна форма /add</Label>
          </Section>

        </Group>

      </main>
    </div>
  );
}
