"use client";

import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";

/**
 * Shared public-site primitives. These replace the button/input/badge/accent
 * markup that used to be hand-rolled, slightly differently, in every section.
 * Corners are rounded on purpose — a deliberate break from the brand PDF's
 * zero-radius rule, chosen after a side-by-side mockup, to read less severe.
 * Circular elements (badges, icon buttons) go fully round, not barely
 * rounded. No box-shadow, no backdrop-blur. `SlantDivider`'s diagonal
 * section seams are a separate, unrelated motif and are untouched.
 */

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type Tone = "amber" | "black" | "white";
type Variant = "solid" | "outline" | "ghost";
type FocusRing = "white" | "black" | "amber";

const FOCUS_RING: Record<FocusRing, string> = {
  white: "focus-visible:outline-white",
  black: "focus-visible:outline-black",
  amber: "focus-visible:outline-tvl-amber",
};

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "min-h-11 px-5 text-xs tracking-[0.1em]",
  md: "min-h-12 px-6 text-sm tracking-[0.14em]",
  lg: "min-h-14 px-8 text-sm tracking-[0.16em]",
};

// `hoverTone` overrides a variant/tone's default hover fill for the handful
// of call sites that sit on a background the default hover would vanish
// into (an amber button hovering to amber on an amber section, etc).
function recipe(variant: Variant, tone: Tone, hoverTone?: Tone): string {
  if (variant === "solid") {
    if (tone === "amber") {
      const hover = hoverTone === "black" ? "hover:bg-black hover:text-tvl-amber" : "hover:bg-white";
      return `bg-tvl-amber text-black ${hover}`;
    }
    if (tone === "black") {
      const hover = hoverTone === "white" ? "hover:bg-white hover:text-black" : "hover:bg-tvl-amber hover:text-black";
      return `bg-black text-tvl-amber ${hover}`;
    }
    return "bg-white text-black hover:bg-tvl-amber";
  }
  if (variant === "outline") {
    if (tone === "white") {
      const hover =
        hoverTone === "white"
          ? "hover:border-white hover:bg-white hover:text-black"
          : "hover:border-tvl-amber hover:text-tvl-amber";
      return `border-2 border-white bg-transparent text-white ${hover}`;
    }
    if (tone === "black") return "border-2 border-black bg-white text-black hover:bg-black hover:text-white";
    return "border-2 border-tvl-amber bg-transparent text-tvl-amber hover:bg-tvl-amber hover:text-black";
  }
  if (tone === "white") return "bg-transparent text-white hover:text-tvl-amber";
  if (tone === "black") return "bg-transparent text-black hover:text-[#854D27]";
  return "bg-transparent text-tvl-amber hover:text-white";
}

const DEFAULT_FOCUS: Record<`${Variant}-${Tone}`, FocusRing> = {
  "solid-amber": "white",
  "solid-black": "black",
  "solid-white": "black",
  "outline-white": "white",
  "outline-black": "black",
  "outline-amber": "black",
  "ghost-white": "amber",
  "ghost-black": "amber",
  "ghost-amber": "white",
};

interface ButtonOwnProps {
  variant?: Variant;
  tone?: Tone;
  /** Overrides the variant/tone's default hover fill (see `recipe`). */
  hoverTone?: Tone;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconPosition?: "leading" | "trailing";
  focusRing?: FocusRing;
  fullWidthOnMobile?: boolean;
  href?: string;
  className?: string;
  children: React.ReactNode;
}

export type ButtonProps = ButtonOwnProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export const Button: React.FC<ButtonProps> = ({
  variant = "solid",
  tone = "amber",
  hoverTone,
  size = "md",
  icon,
  iconPosition = "trailing",
  focusRing,
  fullWidthOnMobile = false,
  href,
  className = "",
  children,
  type,
  ...rest
}) => {
  const ring = focusRing ?? DEFAULT_FOCUS[`${variant}-${tone}`];
  const classes = [
    "inline-flex items-center justify-center gap-3 rounded-xl font-sans font-bold uppercase transition-colors",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variant === "ghost" ? "group" : "",
    SIZE[size],
    recipe(variant, tone, hoverTone),
    FOCUS_RING[ring],
    fullWidthOnMobile ? "w-full sm:w-auto" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconEl = icon ? (
    <Icon
      name={icon}
      className={`h-4 w-4 shrink-0 ${variant === "ghost" ? "transition-transform duration-200 group-hover:translate-x-1" : ""}`}
    />
  ) : null;
  const content = (
    <>
      {iconPosition === "leading" && iconEl}
      {children}
      {iconPosition === "trailing" && iconEl}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      {content}
    </button>
  );
};

// ---------------------------------------------------------------------------
// IconButton
// ---------------------------------------------------------------------------

const ICON_BUTTON_SIZE: Record<"sm" | "md", string> = {
  sm: "h-11 w-11",
  md: "h-12 w-12",
};

function iconButtonRecipe(tone: Tone): string {
  if (tone === "amber") return "bg-tvl-amber text-black hover:bg-white";
  if (tone === "white") return "border-2 border-white bg-transparent text-white hover:border-tvl-amber hover:bg-tvl-amber hover:text-black";
  return "bg-black text-white hover:bg-tvl-amber hover:text-black";
}

const ICON_BUTTON_DEFAULT_FOCUS: Record<Tone, FocusRing> = {
  amber: "white",
  white: "amber",
  black: "amber",
};

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  icon: IconName;
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
  focusRing?: FocusRing;
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  tone = "amber",
  size = "md",
  focusRing,
  className = "",
  type,
  ...rest
}) => {
  const ring = focusRing ?? ICON_BUTTON_DEFAULT_FOCUS[tone];
  const classes = [
    "flex shrink-0 items-center justify-center rounded-full transition-colors",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2",
    ICON_BUTTON_SIZE[size],
    iconButtonRecipe(tone),
    FOCUS_RING[ring],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type ?? "button"} aria-label={label} className={classes} {...rest}>
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
};

// ---------------------------------------------------------------------------
// Field — the stacked label+input recipe duplicated byte-for-byte between
// LeadCapture and LeadDialog.
// ---------------------------------------------------------------------------

const FIELD_SURFACE: Record<"light" | "dark", string> = {
  light: "border-2 border-black bg-white text-black placeholder:text-[#666666] focus-visible:outline-black",
  dark: "border-2 border-white bg-transparent text-white placeholder:text-tide focus-visible:border-tvl-amber focus-visible:outline-tvl-amber",
};

interface FieldProps {
  id: string;
  label: string;
  as?: "input" | "textarea";
  type?: "text" | "email" | "tel";
  surface?: "light" | "dark";
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  hint?: string;
  rows?: number;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLElement>["inputMode"];
  placeholder?: string;
  maxLength?: number;
}

export const Field: React.FC<FieldProps> = ({
  id,
  label,
  as = "input",
  type = "text",
  surface = "light",
  value,
  onChange,
  error,
  hint,
  rows,
  required,
  autoComplete,
  inputMode,
  placeholder,
  maxLength,
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const labelTone = surface === "dark" ? "text-white" : "text-black";
  const fieldClasses = [
    "mt-2 block min-h-12 w-full rounded-xl px-4 font-sans text-base",
    as === "textarea" ? "py-3" : "",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2",
    FIELD_SURFACE[surface],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={id} className={`font-sans text-sm font-bold ${labelTone}`}>
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          rows={rows ?? 3}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={fieldClasses}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={fieldClasses}
        />
      )}
      {hint && (
        <p id={hintId} className={`mt-2 font-sans text-sm leading-[1.5] ${surface === "dark" ? "text-tide" : "text-[#333333]"}`}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={`mt-1 font-sans text-sm font-semibold ${surface === "dark" ? "text-tvl-amber" : "text-black"}`}>
          {error}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Honeypot — the anti-spam field hand-rolled identically in three forms.
// ---------------------------------------------------------------------------

interface HoneypotProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Honeypot: React.FC<HoneypotProps> = ({ value, onChange }) => (
  <input
    type="text"
    name="website"
    tabIndex={-1}
    autoComplete="off"
    aria-hidden="true"
    value={value}
    onChange={onChange}
    className="absolute -left-[9999px] h-0 w-0 opacity-0"
  />
);

// ---------------------------------------------------------------------------
// IndexBadge — the numbered-chip motif, unified into one 70°-sheared shape.
// ---------------------------------------------------------------------------

const pad = (value: number) => String(value).padStart(2, "0");

const BADGE_TONE: Record<Tone, string> = {
  amber: "bg-tvl-amber text-black",
  black: "bg-black text-tvl-amber",
  white: "bg-white text-black",
};

const BADGE_SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "px-2 py-1 text-base",
  md: "px-3.5 py-2 text-2xl",
  lg: "px-4 py-2.5 text-3xl",
};

interface IndexBadgeProps {
  index: number;
  /** When given, renders as a bare "01 / 06" counter instead of a filled chip. */
  total?: number;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const IndexBadge: React.FC<IndexBadgeProps> = ({ index, total, tone = "amber", size = "lg", className = "" }) => {
  if (total !== undefined) {
    return (
      <div aria-hidden="true" className={`flex items-baseline gap-2 font-display leading-none ${className}`}>
        <span className="text-5xl text-tvl-amber sm:text-6xl">{pad(index)}</span>
        <span className="text-2xl text-tide">/ {pad(total)}</span>
      </div>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full font-display leading-none ${BADGE_TONE[tone]} ${BADGE_SIZE[size]} ${className}`}
    >
      {pad(index)}
    </span>
  );
};

// ---------------------------------------------------------------------------
// AccentBar — the rotating black/brown/orange/black accent, one source of
// truth shared by Services and ChoiceCards.
// ---------------------------------------------------------------------------

export const ACCENT_SEQUENCE = ["bg-black", "bg-[#854D27]", "bg-[#DD7230]", "bg-black"] as const;

interface AccentBarProps {
  index: number;
  orientation?: "vertical" | "slant";
  className?: string;
}

export const AccentBar: React.FC<AccentBarProps> = ({ index, orientation = "vertical", className = "" }) => {
  const color = ACCENT_SEQUENCE[index % ACCENT_SEQUENCE.length];
  if (orientation === "slant") {
    return <span aria-hidden="true" className={`inline-block h-1 w-12 rounded-full ${color} ${className}`} />;
  }
  return <span aria-hidden="true" className={`absolute inset-y-0 left-0 z-10 w-2 ${color} ${className}`} />;
};

// ---------------------------------------------------------------------------
// SlantDivider — the diagonal seam between stacked sections.
// ---------------------------------------------------------------------------

const DIVIDER_TONE: Record<Tone, string> = {
  amber: "bg-tvl-amber",
  black: "bg-black",
  white: "bg-white",
};

interface SlantDividerProps {
  toTone: Tone;
  height?: "sm" | "md";
  className?: string;
}

export const SlantDivider: React.FC<SlantDividerProps> = ({ toTone, height = "md", className = "" }) => (
  <div aria-hidden="true" className={`tvl-slant-divider tvl-slant-divider--${height} ${DIVIDER_TONE[toTone]} ${className}`} />
);
