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
    let timerId: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timerId !== null) return;
      timerId = setInterval(() => setNow(new Date()), 1000);
    }

    function stop() {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    // Throttle when tab is not visible — both MobileFrame and
    // DesktopEnvironment mount simultaneously, so two intervals would
    // otherwise tick while hidden.
    function handleVisibility() {
      if (document.hidden) {
        stop();
      } else {
        setNow(new Date());
        start();
      }
    }

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return { now, ...formatClock(now) };
}
