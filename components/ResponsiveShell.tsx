"use client";

import { useSyncExternalStore } from "react";
import { DesktopEnvironment } from "@/components/desktop/DesktopEnvironment";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { DESKTOP_MEDIA_QUERY, desktopMatches } from "@/lib/responsive";

function subscribeToDesktopQuery(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getServerSnapshot(): null {
  return null;
}

/**
 * Mounts only the shell selected by the shared desktop query — but not before
 * hydration. React uses the server snapshot for both the server render and the
 * hydration render, so the null branch below is what lands in the static HTML:
 * both shells, real content, with CSS picking the visible one. After hydration
 * the query resolves and a single tree stays mounted.
 *
 * Do not switch these to `ssr: false` dynamic imports. It drops the page's
 * entire server-rendered content, which on a portfolio is the whole point.
 */
export function ResponsiveShell() {
  const isDesktop = useSyncExternalStore<boolean | null>(
    subscribeToDesktopQuery,
    desktopMatches,
    getServerSnapshot,
  );

  if (isDesktop === null) {
    return (
      <>
        <div className="shell-ssr-mobile">
          <MobileFrame />
        </div>
        <div className="shell-ssr-desktop">
          <DesktopEnvironment />
        </div>
      </>
    );
  }

  return isDesktop ? <DesktopEnvironment /> : <MobileFrame />;
}
