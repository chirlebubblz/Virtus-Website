"use client";

import React, { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useLeadForm } from "./useLeadForm";
import { Honeypot } from "./ui";

export const HeroLeadForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const { status, errors, formError, submit } = useLeadForm();
  const error = errors.email ?? formError;
  const sending = status === "sending";

  if (status === "sent") {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-lg border border-[#F5C518]/25 bg-[#F5C518]/[0.06] px-4 py-3 font-sans text-sm font-medium leading-[1.5] text-zinc-100"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F5C518] text-black">
          <Icon name="check" className="h-4 w-4" />
        </span>
        Thanks. We will email you within one business day.
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit({ email }, honeypot);
      }}
      className="w-full"
    >
      <label htmlFor="hero-lead-email" className="mb-2.5 block font-sans text-xs leading-[1.5] text-zinc-400">
        Not ready to brief us? Leave your email.
      </label>

      <div
        className={`flex items-center gap-1.5 rounded-lg border bg-zinc-950/90 p-1.5 transition-colors focus-within:border-[#F5C518]/60 focus-within:ring-2 focus-within:ring-[#F5C518]/25 ${
          error ? "border-[#DD7230]/70" : "border-zinc-800"
        }`}
      >
        <input
          id="hero-lead-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "hero-lead-error" : undefined}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-3 py-2 font-sans text-sm text-white placeholder:text-zinc-400 focus:outline-none sm:text-base"
        />
        <Honeypot value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-white/[0.06] px-3.5 py-2 font-sans text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#F5C518] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-wait disabled:opacity-60 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.12em]"
        >
          {sending ? (
            <>
              <Icon name="refresh" className="h-3.5 w-3.5 animate-spin" />
              Sending
            </>
          ) : (
            <>
              Keep me posted
              <Icon name="arrow-right" className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {error && (
        <p id="hero-lead-error" role="alert" className="mt-2 font-sans text-xs font-medium leading-[1.5] text-[#F5C518]">
          {error}
        </p>
      )}
    </form>
  );
};
