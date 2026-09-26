"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Exchanges the /track token for a session cookie, then opens the dashboard without the token in the URL. */
export function EnterDashboardButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enter = async () => {
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
      if (res.status === 401) {
        router.replace("/client/login?reason=link");
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
    <div>
      <button
        type="button"
        onClick={enter}
        disabled={pending}
        className="inline-block border-2 border-[#FBD227] bg-[#FBD227] px-8 py-4 font-sans text-eyebrow font-bold uppercase text-black transition-colors hover:bg-black hover:text-[#FBD227] disabled:opacity-60 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
      >
        {pending ? "Opening…" : "Enter your dashboard →"}
      </button>
      {error && (
        <p role="alert" className="mt-3 font-sans text-base font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}
