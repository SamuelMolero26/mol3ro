# Delta for desktop-pr-window

## ADDED Requirements

### Requirement: PR Window Registration and Lifecycle

System MUST provide window `pr` with parity to `github`/`resume.pdf` (drag, 8-dir resize via DOM-direct `--window-x/--window-y`, z-order, dock toggle, close). It MUST start `isOpen:false`, open on top, lazy-load iframe.

#### Scenario: Window is registered

- GIVEN desktop mounted
- WHEN inspecting `WINDOW_IDS`/`WINDOWS`/`INITIAL_WINDOW_STATES`
- THEN `pr` MUST exist with distinct glyph/title and `isOpen:false, zOrder:5`

#### Scenario: Lifecycle respects WM invariants

- GIVEN `pr` is open
- WHEN dragged, resized, or focused
- THEN position MUST update via CSS vars (no per-move state) and focus MUST bump zOrder
- AND iframe MUST be `sandbox="allow-same-origin allow-popups"` without `allow-scripts`/`allow-top-navigation`, `loading="lazy"`, titled

### Requirement: Desktop Inline Opening via Latest

System MUST open `pr` inline when `latest` resolves to PR URL on desktop (`min-width:900px` via `--breakpoint-desktop`). Handler MUST dispatch `CustomEvent("mol3ro:open-pr",{detail:{url}})` synchronously in user gesture (keep `run()` sync). WM MUST listen, set iframe `src` to `/api/pr-html?url=<encodeURIComponent(url)>`, open and front.

#### Scenario: Desktop opens inline

- GIVEN viewport ≥900px and `latest` → `https://github.com/<o>/<r>/pull/<n>`
- WHEN user submits `latest`
- THEN event MUST fire and `pr` MUST open with encoded `src` as topmost

#### Scenario: Non-PR falls back to new tab

- GIVEN `latest` → non-PR URL
- WHEN on desktop
- THEN `pr` MUST NOT open and `window.open(url,"_blank","noopener,noreferrer")` MUST be called

#### Scenario: Re-invocation reuses window

- GIVEN `pr` open on PR 966
- WHEN `latest` fires with different PR URL
- THEN `src` MUST update and window MUST be fronted

### Requirement: Mobile Preservation and Shell Output

System MUST preserve mobile: <900px `latest` MUST use `window.open` (cached fast path or blank-tab slow path) and MUST NOT open `pr`. On all viewports shell MUST append `opening <url>` plus bare `https://` line linkified via `getShellLinkHref`. Dual-mount (both trees mounted, CSS swap) MUST NOT duplicate side effects.

#### Scenario: Mobile stays new-tab

- GIVEN viewport <900px and `latest` → PR URL
- WHEN submitted
- THEN `window.open` MUST be called and `pr` MUST stay closed

#### Scenario: Shell output linkable

- GIVEN desktop inline open for `https://github.com/mark3labs/mcp-go/pull/966`
- WHEN rendered
- THEN lines MUST include `opening <url>` and bare URL anchor with `href` equal to URL
