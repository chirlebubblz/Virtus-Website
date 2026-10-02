"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Logo } from "./Logo";
import { useLeadForm } from "./useLeadForm";
import { Honeypot } from "./ui";
import { Icon } from "@/components/icons/Icon";

interface LeadDialogProps {
  open: boolean;
  onClose: () => void;
}

export const LeadDialog: React.FC<LeadDialogProps> = ({ open, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const { status, errors, formError, submit } = useLeadForm();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
      const restore = () => {
        document.body.style.overflow = previous;
      };
      dialog.addEventListener("close", restore, { once: true });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="inquiry-dialog lead-dialog"
      aria-labelledby={titleId}
      onClose={() => onCloseRef.current()}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-[#262626] bg-[#0A0A0A] px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo size="sm" showWordmark={true} />
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#FBD227] px-2 py-0.5 rounded bg-[#FBD227]/10 border border-[#FBD227]/20 hidden sm:inline-block">
            Fast Response
          </span>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="h-8 w-8 rounded-full border border-[#2A2A2A] hover:border-[#FBD227] bg-[#141414] text-neutral-400 hover:text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-[#FBD227]"
          title="Close dialog"
        >
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="overflow-y-auto px-6 py-7 sm:px-8 bg-[#0E0E0E] text-white">
        {status === "sent" ? (
          <div role="status" className="py-4 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-[#FBD227]/10 border border-[#FBD227]/30 flex items-center justify-center mx-auto text-[#FBD227]">
              <Icon name="check" className="h-7 w-7" />
            </div>
            <div>
              <h2 id={titleId} className="font-monument text-2xl font-black uppercase text-white tracking-tight">
                Inquiry Received
              </h2>
              <p className="mt-2 font-sans text-sm text-neutral-400 leading-relaxed max-w-sm mx-auto">
                Thanks for reaching out. A studio director will review your project and email you within one business day.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="mt-2 px-6 py-2.5 rounded-xl border border-[#2A2A2A] hover:border-[#FBD227] bg-[#141414] text-xs font-mono font-bold uppercase text-white hover:text-[#FBD227] transition-all"
            >
              Close Window
            </button>
          </div>
        ) : (
          <>
            <div>
              <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#FBD227]">
                Direct Studio Access
              </span>
              <h2 id={titleId} className="font-monument text-2xl font-black uppercase tracking-tight text-white mt-1 leading-tight">
                Get a reply from the studio
              </h2>
              <p className="mt-2 font-sans text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Leave your email and our studio leads will follow up within one business day.
              </p>
            </div>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit({ name, email }, honeypot);
              }}
              className="relative mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor={`${titleId}-name`}
                  className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
                >
                  Full Name *
                </label>
                <input
                  id={`${titleId}-name`}
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  className={`w-full rounded-xl border bg-[#161616] px-4 py-3 text-sm font-sans text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#FBD227] transition-all ${
                    errors.name ? "border-amber-500" : "border-[#2A2A2A] focus:border-[#FBD227]"
                  }`}
                />
                {errors.name && <p className="mt-1 font-mono text-xs text-amber-400">{errors.name}</p>}
              </div>

              <div>
                <label
                  htmlFor={`${titleId}-email`}
                  className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
                >
                  Work Email *
                </label>
                <input
                  id={`${titleId}-email`}
                  type="email"
                  required
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className={`w-full rounded-xl border bg-[#161616] px-4 py-3 text-sm font-sans text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#FBD227] transition-all ${
                    errors.email ? "border-amber-500" : "border-[#2A2A2A] focus:border-[#FBD227]"
                  }`}
                />
                {errors.email && <p className="mt-1 font-mono text-xs text-amber-400">{errors.email}</p>}
              </div>

              <Honeypot value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />

              {formError && (
                <div role="alert" className="p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-red-200 font-mono text-xs">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#FBD227] hover:bg-[#ffe25c] text-black font-sans font-black text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2 shadow-lg shadow-[#FBD227]/10 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{status === "sending" ? "Sending Details..." : "Send Details"}</span>
                <Icon name="arrow-right" className="h-4 w-4" />
              </button>

              <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-center gap-1.5 text-center text-[10px] font-mono text-neutral-500">
                <Icon name="shield" className="h-3.5 w-3.5 text-[#FBD227]" />
                <span>Direct line to studio directors · 100% confidential</span>
              </div>
            </form>
          </>
        )}
      </div>
    </dialog>
  );
};
