"use client";

import { useEffect, useState } from "react";
import { EMAIL } from "@/lib/site";
import { getGmailHref, getOutlookHref } from "@/lib/email";

type ToastDetail = {
  copied: boolean;
  email?: string;
};

export function GlobalEmailToast() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<boolean | null>(null);

  useEffect(() => {
    let hideTimer: number | null = null;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      setCopied(detail.copied);
      setVisible(true);
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 6000);
    };

    window.addEventListener("mol3ro:email-toast", handler as EventListener);
    return () => {
      window.removeEventListener("mol3ro:email-toast", handler as EventListener);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  const email = EMAIL;
  const gmailHref = getGmailHref(email);
  const outlookHref = getOutlookHref(email);

  return (
    <div
      role="status"
      aria-live="polite"
      className="email-toast"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="email-toast__head">
        <span className="email-toast__dot" aria-hidden="true" />
        <span className="email-toast__title">
          {copied ? "Email copied" : "Copy failed"}
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          className="email-toast__close"
          onClick={() => setVisible(false)}
        >
          ×
        </button>
      </div>

      <p className="email-toast__email">
        {email}
        {copied && <span className="email-toast__check"> ✓</span>}
      </p>

      <p className="email-toast__hint">
        {copied
          ? "No mail app? Open in Gmail or Outlook — your clipboard is ready to paste."
          : "Select and copy manually, or open directly in Gmail / Outlook."}
      </p>

      <div className="email-toast__actions">
        <a
          href={gmailHref}
          target="_blank"
          rel="noreferrer noopener"
          className="email-toast__action email-toast__action--primary"
        >
          Open in Gmail
        </a>
        <a
          href={outlookHref}
          target="_blank"
          rel="noreferrer noopener"
          className="email-toast__action"
        >
          Open in Outlook
        </a>
      </div>
    </div>
  );
}

export function showEmailToast(copied: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("mol3ro:email-toast", {
      detail: { copied },
    }),
  );
}
