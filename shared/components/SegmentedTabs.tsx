"use client";

import type { ComponentType, ReactNode } from "react";
import { useHaptics } from "@/shared/hooks/useHaptics";

// Segmented pill tabs — the same warm-cream TE-material look used above
// the chord diagrams (instrument switcher). Buttons share 1px borders
// via -1px margin overlap; dark theme flattens to matte charcoal plates.
// Pulled into a shared component so the visibility-picker, instrument
// switcher, and any future segmented tabs stay visually identical.

export interface SegmentedTabOption<V extends string = string> {
  value: V;
  label: string;
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>;
}

interface SegmentedTabsProps<V extends string> {
  options: SegmentedTabOption<V>[];
  value: V;
  onChange: (v: V) => void;
  ariaLabel?: string;
  /** Fire a "selection" haptic on change. Default: true. */
  haptic?: boolean;
  className?: string;
  /** Render a custom node instead of the default label+icon. */
  renderLabel?: (opt: SegmentedTabOption<V>, active: boolean) => ReactNode;
}

export function SegmentedTabs<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  haptic = true,
  className,
  renderLabel,
}: SegmentedTabsProps<V>) {
  const { trigger } = useHaptics();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`te-control-pill segmented-tabs${className ? ` ${className}` : ""}`}
      style={{ display: "flex", width: "100%" }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) {
                if (haptic) trigger("selection");
                onChange(opt.value);
              }
            }}
            className="te-control-pill-btn text-[10px] uppercase tracking-wider"
            style={{
              flex: 1,
              minWidth: 0,
              height: 28,
              padding: "0 8px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: active ? "var(--orange)" : "var(--text-muted)",
              fontWeight: active ? 700 : 500,
            }}
          >
            {renderLabel ? (
              renderLabel(opt, active)
            ) : (
              <>
                {Icon && <Icon size={12} strokeWidth={2} />}
                {opt.label}
              </>
            )}
          </button>
        );
      })}
      <style jsx>{`
        .segmented-tabs {
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }
        .segmented-tabs :global(.te-control-pill-btn) {
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
        .segmented-tabs :global(.te-control-pill-btn:not(:last-child))::after {
          display: none;
        }
        .segmented-tabs :global(.te-control-pill-btn + .te-control-pill-btn) {
          margin-left: -1px;
        }
        .segmented-tabs :global(.te-control-pill-btn:hover:not(:disabled)) {
          background: linear-gradient(to top, #cac4b7 0%, #f5f1e7 80%, #fbf7ed 100%);
          box-shadow:
            0 2px 5px 1px #f8f4ea,
            0 4px 7px #786e5a40,
            0 -2px 4px #bdb7a7,
            0 -5px 6px #fbf7ed,
            inset 0 0 3px 1px #a8a294;
          transform: none;
        }
        .segmented-tabs :global(.te-control-pill-btn:active:not(:disabled)),
        .segmented-tabs :global(.te-control-pill-btn[aria-selected="true"]) {
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
        /* Override the globals.css rule that hardcodes svg color to
           var(--text) on .te-control-pill-btn, so the active tab's icon
           picks up the orange accent alongside its label. */
        .segmented-tabs :global(.te-control-pill-btn[aria-selected="true"] svg) {
          color: var(--orange);
          opacity: 1;
        }
        :global([data-theme="dark"]) .segmented-tabs :global(.te-control-pill-btn) {
          background: #252327;
          background-image: none;
          border: none;
          border-top: 1px solid #3a3842;
          outline: 2px solid #131217;
          text-shadow: none;
          box-shadow: none;
        }
        :global([data-theme="dark"]) .segmented-tabs :global(.te-control-pill-btn:hover:not(:disabled)) {
          background-color: #211f24;
          border-top-color: #322f38;
          box-shadow: inset 0 0 10px 1px rgba(0, 0, 0, 0.35);
        }
        :global([data-theme="dark"]) .segmented-tabs :global(.te-control-pill-btn[aria-selected="true"]),
        :global([data-theme="dark"]) .segmented-tabs :global(.te-control-pill-btn:active:not(:disabled)) {
          background-color: #1c1a1f;
          border-top: none;
          box-shadow: inset 0 0 12px 1px rgba(0, 0, 0, 0.55);
        }
        @media (prefers-color-scheme: dark) {
          :global(:root:not([data-theme="light"])) .segmented-tabs :global(.te-control-pill-btn) {
            background: #252327;
            background-image: none;
            border: none;
            border-top: 1px solid #3a3842;
            outline: 2px solid #131217;
            text-shadow: none;
            box-shadow: none;
          }
          :global(:root:not([data-theme="light"])) .segmented-tabs :global(.te-control-pill-btn:hover:not(:disabled)) {
            background-color: #211f24;
            border-top-color: #322f38;
            box-shadow: inset 0 0 10px 1px rgba(0, 0, 0, 0.35);
          }
          :global(:root:not([data-theme="light"])) .segmented-tabs :global(.te-control-pill-btn[aria-selected="true"]),
          :global(:root:not([data-theme="light"])) .segmented-tabs :global(.te-control-pill-btn:active:not(:disabled)) {
            background-color: #1c1a1f;
            border-top: none;
            box-shadow: inset 0 0 12px 1px rgba(0, 0, 0, 0.55);
          }
        }
      `}</style>
    </div>
  );
}
