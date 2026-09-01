"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import { AquaButton } from "@/components/ui/AquaButton";
import { DockIcon } from "@/components/ui/DockIcon";
import { ResumeIcon } from "@/components/ui/icons";
import { Window, type ResizeDirection } from "@/components/ui/Window";
import { EMAIL, GITHUB_USER, RESUME_URL } from "@/lib/site";
import { COMMAND_NAMES, PROMPT, getShellLinkHref, useShell } from "@/lib/shell";

/* Single source: --breakpoint-desktop in styles/theme.css (fallback 900px). */
function getDesktopBreakpoint(): number {
  if (typeof window === "undefined") return 900;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--breakpoint-desktop")
    .trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 900 : parsed;
}

function desktopMatches(): boolean {
  return window.matchMedia(`(min-width: ${getDesktopBreakpoint()}px)`).matches;
}

const MIN_VISIBLE_WIDTH = 96;
const MIN_WINDOW_WIDTH = 280;
const MIN_WINDOW_HEIGHT = 180;

const WINDOW_IDS = ["readme", "shell", "resume", "github", "pr"] as const;

type WindowId = (typeof WINDOW_IDS)[number];

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowSize {
  width: number;
  height: number;
}

interface DesktopWindowState {
  isOpen: boolean;
  position: WindowPosition;
  size: WindowSize | null;
  zOrder: number;
}

type DesktopWindowStates = Record<WindowId, DesktopWindowState>;

const ORIGIN: WindowPosition = { x: 0, y: 0 };

const INITIAL_WINDOW_STATES: DesktopWindowStates = {
  readme: { isOpen: true, position: ORIGIN, size: null, zOrder: 1 },
  shell: { isOpen: false, position: ORIGIN, size: null, zOrder: 2 },
  resume: { isOpen: false, position: ORIGIN, size: null, zOrder: 3 },
  github: { isOpen: false, position: ORIGIN, size: null, zOrder: 4 },
  pr: { isOpen: false, position: ORIGIN, size: null, zOrder: 5 },
};

interface PointerSession {
  pointerId: number;
  windowId: WindowId;
  windowElement: HTMLElement;
  startPointer: WindowPosition;
  startPosition: WindowPosition;
  startRect: DOMRect;
  workspaceBounds: DOMRect;
  latestPosition: WindowPosition;
}

interface ResizeSession extends PointerSession {
  direction: ResizeDirection;
  latestSize: WindowSize;
}

function bringWindowToFront(
  windowStates: DesktopWindowStates,
  windowId: WindowId,
) {
  const windowState = windowStates[windowId];
  const highestOrder = Math.max(
    ...WINDOW_IDS.map((id) => windowStates[id].zOrder),
  );

  if (windowState.isOpen && windowState.zOrder === highestOrder) {
    return windowStates;
  }

  return {
    ...windowStates,
    [windowId]: { ...windowState, isOpen: true, zOrder: highestOrder + 1 },
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function calculateClampedPosition(
  currentPosition: WindowPosition,
  requestedPosition: WindowPosition,
  workspaceBounds: DOMRect,
  windowBounds: DOMRect,
) {
  const minimumX =
    currentPosition.x +
    workspaceBounds.left +
    MIN_VISIBLE_WIDTH -
    windowBounds.right;
  const maximumX =
    currentPosition.x +
    workspaceBounds.right -
    MIN_VISIBLE_WIDTH -
    windowBounds.left;
  const minimumY = currentPosition.y + workspaceBounds.top - windowBounds.top;
  // Keep the whole window above the footer: its bottom edge stops at the
  // workspace bottom rather than letting the body hang past it.
  const maximumY =
    currentPosition.y + workspaceBounds.bottom - windowBounds.bottom;

  return {
    x: Math.round(clamp(requestedPosition.x, minimumX, maximumX)),
    y: Math.round(clamp(requestedPosition.y, minimumY, maximumY)),
  };
}

function calculateResize(session: ResizeSession, event: ReactPointerEvent) {
  const { direction, startPosition, startRect, workspaceBounds } = session;
  const pointerOffsetX = event.clientX - session.startPointer.x;
  const pointerOffsetY = event.clientY - session.startPointer.y;

  let { width, height } = startRect;
  let { x, y } = startPosition;

  if (direction.includes("e")) {
    width = clamp(
      startRect.width + pointerOffsetX,
      MIN_WINDOW_WIDTH,
      workspaceBounds.right - startRect.left,
    );
  }
  if (direction.includes("w")) {
    width = clamp(
      startRect.width - pointerOffsetX,
      MIN_WINDOW_WIDTH,
      startRect.right - workspaceBounds.left,
    );
    x = startPosition.x + (startRect.width - width);
  }
  if (direction.includes("s")) {
    height = clamp(
      startRect.height + pointerOffsetY,
      MIN_WINDOW_HEIGHT,
      workspaceBounds.bottom - startRect.top,
    );
  }
  if (direction.includes("n")) {
    height = clamp(
      startRect.height - pointerOffsetY,
      MIN_WINDOW_HEIGHT,
      startRect.bottom - workspaceBounds.top,
    );
    y = startPosition.y + (startRect.height - height);
  }

  return {
    position: { x: Math.round(x), y: Math.round(y) },
    size: { width: Math.round(width), height: Math.round(height) },
  };
}

function constrainOpenWindows(
  windowStates: DesktopWindowStates,
  workspaceElement: HTMLElement,
) {
  if (!desktopMatches()) {
    return windowStates;
  }

  const workspaceBounds = workspaceElement.getBoundingClientRect();
  let nextWindowStates = windowStates;

  WINDOW_IDS.forEach((windowId) => {
    const windowState = windowStates[windowId];
    const windowElement = workspaceElement.querySelector<HTMLElement>(
      `[data-window-id="${windowId}"]`,
    );
    if (!windowState.isOpen || !windowElement) {
      return;
    }

    const position = calculateClampedPosition(
      windowState.position,
      windowState.position,
      workspaceBounds,
      windowElement.getBoundingClientRect(),
    );
    if (
      position.x === windowState.position.x &&
      position.y === windowState.position.y
    ) {
      return;
    }

    if (nextWindowStates === windowStates) {
      nextWindowStates = { ...windowStates };
    }
    nextWindowStates[windowId] = { ...windowState, position };
  });

  return nextWindowStates;
}

function windowStyle({ position, size, zOrder }: DesktopWindowState) {
  return {
    "--window-x": `${position.x}px`,
    "--window-y": `${position.y}px`,
    zIndex: zOrder,
    ...(size && { width: `${size.width}px`, height: `${size.height}px` }),
  } as CSSProperties;
}

/* "thu 19 aug   11:04" in the viewer's own locale-independent shape. */
function formatClock(date: Date) {
  const day = date
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(",", "")
    .toLowerCase();
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { day, time };
}

function TopBar() {
  /* Seeded from the render clock so there is no blank frame. On the server
     that is build time in UTC, which is why the <time> below suppresses the
     hydration warning — the first interval tick corrects it a second later. */
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const clock = formatClock(now);

  return (
    <header className="os-topbar os-titlebar">
      <div className="flex items-center gap-5">
        <span className="size-3 bg-accent" aria-hidden="true" />
        <strong className="tracking-heading">molero</strong>
        <nav aria-label="Desktop menu" className="flex items-center gap-5 text-text-muted">
          <span>file</span>
          <span>windows</span>
          <span>help</span>
        </nav>
      </div>
      <time
        dateTime={now.toISOString()}
        className="tabular-nums text-text-muted"
        suppressHydrationWarning
      >
        {`${clock.day}   ${clock.time}`}
      </time>
    </header>
  );
}

/* ── Window content ── */

function ReadmeContent() {
  return (
    <div className="readme">
      <h1 className="readme__name">
        Samuel
        <br />
        Molero
      </h1>
      <p className="readme__role">software engineer · new grad</p>
      <p className="readme__bio">
        Texas A&amp;M, Dec 2026. B.S. Industrial Distribution, minors in CS and
        statistics. Two internships at QTS Data Centers. Backend and infra. The
        shell below knows the rest.
      </p>
      <dl className="readme__facts">
        <div className="readme__fact">
          <dt>Location</dt>
          <dd>college station, tx</dd>
        </div>
        <div className="readme__fact">
          <dt>Stack</dt>
          <dd>go · python · aws</dd>
        </div>
        <div className="readme__fact">
          <dt>Status</dt>
          <dd className="is-accent">
            open to offers
            <span className="caret readme__caret" aria-hidden="true" />
          </dd>
        </div>
      </dl>
      <AquaButton
        href={`mailto:${EMAIL}?subject=Let%27s%20work%20together`}
        fullWidth
        className="readme__cta"
      >
        Continue to hire Samuel
      </AquaButton>
    </div>
  );
}

const SHELL_INITIAL_LINES = [
  `${PROMPT} whoami`,
  "samuel molero — software engineer, new grad",
  "San Antonio, TX · backend & FullStack · open to offers",
];

function ShellContent() {
  const { lines, draft, setDraft, submit, screenRef } = useShell(SHELL_INITIAL_LINES);

  return (
    <div className="shell">
      <div className="shell__scroll" ref={screenRef}>
        {lines.map((line, index) => {
          if (line.startsWith(PROMPT)) {
            return (
              <p key={`${index}-${line}`}>
                <span className="shell__sigil">{PROMPT}</span>
                &nbsp;
                {line.slice(PROMPT.length).trimStart()}
              </p>
            );
          }
          const href = getShellLinkHref(line);
          return (
            <p key={`${index}-${line}`} className="shell__wrap">
              {href ? (
                <a
                  className="shell__link"
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {line}
                </a>
              ) : (
                line
              )}
            </p>
          );
        })}
        <p className="shell__hint">{COMMAND_NAMES.join(" · ")}</p>
      </div>
      <form className="shell__prompt" onSubmit={submit}>
        <span className="shell__sigil" aria-hidden="true">
          {PROMPT}
        </span>
        <input
          className="shell__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Shell command"
          placeholder="type a command"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}


function ResumeContent() {
  return (
    <div className="resume">
      <iframe
        src={`${RESUME_URL}#view=FitH`}
        className="resume__frame"
        title="Resume"
      />
      <p className="resume__actions">
        <a href={RESUME_URL} download>
          Download PDF
        </a>
      </p>
    </div>
  );
}

function GithubContent() {
  return (
    <div className="github">
      <iframe
        src="/api/github-html"
        className="github__frame"
        loading="lazy"
        sandbox="allow-same-origin allow-popups"
        title="GitHub profile"
      />
    </div>
  );
}

function PrContent({ src }: { src: string | null }) {
  if (!src) {
    return (
      <div className="pr">
        <p className="pr__placeholder">Loading pull request…</p>
      </div>
    );
  }
  const iframeSrc = `/api/pr-html?url=${encodeURIComponent(src)}`;
  let title = "Latest pull request";
  try {
    const u = new URL(src);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 4) {
      title = `Latest pull request — ${parts[0]}/${parts[1]}#${parts[3]}`;
    }
  } catch {}
  return (
    <div className="pr">
      <iframe
        src={iframeSrc}
        className="pr__frame"
        loading="lazy"
        sandbox="allow-same-origin allow-popups"
        title={title}
      />
    </div>
  );
}

/* ── Dock glyphs ── */

function ReadmeGlyph() {
  return <span className="glyph-fill striped-surface" />;
}

function ShellGlyph() {
  return <span className="glyph-shell">&gt;_</span>;
}


function GithubGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function PrGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 6.5v2.2c0 1.1 0.7 1.9 1.9 1.9H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 9.5V6.8c0-1.1-0.7-1.9-1.9-1.9H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 5.5l1.2 1.2L8 8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface WindowDefinition {
  title: string;
  dockLabel: string;
  Glyph: () => ReactElement;
  Content: () => ReactElement;
}

const WINDOWS: Record<WindowId, WindowDefinition> = {
  readme: {
    title: "readme.txt",
    dockLabel: "readme.txt",
    Glyph: ReadmeGlyph,
    Content: ReadmeContent,
  },
  shell: {
    title: "— zsh — samuel@molero",
    dockLabel: "shell",
    Glyph: ShellGlyph,
    Content: ShellContent,
  },
  resume: {
    title: "resume.pdf",
    dockLabel: "resume.pdf",
    Glyph: ResumeIcon,
    Content: ResumeContent,
  },
  github: {
    title: `github — ${GITHUB_USER}`,
    dockLabel: "github",
    Glyph: GithubGlyph,
    Content: GithubContent,
  },
  pr: {
    title: "pull request",
    dockLabel: "pr",
    Glyph: PrGlyph,
    Content: () => <PrContent src={null} />,
  },
};

export function DesktopEnvironment() {
  const [windowStates, setWindowStates] = useState(INITIAL_WINDOW_STATES);
  const [prSrc, setPrSrc] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<PointerSession | null>(null);
  const resizeSessionRef = useRef<ResizeSession | null>(null);

  function openPrWindow(url: string) {
    setPrSrc(url);
    setWindowStates((current) => bringWindowToFront(current, "pr"));
  }

  function closeWindow(windowId: WindowId) {
    setWindowStates((current) => ({
      ...current,
      [windowId]: { ...current[windowId], isOpen: false },
    }));
  }

  function focusWindow(windowId: WindowId) {
    setWindowStates((current) => bringWindowToFront(current, windowId));
  }

  function toggleWindow(windowId: WindowId) {
    setWindowStates((current) => {
      const windowState = current[windowId];
      if (windowState.isOpen) {
        return {
          ...current,
          [windowId]: { ...windowState, isOpen: false },
        };
      }
      return bringWindowToFront(current, windowId);
    });
  }

  function openSession(
    windowId: WindowId,
    event: ReactPointerEvent<HTMLElement>,
  ): PointerSession | null {
    const workspaceElement = workspaceRef.current;
    const windowElement =
      event.currentTarget.closest<HTMLElement>("[data-window-id]");

    if (
      event.button !== 0 ||
      !workspaceElement ||
      !windowElement ||
      !desktopMatches()
    ) {
      return null;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const startPosition = windowStates[windowId].position;

    return {
      pointerId: event.pointerId,
      windowId,
      windowElement,
      startPointer: { x: event.clientX, y: event.clientY },
      startPosition,
      startRect: windowElement.getBoundingClientRect(),
      workspaceBounds: workspaceElement.getBoundingClientRect(),
      latestPosition: startPosition,
    };
  }

  function applyPosition(session: PointerSession, position: WindowPosition) {
    session.latestPosition = position;
    session.windowElement.style.setProperty("--window-x", `${position.x}px`);
    session.windowElement.style.setProperty("--window-y", `${position.y}px`);
  }

  function releasePointer(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function startDrag(windowId: WindowId, event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("[data-window-control]")) {
      return;
    }
    dragSessionRef.current = openSession(windowId, event);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    applyPosition(
      session,
      calculateClampedPosition(
        session.startPosition,
        {
          x: session.startPosition.x + event.clientX - session.startPointer.x,
          y: session.startPosition.y + event.clientY - session.startPointer.y,
        },
        session.workspaceBounds,
        session.startRect,
      ),
    );
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    dragSessionRef.current = null;
    releasePointer(event);
    setWindowStates((current) => ({
      ...current,
      [session.windowId]: {
        ...current[session.windowId],
        position: session.latestPosition,
      },
    }));
  }

  function startResize(
    windowId: WindowId,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const direction = event.currentTarget.dataset.resizeHandle as
      | ResizeDirection
      | undefined;
    const session = direction ? openSession(windowId, event) : null;
    if (!session || !direction) {
      return;
    }

    resizeSessionRef.current = {
      ...session,
      direction,
      latestSize: {
        width: session.startRect.width,
        height: session.startRect.height,
      },
    };
  }

  function moveResize(event: ReactPointerEvent<HTMLElement>) {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const { position, size } = calculateResize(session, event);
    session.latestSize = size;
    session.windowElement.style.width = `${size.width}px`;
    session.windowElement.style.height = `${size.height}px`;
    applyPosition(session, position);
  }

  function endResize(event: ReactPointerEvent<HTMLElement>) {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    resizeSessionRef.current = null;
    releasePointer(event);
    setWindowStates((current) => ({
      ...current,
      [session.windowId]: {
        ...current[session.windowId],
        position: session.latestPosition,
        size: session.latestSize,
      },
    }));
  }

  useEffect(() => {
    function handleResize() {
      const workspaceElement = workspaceRef.current;
      if (!workspaceElement) {
        return;
      }
      setWindowStates((current) =>
        constrainOpenWindows(current, workspaceElement),
      );
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleOpenPr(event: Event) {
      const detail = (event as CustomEvent<{ url: string }>).detail;
      if (!detail || typeof detail.url !== "string") return;
      openPrWindow(detail.url);
    }
    window.addEventListener("mol3ro:open-pr", handleOpenPr as EventListener);
    return () =>
      window.removeEventListener("mol3ro:open-pr", handleOpenPr as EventListener);
  }, []);

  return (
    <div className="app-texture flex h-dvh min-h-0 flex-col overflow-hidden">
      <TopBar />
      <div ref={workspaceRef} className="desktop-workspace">
        <aside className="desktop-dock" aria-label="Open files">
          {WINDOW_IDS.map((windowId) => {
            const { dockLabel, Glyph } = WINDOWS[windowId];
            return (
              <DockIcon
                key={windowId}
                label={dockLabel}
                active={windowStates[windowId].isOpen}
                controls={`window-${windowId}`}
                onClick={() => toggleWindow(windowId)}
              >
                <Glyph />
              </DockIcon>
            );
          })}
        </aside>

        {WINDOW_IDS.map((windowId) => {
          const windowState = windowStates[windowId];
          if (!windowState.isOpen) {
            return null;
          }

          const { title, Content } = WINDOWS[windowId];
          return (
            <Window
              key={windowId}
              windowId={windowId}
              title={title}
              className={`desktop-managed-window desktop-${windowId}`}
              style={windowStyle(windowState)}
              onClose={() => closeWindow(windowId)}
              onFocus={() => focusWindow(windowId)}
              drag={{
                onPointerDown: (event) => startDrag(windowId, event),
                onPointerMove: moveDrag,
                onPointerUp: endDrag,
                onPointerCancel: endDrag,
              }}
              resize={{
                onPointerDown: (event) => startResize(windowId, event),
                onPointerMove: moveResize,
                onPointerUp: endResize,
                onPointerCancel: endResize,
              }}
            >
              {windowId === "pr" ? <PrContent src={prSrc} /> : <Content />}
            </Window>
          );
        })}
      </div>
      <footer className="os-bottombar os-titlebar" />
    </div>
  );
}
