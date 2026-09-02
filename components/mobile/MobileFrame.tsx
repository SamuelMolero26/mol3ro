"use client";

import { useState, type ReactElement } from "react";
import { AquaButton } from "@/components/ui/AquaButton";
import { CardIcon, ResumeIcon, ShellIcon } from "@/components/ui/icons";
import { EMAIL, GITHUB_URL, RESUME_URL } from "@/lib/site";
import { COMMAND_NAMES, PROMPT, getShellLinkHref, useShell } from "@/lib/shell";

type CopyStatus = "copied" | "failed" | null;
type TabId = "card" | "shell" | "resume";

interface TabDefinition {
  id: TabId;
  label: string;
  title: string;
  Icon: () => ReactElement;
}

const TABS: readonly TabDefinition[] = [
  { id: "card", label: "card", title: "card.vcf", Icon: CardIcon },
  { id: "shell", label: "shell", title: "zsh — molero.dev", Icon: ShellIcon },
  { id: "resume", label: "resume", title: "resume.pdf", Icon: ResumeIcon },
] as const;

function StatusBar() {
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
      <time dateTime="09:41">9:41 AM</time>
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
  onSave,
}: {
  copyStatus: CopyStatus;
  onCopy: () => void;
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
          <span>
            347 555
            <br />
            0182
          </span>
        </div>
        <div className="mobile-card__identity">
          <h3 className="mobile-card__name">Samuel Molero</h3>
          <p className="mobile-card__role">
            Software Engineer · New Grad
            <br />
            2026
          </p>
        </div>
        <p className="mobile-card__meta">
          {EMAIL} · College Station, TX.
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

const INITIAL_LINES = [
  `${PROMPT} resume`,
  "one page, pdf →",
  `molero.dev${RESUME_URL}`,
];

function ShellTab() {
  const { lines, draft, setDraft, run, submit, screenRef } = useShell(INITIAL_LINES);

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

    return (
      <p key={`${index}-${line}`}>
        <a className="shell__link" href={href} target="_blank" rel="noreferrer noopener">
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
      <div className="mobile-shell__chips">
        {COMMAND_NAMES.map((command) => (
          <button
            key={command}
            type="button"
            onClick={() => run(command)}
            className="mobile-secondary mobile-shell__chip"
          >
            {command}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResumeTab() {
  return (
    <div className="mobile-resume">
      <div className="resume-stripes mobile-resume__preview">
        <p className="mobile-resume__caption">1 page · pdf preview</p>
      </div>
      <a
        href={RESUME_URL}
        download
        className="mobile-secondary mobile-resume__download"
      >
        Download resume
      </a>
    </div>
  );
}

export function MobileFrame() {
  const [active, setActive] = useState<TabId>("card");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const activeTab = TABS.find((tab) => tab.id === active) ?? TABS[0];

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  const saveContact = () => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Samuel Molero",
      "ORG:Molero Systems",
      "TITLE:Software Engineer",
      `EMAIL:${EMAIL}`,
      `URL:${GITHUB_URL}`,
      "ADR:;;;College Station, TX;;;United States",
      "END:VCARD",
    ].join("\r\n");
    const anchor = document.createElement("a");
    anchor.href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;
    anchor.download = "samuel-molero.vcf";
    anchor.click();
  };

  const contactSamuel = () => {
    window.location.href = `mailto:${EMAIL}?subject=Let%27s%20work%20together`;
  };

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
              <span className="mobile-brand__context">{activeTab.title}</span>
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
                    onSave={saveContact}
                  />
                )}
                {active === "shell" && <ShellTab />}
                {active === "resume" && <ResumeTab />}
              </MobileWindow>
              <div className="mobile-cta-slot">
                <AquaButton fullWidth onClick={contactSamuel} className="mobile-cta">
                  Continue to hire Samuel
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
