# Proposal: Desktop PR Inline Window

## Intent

`latest` opens new tab everywhere. Desktop should show latest PR (`/api/latest-repo` → https://github.com/mark3labs/mcp-go/pull/966) inline as OS window like `github`/`resume.pdf`; mobile stays new-tab. Keep `opening <url>` link.

## Scope

### In Scope
- `WindowId "pr"` + `PrContent` iframe in `DesktopEnvironment`
- `GET /api/pr-html?url=` proxy (allowlist PR, strip scripts, base href, loop fragments, 3600 cache, 1.5 MB cap, 8s timeout, fallback HTML)
- `lib/shell.ts` gate (`desktopMatches()`+`mol3ro:open-pr`) preserving sync `window.open`
- `.desktop-pr`/`.pr__frame` + dock glyph

### Out of Scope
- Mobile window, API markdown (Phase 2), oEmbed, diff/checks, test runner

## Capabilities

### New Capabilities
- `desktop-pr-window`: PR window lifecycle
- `pr-html-proxy`: sanitized PR proxy

### Modified Capabilities
- None — specs empty

## Approach

Approach 1. `latest` checks `window`+`desktopMatches()` (`--breakpoint-desktop`). Desktop: `dispatchEvent(CustomEvent("mol3ro:open-pr",{detail:{url}}))`; else sync `window.open` (cached `noopener,noreferrer` fast path, blank-tab slow path). `run()` stays sync. WM adds `"pr"` to `WINDOW_IDS`/`WINDOWS`/`INITIAL_WINDOW_STATES` (`isOpen:false,zOrder:5`, `16% auto auto 28%/52%x62%`), `PrGlyph`, listener → iframe `/api/pr-html?url=encode(url)` + `bringWindowToFront`. Iframe lazy, `sandbox="allow-same-origin allow-popups"`, `loading="lazy"`. Proxy validates PR regex, fetches `Mozilla/5.0`, loops fragments, strips scripts, injects base, `Cache-Control: public,s-maxage=3600,stale-while-revalidate=86400` `revalidate=3600`; error → fallback HTML. Invariants: dual-mount, DOM-direct drag, breakpoint single-source, popup-sync. Flags `api/github-html` fragility.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/shell.ts` | Modified | Gate + event |
| `components/desktop/DesktopEnvironment.tsx` | Modified | `pr` + listener |
| `components/ui/Window.tsx` | Verify | No change |
| `app/api/pr-html/route.ts` | New | Proxy ~70 LOC |
| `app/api/github-html/route.ts` | Reference | Fragility |
| `styles/desktop.css` | Modified | `.desktop-pr` |
| `styles/windows.css` | Modified | `.pr__frame` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| HTML fragility | High | Loop fragments, fallback |
| SSRF via `?url=` | Med | PR regex, cap, timeout |
| Dual-mount leak | Med | Gate + desktop-only listener |
| Popup regression | Low | Keep `run()` sync |
| Perf 400 KB | Med | Lazy + cache |
| Dock crowding | Low | Verify 900px |

## Rollback Plan

Single-PR revert: remove `"pr"` from `WINDOW_IDS`, delete `WINDOWS.pr`/state/CSS, delete `app/api/pr-html/route.ts`, revert `lib/shell.ts`. No migration. Budget 800 (~180 lines).

## Dependencies

- `GITHUB_TOKEN` optional; no new deps.

## Success Criteria

- [ ] Desktop `latest` opens `pr` window with `/api/pr-html?url=<pr>`; drag/resize/z-order OK
- [ ] Mobile `latest` opens new-tab only
- [ ] Shell prints `opening <url>` + clickable URL
- [ ] `pr-html` rejects non-PR (400), caps, strips scripts, injects base
- [ ] `build` + `lint` + `tsc --noEmit` pass

## Proposal Question Round (deferred)

Non-blocking. Assumptions: (1) non-PR fallback → new-tab even desktop; (2) lazy not prefetch; (3) distinct glyph; (4) 500 → fallback HTML; (5) overlap ok, `pr` on top.
