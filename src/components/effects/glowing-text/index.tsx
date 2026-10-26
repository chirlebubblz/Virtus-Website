// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import React, { useMemo, type CSSProperties } from "react";

export type GlowingTextProps = {
  id?: string;
  eyebrow?: string;
  showEyebrow?: boolean;
  showEyebrowDivider?: boolean;
  text?: string;
  textColor?: string;
  glowColor?: string;
  backgroundColor?: string;
  fontSize?: number | string;
  letterSpacing?: number;
  lineHeight?: number;
  glowIntensity?: number;
  characterStagger?: number;
  revealDuration?: number;
  lineGap?: number;
  className?: string;
  textClassName?: string;
  eyebrowClassName?: string;
  as?: "section" | "div" | "h1" | "h2" | "h3";
};

type CharStyle = CSSProperties & {
  "--char-delay": string;
  "--char-duration": string;
};

type Token = { text: string; isSpace: boolean; start: number };

const DEFAULT_EYEBROW = "THE VIRTUS MODEL";
const DEFAULT_TEXT =
  "Five stages. One clear owner.\nPredictable sprints with zero ambiguity.\nCrafted for brands that demand excellence.";
const SETTLED_WEIGHT = 500;

function withAlpha(color: string, alpha: number) {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return color;
}

function tokenizeWithOffsets(value: string): Token[] {
  const matches = value.match(/\s+|\S+/g) ?? [];
  let offset = 0;

  return matches.map((text) => {
    const start = offset;
    offset += Array.from(text).length;
    return { text, isSpace: /^\s/.test(text), start };
  });
}

export function GlowingText({
  id,
  eyebrow = DEFAULT_EYEBROW,
  showEyebrow = true,
  showEyebrowDivider = false,
  text = DEFAULT_TEXT,
  textColor = "#ffffff",
  glowColor = "#F5C518",
  backgroundColor = "transparent",
  fontSize,
  letterSpacing,
  lineHeight = 1.25,
  glowIntensity = 0.85,
  characterStagger = 0.03,
  revealDuration = 0.4,
  lineGap = 0.08,
  className = "",
  textClassName = "",
  eyebrowClassName = "",
  as: Component = "div",
}: GlowingTextProps) {
  const glowSoft = withAlpha(glowColor, Math.min(0.55, glowIntensity * 0.55));
  const glowHard = withAlpha(glowColor, Math.min(0.95, glowIntensity * 0.95));
  const dimEnd = withAlpha(textColor, 0.95);
  const stagger = Math.max(characterStagger, 0.01);
  const duration = Math.max(revealDuration, 0.1);

  const shouldRenderEyebrow = Boolean(showEyebrow && eyebrow);
  const eyebrowTokens = useMemo(
    () => (shouldRenderEyebrow ? tokenizeWithOffsets(eyebrow) : []),
    [shouldRenderEyebrow, eyebrow]
  );
  const lineTokens = useMemo(() => text.split("\n").map(tokenizeWithOffsets), [text]);

  const lineCharDelays = useMemo(
    () =>
      lineTokens.reduce<{ result: number[][]; elapsed: number }>(
        (state, tokens) => {
          const charCount = tokens.reduce((total, token) => total + Array.from(token.text).length, 0);
          const delays = Array.from({ length: charCount }, (_, index) => state.elapsed + index * stagger);
          const lineDuration = charCount > 0 ? (charCount - 1) * stagger + duration : 0;

          return {
            result: [...state.result, delays],
            elapsed: state.elapsed + lineDuration + Math.max(lineGap, 0),
          };
        },
        { result: [], elapsed: 0 }
      ).result,
    [lineTokens, stagger, duration, lineGap]
  );

  const animationKey = [
    eyebrow,
    text,
    glowColor,
    glowIntensity,
    characterStagger,
    revealDuration,
    lineGap,
  ].join("|");

  const computedFontSize = useMemo(() => {
    if (typeof fontSize === "string") return fontSize;
    if (typeof fontSize === "number") return `clamp(1.125rem, ${fontSize}vw, 2.5rem)`;
    return undefined;
  }, [fontSize]);

  const renderTokens = (tokens: Token[], keyPrefix: string, delayFor: (charIndex: number) => number) =>
    tokens.map((token, tokenIndex) => {
      if (token.isSpace) {
        return <span key={`${keyPrefix}-space-${tokenIndex}`}>{token.text}</span>;
      }

      return (
        <span key={`${keyPrefix}-word-${tokenIndex}`} className="glowing-text-word">
          {Array.from(token.text).map((character, charIndex) => (
            <span
              key={`${keyPrefix}-char-${tokenIndex}-${charIndex}`}
              aria-hidden="true"
              className="glowing-text-char"
              style={
                {
                  "--char-delay": `${delayFor(token.start + charIndex)}s`,
                  "--char-duration": `${duration}s`,
                } as CharStyle
              }
            >
              {character}
            </span>
          ))}
        </span>
      );
    });

  return (
    <Component
      id={id}
      key={animationKey}
      className={`glowing-text-root relative w-full overflow-hidden ${className}`}
      style={
        {
          "--glow-text": textColor,
          "--glow-text-dim-end": dimEnd,
          "--glow-soft": glowSoft,
          "--glow-hard": glowHard,
          "--glow-settled-weight": SETTLED_WEIGHT,
          backgroundColor,
        } as CSSProperties
      }
    >
      {/* Accessible fallback for screen readers */}
      <span className="sr-only">
        {shouldRenderEyebrow ? `${eyebrow}. ` : ""}
        {text}
      </span>

      <div className="relative z-10 w-full" aria-hidden="true">
        {shouldRenderEyebrow ? (
          <div className="mb-3">
            <div
              className={`glowing-text-eyebrow font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] ${eyebrowClassName}`}
            >
              {renderTokens(eyebrowTokens, "eyebrow", (charIndex) => charIndex * stagger)}
            </div>
            {showEyebrowDivider ? (
              <div className="mt-3 mb-4 h-px w-16 bg-gradient-to-r from-[#F5C518] to-transparent opacity-75 shadow-[0_0_10px_var(--glow-soft)]" />
            ) : null}
          </div>
        ) : null}

        <div
          className={`glowing-text-copy tracking-tight ${textClassName}`}
          style={{
            ...(computedFontSize ? { fontSize: computedFontSize } : {}),
            ...(typeof letterSpacing === "number" ? { letterSpacing: `${letterSpacing}em` } : {}),
            lineHeight,
          }}
        >
          {lineTokens.map((tokens, lineIndex) => (
            <div key={`line-${lineIndex}`} className="glowing-text-line">
              {renderTokens(tokens, `line-${lineIndex}`, (charIndex) => lineCharDelays[lineIndex][charIndex])}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .glowing-text-root {
          color: var(--glow-text);
        }

        .glowing-text-word {
          display: inline-block;
          white-space: nowrap;
        }

        .glowing-text-char {
          display: inline-block;
          color: var(--glow-text);
          opacity: 0;
          font-weight: 400;
          text-shadow: none;
          animation: glowing-char-reveal var(--char-duration) cubic-bezier(0.16, 1, 0.3, 1) var(--char-delay) forwards;
        }

        @keyframes glowing-char-reveal {
          0% {
            color: var(--glow-text);
            opacity: 0;
            font-weight: 400;
            text-shadow: none;
            filter: blur(2px);
          }

          35% {
            color: #ffffff;
            opacity: 1;
            font-weight: 700;
            text-shadow:
              0 0 8px var(--glow-hard),
              0 0 16px var(--glow-hard),
              0 0 28px var(--glow-soft);
            filter: blur(0px);
          }

          70% {
            color: #ffffff;
            opacity: 1;
            font-weight: 600;
            text-shadow: 0 0 10px var(--glow-soft);
          }

          100% {
            color: var(--glow-text-dim-end);
            opacity: 0.96;
            font-weight: var(--glow-settled-weight);
            text-shadow: 0 0 8px rgba(245, 197, 24, 0.16);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .glowing-text-char {
            color: var(--glow-text-dim-end);
            font-weight: var(--glow-settled-weight);
            text-shadow: none;
            filter: none;
            animation: glowing-char-fade-in 0.25s ease-out forwards;
          }
        }

        @keyframes glowing-char-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 0.96;
          }
        }
      `}</style>
    </Component>
  );
}

export default GlowingText;
