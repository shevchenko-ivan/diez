"use client";

import { useInstrument, type Instrument } from "@/shared/hooks/useInstrument";
import { useHaptics } from "@/shared/hooks/useHaptics";

const OPTIONS: { value: Instrument; label: string }[] = [
  { value: "guitar", label: "Гітара" },
  { value: "ukulele", label: "Укулеле" },
  { value: "piano", label: "Піаніно" },
];

export function InstrumentSwitch() {
  const [instrument, setInstrument] = useInstrument();
  const { trigger } = useHaptics();

  return (
    <div
      role="tablist"
      aria-label="Інструмент"
      className="te-control-pill instrument-switch"
      style={{ display: "flex", width: "100%" }}
    >
      {OPTIONS.map((opt) => {
        const active = instrument === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) {
                trigger("selection");
                setInstrument(opt.value);
              }
            }}
            className="te-control-pill-btn text-[10px] uppercase tracking-wider"
            style={{
              flex: 1,
              minWidth: 0,
              height: 28,
              padding: "0 8px",
              color: active ? "var(--orange)" : "var(--text-muted)",
              fontWeight: active ? 700 : 500,
            }}
          >
            {opt.label}
          </button>
        );
      })}
      <style jsx>{`
        /* Segmented control reskinned to share the .te-pill-btn material:
           same warm-cream gradient, 1px border, layered inset / halo shadows. */
        .instrument-switch {
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }
        .instrument-switch :global(.te-control-pill-btn) {
          background: linear-gradient(to top, #cac4b7 0%, #f5f1e7 80%, #fbf7ed 100%);
          border: 1px solid #8a847590;
          text-shadow: 0 1px #f5f1e7;
          box-shadow:
            0 2px 5px 1px #f8f4ea,
            0 4px 7px #786e5a40,
            0 -2px 4px #bdb7a7,
            0 -5px 6px #fbf7ed,
            inset 0 0 2px #bdb7a7;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        /* kill the default divider — buttons now share borders instead */
        .instrument-switch :global(.te-control-pill-btn:not(:last-child))::after {
          display: none;
        }
        /* overlap 1px so adjacent borders merge into a single hairline */
        .instrument-switch :global(.te-control-pill-btn + .te-control-pill-btn) {
          margin-left: -1px;
        }
        .instrument-switch :global(.te-control-pill-btn:hover:not(:disabled)) {
          background: linear-gradient(to top, #cac4b7 0%, #f5f1e7 80%, #fbf7ed 100%);
          box-shadow:
            0 2px 5px 1px #f8f4ea,
            0 4px 7px #786e5a40,
            0 -2px 4px #bdb7a7,
            0 -5px 6px #fbf7ed,
            inset 0 0 3px 1px #a8a294;
          transform: none;
        }
        .instrument-switch :global(.te-control-pill-btn:active:not(:disabled)),
        .instrument-switch :global(.te-control-pill-btn[aria-selected="true"]) {
          background: linear-gradient(to top, #cac4b7 0%, #f5f1e7 80%, #fbf7ed 100%);
          box-shadow:
            0 2px 5px 1px #f8f4ea,
            0 4px 7px #786e5a40,
            0 -2px 4px #bdb7a7,
            0 -5px 6px #fbf7ed,
            inset 0 0 4px 2px #9e998b;
          transform: none;
          z-index: 1;
        }
        /* dark theme: flat plate + outline ring, matching dark .te-pill-btn */
        :global([data-theme="dark"]) .instrument-switch :global(.te-control-pill-btn) {
          background: #252327;
          background-image: none;
          border: none;
          border-top: 1px solid #3a3842;
          outline: 2px solid #131217;
          text-shadow: none;
          box-shadow: none;
        }
        :global([data-theme="dark"]) .instrument-switch :global(.te-control-pill-btn:hover:not(:disabled)) {
          background-color: #211f24;
          border-top-color: #322f38;
          box-shadow: inset 0 0 10px 1px rgba(0, 0, 0, 0.35);
        }
        :global([data-theme="dark"]) .instrument-switch :global(.te-control-pill-btn[aria-selected="true"]),
        :global([data-theme="dark"]) .instrument-switch :global(.te-control-pill-btn:active:not(:disabled)) {
          background-color: #1c1a1f;
          border-top: none;
          box-shadow: inset 0 0 12px 1px rgba(0, 0, 0, 0.55);
        }
        @media (prefers-color-scheme: dark) {
          :global(:root:not([data-theme="light"])) .instrument-switch :global(.te-control-pill-btn) {
            background: #252327;
            background-image: none;
            border: none;
            border-top: 1px solid #3a3842;
            outline: 2px solid #131217;
            text-shadow: none;
            box-shadow: none;
          }
          :global(:root:not([data-theme="light"])) .instrument-switch :global(.te-control-pill-btn:hover:not(:disabled)) {
            background-color: #211f24;
            border-top-color: #322f38;
            box-shadow: inset 0 0 10px 1px rgba(0, 0, 0, 0.35);
          }
          :global(:root:not([data-theme="light"])) .instrument-switch :global(.te-control-pill-btn[aria-selected="true"]),
          :global(:root:not([data-theme="light"])) .instrument-switch :global(.te-control-pill-btn:active:not(:disabled)) {
            background-color: #1c1a1f;
            border-top: none;
            box-shadow: inset 0 0 12px 1px rgba(0, 0, 0, 0.55);
          }
        }
      `}</style>
    </div>
  );
}
