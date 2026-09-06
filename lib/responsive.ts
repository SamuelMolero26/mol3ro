// Keep this value aligned with --breakpoint-desktop in styles/theme.css.
export const DESKTOP_MEDIA_QUERY = "(min-width: 900px)";

export function desktopMatches(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  );
}
