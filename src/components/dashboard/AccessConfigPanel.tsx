"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { Skeleton } from "./Skeleton";
import { Chip, Modal, Panel, btnDark, btnGhost, btnPrimary, fieldClass, labelClass } from "./ui";

type Source = "settings" | "environment" | "none";

interface Summary {
  inviteTeam: { source: Source; updatedAt: string | null; updatedBy: string | null };
  inviteAdmin: { source: Source; updatedAt: string | null; updatedBy: string | null };
  emailDomains: { value: string[]; source: Source };
  demoAccess: { value: boolean; source: Source };
  env: { name: string; required: boolean; note: string; present: boolean }[];
  cacheSeconds: number;
}

/** A change waiting for the admin's password. */
interface Pending {
  title: string;
  warning: string;
  button: string;
  body: Record<string, unknown>;
  /** Runs with the response data after the server accepts the change. */
  onDone?: (data: { code?: string; summary: Summary }) => void;
}

const SOURCE_LABEL: Record<Source, string> = { settings: "Saved in Settings", environment: "From environment", none: "Not set" };
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

/** Admin only. Every change re-checks the admin's own password on the server. */
export function AccessConfigPanel() {
  const uid = useId();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ role: "team" | "admin"; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [domains, setDomains] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) return setLoadError(body?.error ?? "Could not load settings.");
      setSummary(body.data);
      setDomains(body.data.emailDomains.value.join(", "));
      setLoadError(null);
    } catch {
      setLoadError("Network error. Could not load settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeConfirm = () => {
    setPending(null);
    setPassword("");
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending.body, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setPassword("");
        setError(body?.error ?? "Something went wrong. Nothing was changed.");
        return;
      }
      setSummary(body.data.summary);
      setDomains(body.data.summary.emailDomains.value.join(", "));
      pending.onDone?.(body.data);
      closeConfirm();
    } catch {
      setError("Network error. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  const rotate = (role: "team" | "admin") =>
    setPending({
      title: `New ${role} invite code`,
      warning: `Creates a new ${role} code and stops the current one working. The code is shown once and stored only as a salted hash, so it cannot be looked up later.`,
      button: "Generate code",
      body: { action: "rotate_invite", role },
      onDone: (data) => {
        setIssued({ role, code: data.code ?? "" });
        setCopied(false);
      },
    });

  const revert = (role: "team" | "admin") =>
    setPending({
      title: "Use the environment code",
      warning: `Removes the ${role} code saved in Settings. Registration goes back to the ${role === "admin" ? "ADMIN_INVITE_CODE" : "STAFF_INVITE_CODE"} environment variable, if one is set.`,
      button: "Revert",
      body: { action: "revert_invite", role },
      onDone: () => setNotice("Invite code reverted to the environment value."),
    });

  const copy = async () => {
    if (!issued) return;
    const link = `${window.location.origin}/staff/register#code=${issued.code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", link);
    }
  };

  const inviteRow = (role: "team" | "admin", info: Summary["inviteTeam"]) => (
    <li key={role} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="font-sans text-sm font-bold">{role === "admin" ? "Admin invite code" : "Team invite code"}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 font-sans text-xs text-[#333333]">
          <Chip tone={info.source === "settings" ? "black" : info.source === "none" ? "orange" : "plain"}>
            {SOURCE_LABEL[info.source]}
          </Chip>
          {info.updatedAt && (
            <span>
              Changed {when(info.updatedAt)} by {info.updatedBy}
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} onClick={() => rotate(role)}>
          Generate new code
        </button>
        {info.source === "settings" && (
          <button type="button" className={btnGhost} onClick={() => revert(role)}>
            Use environment
          </button>
        )}
      </div>
    </li>
  );

  if (!summary) {
    return (
      <Panel>
        <h2 className="font-monument text-base font-bold uppercase">Access configuration</h2>
        {loadError ? (
          <p role="alert" className="mt-3 font-sans text-sm font-semibold">
            {loadError}
          </p>
        ) : (
          <div className="mt-4 space-y-3" aria-hidden="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <h2 className="font-monument text-base font-bold uppercase">Access configuration</h2>
      <p className="mt-2 max-w-[68ch] font-sans text-sm leading-relaxed text-[#333333]">
        Change these here instead of editing environment variables. A value saved here replaces the environment one.
        Every change asks for your password. The server reads settings at most every {summary.cacheSeconds} seconds, so
        a change is live here at once and reaches other server instances within about a minute.
      </p>

      {notice && (
        <p role="status" className="mt-4 flex items-center justify-between gap-3 border-l-4 border-[#FBD227] bg-black px-4 py-3 font-sans text-sm font-semibold text-white">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-bold uppercase text-[#FBD227]">
            Dismiss
          </button>
        </p>
      )}

      <h3 className="mt-6 font-sans text-xs font-bold uppercase tracking-[0.14em]">Invite codes</h3>
      <ul className="mt-1 divide-y-2 divide-black border-y-2 border-black">
        {inviteRow("team", summary.inviteTeam)}
        {inviteRow("admin", summary.inviteAdmin)}
      </ul>

      <h3 className="mt-6 font-sans text-xs font-bold uppercase tracking-[0.14em]">Allowed sign-up domains</h3>
      <form
        className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setPending({
            title: "Change allowed domains",
            warning: "Only these email domains can register for staff accounts. Leave it empty to go back to the environment default.",
            button: "Save domains",
            body: { action: "set_email_domains", domains },
            onDone: () => setNotice("Allowed domains saved."),
          });
        }}
      >
        <div className="flex-1">
          <label htmlFor={`${uid}-domains`} className={labelClass}>
            Domains, comma separated ({SOURCE_LABEL[summary.emailDomains.source]})
          </label>
          <input
            id={`${uid}-domains`}
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            className={fieldClass}
            placeholder="gmail.com, yourstudio.com"
          />
        </div>
        <button type="submit" className={btnDark}>
          Save domains
        </button>
      </form>

      <h3 className="mt-6 font-sans text-xs font-bold uppercase tracking-[0.14em]">Demo client sign-in in production</h3>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-[#333333]">
          Sample clients can {summary.demoAccess.value ? "" : "not "}sign in when the site is live ({SOURCE_LABEL[summary.demoAccess.source]}).
        </p>
        <button
          type="button"
          className={btnGhost}
          onClick={() =>
            setPending({
              title: summary.demoAccess.value ? "Block demo sign-in" : "Allow demo sign-in",
              warning: summary.demoAccess.value
                ? "Demo clients will no longer be able to sign in on the live site."
                : "Demo clients will be able to sign in on the live site. Only enable this for a demo.",
              button: summary.demoAccess.value ? "Block" : "Allow",
              body: { action: "set_demo_access", enabled: !summary.demoAccess.value },
              onDone: () => setNotice("Demo sign-in setting saved."),
            })
          }
        >
          {summary.demoAccess.value ? "Turn off" : "Turn on"}
        </button>
      </div>

      <h3 className="mt-6 font-sans text-xs font-bold uppercase tracking-[0.14em]">Environment only</h3>
      <p className="mt-1 font-sans text-sm text-[#333333]">
        These are needed before the app can reach its database, so they can only be set in your hosting environment.
        The values are never shown here.
      </p>
      <ul className="mt-2 divide-y-2 divide-black border-y-2 border-black">
        {summary.env.map((e) => (
          <li key={e.name} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-mono text-sm font-bold">{e.name}</p>
              <p className="font-sans text-xs text-[#333333]">{e.note}</p>
            </div>
            <Chip tone={e.present ? "black" : "orange"}>{e.present ? "Set" : "Missing"}</Chip>
          </li>
        ))}
      </ul>

      <Modal open={pending !== null} onClose={closeConfirm} title={pending?.title ?? "Confirm"}>
        {pending && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <p className="font-sans text-sm leading-relaxed">{pending.warning}</p>
            <div>
              <label htmlFor={`${uid}-password`} className={labelClass}>
                Confirm with your password
              </label>
              <input
                id={`${uid}-password`}
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${uid}-error` : undefined}
                className={fieldClass}
              />
            </div>
            {error && (
              <p id={`${uid}-error`} role="alert" className="border-l-4 border-[#DD7230] bg-[#F8E3D6] px-3 py-2 font-sans text-sm font-semibold">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={closeConfirm}>
                Cancel
              </button>
              <button type="submit" className={btnDark} disabled={busy || password.length === 0}>
                {busy ? "Working…" : pending.button}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={issued !== null}
        dismissible={false}
        onClose={() => {
          if (!copied && !window.confirm("This code is shown only once and you have not copied it. Close anyway?")) return;
          setIssued(null);
        }}
        title={issued ? `New ${issued.role} invite code` : "Invite code"}
      >
        {issued && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed">
              Copy it now. It is stored only as a salted hash, so it cannot be shown again.
            </p>
            <label htmlFor={`${uid}-code`} className={labelClass}>
              Registration link
            </label>
            <input
              id={`${uid}-code`}
              readOnly
              value={`${typeof window === "undefined" ? "" : window.location.origin}/staff/register#code=${issued.code}`}
              onFocus={(e) => e.currentTarget.select()}
              className={fieldClass}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnPrimary} onClick={copy}>
                {copied ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  if (!copied && !window.confirm("This code is shown only once and you have not copied it. Close anyway?")) return;
                  setIssued(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  );
}
