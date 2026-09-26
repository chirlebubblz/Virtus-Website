"use client";

import React, { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useLeadForm } from "./useLeadForm";

export const HeroLeadForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const { status, errors, formError, submit } = useLeadForm();
  const error = errors.email ?? formError;

  if (status === "sent") {
    return (
      <p role="status" className="flex items-center gap-3 font-sans text-base font-semibold text-white">
        <Icon name="check" className="h-5 w-5 text-tvl-amber" />
        Thanks. We will email you within one business day.
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit({ email }, honeypot);
      }}
      className="w-full max-w-[30rem]"
    >
      <label htmlFor="hero-lead-email" className="mb-2 block font-sans text-sm font-semibold text-white">
        Not ready to brief us? Leave your email.
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="hero-lead-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "hero-lead-error" : undefined}
          className="min-h-12 flex-1 border-2 border-white bg-transparent px-4 font-sans text-base text-white placeholder:text-tide focus-visible:border-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
        />
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
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex min-h-12 items-center justify-center gap-2 border-2 border-white px-6 font-sans text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:border-tvl-amber hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
        >
          {status === "sending" ? "Sending" : "Keep me posted"}
          <Icon name="arrow-right" />
        </button>
      </div>
      {error && (
        <p id="hero-lead-error" role="alert" className="mt-2 font-sans text-sm font-semibold text-tvl-amber">
          {error}
        </p>
      )}
    </form>
  );
};
