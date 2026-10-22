"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { PasswordField } from "./PasswordField";
import { authError, authInput, authLabel, authPrimary } from "./authStyles";

type FieldName = "name" | "email" | "password" | "code" | "roleTitle";

interface PodOption {
  id: string;
  name: string;
  focusArea: string;
  color: string;
}

/** Reads `code`, `invite`, or `join` from the URL fragment (preferred) or query, then removes them from the address bar. */
function readInviteFromUrl(): { code: string; invite: string; join: string } {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromQuery = new URLSearchParams(window.location.search);
  const code = fromHash.get("code") ?? fromQuery.get("code") ?? "";
  const invite = fromHash.get("invite") ?? fromQuery.get("invite") ?? "";
  const join =
    fromHash.get("join") ??
    fromQuery.get("join") ??
    fromHash.get("mass") ??
    fromQuery.get("mass") ??
    "";
  if (code || invite || join) window.history.replaceState(null, "", window.location.pathname);
  return { code, invite, join };
}

export function StaffRegisterForm({ directJoin = false }: { directJoin?: boolean } = {}) {
  const router = useRouter();
  const uid = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [isMassRegistry, setIsMassRegistry] = useState(directJoin);
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedPodId, setSelectedPodId] = useState("");
  const [pods, setPods] = useState<PodOption[]>([]);
  const [lockedEmail, setLockedEmail] = useState(false);
  const [inviteRole, setInviteRole] = useState<string | null>(directJoin ? "team" : null);
  const [inviteBad, setInviteBad] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; field?: FieldName } | null>(null);

  useEffect(() => {
    const found = readInviteFromUrl();
    if (found.code) setCode(found.code);

    if (directJoin || found.join) {
      if (found.join) setJoinToken(found.join);
      const payload = found.join ? { token: found.join } : { direct: true };

      fetch("/api/staff/mass-register-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))
        .then(({ status, body }) => {
          if (status === 429) return setInviteNotice("Too many attempts. Wait a little, then reload this page.");
          if (status >= 500) return setInviteNotice("Could not check registration link. Reload to try again.");
          if (!body?.ok) {
            setInviteBad(true);
            setInviteNotice(body?.error || "This team registration link is invalid or has expired.");
            return;
          }
          setIsMassRegistry(true);
          setInviteRole("team");
          if (body.data?.joinToken) {
            setJoinToken(body.data.joinToken);
          }
          if (Array.isArray(body.data?.pods)) {
            setPods(body.data.pods);
          }
        })
        .catch(() => setInviteNotice("Could not verify your registration link. Check your connection and reload."));
      return;
    }

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
  }, [directJoin]);

  const hasInvite = Boolean(invite) && !inviteBad;
  // Keep the field visible (prefilled) when the code was rejected, so it can be corrected.
  const showCodeField = !isMassRegistry && !hasInvite && (!code || error?.field === "code");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    if (isMassRegistry && !roleTitle.trim()) {
      setError({ message: "Enter your role or specialty title (e.g. Frontend Engineer).", field: "roleTitle" });
      return;
    }

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
      const payload: Record<string, unknown> = {
        name,
        email,
        password,
      };

      if (isMassRegistry) {
        payload.join = joinToken;
        payload.roleTitle = roleTitle.trim();
        if (selectedPodId) payload.teamId = selectedPodId;
      } else if (hasInvite) {
        payload.invite = invite;
      } else {
        payload.code = code;
      }

      const res = await fetch("/api/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        <span className="font-sans text-eyebrow font-bold uppercase tracking-wider text-[#FBD227]">
          {isMassRegistry ? "Team Member Self-Registration" : "Team access"}
        </span>
      </div>

      <h1 className="mt-6 font-monument text-[clamp(2rem,6vw,3.5rem)] font-bold uppercase leading-[1.1]">
        Join the <span className="text-[#FBD227]">team.</span>
      </h1>

      <p className="mt-5 font-sans text-lg leading-[1.5]">
        {isMassRegistry
          ? "Welcome! Add yourself to the Virtus team roster and create your staff credentials."
          : `Create your staff account with your email address.${inviteRole ? ` You are joining as ${inviteRole === "admin" ? "an admin" : "a team member"}.` : ""}`}
      </p>

      {/* Role Restriction Banner for Mass Registry */}
      {isMassRegistry && (
        <div className="mt-6 border border-[#262626] bg-[#141414] p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-[#FBD227]/10 text-[#FBD227] border border-[#FBD227]/30 rounded">
              <Icon name="shield" className="h-3.5 w-3.5" />
              Assigned Role: Team Member
            </span>
            <span className="text-xs font-mono text-gray-400">Specialist Tier</span>
          </div>
          <p className="mt-2 text-xs font-sans text-gray-400 leading-relaxed">
            You are registering as a Team Member with Specialist access. Admin accounts require separate administrative provisioning.
          </p>
        </div>
      )}

      {inviteNotice && (
        <p role="alert" className={`${authError} mt-6`}>
          <Icon name="alert" className="mt-0.5 h-5 w-5 text-[#DD7230]" />
          {inviteNotice}
        </p>
      )}

      {inviteBad && !inviteNotice && (
        <p role="alert" className={`${authError} mt-6`}>
          <Icon name="alert" className="mt-0.5 h-5 w-5 text-[#DD7230]" />
          That invitation link is invalid or has expired. Ask an admin for a new one, or enter a code below.
        </p>
      )}

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor={`${uid}-name`} className={authLabel}>
            Display / Discord name
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
            placeholder="e.g. Kai or Ren"
          />
        </div>

        {/* Mass Registry specific fields */}
        {isMassRegistry && (
          <>
            <div>
              <label htmlFor={`${uid}-roleTitle`} className={authLabel}>
                Role / Specialty Title
              </label>
              <input
                id={`${uid}-roleTitle`}
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                required
                maxLength={60}
                aria-invalid={invalid("roleTitle") || undefined}
                className={authInput}
                placeholder="e.g. Frontend Engineer, Motion Lead, Brand Strategist"
              />
            </div>

            {pods.length > 0 && (
              <div>
                <label htmlFor={`${uid}-pod`} className={authLabel}>
                  Select Pod / Department (Optional)
                </label>
                <select
                  id={`${uid}-pod`}
                  value={selectedPodId}
                  onChange={(e) => setSelectedPodId(e.target.value)}
                  className={`${authInput} bg-[#161616] cursor-pointer`}
                >
                  <option value="">General / Cross-functional</option>
                  {pods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.focusArea})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <div>
          <label htmlFor={`${uid}-email`} className={authLabel}>
            Email address
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
            placeholder="you@company.com"
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
            disabled={
              pending ||
              !name ||
              !email ||
              !password ||
              !confirm ||
              (isMassRegistry && !roleTitle.trim()) ||
              (!isMassRegistry && !hasInvite && !code)
            }
            className={authPrimary}
          >
            <Icon name="user-plus" />
            {pending ? "Registering…" : isMassRegistry ? "Join as Team Member" : "Create account"}
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
