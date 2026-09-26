"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { PasswordField } from "./PasswordField";
import { authError, authPrimary } from "./authStyles";

export function StaffResetForm() {
  const uid = useId();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
    const fromQuery = new URLSearchParams(window.location.search).get("token");
    const found = fromHash ?? fromQuery ?? "";
    // Only overwrite when a token was found. React StrictMode runs this twice in dev, and the second run
    // sees the already-cleaned URL.
    if (found) {
      setToken(found);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (password.length < 12) return setError("Use at least 12 characters for your password.");
    if (password !== confirm) return setError("Passwords do not match.");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) return setDone(true);
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
        <span className="font-sans text-eyebrow font-bold uppercase">Team access</span>
      </div>
      <h1 className="mt-6 font-monument text-[clamp(2rem,6vw,3.5rem)] font-bold uppercase leading-[1.1]">
        New <span className="text-[#FBD227]">password.</span>
      </h1>

      {done ? (
        <div className="mt-8 space-y-6">
          <p role="status" className="flex items-start gap-3 border-l-4 border-[#FBD227] bg-[#1C1C1C] px-4 py-3 font-sans text-base font-semibold">
            <Icon name="check-circle" className="mt-0.5 h-5 w-5 text-[#FBD227]" />
            Password updated. Log in with your new password.
          </p>
          <Link href="/staff/login" className={authPrimary}>
            <Icon name="lock" />
            Go to login
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
          {!token && (
            <p role="status" className={authError}>
              <Icon name="alert" className="mt-0.5 h-5 w-5 text-[#DD7230]" />
              Open the reset link an admin sent you. This page needs that link.
            </p>
          )}
          <PasswordField id={`${uid}-password`} label="New password" value={password} onChange={setPassword} autoComplete="new-password" describedBy={`${uid}-hint`} />
          <p id={`${uid}-hint`} className="-mt-2 font-sans text-sm text-[#999999]">
            At least 12 characters, mixing two of: lowercase, uppercase, numbers, symbols.
          </p>
          <PasswordField id={`${uid}-confirm`} label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && (
            <p role="alert" className={authError}>
              <Icon name="alert" className="mt-0.5 h-5 w-5 text-[#DD7230]" />
              {error}
            </p>
          )}
          <button type="submit" disabled={pending || !token || !password || !confirm} className={authPrimary}>
            {pending ? "Saving…" : "Set password"}
          </button>
        </form>
      )}
    </div>
  );
}
