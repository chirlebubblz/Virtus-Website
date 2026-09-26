"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Logo } from "./Logo";
import { useLeadForm } from "./useLeadForm";

interface LeadDialogProps {
  open: boolean;
  onClose: () => void;
}

const fieldClass =
  "mt-2 block min-h-12 w-full border-2 border-black bg-white px-4 font-sans text-base text-black placeholder:text-[#666666] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black";

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
      <div className="flex items-center justify-between gap-4 border-b-4 border-[#FBD227] bg-black px-5 py-3.5">
        <Logo size="sm" showWordmark={false} />
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#FBD227] text-black transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-7 sm:px-8">
        {status === "sent" ? (
          <div role="status">
            <h2 id={titleId} className="font-monument text-2xl font-bold uppercase">
              Received
            </h2>
            <p className="mt-3 font-sans text-base leading-[1.6]">
              Thanks. A studio lead will email you within one business day.
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="mt-6 inline-flex min-h-12 items-center bg-black px-6 font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 id={titleId} className="font-monument text-2xl font-bold uppercase leading-tight">
              Get a reply from the studio
            </h2>
            <p className="mt-3 font-sans text-base leading-[1.6]">
              Leave your email and we will follow up within one business day.
            </p>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit({ name, email }, honeypot);
              }}
              className="relative mt-6 space-y-5"
            >
              <div>
                <label htmlFor={`${titleId}-name`} className="font-sans text-sm font-bold">
                  Name
                </label>
                <input
                  id={`${titleId}-name`}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={errors.name ? true : undefined}
                  className={fieldClass}
                />
                {errors.name && <p role="alert" className="mt-1 font-sans text-sm font-semibold">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor={`${titleId}-email`} className="font-sans text-sm font-bold">
                  Email
                </label>
                <input
                  id={`${titleId}-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  className={fieldClass}
                />
                {errors.email && <p role="alert" className="mt-1 font-sans text-sm font-semibold">{errors.email}</p>}
              </div>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
              {formError && (
                <p role="alert" className="font-sans text-sm font-bold">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex min-h-14 items-center gap-3 bg-black px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-[#FBD227] transition-colors hover:bg-[#333333] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-black disabled:opacity-60"
              >
                {status === "sending" ? "Sending" : "Send details"}
                <Icon name="arrow-right" />
              </button>
            </form>
          </>
        )}
      </div>
    </dialog>
  );
};
