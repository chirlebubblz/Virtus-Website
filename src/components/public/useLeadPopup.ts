"use client";

import { useCallback, useEffect, useState } from "react";
import { leadPopupSuppressed } from "./leadSeen";

const FIRST_DELAY_MS = 10_000;
const REPEAT_DELAY_MS = 20_000;

/**
 * Opens after FIRST_DELAY_MS, then again REPEAT_DELAY_MS after each close, until the visitor submits a
 * lead form (which sets the quiet period in leadSeen). `blocked` holds it back while another dialog is open.
 */
export function useLeadPopup(blocked: boolean) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (open || blocked) return;
    const timer = window.setTimeout(
      () => {
        if (leadPopupSuppressed()) return;
        setShown((n) => n + 1);
        setOpen(true);
      },
      shown === 0 ? FIRST_DELAY_MS : REPEAT_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [open, blocked, shown]);

  const close = useCallback(() => setOpen(false), []);

  return { open: open && !blocked, close };
}
