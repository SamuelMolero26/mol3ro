"use client";

import { useEffect, useRef, useState } from "react";
import { DOMAIN, EMAIL, RESUME_URL, PHONE, LINKEDIN } from "@/lib/site";

export const PROMPT = "➜";

export const PR_RE = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+\/?$/;

type OpenPrDetail = { url: string };

function getDesktopBreakpoint(): number {
  if (typeof window === "undefined") return 900;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--breakpoint-desktop")
    .trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 900 : parsed;
}

export function desktopMatches(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(min-width: ${getDesktopBreakpoint()}px)`).matches;
}

/**
 * Every command returns the lines it prints. Async commands resolve to the
 * same shape, so the shell renders both without branching.
 */
// Latest PR url cache — preloaded so `latest` can open synchronously in the
// user-gesture tick and avoid popup blockers. Falls back to blank-tab trick.
let cachedLatestUrl: string | null = null;
let latestFetchInFlight: Promise<string | null> | null = null;

function fetchLatestUrl(): Promise<string | null> {
  if (latestFetchInFlight) return latestFetchInFlight;
  latestFetchInFlight = fetch("/api/latest-repo")
    .then((res) => {
      if (!res.ok) throw new Error("bad response");
      return res.json() as Promise<{ url?: unknown }>;
    })
    .then((data) => {
      const url = data.url;
      if (typeof url === "string" && url) {
        cachedLatestUrl = url;
        return url;
      }
      throw new Error("bad url");
    })
    .catch(() => null)
    .finally(() => {
      latestFetchInFlight = null;
    });
  return latestFetchInFlight;
}

function preloadLatestUrl() {
  if (typeof window === "undefined") return;
  if (cachedLatestUrl || latestFetchInFlight) return;
  void fetchLatestUrl();
}



export const COMMANDS: Record<string, () => string[] | Promise<string[]>> = {
  whoami: () => [
    "samuel molero — software engineer, new grad",
    "College Station, TX · backend & full-stack · open to offers",
  ],
  ls: () => ["resume.pdf", "card.vcf"],
  contact: () => [
    `email: ${EMAIL}`,
    `phone: ${PHONE}`,
    `linkedin: ${LINKEDIN}`,
  ],
  resume: () => ["one page, pdf →", `${DOMAIN}${RESUME_URL}`],
  latest: () => {
    // Fast path: cached url can be opened synchronously, so popup blockers
    // see it as a user gesture. Keep the fetch in the background to refresh.
    if (cachedLatestUrl) {
      const url = cachedLatestUrl;
      if (PR_RE.test(url) && desktopMatches()) {
        try {
          window.dispatchEvent(
            new CustomEvent<OpenPrDetail>("mol3ro:open-pr", {
              detail: { url },
            }),
          );
        } catch {}
        void fetchLatestUrl();
        return [`opening ${url}`, url];
      }
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {}
      // refresh cache for next invocation
      void fetchLatestUrl();
      return [`opening ${url}`, url];
    }

    // Slow path: open a blank tab WITHOUT noopener so we keep a handle
    // and can navigate it after the async fetch. `noopener` would return
    // null and make `tab.location.href = url` impossible (see verbose
    // Playwright test: window.open with noopener always returns null).
    let tab: Window | null = null;
    try {
      tab = window.open("about:blank", "_blank");
    } catch {
      tab = null;
    }

    return fetchLatestUrl()
      .then((url) => {
        if (!url) throw new Error("no url");
        if (PR_RE.test(url) && desktopMatches()) {
          try {
            if (tab && !tab.closed) tab.close();
          } catch {}
          try {
            window.dispatchEvent(
              new CustomEvent<OpenPrDetail>("mol3ro:open-pr", {
                detail: { url },
              }),
            );
          } catch {}
          return [`opening ${url}`, url];
        }
        if (tab && !tab.closed) {
          tab.location.href = url;
        } else {
          try {
            window.open(url, "_blank", "noopener,noreferrer");
          } catch {}
        }
        return [`opening ${url}`, url];
      })
      .catch(() => {
        try {
          tab?.close();
        } catch {}
        return ["could not reach github, try again"];
      });
  },
  /* Registry entry only: run() wipes the log before dispatch, so this
     handler never fires. It exists to list `clear` in COMMAND_NAMES. */
  clear: () => [],
};

export const COMMAND_NAMES = Object.keys(COMMANDS);

/**
 * Printed lines that are really destinations. Both shells look a line up here
 * verbatim and wrap it in an anchor when it hits.
 *
 * ponytail: exact-match lookup, not a URL scanner — these lines are emitted by
 * COMMANDS, so they are known strings. Swap in a regex only if free-form text
 * ever needs linking.
 */
const SHELL_LINKS: Record<string, string> = {
  [`email: ${EMAIL}`]: `mailto:${EMAIL}`,
  [`phone: ${PHONE}`]: `tel:${PHONE.replace(/\D/g, "")}`,
  [`linkedin: ${LINKEDIN}`]: LINKEDIN,
  [`${DOMAIN}${RESUME_URL}`]: RESUME_URL,
};

export function getShellLinkHref(line: string): string | null {
  if (SHELL_LINKS[line]) return SHELL_LINKS[line];
  if (line.startsWith("https://") || line.startsWith("http://")) return line;
  return null;
}

/**
 * Shared terminal state for the desktop and handset shells: the printed log,
 * the draft input, and the scroll pinning that keeps the newest line visible.
 */
export function useShell(initialLines: string[]) {
  const [lines, setLines] = useState(initialLines);
  const [draft, setDraft] = useState("");
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    preloadLatestUrl();
  }, []);

  useEffect(() => {
    const screen = screenRef.current;
    if (screen) screen.scrollTop = screen.scrollHeight;
  }, [lines]);

  function run(command: string) {
    if (command === "clear") {
      setLines([]);
      return;
    }

    const echo = `${PROMPT} ${command}`;
    const handler = COMMANDS[command];

    if (!handler) {
      setLines((previous) => [
        ...previous,
        echo,
        `zsh: command not found: ${command}`,
        `try: ${COMMAND_NAMES.join(", ")}`,
      ]);
      return;
    }

    let output: string[] | Promise<string[]>;
    try {
      output = handler();
    } catch {
      setLines((previous) => [...previous, echo, "command failed — try again"]);
      return;
    }

    setLines((previous) => [...previous, echo]);
    Promise.resolve(output).then(
      (result) => {
        setLines((previous) => [...previous, ...result]);
      },
      () => {
        setLines((previous) => [...previous, "could not reach github, try again"]);
      },
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const command = draft.trim();
    if (!command) return;
    setDraft("");
    run(command);
  }

  return { lines, draft, setDraft, run, submit, screenRef };
}
