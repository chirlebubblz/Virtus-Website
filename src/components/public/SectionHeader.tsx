import React from "react";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  intro?: string;
  titleId?: string;
  tone?: "dark" | "light";
  className?: string;
}

// Shared section heading: yellow/black bar + eyebrow, Unbounded title, intro.
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  intro,
  titleId,
  tone = "dark",
  className = "",
}) => {
  const light = tone === "light";
  return (
    <header className={`max-w-[46rem] ${className}`}>
      <div className="mb-5 flex items-center gap-4">
        <span aria-hidden="true" className={`block h-1 w-12 ${light ? "bg-black" : "bg-tvl-amber"}`} />
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
      {intro && (
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
