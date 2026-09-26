// Shared class strings for the dark client dashboard. Contrast: body text #D4D4D4 and muted #A3A3A3 both pass AA on #0A0A0A.

export const focusRing =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FBD227]";

export const card = "border border-white/10 bg-white/[0.04] backdrop-blur-sm";
export const cardPad = `${card} p-5 sm:p-7`;
export const eyebrow = "font-sans text-eyebrow font-bold uppercase text-[#A3A3A3]";
export const muted = "text-[#A3A3A3]";

export const btnYellow = `inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[#FBD227] bg-[#FBD227] px-5 py-2.5 font-sans text-eyebrow font-bold uppercase text-black transition-colors hover:bg-transparent hover:text-[#FBD227] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const btnOutline = `inline-flex min-h-11 items-center justify-center gap-2 border-2 border-white/25 px-5 py-2.5 font-sans text-eyebrow font-bold uppercase text-white transition-colors hover:border-[#FBD227] hover:text-[#FBD227] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

/** Staggered entrance. Skipped for people who ask for reduced motion. */
export const enter = "motion-safe:animate-fade-up";
export const stagger = (i: number) => ({ animationDelay: `${i * 70}ms` });
