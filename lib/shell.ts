"use client";

import { useEffect, useRef, useState } from "react";
import { EMAIL, RESUME_URL, PHONE, LINKEDIN } from "@/lib/site";

export const PROMPT = "➜";

/**
 * Every command returns the lines it prints. Async commands resolve to the
 * same shape, so the shell renders both without branching.
 */
export const COMMANDS: Record<string, () => string[] | Promise<string[]>> = {
  whoami: () => [
    "samuel molero — software engineer, new grad",
    "San Antonio, TX · backend & FullStack · open to offers",
  ],
  ls: () => ["resume.pdf", "card.vcf"],
  contact: () => [
    `email: ${EMAIL}`,
    `phone: ${PHONE}`,
    `linkedin: ${LINKEDIN}`,
  ],
  resume: () => ["one page, pdf →", `molero.dev${RESUME_URL}`],
  latest: () => {

    const tab = window.open("", "_blank", "noopener,noreferrer");
    return fetch("/api/latest-repo")
      .then((res) => res.json())
      .then(({ url }: { url: string }) => {
        if (tab) tab.location.href = url;
        return [`opening ${url}`];
      })
      .catch(() => {
        tab?.close();
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
export const SHELL_LINKS: Record<string, string> = {
  [`email: ${EMAIL}`]: `mailto:${EMAIL}`,
  [`phone: ${PHONE}`]: `tel:${PHONE.replace(/\D/g, "")}`,
  [`linkedin: ${LINKEDIN}`]: LINKEDIN,
  [`molero.dev${RESUME_URL}`]: RESUME_URL,
};

/**
 * Shared terminal state for the desktop and handset shells: the printed log,
 * the draft input, and the scroll pinning that keeps the newest line visible.
 */
export function useShell(initialLines: string[]) {
  const [lines, setLines] = useState(initialLines);
  const [draft, setDraft] = useState("");
  const screenRef = useRef<HTMLDivElement>(null);

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

    const output = handler();

    setLines((previous) => [...previous, echo]);
    Promise.resolve(output).then((result) => {
      setLines((previous) => [...previous, ...result]);
    });
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
