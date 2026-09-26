"use client";

import React, { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/icons/Icon";

/** Brand-aligned building blocks for the internal workspace: black/white base, Spark Yellow accent, 2px borders. */

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-[#FBD227] px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-[#FBD227] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black";
export const btnDark =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-black px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#FBD227] hover:text-black disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-white px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black";
export const fieldClass =
  "w-full border-2 border-black bg-white px-3 py-2 font-sans text-sm text-black placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#FBD227] [&[readonly]]:bg-[#F4F4F4]";
/** Small inline select or input, for filters and per-row controls. */
export const fieldCompact =
  "border-2 border-black bg-white px-2 py-1 font-sans text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#FBD227] disabled:opacity-50";
export const labelClass = "mb-1.5 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-black";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b-2 border-black pb-5 md:flex-row md:items-end">
      <div>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="block h-1 w-10 bg-[#FBD227]" />
          <span className="font-sans text-xs font-bold uppercase tracking-[0.16em]">{eyebrow}</span>
        </div>
        <h1 className="mt-2 font-monument text-2xl font-bold uppercase leading-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-[62ch] font-sans text-sm leading-relaxed text-[#333333]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`border-2 border-black bg-white p-5 ${className}`}>{children}</section>;
}

type Tone = "black" | "yellow" | "orange" | "brown" | "plain";
const tones: Record<Tone, string> = {
  black: "bg-black text-white border-black",
  yellow: "bg-[#FBD227] text-black border-black",
  orange: "bg-[#DD7230] text-black border-black",
  brown: "bg-[#854D27] text-white border-[#854D27]",
  plain: "bg-white text-black border-black",
};

/** Status chip. Colour is paired with the label so meaning never depends on colour alone. */
export function Chip({ tone = "plain", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-[0.1em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Native <dialog> modal: focus trap, Escape to close and inert background come from the browser. */
export function Modal({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** When false, Escape and backdrop clicks do nothing. Use for one-time secrets. The close button still calls onClose. */
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault();
      }}
      onClick={(e) => {
        if (dismissible && e.target === ref.current) onClose(); // backdrop click
      }}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-lg border-4 border-[#FBD227] bg-white p-0 text-black [color-scheme:light] backdrop:bg-black/80"
    >
      {open && (
        <div>
          <div className="flex items-center justify-between border-b-2 border-black px-5 py-4">
            <h3 id={titleId} className="font-monument text-lg font-bold uppercase">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center border-2 border-black bg-[#FBD227] text-black transition-colors hover:bg-black hover:text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
