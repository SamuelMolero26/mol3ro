# Tasks: Desktop PR Inline Window

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180 (170–220) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (single-pr, 800 budget) |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | PR inline window E2E (API+shell+WM+CSS) | PR 1 single | `npm run build && npm run lint && npx tsc --noEmit` | `npm run dev` ≥900px `latest`→pr drag/resize; `curl` 400/fallback | Delete `app/api/pr-html/route.ts`, remove WM `pr`, revert shell+CSS |

## Phase 1: API — `app/api/pr-html/route.ts`

- [x] 1.1 Create route with `PR_RE=/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+\/?$/`, `revalidate=3600`; `400` if missing/non-PR, no fetch
- [x] 1.2 Fetch with `User-Agent: Mozilla/5.0`, `AbortSignal.timeout(8000)`, 1.5 MB cap, validate before fetch
- [x] 1.3 Loop-resolve all `<include-fragment>`, strip `<script>`, inject `<base href="https://github.com/" target="_blank">`, return `text/html` + `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- [x] 1.4 On non-2xx/timeout/cap/network return `200` fallback HTML (sanitized base, anchor `Open on GitHub` to original url, no scripts)

## Phase 2: Shell — `lib/shell.ts`

- [x] 2.1 Export `PR_RE`, `OpenPrDetail={url}`; add `desktopMatches()` via `--breakpoint-desktop` (900px), guard `typeof window`
- [x] 2.2 Branch `latest`: PR && desktop → `dispatchEvent(CustomEvent("mol3ro:open-pr",{detail:{url}}))` sync; else `window.open` fast/slow paths
- [x] 2.3 Keep `run()` sync (no await before open/event), preserve `opening <url>` + bare url, mobile `<900px` stays new-tab

## Phase 3: Window Manager — `components/desktop/DesktopEnvironment.tsx`

- [x] 3.1 Add `"pr"` to `WINDOW_IDS`, `INITIAL_WINDOW_STATES.pr={isOpen:false,position:{x:0,y:0},size:null,zOrder:5}` at `16% auto auto 28% / 52%×62%`
- [x] 3.2 Add `WINDOWS.pr` with `title/dockLabel/PrGlyph/PrContent`; distinct glyph, verify 5-icon dock at 900px
- [x] 3.3 Implement `PrContent({src})` iframe `src="/api/pr-html?url=${encode(src)}"`, `sandbox="allow-same-origin allow-popups"`, `loading="lazy"`, titled, class `pr__frame`
- [x] 3.4 Add `prSrc` + `openPrWindow(url)` → set src, `bringWindowToFront("pr")`, open; re-invocation updates src+front
- [x] 3.5 Add `useEffect` listener for `mol3ro:open-pr` with cleanup; only `DesktopEnvironment` listens (dual-mount safe)
- [x] 3.6 Verify drag (`--window-x/--window-y`), 8-dir resize, z-order, close/dock; `Window.tsx` unchanged

## Phase 4: Styling — CSS

- [x] 4.1 Add `.desktop-pr` in `styles/desktop.css` `@media (width>=900px)` with `inset`/`width`/`height`
- [x] 4.2 Add `.pr` + `.pr__frame` in `styles/windows.css` cloning `.github__frame` (`width:100%; flex:1; border:0; background:#fff`)
- [x] 4.3 Tokens stay in `styles/theme.css`; verify `--breakpoint-desktop` single source matches JS

## Phase 5: Verification

- [x] 5.1 `npm run build && npm run lint && npx tsc --noEmit` → 0 errors (`strict_tdd:false`, no runner)
- [x] 5.2 `curl` guards: valid PR→200 sanitized (no `<script>`, has `<base>`, fragments replaced); non-PR→400; 500/timeout→200 fallback anchor; check headers
- [x] 5.3 Manual `npm run dev`: ≥900px `latest` opens `pr` lazy iframe topmost; <900px → new tab; drag/resize, re-invoke src, `opening <url>` clickable
- [x] 5.4 Note `pr-html` fragility (mirrors `github-html`), no migration; rollback = remove WM `pr` + route + shell gate + CSS
