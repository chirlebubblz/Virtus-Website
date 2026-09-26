import React from "react";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

const symbolSizes = {
  sm: "h-6 w-6",
  md: "h-9 w-10",
  lg: "h-12 w-[3.25rem]",
};

const wordmarkSizes = {
  sm: {
    gap: "gap-2",
    the: "text-[0.5rem]",
    virtus: "text-[0.88rem]",
    labs: "text-[0.52rem]",
  },
  md: {
    gap: "gap-2.5",
    the: "text-[0.56rem]",
    virtus: "text-[1.05rem]",
    labs: "text-[0.62rem]",
  },
  lg: {
    gap: "gap-3",
    the: "text-[0.66rem]",
    virtus: "text-[1.3rem]",
    labs: "text-[0.75rem]",
  },
};

export const Logo: React.FC<LogoProps> = ({
  className = "",
  showWordmark = true,
  size = "md",
}) => {
  const wordmark = wordmarkSizes[size];

  return (
    <div
      className={`inline-flex select-none items-center ${wordmark.gap} ${className}`}
      role="img"
      aria-label="The Virtus Labs"
    >
      <svg
        viewBox="0 0 100 90"
        className={`${symbolSizes[size]} shrink-0`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <polygon
          points="0,0 29.6,0 50.2,59.8 79.6,59.8 69,90 31,90"
          fill="#FFFFFF"
        />
        <polygon points="70.6,0 100,0 82.9,50.2 53.5,50.2" fill="#FBD227" />
      </svg>

      {showWordmark && (
        <div className="flex min-w-0 flex-col leading-none">
          <span
            className={`${wordmark.the} font-wordmark font-bold uppercase tracking-[0.25em] text-white`}
          >
            THE
          </span>
          <div className="mt-[0.2em] flex items-baseline gap-[0.3em]">
            <span
              className={`${wordmark.virtus} font-wordmark font-bold uppercase leading-none tracking-[0.04em] text-tvl-amber`}
            >
              VIRTUS
            </span>
            <span
              className={`${wordmark.labs} font-accent font-light uppercase leading-none tracking-[0.2em] text-white`}
            >
              LABS
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
