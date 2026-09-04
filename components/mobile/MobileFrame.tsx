"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import Image from "next/image";
import { AquaButton } from "@/components/ui/AquaButton";
import { CardIcon, LinkedInIcon, ReposIcon, ResumeIcon, ShellIcon } from "@/components/ui/icons";
import {
  DOMAIN,
  EMAIL,
  FOCUS,
  GITHUB_URL,
  GITHUB_USER,
  GRADUATION,
  LINKEDIN,
  LOCATION,
  NAME,
  PHONE,
  RESUME_PREVIEW_URL,
  RESUME_URL,
  ROLE,
  SCHOOL,
} from "@/lib/site";
import { COMMAND_NAMES, PROMPT, getShellLinkHref, useShell } from "@/lib/shell";
import { useClock } from "@/lib/clock";
import type { ReposResponse, RepoSummary } from "@/lib/github";
import { copyToClipboard } from "@/lib/email";
import { showEmailToast } from "@/components/ui/GlobalEmailToast";

type CopyStatus = "copied" | "failed" | null;
type TabId = "card" | "repos" | "shell" | "resume";
interface TabDefinition {
  id: TabId;
  label: string;
  title: string;
  Icon: () => ReactElement;
}

const TABS: readonly TabDefinition[] = [
  { id: "card", label: "card", title: "card.vcf", Icon: CardIcon },
  { id: "repos", label: "repos", title: `github/${GITHUB_USER}`, Icon: ReposIcon },
  { id: "shell", label: "shell", title: `zsh — ${DOMAIN}`, Icon: ShellIcon },
  { id: "resume", label: "resume", title: "resume.pdf", Icon: ResumeIcon },
] as const;

function StatusBar() {
  /* Same clock as the desktop top bar. suppressHydrationWarning because the
     server renders build-time UTC; the first interval tick corrects it. */
  const { now, day, time } = useClock();

  return (
    <div className="mobile-statusbar os-titlebar">
      <span className="mobile-statusbar__signal" aria-label="AT&T 3G signal">
        <span className="mobile-statusbar__bar" />
        <span className="mobile-statusbar__bar" />
        <span className="mobile-statusbar__bar" />
        <span className="mobile-statusbar__bar" />
        <span className="mobile-statusbar__bar" />
        <span className="mobile-statusbar__carrier">AT&amp;T&nbsp; 3G</span>
      </span>
      <time dateTime={now.toISOString()} suppressHydrationWarning>
        {`${day}   ${time}`}
      </time>
      <span className="mobile-statusbar__battery" aria-label="Battery full">
        <span />
      </span>
    </div>
  );
}

function MobileWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mobile-window">
      <header className="mobile-window__titlebar os-titlebar">
        <span className="mobile-window__control" aria-hidden="true">
          ×
        </span>
        <h2 className="mobile-window__title">{title}</h2>
      </header>
      <div className="mobile-window__body">{children}</div>
    </section>
  );
}

function ContactCard({
  copyStatus,
  onCopy,
  onEmailClick,
  onSave,
}: {
  copyStatus: CopyStatus;
  onCopy: () => void;
  onEmailClick: () => void;
  onSave: () => void;
}) {
  const copyLabel =
    copyStatus === "copied"
      ? "Email copied"
      : copyStatus === "failed"
        ? "Copy failed"
        : "Copy email";

  return (
    <div className="mobile-card">
      <article className="mobile-card__face">
        <div className="mobile-card__head">
          <span>{PHONE}</span>
          <span>{ROLE}</span>
        </div>
        <div className="mobile-card__identity">
          <h3 className="mobile-card__name">{NAME}</h3>
          <p className="mobile-card__school">{SCHOOL}</p>
        </div>
        <p className="mobile-card__meta">
          <button
            type="button"
            onClick={onEmailClick}
            className="mobile-card__email"
            aria-label={`Copy email ${EMAIL}`}
          >
            {EMAIL}
          </button>
          <span aria-hidden="true"> · {LOCATION}</span>
        </p>
      </article>
      <div className="mobile-card__actions">
        <button
          type="button"
          onClick={onSave}
          className="mobile-secondary mobile-card__action"
        >
          Save contact
        </button>
        <button
          type="button"
          onClick={onCopy}
          aria-live="polite"
          className="mobile-secondary mobile-card__action"
        >
          {copyLabel}
        </button>
      </div>
    </div>
  );
}


type ReposState =
  | { status: "loading" }
  | { status: "ready"; repos: RepoSummary[] }
  | { status: "empty" }
  | { status: "failed" };

function ReposTab() {
  /* Starts in "loading" rather than setting it inside the effect — a sync
     setState in an effect body is a cascading render (react-hooks lint). */
  const [state, setState] = useState<ReposState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/repos")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch repos");
        return (await res.json()) as Partial<ReposResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.ok === false) return setState({ status: "failed" });
        const repos = data.repos ?? [];
        setState(repos.length ? { status: "ready", repos } : { status: "empty" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status !== "ready") {
    return (
      <div className="mobile-repos mobile-repos--message">
        <p className="mobile-repos__note">
          {state.status === "failed"
            ? "could not reach github"
            : state.status === "empty"
              ? "no public repos yet"
              : "fetching repos…"}
        </p>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="mobile-secondary mobile-repos__all"
        >
          Open GitHub profile
        </a>
      </div>
    );
  }

  return (
    <div className="mobile-repos">
      <ul className="mobile-repos__list">
        {state.repos.map((repo) => (
          <li key={repo.name}>
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mobile-repo"
            >
              <span className="mobile-repo__name">{repo.name}</span>
              {repo.description && (
                <span className="mobile-repo__desc">{repo.description}</span>
              )}
              <span className="mobile-repo__meta">
                {repo.language && <span>{repo.language}</span>}
                {repo.stars > 0 && <span>★ {repo.stars}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="mobile-secondary mobile-repos__all"
      >
        Full Profile
      </a>
    </div>
  );
}

const INITIAL_LINES = [
  `${PROMPT} whoami`,
  `${NAME.toLowerCase()} — ${ROLE.toLowerCase()}, ${GRADUATION.toLowerCase()} grad`,
  `commands: ${COMMAND_NAMES.join(" · ")}`,
];

function ShellTab() {
  const { lines, draft, setDraft, submit, screenRef } = useShell(INITIAL_LINES);

  function renderLine(line: string, index: number) {
    if (line.startsWith(PROMPT)) {
      return (
        <p key={`${index}-${line}`}>
          <span className="shell__sigil">{PROMPT}</span>
          {line.slice(PROMPT.length)}
        </p>
      );
    }

    const href = getShellLinkHref(line);
    if (!href) {
      return <p key={`${index}-${line}`}>{line}</p>;
    }

    const isEmail = href.startsWith("mailto:");
    const isExternal = href.startsWith("https://");

    return (
      <p key={`${index}-${line}`}>
        <a
          className="shell__link"
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer noopener" : undefined}
          onClick={
            isEmail
              ? (e) => {
                  e.preventDefault();
                  void (async () => {
                    let copied = false;
                    try {
                      copied = await copyToClipboard(EMAIL);
                    } catch {
                      copied = false;
                    }
                    showEmailToast(copied);
                    try {
                      window.location.href = href;
                    } catch {}
                  })();
                }
              : undefined
          }
        >
          {line}
        </a>
      </p>
    );
  }

  return (
    <div className="mobile-shell">
      <div className="mobile-shell__screen" ref={screenRef}>
        {lines.map((line, index) => renderLine(line, index))}
      </div>
      <form className="mobile-shell__prompt" onSubmit={submit}>
        <span className="shell__sigil" aria-hidden="true">
          {PROMPT}
        </span>
        <input
          className="mobile-shell__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Shell command"
          placeholder="type a command"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
        />
      </form>
    </div>
  );
}

function ResumeTab() {
  return (
    <div className="mobile-resume">
      {/* Static first-page render: iOS Safari will not display a PDF in an
          iframe, so a recruiter would otherwise see an empty box. */}
      <a
        href={RESUME_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="mobile-resume__preview"
      >
        <Image
          src={RESUME_PREVIEW_URL}
          alt={`${NAME} resume, page 1`}
          className="mobile-resume__page"
          width={772}
          height={1000}
          loading="lazy"
          sizes="(max-width: 560px) 94vw, 560px"
        />
      </a>
      <a
        href={RESUME_URL}
        download
        className="mobile-secondary mobile-resume__download"
      >
        Download PDF
      </a>
    </div>
  );
}

export function MobileFrame() {
  const [active, setActive] = useState<TabId>("card");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const activeTab = TABS.find((tab) => tab.id === active) ?? TABS[0];

  const copyEmail = useCallback(async () => {
    let ok = false;
    try {
      ok = await copyToClipboard(EMAIL);
    } catch {
      ok = false;
    }
    setCopyStatus(ok ? "copied" : "failed");
    showEmailToast(ok);
    // reset label after a beat so the button is reusable
    window.setTimeout(() => setCopyStatus(null), 2500);
  }, []);

  const handleEmailClick = useCallback(async () => {
    let ok = false;
    try {
      ok = await copyToClipboard(EMAIL);
    } catch {
      ok = false;
    }
    setCopyStatus(ok ? "copied" : "failed");
    showEmailToast(ok);
    window.setTimeout(() => setCopyStatus(null), 2500);
  }, []);

  const saveContact = useCallback(() => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${NAME}`,
      `ORG:${SCHOOL}`,
      `TITLE:${ROLE}`,
      `EMAIL:${EMAIL}`,
      `TEL;TYPE=CELL:${PHONE}`,
      `URL:${LINKEDIN}`,
      `URL:${GITHUB_URL}`,
      `ADR:;;;${LOCATION.replace(", ", ";")};;United States`,
      `NOTE:${FOCUS} · ${SCHOOL} · graduating ${GRADUATION}`,
      "END:VCARD",
    ].join("\r\n");

    const triggerBlobDownload = () => {
      const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      // iOS Safari ignores the download attribute — opening the blob lets the
      // system preview the vCard and offer "Create New Contact" / "Add to Existing".
      // Must stay synchronous with the user gesture, so no setTimeout before window.open.
      if (isIOS) {
        try {
          window.open(url, "_blank");
        } catch {
          window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "samuel-molero.vcf";
      anchor.rel = "noopener";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      // Keep URL alive briefly so the download can start, then clean up.
      setTimeout(() => {
        try {
          document.body.removeChild(anchor);
        } catch {}
        URL.revokeObjectURL(url);
      }, 1500);
    };

    // Best UX on mobile: system share sheet with a real .vcf file — iOS/Android
    // show "Add to Contacts" / "Save to Files" directly. Requires a user gesture.
    try {
      const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
      const file = new File([blob], "samuel-molero.vcf", { type: "text/vcard" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData & { files?: File[] }) => boolean;
        share?: (data: ShareData & { files?: File[] }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        void nav
          .share({ files: [file], title: NAME, text: `${ROLE} — ${SCHOOL}` })
          .catch((err: unknown) => {
            // User dismissal (AbortError) should not trigger a download
            const name =
              err && typeof err === "object" && "name" in err
                ? (err as { name?: string }).name
                : null;
            if (name !== "AbortError") triggerBlobDownload();
          });
        return;
      }
    } catch {
      // fall through to blob download
    }

    triggerBlobDownload();
  }, []);

  return (
    <div className="app-texture phone-stage">
      <div className="phone-shell">
        <div className="phone-bezel">
          <div className="phone-earpiece">
            <span className="phone-speaker__sensor" aria-hidden="true" />
            <span className="phone-speaker" aria-hidden="true">
              <span className="phone-speaker__mesh" aria-hidden="true" />
            </span>
          </div>
          <div className="phone-screen">
            <StatusBar />
            <div className="mobile-brand os-titlebar">
              <strong className="mobile-brand__name">
                <span className="mobile-brand__dot" aria-hidden="true" />
                molero
              </strong>
            </div>
            <nav aria-label="Portfolio sections" className="mobile-tabs striped-surface">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  aria-pressed={active === tab.id}
                  className="mobile-tab"
                >
                  <span className="mobile-tab__tile">
                    <tab.Icon />
                  </span>
                  <span className="mobile-tab__label">{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="mobile-stage">
              <MobileWindow title={activeTab.title}>
                {active === "card" && (
                  <ContactCard
                    copyStatus={copyStatus}
                    onCopy={copyEmail}
                    onEmailClick={handleEmailClick}
                    onSave={saveContact}
                  />
                )}
                {active === "repos" && <ReposTab />}
                {active === "shell" && <ShellTab />}
                {active === "resume" && <ResumeTab />}
              </MobileWindow>
              {/* Persistent across every tab: at a career fair the recruiter is
                  holding their own phone and wants to connect before walking away. */}
              <div className="mobile-cta-slot">
                <AquaButton
                  fullWidth
                  href={LINKEDIN}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mobile-cta"
                >
                  <span className="mobile-cta__icon" aria-hidden="true">
                    <LinkedInIcon />
                  </span>
                  Connect on LinkedIn
                </AquaButton>
              </div>
            </div>
          </div>
          <div className="phone-home-row">
            <span className="phone-home-button" aria-hidden="true">
              <span className="phone-home-button__icon" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
