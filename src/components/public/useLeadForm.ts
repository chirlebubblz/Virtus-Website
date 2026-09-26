"use client";

import { useCallback, useState } from "react";
import { markLeadSeen } from "./leadSeen";

export type LeadStatus = "idle" | "sending" | "sent";
export type LeadErrors = Partial<Record<"name" | "email" | "message", string>>;

export interface LeadValues {
  name?: string;
  email: string;
  message?: string;
}

/** Posts to /api/lead. `website` is the honeypot and stays empty for people. */
export function useLeadForm() {
  const [status, setStatus] = useState<LeadStatus>("idle");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = useCallback(async (values: LeadValues, honeypot: string) => {
    setStatus("sending");
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website: honeypot }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        markLeadSeen();
        setStatus("sent");
        return;
      }
      setStatus("idle");
      setErrors(data?.error?.fields ?? {});
      setFormError(
        data?.error?.fields ? null : data?.error?.message ?? "Something went wrong. Please try again."
      );
    } catch {
      setStatus("idle");
      setFormError("Could not reach the server. Check your connection and try again.");
    }
  }, []);

  return { status, errors, formError, submit };
}
