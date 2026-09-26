"use client";

import React, { useEffect, useId, useState } from "react";
import { Skeleton } from "./Skeleton";
import { Modal, Panel, btnDark, btnGhost, btnPrimary, fieldClass, labelClass } from "./ui";

type Action = "load" | "clear";

const COPY: Record<Action, { button: string; title: string; warning: string; done: string }> = {
  load: {
    button: "Load demo data",
    title: "Load demo data",
    warning:
      "Adds sample clients, leads, projects, tasks, invoices, bookings, contracts, proposals, media and emails. Your real records are not changed.",
    done: "Demo data loaded.",
  },
  clear: {
    button: "Remove demo data",
    title: "Remove demo data",
    warning:
      "Deletes the sample records only. Real clients, leads, invoices and everything you created stay exactly as they are.",
    done: "Demo data removed. Real data was not touched.",
  },
};

/** Admin only. Both actions need the admin's own password, checked on the server. */
export function DemoDataPanel() {
  const uid = useId();
  const [loaded, setLoaded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action | null>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demo/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setLoaded(body?.ok ? Boolean(body.data.loaded) : null))
      .catch(() => setLoaded(null))
      .finally(() => setLoading(false));
  }, []);

  const close = () => {
    setAction(null);
    setPassword("");
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setPassword("");
        setError(body?.error ?? "Something went wrong. Nothing was changed.");
        return;
      }
      setLoaded(Boolean(body.data.loaded));
      setNotice(COPY[action].done);
      close();
      // The views hold their own in-memory copy of the data, so reload to show what the server now has.
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      setError("Network error. Nothing was changed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel>
      <h2 className="font-monument text-base font-bold uppercase">Demo data</h2>
      <p className="mt-2 max-w-[62ch] font-sans text-sm leading-relaxed text-[#333333]">
        The workspace starts empty and holds only real data. Load sample records to demo the product, and remove them
        when you are done. Removing demo data never touches real records.
      </p>
      {loading ? (
        <Skeleton className="mt-3 h-5 w-44" />
      ) : (
        <p className="mt-3 font-sans text-sm font-bold">
          Status: {loaded === null ? "Unknown" : loaded ? "Demo data is loaded" : "No demo data"}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={loading || loaded === true}
          onClick={() => setAction("load")}
        >
          {COPY.load.button}
        </button>
        <button type="button" className={btnDark} disabled={loading || loaded === false} onClick={() => setAction("clear")}>
          {COPY.clear.button}
        </button>
      </div>

      {notice && (
        <p role="status" className="mt-4 border-l-4 border-[#FBD227] bg-black px-4 py-3 font-sans text-sm font-semibold text-white">
          {notice}
        </p>
      )}

      <Modal open={action !== null} onClose={close} title={action ? COPY[action].title : "Demo data"}>
        {action && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <p className="font-sans text-sm leading-relaxed">{COPY[action].warning}</p>
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
              <button type="button" className={btnGhost} onClick={close}>
                Cancel
              </button>
              <button type="submit" className={btnDark} disabled={pending || password.length === 0}>
                {pending ? "Working…" : COPY[action].button}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Panel>
  );
}
