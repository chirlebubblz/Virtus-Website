"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { todayString } from "./format";

interface Clock {
  /** YYYY-MM-DD. Starts as the server's date so server and first client render agree, then becomes the viewer's. */
  today: string;
  /** Viewer's local hour, or null until mounted. Used so the greeting never differs between server and client. */
  hour: number | null;
  /** Epoch ms of the last data update, or null until mounted. */
  updatedAt: number | null;
  markUpdated: () => void;
}

const ClockContext = createContext<Clock>({ today: "", hour: null, updatedAt: null, markUpdated: () => undefined });

/**
 * Anything that depends on the current time (greeting, "days left", overdue, "updated 2 min ago") reads it from here.
 * Rendering it directly would differ between the server and the browser and break hydration.
 */
export function ClockProvider({ serverToday, children }: { serverToday: string; children: React.ReactNode }) {
  const [today, setToday] = useState(serverToday);
  const [hour, setHour] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    setToday(todayString());
    setHour(new Date().getHours());
    setUpdatedAt(Date.now());
  }, []);

  return (
    <ClockContext.Provider value={{ today, hour, updatedAt, markUpdated: () => setUpdatedAt(Date.now()) }}>
      {children}
    </ClockContext.Provider>
  );
}

export const useClock = () => useContext(ClockContext);
