# Exploration: Desktop inline PR window for `latest` command

## Current State

`lib/shell.ts` owns the terminal core: `COMMANDS` map + `useShell` hook. `latest` fetches `GET /api/latest-repo` (revalidate 3600) — first tries `GET https://api.github.com/search/issues?q=author:SamuelMolero26+type:pr` (most recent PR, currently `https://github.com/mark3labs/mcp-go/pull/966`), fallback to `GET /users/:user/repos?sort=pushed`, fallback to `https://github.com/<user>`. Result is cached in `cachedLatestUrl`; `preloadLatestUrl()` warms it from `useShell` mount.

Popup-blocker handling is already solved: fast path (`cachedLatestUrl` present) calls `window.open(url, "_blank", "noopener,noreferrer")` synchronously inside the user-gesture tick; slow path opens a blank tab (`window.open("about:blank","_blank")` without `noopener` to retain handle) then navigates `tab.location.href = url` after fetch. Both Desktop `ShellContent` and mobile `ShellTab` share this — `COMMANDS` contract is `() => string[] | Promise<string[]>` and `useShell.run()` renders `opening <url>` + bare URL (auto-linked via `getShellLinkHref` exact + `https://` prefix).

Desktop WM is `components/desktop/DesktopEnvironment.tsx` (716 LOC, `precision: syntactic` graph). Windows are data-registered: `WINDOW_IDS = ["readme","shell","resume","github"] as const` types `WindowId`; `WINDOWS: Record<WindowId, WindowDefinition>` supplies title/dockLabel/Glyph/Content; `INITIAL_WINDOW_STATES` defines isOpen/position/size/zOrder; `bringWindowToFront` bumps zOrder; `toggleWindow`/`closeWindow`/`focusWindow` manage lifecycle. Drag/resize are DOM-direct: `applyPosition` sets `--window-x/--window-y`, `moveResize` sets `width`/`height` on element; state committed only on pointer-up (deliberate — do NOT refactor to setState per move). Gated on `desktopMatches()` reading `--breakpoint-desktop` (900px) from `styles/theme.css` — duplicated value.

Github window: `function GithubContent()` renders `<iframe src="/api/github-html" sandbox="allow-same-origin allow-popups" loading="lazy" class="github__frame">`. `app/api/github-html/route.ts` scrapes `GITHUB_URL`, resolves the single `<include-fragment>` for the contribution calendar server-side, strips **all** `<script>` tags (GitHub bundle would fire same-origin requests against this site and trigger its error boundary), and injects `<base href="https://github.com/" target="_blank">`. `Content-Type: text/html; Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, `revalidate=3600`. Inherently fragile — breaks on GitHub markup changes (flagged in `openspec/config.yaml`).

Both surfaces mount simultaneously (`app/page.tsx`: `md:hidden` / `hidden md:block` visibility swap, not conditional render). Any new desktop-only side effect must be idempotent and must not fire from the hidden mobile tree.

No test runner, no CI, `strict_tdd: false` (`npm run build` is verify).

### Affected Areas

- `lib/shell.ts` — `latest` handler and `preloadLatestUrl`/`fetchLatestUrl`. Must gain desktop detection and either return structured action or emit event so WM can open inline window without breaking mobile new-tab behavior or the sync `window.open` invariant. `COMMANDS` contract change ripples to both chromes.
- `components/desktop/DesktopEnvironment.tsx` — add new `WindowId` (`"pr"` or `"latest"`), entry in `WINDOWS`, `INITIAL_WINDOW_STATES`, dock glyph, CSS placement, focus/open logic, and a listener/callback that opens the window on `latest` and injects the PR URL into the iframe src (`/api/pr-html?url=…`). Estimated +60–90 LOC plus new `PrContent` component.
- `components/ui/Window.tsx` — no logic change; verify `Window` frame still fits PR content (white-bg iframe vs current `github` style). May need `github__frame` reuse or `pr__frame` variant.
- `styles/desktop.css` — add `.desktop-pr` absolute placement (`inset`/`width`/`height` inside `@media (width >= 900px)`), ensure `.desktop-managed-window` transform still applies. Also ensure `.desktop-dock` z-order remains below windows.
- `styles/windows.css` — add `.pr` / `.pr__frame` styles (likely copy of `.github` / `.github__frame` with `background:#fff`, `flex:1`, scroll handling). Keep tokens in `styles/theme.css` if new sizes introduced.
- `app/api/github-html/route.ts` — reference implementation to copy. No change required, but note as pattern source.
- `app/api/pr-html/route.ts` (new) — proxy for PR HTML. Needs URL validation (allow only `https://github.com/<owner>/<repo>/pull/<n>`), optional `GITHUB_TOKEN` passthrough, script stripping, `<base>` injection, `<include-fragment>` resolution (PR pages use fragments for e.g. timeline, checks), caching (`revalidate=3600`, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`), 500 fallback HTML, size limit.
- `app/api/latest-repo/route.ts` — already returns PR URL; no change, but `pr-html` will reuse its output. Rate-limit concern shared: Search API is 10 req/min unauth, 30 req/min with token; html scrape is unauthenticated and not rate-counted against API quota.
- `lib/site.ts` — no change unless adding `PR_URL` constant or icon; otherwise just consumes `GITHUB_USER`.
- `components/mobile/MobileFrame.tsx` — **must stay unchanged** (out of scope). Verify `useShell` change does not break mobile chips (`COMMAND_NAMES` auto-generates tap chip per key).
- `app/globals.css` / `styles/theme.css` — if new tokens or breakpoint usage needed, update there (never inline literals).

## Approaches

### 1. New desktop window with iframe proxy (`/api/pr-html?url=…`) — recommended candidate

Add `WindowId = "pr"` (or `"latest"`), `PrContent` iframe pointing at new API route that proxies the PR HTML like `github-html` does. `latest` on desktop opens/focuses this window and sets its iframe src to `/api/pr-html?url=<encoded PR url>`; on mobile it keeps `window.open`. Desktop still prints `opening <url>` + clickable bare URL so user can “pop out” to GitHub. Optionally also warm the PR html via `<link rel="preload">` after `preloadLatestUrl`.

- Pros: Reuses proven pattern (`github` window + `github-html` proxy) so WM integration is mechanical (tuple + record + INITIAL states + bringWindowToFront + dock icon). Stays inside OS metaphor — draggable, resizable, z-ordered, `sandbox="allow-same-origin allow-popups"` consistent. Mobile impact zero (window hidden via CSS breakpoint; `DesktopEnvironment` not rendered visibly but still mounts — so guard desktop detection inside handler). Accessible if iframe gets `title="Latest pull request"` + window `aria-labelledby`. Caching aligns with existing 3600s ISR. No new npm deps.
- Cons: Inherits `github-html` fragility: full HTML scrape, script stripping may mangle PR page (comments, diff, checks rely on JS; timeline fragments stripped). Payload is large (~300–600 KB HTML). `<base href>` trick can leak relative links. Rate unfriendly if many users scrape concurrently (no API quota but GitHub may throttle scraper). Requires URL allowlist validation to avoid open proxy (SSRF). No offline degrade beyond 500 HTML.
- Effort: **Medium** — new API route (~70 LOC, copy + harden `github-html`), WM registration (~30 LOC), `PrContent` (~25 LOC), CSS placement (~12 LOC), `lib/shell.ts` desktop hook (~25 LOC), wiring desktop detection + event/context (~20 LOC). Fits in one PR under 400-line budget (forecast: ~180 authored lines).
- Tradeoffs deep dive:
  - *Fragility*: Same as `github-html` but PR pages are heavier and change more often than profile pages. Contribution calendar had 1 fragment; PR page may have multiple `<include-fragment>` and Turbo Frames. Current `github-html` only handles one fragment via regex — PR proxy should loop over all fragments or fetch PR timeline via API if needed. Consider also stripping `<link rel="stylesheet">` that points to GitHub assets — they load cross-origin fine with base href, but CSP may block.
  - *Security*: Iframe `sandbox` must NOT include `allow-scripts` (scripts already stripped). `allow-same-origin` is required for `<base>` + asset loading, but means embedded GitHub HTML is same-origin with iframe itself — still isolated from parent. Must NOT add `allow-top-navigation` (prevents frame busting). Validate `url` param against `^https://github\.com/[^/]+/[^/]+/pull/\d+/?$` and reject otherwise (prevent proxy abuse). Consider `X-Frame-Options` — we bypass it because we re-host HTML, but we still send `Content-Security-Policy: frame-ancestors 'self'` from the API if needed.
  - *Performance*: Iframe `loading="lazy"` + `src` set only when window opened (not at mount) avoids cost for users who never run `latest`. Cache `revalidate=3600` on both `latest-repo` and `pr-html` so repeated opens hit CDN. Consider prefetching PR HTML after `preloadLatestUrl` resolves on desktop only (one extra fetch, acceptable).
  - *Mobile impact*: Zero if guarded. But both Desktop and Mobile mount — `lib/shell.ts` cannot call `window.matchMedia` at module init; must check inside handler after confirming `typeof window !== "undefined"` and `desktopMatches()`. Otherwise mobile tree would also try to open a window that doesn't exist visually.
  - *WM integration*: New `WINDOW_IDS` entry auto-creates dock icon; choose glyph distinct from `GithubGlyph` (e.g. `GitPullRequest` icon). Placement: avoid overlapping `github` default (`22% auto auto 20%, 60%x60%`). Propose `inset: 16% auto auto 28%, width: 52%, height: 62%` with higher initial `zOrder` so it opens on top. `Window` frame handles drag/resize identically — no WM invariant change.

### 2. Reuse existing `github` window to show PR (navigate its iframe)

Keep `WINDOW_IDS` unchanged; `latest` on desktop sets the existing github iframe’s `src` to `/api/pr-html?url=…` (or plain `prUrl` with direct proxy) and focuses that window. Add a “Back to profile” affordance (small link or secondary button) that resets src to `/api/github-html`.

- Pros: No new window, zero dock bloat, minimal CSS. Still inline.
- Cons: Destroys user’s profile view (if they had it open, it’s replaced). History confusion — closing the window loses context. Requires mutable iframe ref/ state that cuts across `GithubContent` (currently stateless). If user toggled github closed, open + navigate is same cost as new window but with information loss. Harder to reason about : profile vs PR are conceptually different documents. Also forces all `github` window consumers to handle two modes.
- Effort: **Low-Medium** (~80 LOC: ref + state lift, message/event wiring).
- Verdict: Viable quick-win but degrades window semantics. Not recommended as final unless dock space is critical.

### 3. Current behavior only — new tab + enhanced shell link (no inline window)

Keep `window.open` for both surfaces. Optionally improve shell output: render clickable `opening <url>` with distinct styling, add `OPEN_IN_GITHUB` action link, or add `⌘+click` hint. No proxy, no iframe.

- Pros: Zero fragility, zero maintenance, bypasses all CSP/iframe/sandbox issues, no SSRF proxy, no caching complexity, no WM changes, keeps mobile and desktop identical (simpler mental model).
- Cons: Fails the stated design goal — desktop stays “browser tab” UX instead of OS window. Misses opportunity to showcase inline integration. Still subject to popup blockers on slow path (though already fixed). No visual delight.
- Effort: **Low** (~5 LOC).
- Verdict: Rejected as sole solution (does not satisfy user intent) but keep as fallback: inline window should still emit clickable URL so user can pop out if proxy fails.

### 4. GitHub REST API render (native UI, no HTML scrape)

New `GET /api/pr-data?url=…` calls `GET https://api.github.com/repos/:owner/:repo/pulls/:number` (requires parsing PR URL), returns JSON `{title, body, state, html_url, user, created_at}`. Desktop window renders natively in React (markdown via e.g. `react-markdown` + `remark-gfm`), with custom OS styling. Optionally fetch `timeline` or `comments` via additional API calls.

- Pros: Robust (stable API contract vs fragile HTML), style fully controllable (no GitHub CSS leakage), smaller payload (~10 KB JSON vs 400 KB HTML), respects auth (`GITHUB_TOKEN` raises rate limit to 5000/hr), accessible (native headings, semantic markup), no script stripping needed, no SSRF proxy of arbitrary HTML.
- Cons: New runtime dependency if markdown needed (`react-markdown` ~30 KB gz). Loses GitHub fidelity (diff, checks, reviewers, file list complex to replicate). Two API calls minimum (`search/issues` already + `pulls/:number` fetch). Needs markdown sanitization (`rehype-sanitize`) to avoid XSS. Contrasts with existing `github-html` decision (inconsistency). Diff rendering is out-of-scope complexity.
- Effort: **Medium-High** (~150–220 LOC: URL parsing, api route, markdown render component, error/loading states, CSS).
- Verdict: Strong alternative if fragility is unacceptable. Could be Phase 2 after Approach 1 ships: start with HTML proxy (fastest to match existing precedent), migrate to API-native render once PR page scraping proves too brittle. Recommendation below proposes API-native as stretch goal.

### 5. GitHub Embed / oEmbed (`https://github.com/.../pull/...` via `https://api.github.com` oEmbed or `https://gh-card.dev`, `opengraph` fetch)

Fetch `og:title`/`og:description`/`og:image` and render a card that links out.

- Pros: Tiny payload, trivial proxy.
- Cons: Not an inline PR view — just a preview card. Does not satisfy “render PR inside website like github window”. oEmbed for GitHub is not officially supported for PRs.
- Effort: **Low**.
- Verdict: Not sufficient; at most a fallback placeholder when proxy fails.

## Recommendation

**Approach 1 — New desktop window with iframe proxy — as the proposal.**

Rationale:
- Directly fulfills the user’s “OS window like existing github and resume.pdf windows” requirement while keeping mobile as new tab (scoped to desktop per `user_rule: Scope window manager to desktop`).
- Reuses established `WindowId`/`WINDOWS`/`INITIAL_WINDOW_STATES`/`bringWindowToFront`/`--window-x` DOM-direct pattern; reviewers already understand it, low cognitive load.
- Mirrors `github-html` proxy so the fragility tradeoff is already accepted (flagged in `openspec/config.yaml: Flag api/github-html fragility`) and not a new class of risk. Approach 4 (API-native) is kept as a documented next step if scraping proves too brittle — this keeps the initial slice small and shippable.

Patch sketch for proposal/design:
- `lib/shell.ts`: introduce `type LatestAction = { lines: string[]; prUrl?: string }` or a typed custom event `dispatchEvent(new CustomEvent("mol3ro:open-pr", {detail:{url}}))` so Desktop can intercept on desktop and call `openPrWindow(url)`. Gate with `desktopMatches()` reading `--breakpoint-desktop`. Preserve sync `window.open` for mobile and as fallback if desktop window fails to open. Keep `COMMANDS` async-compatible but ensure shell’s `run()` stays sync for popup-blocker semantics (or expose separate `runWithContext` hook).
- `components/desktop/DesktopEnvironment.tsx`: add `"pr"` to `WINDOW_IDS`, `PrContent({ src })`, `PrGlyph` (pull-request icon), `WINDOWS.pr`, placement `.desktop-pr { inset:16% auto auto 28%; width:52%; height:62% }`, state `isOpen:false, zOrder:5`, handler `openPrWindow(url)` that sets iframe src to `/api/pr-html?url=${encodeURIComponent(url)}` and `bringWindowToFront`. Wire `useEffect` listener for `mol3ro:open-pr` (and cleanup). Consider making iframe `src` lazy — only set on first open.
- `app/api/pr-html/route.ts`: validate `url` param (regex, allow only `github.com/.../pull/...`), fetch with `User-Agent: Mozilla/5.0`, loop-replace all `<include-fragment>` (not just first), strip `<script>` + `<noscript>` wrappers, inject `<base href="https://github.com/" target="_blank">` + optional minimal `<style>` to hide GitHub header/footer that duplicates OS chrome, return `text/html` with `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, `revalidate=3600`. On any error return fallback HTML with centered message + `<a href="{originalUrl}" target="_blank">Open on GitHub</a>`.
- `styles/desktop.css` / `styles/windows.css`: add placement and `.pr__frame` (clone of `.github__frame`). Ensure `styles/theme.css` remains token source.
- `lib/site.ts`: no change.
- Mobile: zero change; but `useShell` must still emit `opening <url>` + bare URL so both surfaces render the clickable link even when desktop also opens the window — satisfies “instead of (or in addition to)” by doing “in addition to”.

Out-of-scope but note for design: Future swap from HTML proxy to API-native render (Approach 4) is a drop-in: change `PrContent` from iframe to React markdown view; API route contract stays `?url=…`. No WM change.

## Risks

- **HTML fragility** — PR page markup, Turbo Frames, `<include-fragment>` multiplicity, and GitHub CSS/JS evolve without notice. Mitigation: loop-replace all fragments, strip scripts defensively, keep fallback HTML with direct link, and document in proposal that `pr-html` is inherently fragile (like `github-html`).
- **SSRF / open proxy** — `?url=` must not proxy arbitrary hosts. Mitigation: strict allowlist regex + reject non-GitHub, limit response size (e.g. 1.5 MB), set fetch timeout (8s), no `allow-scripts` in sandbox.
- **Dual-mount side-effect leakage** — Both Desktop and Mobile call `useShell`; a naive `window.open` replacement would fire twice or open window on mobile. Mitigation: desktop detection inside handler + event-based decoupling (only `DesktopEnvironment` listener reacts).
- **Popup-blocker regression** — If `lib/shell.ts` is refactored to `async run()` that awaits before opening window, the iframe window open is NOT a popup (it's in-DOM) so safe, but keep shell output rendering sync. If we also keep new-tab fallback, retain blank-tab trick semantics.
- **Performance on first open** — Cold fetch of PR HTML + 3600s revalidate could feel sluggish. Mitigation: iframe `src` set only on open; after `preloadLatestUrl` resolves, optionally `fetch("/api/pr-html?url=…", {next:{revalidate:3600}})` speculatively on desktop idle (`requestIdleCallback`).
- **Accessibility** — New window must have focus management, `aria-labelledby` via `Window` already, plus `iframe title`. Mitigation: ensure `PrContent` iframe has `title="Latest pull request — ${repo}#${n}"` parsed from URL.
- **CSP / frame-ancestors** — GitHub sends `X-Frame-Options: deny` on the real site, but we re-host so not blocked; our own API must not send `X-Frame-Options: DENY`. Verify `next.config` (none today) does not add it globally.
- **Dock crowding** — 5th icon changes dock density. At `width:8.6%` + `gap:12px`, still fits but verify at 900px breakpoint. Alternative name `"latest"` vs `"pr"` — prefer `"pr"` to match GitHub icon semantics.

## Ready for Proposal

Yes — ready for `sdd-propose`. Proposal should carry forward Approach 1 with `pr-html` proxy, desktop event wiring, and Approach 4 as follow-up.

Prompt for `sdd-propose`:

> Draft `desktop-pr-inline-window` proposal for desktop inline PR window for `latest` on `mol3ro` (hybrid store). Scope: new `WindowId "pr"` + `PrContent` iframe, `GET /api/pr-html?url=` proxy (allowlist PR URL, script strip, base href, multi-fragment resolve, 3600 cache, sandbox, SSRF guards), `lib/shell.ts` desktop detection + `mol3ro:open-pr` event wiring (keep mobile as new tab, keep `opening <url>` + clickable bare URL, preserve sync popup semantics), CSS placement in `styles/desktop.css` / `styles/windows.css`, dock glyph. Out-of-scope: mobile behavior change, API-native markdown render (Phase 2), diff/checks fidelity. Include rollback plan (remove `pr` from `WINDOW_IDS` + route) and flag `github-html` fragility per `openspec/config.yaml`. Use `npm run build` + `npm run lint` + `npx tsc --noEmit` for verify and `single-pr` delivery.

