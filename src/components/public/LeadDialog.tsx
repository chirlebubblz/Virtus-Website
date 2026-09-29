"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Logo } from "./Logo";
import { useLeadForm } from "./useLeadForm";
import { Button, Field, Honeypot, IconButton } from "./ui";

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
      <div className="flex items-center justify-between gap-4 border-b-4 border-[#FBD227] bg-black px-5 py-3.5">
        <Logo size="sm" showWordmark={false} />
        <IconButton icon="close" tone="amber" size="sm" label="Close" onClick={() => dialogRef.current?.close()} />
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
            <Button onClick={() => dialogRef.current?.close()} tone="black" size="md" className="mt-6">
              Close
            </Button>
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
              <Field
                id={`${titleId}-name`}
                label="Name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />
              <Field
                id={`${titleId}-email`}
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
              <Honeypot value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              {formError && (
                <p role="alert" className="font-sans text-sm font-bold">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={status === "sending"} tone="black" hoverTone="white" size="lg" icon="arrow-right">
                {status === "sending" ? "Sending" : "Send details"}
              </Button>
            </form>
          </>
        )}
      </div>
    </dialog>
  );
};
