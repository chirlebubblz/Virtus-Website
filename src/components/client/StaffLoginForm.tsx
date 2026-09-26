"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { PasswordField } from "./PasswordField";
import { authError, authInput, authLabel, authPrimary } from "./authStyles";

export function StaffLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const uid = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        // Each role has one workspace: admins /admin, team members /team.
        const home = body.data.redirect as string;
        const target = next === home ? next : home;
        router.replace(target);
        router.refresh();
        return;
      }
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
        Staff <span className="text-[#FBD227]">login.</span>
      </h1>
      <p className="mt-5 font-sans text-lg leading-[1.5]">Use the email and password you registered with.</p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor={`${uid}-email`} className={authLabel}>
            Email
          </label>
          <input
            id={`${uid}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            className={authInput}
            placeholder="you@company.com"
          />
        </div>
        <PasswordField
          id={`${uid}-password`}
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          invalid={Boolean(error)}
          describedBy={error ? `${uid}-error` : undefined}
        />
        {error && (
          <p id={`${uid}-error`} role="alert" className={authError}>
            <Icon name="alert" className="mt-0.5 h-5 w-5 text-[#DD7230]" />
            {error}
          </p>
        )}
        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
          <button type="submit" disabled={pending || !email || !password} className={authPrimary}>
            <Icon name="lock" />
            {pending ? "Checking…" : "Log in"}
          </button>
          <Link
            href="/staff/register"
            className="font-sans text-eyebrow font-bold uppercase text-white underline decoration-[#FBD227] decoration-2 underline-offset-8 hover:text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
          >
            Have an invite? Register
          </Link>
        </div>
        <p className="font-sans text-sm text-[#999999]">Forgot your password? Ask an admin for a reset link.</p>
      </form>
    </div>
  );
}
