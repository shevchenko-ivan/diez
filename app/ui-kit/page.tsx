"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Section wrapper ──────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UIKitPage() {
  const [ledActive, setLedActive] = useState(false);
  const [pillActive, setPillActive] = useState<"a" | "b" | "c">("a");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "var(--bg)", borderColor: "var(--surface-dk)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="te-key px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
            ← Назад
          </Link>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em" }}>
            <span style={{ color: "var(--orange)" }}>#</span>DIEZ UI Kit
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
          TE Design System
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">

        {/* ── 1. Colors ─────────────────────────────────────────────────────── */}
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

          {/* Text colors */}
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

        {/* ── 2. Typography ─────────────────────────────────────────────────── */}
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

          {/* Mono */}
          <div className="mt-6 te-lcd inline-block px-4 py-3" style={{ borderRadius: "0.75rem" }}>
            <span className="font-mono-te" style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
              03:47
            </span>
            <span className="font-mono-te ml-4" style={{ fontSize: "0.75rem" }}>
              JetBrains Mono — font-mono-te
            </span>
          </div>
        </Section>

        {/* ── 3. Surfaces ───────────────────────────────────────────────────── */}
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

          {/* Surface with content */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="te-surface p-4 rounded-2xl">
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Panel title
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                Контент всередині te-surface. Використовується для карток, бічних панелей, блоків контролів.
              </p>
            </div>
            <div className="te-inset p-4 rounded-2xl">
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Inset field
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                te-inset — для полів вводу, LCD-дисплеїв, заглиблених зон.
              </p>
            </div>
            <div className="te-lcd p-4 rounded-2xl">
              <p className="font-mono-te" style={{ fontSize: "0.65rem", color: "var(--panel-text)", opacity: 0.5, letterSpacing: "0.1em", marginBottom: 8 }}>
                LCD DISPLAY
              </p>
              <p className="font-mono-te" style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--panel-text)" }}>
                Am · Em · C · G
              </p>
            </div>
          </div>
        </Section>

        {/* ── 4. Buttons ────────────────────────────────────────────────────── */}
        <Section title="Buttons &amp; Interactive Elements">
          <Row gap={4}>
            <Cell>
              <button className="te-btn-orange px-6 py-3 text-sm font-bold">
                Зберегти пісню
              </button>
              <Label>.te-btn-orange</Label>
            </Cell>
            <Cell>
              <button className="te-btn-orange px-5 py-2.5 text-xs font-bold uppercase tracking-widest">
                + Створити
              </button>
              <Label>.te-btn-orange sm</Label>
            </Cell>
            <Cell>
              <button className="te-key px-5 py-2.5 text-sm font-medium" style={{ color: "var(--text-mid)" }}>
                Увійти
              </button>
              <Label>.te-key</Label>
            </Cell>
            <Cell>
              <button className="te-key px-5 py-2.5 text-sm font-bold uppercase tracking-widest" style={{ color: "var(--orange)" }}>
                + Створити
              </button>
              <Label>.te-key orange</Label>
            </Cell>
            <Cell>
              <button
                className="te-key px-5 py-2.5 text-sm font-medium"
                style={{ color: "var(--red)" }}
              >
                Видалити
              </button>
              <Label>.te-key danger</Label>
            </Cell>
            <Cell>
              <button className="te-key px-5 py-2.5 text-sm font-medium" disabled style={{ opacity: 0.35, cursor: "default" }}>
                Disabled
              </button>
              <Label>.te-key disabled</Label>
            </Cell>
          </Row>

          {/* Knob */}
          <Row gap={6} >
            <Cell>
              <div className="te-knob w-14 h-14 flex items-center justify-center mt-6" />
              <Label>.te-knob</Label>
            </Cell>
            <Cell>
              <div
                className="te-knob w-14 h-14 flex items-center justify-center mt-6"
                style={{ color: "var(--orange)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <Label>.te-knob + icon</Label>
            </Cell>
            <Cell>
              <div className="te-knob w-10 h-10 flex items-center justify-center mt-6" />
              <Label>.te-knob sm</Label>
            </Cell>
          </Row>

          {/* Control pill (segmented) */}
          <div className="mt-8">
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
            <Label>.te-control-pill — segmented control</Label>
          </div>
        </Section>

        {/* ── 5. Chips & Badges ─────────────────────────────────────────────── */}
        <Section title="Chips &amp; Badges">
          <Row gap={3}>
            {/* Difficulty */}
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

            {/* Status */}
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

            {/* LCD chips */}
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

          {/* LED */}
          <div className="mt-8 flex items-center gap-6">
            <Cell>
              <button
                onClick={() => setLedActive(!ledActive)}
                className="flex items-center gap-2"
              >
                <span className={`te-led ${ledActive ? "te-led-active" : ""}`} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {ledActive ? "Active" : "Inactive"} — click to toggle
                </span>
              </button>
              <Label>.te-led / .te-led-active</Label>
            </Cell>
          </div>
        </Section>

        {/* ── 6. Form Elements ──────────────────────────────────────────────── */}
        <Section title="Form Elements">
          <div className="grid grid-cols-2 gap-6 max-w-2xl">
            <div>
              <label className="te-label block mb-2">Назва пісні</label>
              <div className="te-inset px-4 py-3 rounded-xl">
                <input
                  className="field-input"
                  placeholder="Введіть назву..."
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>
            <div>
              <label className="te-label block mb-2">Виконавець</label>
              <div className="te-inset px-4 py-3 rounded-xl">
                <input
                  className="field-input"
                  placeholder="Океан Ельзи..."
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>
            <div>
              <label className="te-label block mb-2">Тональність</label>
              <div className="te-inset px-4 py-3 rounded-xl">
                <select className="field-input bg-transparent" style={{ color: "var(--text)" }}>
                  <option>Am</option>
                  <option>Em</option>
                  <option>C</option>
                </select>
              </div>
            </div>
            <div>
              <label className="te-label block mb-2">Складність</label>
              <div className="te-inset px-4 py-3 rounded-xl">
                <select className="field-input bg-transparent" style={{ color: "var(--text)" }}>
                  <option>easy</option>
                  <option>medium</option>
                  <option>hard</option>
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

          {/* Search bar */}
          <div className="mt-6">
            <label className="te-label block mb-2">Search bar</label>
            <div className="te-inset flex items-center gap-3 px-4 py-3 rounded-full max-w-md">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                className="field-input flex-1"
                placeholder="Шукайте: Океан Ельзи, Бумбокс..."
                style={{ color: "var(--text)" }}
              />
              <button className="te-btn-orange px-4 py-1.5 text-xs font-bold uppercase tracking-widest flex-shrink-0">
                Знайти
              </button>
            </div>
          </div>
        </Section>

        {/* ── 7. Cards ──────────────────────────────────────────────────────── */}
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
                  <div className="te-knob w-12 h-12 flex items-center justify-center flex-shrink-0" />
                  <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Океан Ельзи</p>
                    <p style={{ fontSize: "0.65rem", color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Рок</p>
                  </div>
                </div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>24 пісень у каталозі</p>
              </div>
              <Label>ArtistCard</Label>
            </div>

            {/* Control block */}
            <div>
              <div className="te-surface p-3 rounded-2xl" style={{ width: 180 }}>
                <p className="text-[9px] font-bold tracking-widest uppercase mb-2 opacity-50" style={{ color: "var(--text-muted)" }}>
                  Транспоз
                </p>
                <div className="flex items-center justify-between">
                  <button className="te-knob w-7 h-7 flex items-center justify-center text-sm font-bold" style={{ borderRadius: "50%" }}>−</button>
                  <span className="font-mono font-bold text-sm" style={{ color: "var(--text)" }}>+2</span>
                  <button className="te-knob w-7 h-7 flex items-center justify-center text-sm font-bold" style={{ borderRadius: "50%" }}>+</button>
                </div>
              </div>
              <Label>ControlBlock</Label>
            </div>

            {/* Filter card */}
            <div>
              <div className="te-surface te-pressable flex flex-col p-4" style={{ borderRadius: "1.25rem", width: 130, height: 110 }}>
                <div className="te-knob mb-auto" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
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

        {/* ── 8. Shadows reference ──────────────────────────────────────────── */}
        <Section title="Shadows — Box Shadow Reference">
          <Row gap={8}>
            {[
              { label: "--sh-physical",        cls: "te-surface" },
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

        {/* ── 9. Grille ─────────────────────────────────────────────────────── */}
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

      </main>
    </div>
  );
}
