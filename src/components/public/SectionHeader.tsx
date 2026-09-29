import React from "react";
import { AccentBar } from "./ui";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  intro?: string;
  titleId?: string;
  tone?: "dark" | "light";
  /**
   * "full" (default): bar + eyebrow + title + optional intro — WorkShowcase,
   * Services, Process, FAQ (FAQ passes no intro, which is intentional).
   * "compact": bar + eyebrow + title only (intro ignored), tighter spacing,
   * slant accent bar — Products only, so it reads as a denser "menu" header
   * rather than repeating Services'/Process's spacious one.
   *
   * Hero, Trust and Footer intentionally opt out of SectionHeader entirely —
   * each already has its own distinct opening device (display headline,
   * stat strip, closing headline). Don't "fix" that back to a 9-for-9 shared
   * formula.
   */
  layout?: "full" | "compact";
  className?: string;
}

// Shared section heading: yellow/black bar + eyebrow, Unbounded title, intro.
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  intro,
  titleId,
  tone = "dark",
  layout = "full",
  className = "",
}) => {
  const light = tone === "light";
  const compact = layout === "compact";
  return (
    <header className={`max-w-[46rem] ${className}`}>
      <div className={`flex items-center gap-4 ${compact ? "mb-3" : "mb-5"}`}>
        {compact ? (
          <AccentBar index={0} orientation="slant" />
        ) : (
          <span aria-hidden="true" className={`block h-1 w-12 ${light ? "bg-black" : "bg-tvl-amber"}`} />
        )}
        <span className={`text-eyebrow font-sans font-bold uppercase ${light ? "text-black" : "text-white"}`}>
          {eyebrow}
        </span>
      </div>
      <h2
        id={titleId}
        className={`font-monument text-h2 font-bold uppercase ${light ? "text-black" : "text-white"}`}
      >
        {title}
      </h2>
      {!compact && intro && (
        <p
          className={`mt-4 max-w-[56ch] font-sans text-base leading-[1.6] sm:text-lg ${
            light ? "text-black" : "text-tide"
          }`}
        >
          {intro}
        </p>
      )}
    </header>
  );
};
