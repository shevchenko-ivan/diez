"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, FocusEvent, MouseEvent, ReactNode, TouchEvent } from "react";

type Shape = "circle" | "pill";
type Size = "sm" | "md" | "lg";
type Tone = "default" | "red" | "orange";

interface BaseProps {
  /** Visual form. `circle` — round key (default). `pill` — rounded pill (icon-only or icon+label). */
  shape?: Shape;
  /** Lucide icon component. Pass `children` for custom inner content (text, symbols, custom svg). */
  icon?: LucideIcon;
  /** Override icon size in px. Defaults: sm=14, md=18, lg=22. */
  iconSize?: number;
  /** Override icon color (CSS value). Defaults to inherited button color. */
  iconColor?: string;
  /** Preset size — sm 34px, md 44px, lg 56px (circle); pill scales padding/font analogously. */
  size?: Size;
  /** Color tone. */
  tone?: Tone;
  /** Toggle "on" state — applies `data-active` for pressed visuals (orange tint). */
  active?: boolean;
  /** Tooltip; also used as accessible label if `aria-label` is omitted. */
  title?: string;
  "aria-label"?: string;
  /** Custom inner content (replaces `icon`). */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

type AsButton = BaseProps & {
  href?: undefined;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (e: MouseEvent<HTMLButtonElement>) => void;
  onFocus?: (e: FocusEvent<HTMLButtonElement>) => void;
  onTouchStart?: (e: TouchEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
};

type AsLink = BaseProps & {
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export type TeButtonProps = AsButton | AsLink;

const SIZE_TO_ICON: Record<Size, number> = { sm: 14, md: 18, lg: 22 };

const CIRCLE_SIZE: Record<Size, string> = {
  sm: "te-icon-btn-sm",
  md: "",
  lg: "te-icon-btn-lg",
};

const PILL_SIZE: Record<Size, string> = {
  sm: "te-pill-btn-sm",
  md: "",
  lg: "te-pill-btn-lg",
};

const CIRCLE_TONE: Record<Tone, string> = {
  default: "",
  red: "te-icon-btn-red",
  orange: "",
};

/**
 * Unified TE-style key button.
 *
 * Variables:
 *   shape   — "circle" | "pill"
 *   size    — "sm" | "md" | "lg"
 *   tone    — "default" | "red" | "orange"
 *   active  — toggle on/off (visually pressed + orange)
 *   icon    — LucideIcon shorthand (or use `children` for ±, A+, custom)
 *   href    — renders as <Link> instead of <button>
 *
 * Examples:
 *   <TeButton icon={Heart} title="Save" />                              // round, default
 *   <TeButton icon={Zap} active={flashOn} onClick={toggle} />           // toggle
 *   <TeButton icon={Play} size="lg" tone="orange" />                    // big play
 *   <TeButton tone="red" aria-label="Record"><span className="dot" /></TeButton>
 *   <TeButton shape="pill" icon={Search} aria-label="Search" />         // icon-only pill
 *   <TeButton size="sm">+</TeButton>                                    // adjuster
 *   <TeButton href="/admin/edit" icon={Pencil} title="Edit" />          // as link
 */
export function TeButton(props: TeButtonProps) {
  const {
    shape = "circle",
    icon: Icon,
    iconSize,
    iconColor,
    size = "md",
    tone = "default",
    active,
    title,
    children,
    className = "",
    style,
    disabled,
  } = props;

  const baseClass = shape === "pill" ? "te-pill-btn" : "te-icon-btn";
  const sizeClass = shape === "pill" ? PILL_SIZE[size] : CIRCLE_SIZE[size];
  const toneClass = shape === "pill" ? "" : CIRCLE_TONE[tone];
  // `te-pill-btn-icon` — compact square padding for pills that have ONLY an icon (no label).
  const iconOnlyPillClass = shape === "pill" && Icon && children == null ? "te-pill-btn-icon" : "";

  const cls = [baseClass, sizeClass, toneClass, iconOnlyPillClass, className]
    .filter(Boolean)
    .join(" ");

  const computedIconSize = iconSize ?? SIZE_TO_ICON[size];
  const computedStyle: CSSProperties = {
    ...(tone === "orange" && shape === "circle" ? { color: "var(--orange)" } : null),
    ...(tone === "red"    && shape === "pill"   ? { color: "var(--red)"    } : null),
    ...(tone === "orange" && shape === "pill"   ? { color: "var(--orange)" } : null),
    ...style,
  };
  const ariaLabel = props["aria-label"] ?? title;

  // Icon and children render together when both are provided (pill label with leading icon).
  const inner = (
    <>
      {Icon && (
        <Icon
          size={computedIconSize}
          strokeWidth={1.8}
          style={iconColor ? { color: iconColor } : undefined}
        />
      )}
      {children}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        onClick={props.onClick}
        className={cls}
        style={computedStyle}
        title={title}
        aria-label={ariaLabel}
      >
        {inner}
      </Link>
    );
  }

  const btn = props as AsButton;
  return (
    <button
      type={btn.type ?? "button"}
      onClick={btn.onClick}
      onMouseDown={btn.onMouseDown}
      onMouseEnter={btn.onMouseEnter}
      onFocus={btn.onFocus}
      onTouchStart={btn.onTouchStart}
      disabled={disabled}
      data-active={active || undefined}
      className={cls}
      style={computedStyle}
      title={title}
      aria-label={ariaLabel}
    >
      {inner}
    </button>
  );
}
