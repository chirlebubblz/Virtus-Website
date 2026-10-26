"use client";

import { useCallback, useEffect, useState } from "react";
import { leadPopupSuppressed, markLeadSeen } from "./leadSeen";

const FIRST_DELAY_MS = 10_000;
const REPEAT_DELAY_MS = 20_000;

/**
 * Opens after FIRST_DELAY_MS, then again REPEAT_DELAY_MS after each close, until the visitor submits a
 * lead form or closes the popup — closing marks the quiet period in leadSeen, so closing it once keeps it
 * gone for a week. `blocked` holds it back while another dialog is open.
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

  // Any close — X, ESC, backdrop, or the success screen's Close — starts the quiet period.
  const close = useCallback(() => {
    setOpen(false);
    markLeadSeen();
  }, []);

  return { open: open && !blocked, close };
}
