"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClientLoginFormProps {
  /** Why the visitor landed here: a /track link that did not resolve, an ended session, or a service problem. */
  reason?: "link" | "expired" | "unavailable";
}

const REASON_COPY = {
  link: "That link did not work. It may have expired. Log in with your access key below, or start a project with us.",
  expired: "Your session ended. Log in again with your access key to continue.",
  unavailable: "The dashboard is temporarily unavailable. Try again in a moment.",
} as const;

export function ClientLoginForm({ reason }: ClientLoginFormProps) {
  const router = useRouter();
  const inputId = useId();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        router.replace("/client");
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="max-w-[34rem]">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="block h-1 w-12 bg-[#FBD227]" />
        <span className="font-sans text-eyebrow font-bold uppercase">Client dashboard</span>
      </div>
      <h1 className="mt-6 font-monument text-[clamp(2rem,6vw,3.5rem)] font-bold uppercase leading-[1.1]">
        Log <span className="text-[#FBD227]">in.</span>
      </h1>

      {reason && (
        <p
          role="status"
          className="mt-6 border-l-4 border-[#FBD227] bg-[#1C1C1C] px-4 py-3 font-sans text-base leading-[1.5]"
        >
          {REASON_COPY[reason]}
        </p>
      )}

      <p className="mt-5 font-sans text-lg leading-[1.5]">
        Enter the access key your account lead sent you. It starts with <span className="font-bold">clitk_</span>.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <label htmlFor={inputId} className="block font-sans text-eyebrow font-bold uppercase">
          Access key
        </label>
        <input
          id={inputId}
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="w-full border-2 border-[#333333] bg-black px-4 py-3 font-sans text-base text-white placeholder-[#999999] focus:border-[#FBD227] focus:outline-none"
          placeholder="clitk_…"
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="font-sans text-base font-semibold text-white">
            <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 bg-[#DD7230]" />
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="submit"
            disabled={pending || token.trim().length === 0}
            className="border-2 border-[#FBD227] bg-[#FBD227] px-6 py-3 font-sans text-eyebrow font-bold uppercase text-black transition-colors hover:bg-black hover:text-[#FBD227] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
          >
            {pending ? "Checking…" : "Log in"}
          </button>
          <Link
            href="/#brief"
            className="border-2 border-white/30 px-6 py-3 text-center font-sans text-eyebrow font-bold uppercase text-white transition-colors hover:border-[#FBD227] hover:text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
          >
            Start a project
          </Link>
        </div>
      </form>
    </div>
  );
}
