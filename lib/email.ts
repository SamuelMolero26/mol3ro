import { EMAIL } from "@/lib/site";

export const EMAIL_SUBJECT = "Let's work together";

export function getMailtoHref(email: string = EMAIL, subject: string = EMAIL_SUBJECT): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export function getGmailHref(email: string = EMAIL, subject: string = EMAIL_SUBJECT): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}`;
}

export function getOutlookHref(email: string = EMAIL, subject: string = EMAIL_SUBJECT): string {
  return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}`;
}

/**
 * Copy text to clipboard with a textarea fallback for older browsers / insecure contexts.
 * Returns true if the text was copied.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
