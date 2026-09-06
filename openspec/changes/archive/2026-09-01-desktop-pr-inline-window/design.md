# Design: Desktop PR Inline Window

## Technical Approach

Add `WindowId "pr"` to data-registered WM (`WINDOW_IDS`→`WINDOWS`→`INITIAL_WINDOW_STATES`) and `GET /api/pr-html?url=` mirroring `github-html`. `latest` stays sync, checks `desktopMatches()` (`--breakpoint-desktop` 900px) and dispatches `CustomEvent("mol3ro:open-pr",{detail:{url}})` only on desktop. `DesktopEnvironment` listens, sets `prSrc=/api/pr-html?url=<enc(url)>`, `bringWindowToFront("pr")`. Mobile and non-PR keep `window.open` paths. Iframe lazy, sandboxed. Single-PR ~180 LOC.

## Architecture Decisions

### Decision: Event decoupling

| Option | Tradeoff | Decision |
|---|---|---|
| Shell imports WM | Couples shared `lib/shell.ts` to desktop, leaks to mobile | Rejected |
| `CustomEvent("mol3ro:open-pr")` sync | Decoupled, keeps `run()` sync, desktop-only listener | **Chosen** |

**Rationale**: Both trees mount. Event avoids dual-mount duplication; WM owns lifecycle.

### Decision: New `pr` vs reuse `github`

| Option | Tradeoff | Decision |
|---|---|---|
| Reuse `github` iframe | Destroys profile view | Rejected |
| New `pr` + `PrContent` | Clear semantics, distinct glyph, lazy `src` | **Chosen** |

**Rationale**: Parities `readme`/`resume`/`github`; `isOpen:false,zOrder:5`, `16% auto auto 28%/52%×62%`.

### Decision: HTML proxy vs API render

| Option | Tradeoff | Decision |
|---|---|---|
| `GET /api/pr-data` + markdown | Stable but needs deps, low fidelity | Phase 2 |
| Proxy PR HTML, loop fragments, strip scripts, base | Fragile but zero deps, full fidelity | **Chosen** |

**Rationale**: Smallest slice; fallback + sandbox secures.

## Data Flow

```mermaid
sequenceDiagram
 participant U as User desktop≥900px
 participant S as shell latest()
 participant W as DesktopEnvironment
 participant P as /api/pr-html
 participant G as github.com
 U->>S: latest (gesture)
 S->>S: fetch /api/latest-repo→url
 alt PR && desktopMatches()
  S->>W: dispatch mol3ro:open-pr
  S-->>U: ["opening "+url, url]
  W->>W: prSrc=enc(url); bringWindowToFront(pr)
  W->>P: iframe fetch
  P->>P: validate PR regex else 400
  P->>G: fetch UA Mozilla/5.0 8s 1.5MB
  G-->>P: HTML
  P->>P: loop fragments, strip script, inject base
  P-->>W: 200 html + Cache-Control
  W-->>U: iframe sandbox lazy
 else mobile/non-PR
  S->>S: window.open(url,_blank)
  S-->>U: ["opening "+url, url]
 end
```

Drag writes `--window-x/--window-y`+size via `applyPosition`/`moveResize` (no per-move state, commit on pointer-up); `desktopMatches()` single-source `--breakpoint-desktop`; both trees mount but only WM opens window; `run()` sync preserves gesture.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/api/pr-html/route.ts` | Create | PR regex, 8s/1.5MB fetch, fragments, strip scripts, base, `revalidate=3600`, fallback |
| `components/desktop/DesktopEnvironment.tsx` | Modify | `WINDOW_IDS`/`WINDOWS.pr`/`INITIAL_WINDOW_STATES.pr`, `PrContent`/`PrGlyph`, `prSrc`, listener |
| `lib/shell.ts` | Modify | `PR_RE`, `desktopMatches` gate, event vs `window.open` |
| `styles/desktop.css` | Modify | `.desktop-pr{inset:16% auto auto 28%;width:52%;height:62%}` ≥900px |
| `styles/windows.css` | Modify | `.pr` + `.pr__frame` (clone `.github`) |
| `components/ui/Window.tsx` | Verify | No change |
| `app/api/github-html/route.ts` | Reference | — |
| `app/api/latest-repo/route.ts` | Reference | — |

## Interfaces / Contracts

```ts
export const PR_RE = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+\/?$/;
export type OpenPrDetail = { url: string };
const WINDOW_IDS = ["readme","shell","resume","github","pr"] as const;
const INITIAL_WINDOW_STATES = { pr:{isOpen:false,position:{x:0,y:0},size:null,zOrder:5} };
function PrContent(p:{src:string|null}): ReactElement;
function PrGlyph(): ReactElement;
// GET /api/pr-html?url= → 400 if !PR_RE else 200 text/html + Cache-Control or 200 fallback HTML
// fallback: <base href="https://github.com/" target="_blank"><a href="url" rel="noopener noreferrer">Open on GitHub</a>
export const revalidate = 3600;
```

Sandbox `allow-same-origin allow-popups` (no scripts/top-nav), `loading="lazy"`, `title="Latest pull request — {repo}#{n}"`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | `PR_RE`, `desktopMatches`, zOrder | `tsc --noEmit` |
| Integration | 400, sanitize, fallback, cache, cap | `curl` + build |
| E2E manual | open pr, lazy, drag/resize vars, re-invoke src, non-PR/mobile tab, `opening` link, dock toggle | viewports 900/899, `build lint tsc` |

No runner (`strict_tdd:false`).

## Threat Matrix

Per `references/threat-matrix.md` (touches `latest` and `/api/pr-html`):

| Boundary | Cases | Applicability | Response | RED tests |
|----------|-------|---------------|----------|-----------|
| Docs-like paths | `requirements.txt`, MDX | N/A — allowlist PR only | — | — |
| Git repo selection | `git -C` | N/A — no git | — | — |
| Commit state | staged | N/A — no commit | — | — |
| Push state | tracking | N/A — no push | — | — |
| PR commands | `--head` | N/A — reads only | — | — |

Guarded: strict regex, `AbortSignal.timeout(8000)`, 1.5MB cap, sandbox, base `target=_blank`.

## Migration / Rollout

No migration. Single-PR ~180 LOC. Rollback: remove `pr` from `WINDOW_IDS`/`WINDOWS`/states/`prSrc`/listener/CSS, delete `app/api/pr-html/route.ts`, revert `lib/shell.ts`. Cache clears on redeploy.

## Open Questions

- [ ] Glyph distinct PR icon?
- [ ] Fallback title includes `{repo}#{n}`?
- [ ] Prefetch PR HTML on idle? (deferred)
