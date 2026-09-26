"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { PasswordField } from "./PasswordField";
import { authError, authInput, authLabel, authPrimary } from "./authStyles";

type FieldName = "name" | "email" | "password" | "code";

/** Reads `code` or `invite` from the URL fragment (preferred) or query, then removes them from the address bar. */
function readInviteFromUrl(): { code: string; invite: string } {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromQuery = new URLSearchParams(window.location.search);
  const code = fromHash.get("code") ?? fromQuery.get("code") ?? "";
  const invite = fromHash.get("invite") ?? fromQuery.get("invite") ?? "";
  if (code || invite) window.history.replaceState(null, "", window.location.pathname);
  return { code, invite };
}

export function StaffRegisterForm() {
  const router = useRouter();
  const uid = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState("");
  const [lockedEmail, setLockedEmail] = useState(false);
  const [inviteRole, setInviteRole] = useState<string | null>(null);
  const [inviteBad, setInviteBad] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; field?: FieldName } | null>(null);

  useEffect(() => {
    const found = readInviteFromUrl();
    if (found.code) setCode(found.code);
    if (found.invite) {
      setInvite(found.invite);
      fetch("/api/staff/invite-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite: found.invite }),
      })
        .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))
        .then(({ status, body }) => {
          if (status === 429) return setInviteNotice("Too many attempts. Wait a little, then reload this page.");
          if (status >= 500) return setInviteNotice("Could not check your invitation right now. Reload to try again.");
          if (!body?.ok) return setInviteBad(true);
          setInviteRole(body.data.role);
          if (body.data.email) {
            setEmail(body.data.email);
            setLockedEmail(true);
          }
        })
        .catch(() => setInviteNotice("Could not check your invitation. Check your connection and reload."));
    }
  }, []);

  const hasInvite = Boolean(invite) && !inviteBad;
  // Keep the field visible (prefilled) when the code was rejected, so it can be corrected.
  const showCodeField = !hasInvite && (!code || error?.field === "code");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (password.length < 12) {
      setError({ message: "Use at least 12 characters for your password.", field: "password" });
      return;
    }
    if (password !== confirm) {
      setError({ message: "Passwords do not match.", field: "password" });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, ...(hasInvite ? { invite } : { code }) }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        router.replace(body.data.redirect);
        router.refresh();
        return;
      }
      setError({ message: body?.error ?? "Something went wrong. Try again.", field: body?.field });
    } catch {
      setError({ message: "Network error. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  };

  const invalid = (field: FieldName) => error?.field === field;

  return (
    <div className="max-w-[34rem]">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="block h-1 w-12 bg-[#FBD227]" />
        <span className="font-sans text-eyebrow font-bold uppercase">Team access</span>
      </div>
      <h1 className="mt-6 font-monument text-[clamp(2rem,6vw,3.5rem)] font-bold uppercase leading-[1.1]">
        Join the <span className="text-[#FBD227]">team.</span>
      </h1>
      <p className="mt-5 font-sans text-lg leading-[1.5]">
        Create your staff account with your Gmail address.
        {inviteRole ? ` You are joining as ${inviteRole === "admin" ? "an admin" : "a team member"}.` : ""}
      </p>

      {inviteNotice && (
        <p role="alert" className={`${authError} mt-6`}>
          <Icon name="alert" className="mt-0.5 h-5 w-5 text-[#DD7230]" />
          {inviteNotice}
        </p>
      )}

      {inviteBad && (
        // An invalid invite is an error, so announce it assertively.
        <p role="alert" className={`${authError} mt-6`}>
          <Icon name="alert" className="mt-0.5 h-5 w-5 text-[#DD7230]" />
          That invitation link is invalid or has expired. Ask an admin for a new one, or enter a code below.
        </p>
      )}

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor={`${uid}-name`} className={authLabel}>
            Discord name
          </label>
          <input
            id={`${uid}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            required
            maxLength={40}
            aria-invalid={invalid("name") || undefined}
            className={authInput}
            placeholder="Your Discord name"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className={authLabel}>
            Gmail address
          </label>
          <input
            id={`${uid}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={lockedEmail}
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={invalid("email") || undefined}
            className={authInput}
            placeholder="you@gmail.com"
          />
          {lockedEmail && <p className="mt-2 font-sans text-sm text-[#999999]">This invite is for this address.</p>}
        </div>
        <PasswordField
          id={`${uid}-password`}
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          invalid={invalid("password")}
          describedBy={`${uid}-hint`}
        />
        <p id={`${uid}-hint`} className="-mt-2 font-sans text-sm text-[#999999]">
          At least 12 characters, mixing two of: lowercase, uppercase, numbers, symbols.
        </p>
        <PasswordField
          id={`${uid}-confirm`}
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {showCodeField && (
          <div>
            <label htmlFor={`${uid}-code`} className={authLabel}>
              Invitation code
            </label>
            <input
              id={`${uid}-code`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-invalid={invalid("code") || undefined}
              className={authInput}
              placeholder="Paste your invitation code"
            />
          </div>
        )}
        {error && (
          <p role="alert" className={authError}>
            <Icon name="alert" className="mt-0.5 h-5 w-5 text-[#DD7230]" />
            {error.message}
          </p>
        )}
        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={pending || !name || !email || !password || !confirm || (!hasInvite && !code)}
            className={authPrimary}
          >
            <Icon name="user-plus" />
            {pending ? "Creating…" : "Create account"}
          </button>
          <Link
            href="/staff/login"
            className="font-sans text-eyebrow font-bold uppercase text-white underline decoration-[#FBD227] decoration-2 underline-offset-8 hover:text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
          >
            Already registered? Log in
          </Link>
        </div>
      </form>
    </div>
  );
}
