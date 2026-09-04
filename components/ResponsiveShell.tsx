"use client";

import { useEffect, useState } from "react";
import { DesktopEnvironment } from "@/components/desktop/DesktopEnvironment";
import { MobileFrame } from "@/components/mobile/MobileFrame";

/**
 * Mounts only the visible shell after hydration to avoid running both
 * desktop + mobile trees (and their clocks/effects) simultaneously.
 * Server fallback renders both hidden to avoid hydration mismatch and
 * to keep first paint identical to the previous CSS-only swap.
 */
export function ResponsiveShell() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(m.matches);
    onChange();
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  if (isDesktop === null) {
    // SSR / initial hydration: match the old page.tsx output exactly
    return (
      <>
        <div className="md:hidden">
          <MobileFrame />
        </div>
        <div className="hidden md:block">
          <DesktopEnvironment />
        </div>
      </>
    );
  }

  return isDesktop ? <DesktopEnvironment /> : <MobileFrame />;
}
