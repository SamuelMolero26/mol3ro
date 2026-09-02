"use client";

import { useEffect, useState } from "react";

/**
 * Shared wall clock for both shells. The desktop top bar and the handset
 * status bar print the same string, so the format lives here rather than
 * being duplicated per chrome.
 */
function formatClock(date: Date) {
  const day = date
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(",", "")
    .toLowerCase();
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { day, time };
}

/**
 * Seeded from the render clock so there is no blank frame. On the server that
 * is build time in UTC, so every <time> rendered from this must set
 * suppressHydrationWarning — the first interval tick corrects it a second later.
 */
export function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return { now, ...formatClock(now) };
}
