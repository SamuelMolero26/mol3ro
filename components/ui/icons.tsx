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
