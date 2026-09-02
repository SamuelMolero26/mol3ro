export function CardIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 6h11" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8.5 8.5h4M8.5 10.5h3.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function ShellIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 7l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* Shared: the handset's resume tab and the desktop dock draw the same sheet. */
export function ResumeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="2" width="10" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 6h6M5 8.2h6M5 10.4h4.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M9.2 2v3.2H12.2" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/* Career-fair primary action: recruiters connect from their phone on the spot. */
export function LinkedInIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 6.8v4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5" cy="4.9" r="0.85" fill="currentColor" />
      <path
        d="M7.7 11.2V6.8m0 1.3c.35-.85 1.1-1.3 1.95-1.3 1.05 0 1.75.7 1.75 1.95v2.45"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Repos tab: the proof-of-work surface, fed live from the GitHub API. */
export function ReposIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 2.5h6.2a1.3 1.3 0 0 1 1.3 1.3v9.7H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M3 11.7h8.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.4 5.2h4M5.4 7.4h2.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
