# Archive Report: desktop-pr-inline-window

**Change**: `desktop-pr-inline-window` — desktop inline PR window for `latest` command
**Archived to**: `openspec/changes/archive/2026-09-01-desktop-pr-inline-window/` (hybrid)
**Archive date**: 2026-09-01 (ISO `2026-09-01`)
**Mode**: hybrid (openspec + engram + droids-mem sync)
**Delivery**: single-pr, 800 budget, single PR `f13b58e`
**Evidence revision**: `f13b58e3ea555cfdda02118bfffd4416f9a7af29` (HEAD) / `sha256:05cd15ccdd12275e1ad05967d94c90a2d4ddd998b4367223c442547a6cfcdf1b`
**Review gate**: absent — no native review receipt discovered; proceeds under ordinary repository policy (hybrid interactive, no kill switch)
**Execution**: interactive, single work unit, ~210 lines actual (forecast ~180), Low risk (<400)

## Executive Summary

Archived SDD change `desktop-pr-inline-window` fully planned, implemented, verified, and synced to source of truth. Desktop `≥900px` `latest` now dispatches `mol3ro:open-pr` and opens sandboxed lazy `pr` OS window via `GET /api/pr-html?url=` (allowlist PR regex, 8 s timeout, 1.5 MB cap, fragment loop, script strip, base href, cache 3600, fallback 200); mobile `<900px` and non-PR keep `window.open` new-tab. Build/lint/tsc green at archive time, 7/7 requirements and 13/13 scenarios verified, no CRITICAL defects. Safe to close cycle.

## Final-State Authority

Archive report is terminal record at close (2026-09-01). Intermediate snapshots (`apply-progress` 2026-09-01 16:30, `verify-report` 2026-09-01 16:38) remain valid history but do not override later evidence.

Ranking applied:
1. Structured status (no `reviewGate` — absent, not blocked)
2. Persisted `tasks.md` (20/20 `[x]`, archive copy verified)
3. Explicit final-state facts from orchestrator launch prompt (warnings non-blocking, build green 05cd15cc, no commits after f13b58e, 20/20 accurate, Low single-PR)
4. `verify-report` / `apply-progress` snapshots — lowest rank, cited as historical source

Contradiction noted: Engram `sdd/desktop-pr-inline-window/tasks` (#646, 2026-09-01 16:25:58) still shows 20× `[ ]` unchecked (stale snapshot captured before apply completed). Filesystem `openspec/changes/archive/2026-09-01-desktop-pr-inline-window/tasks.md` at close shows 20/20 `[x]` (authoritative per Task Completion Gate). Stale Engram snapshot is not final state.

No `reviewGate` present — archive proceeds; `dependencies.archive: ready` is invitation declination, not a gate.

All carry-forward numbers (test counts, warnings, open issues) taken from highest-ranked source covering each fact: task counts from filesystem, build verdict from verify-report + live archive-time build, warnings from verify-report reinterpreted per final-state facts.

## Specs Synced (Step 2)

Delta specs lives in `openspec/changes/desktop-pr-inline-window/specs/` (later archived). No existing `openspec/specs/` at start — both domains were NEW (ADDED-only, no MODIFIED/REMOVED/RENAMED). Main specs did NOT exist; delta specs were full specs copied mechanically with shell-only copy and `diff -r` readback. No merge into existing spec, no destructive deletion. `specs/` was empty before sync.

| Domain | Action | Details | Source → Destination |
|--------|--------|---------|---------------------|
| `desktop-pr-window` | **Created** | 3 ADDED Requirements, 7 scenarios (PR Window Registration and Lifecycle ×2, Desktop Inline Opening via Latest ×3, Mobile Preservation ×2) — RFC 2119 MUST + Given/When/Then | `openspec/changes/desktop-pr-inline-window/specs/desktop-pr-window/spec.md` → `openspec/specs/desktop-pr-window/spec.md` |
| `pr-html-proxy` | **Created** | 4 ADDED Requirements, 6 scenarios (PR URL Validation ×2, Sanitized HTML Response ×1, Caching ×1, Failure Fallback ×2) — SSRF guard, sanitization, caching contract | `openspec/changes/desktop-pr-inline-window/specs/pr-html-proxy/spec.md` → `openspec/specs/pr-html-proxy/spec.md` |

**Mechanical copy evidence (verbatim `diff -r` source vs temp — empty = PASS):**

```text
===SPEC_SYNC_desktop-pr-window===
cp desktop-pr-window OK
diff source->temp desktop-pr-window:
diff_status=0
mv to target OK: openspec/specs/desktop-pr-window/spec.md
===desktop-pr-window sync done, diff empty PASS===

===SPEC_SYNC_pr-html-proxy===
cp pr-html-proxy OK
diff source->temp pr-html-proxy:
diff_status=0
mv to target OK: openspec/specs/pr-html-proxy/spec.md
===pr-html-proxy sync done, diff empty PASS===
```

No `REMOVED` or `RENAMED` requirements; no `(Reason:)`/`(Migration:)` needed. Preservation check: all OTHER requirements nonexistent (specs were empty) so append = create.

## Archive Move (Step 3)

Entire change folder moved mechanically via shell (snapshot + `git mv` fallback `mv`) with mandatory `diff -r` readback. Archive-report file is additive-only and excluded from source/destination comparison (did not exist in source snapshot).

**Mechanical move evidence (verbatim):**

```text
===ARCHIVE_MOVE_START===
snapshot_root=/var/folders/t8/_2vv47_s12d49vpmvrkng3c80000gn/T//sdd-archive.dza1mI
snapshot copied
...
try git mv...
git mv succeeded
source gone OK
...
===DIFF_READBACK===
diff_status=0
===ARCHIVE_MOVE_SUCCESS empty diff PASS===
```

Checks after move:
- [x] Main specs updated correctly (2 new specs, diff empty)
- [x] Change folder moved to `openspec/changes/archive/2026-09-01-desktop-pr-inline-window/`
- [x] Archive contains all artifacts (proposal, specs/×2, design, tasks, verify-report, plus archive-report)
- [x] Archived `tasks.md` has 0 unchecked implementation tasks (20/20 `[x]`)
- [x] Active `openspec/changes/desktop-pr-inline-window/` no longer exists (`ls` returns No such file)
- [x] Verbatim `diff -r` readback included above and is empty

## Archive Contents

At `openspec/changes/archive/2026-09-01-desktop-pr-inline-window/`:

- `proposal.md` ✅ — Intent: inline PR window like github/resume, mobile stays new-tab; approach event decoupling + proxy
- `specs/desktop-pr-window/spec.md` ✅ — delta (ADDED 3 req, 7 scenarios) — preserved in archive
- `specs/pr-html-proxy/spec.md` ✅ — delta (ADDED 4 req, 6 scenarios) — preserved in archive
- `design.md` ✅ — Event `mol3ro:open-pr`, new `pr` vs reuse `github`, proxy vs API render decisions + sequence diagram
- `tasks.md` ✅ — 20/20 tasks complete (Phase 1 API 4/4, Phase 2 Shell 3/3, Phase 3 WM 6/6, Phase 4 CSS 3/3, Phase 5 Verify 4/4); forecast Low <400
- `verify-report.md` ✅ — PASS WITH WARNINGS, 13/13 scenarios, build/lint/tsc green (see below)
- `exploration.md` ✅ — 5 approaches evaluated, Approach 1 recommended
- `apply-progress.md` ✅ — 20/20, ~210 lines, deviations none, invariants preserved
- `archive-report.md` ✅ — this file (additive, excluded from diff)

## Source of Truth Updated

New specs now at:

- `openspec/specs/desktop-pr-window/spec.md` — PR Window Registration and Lifecycle + Desktop Inline Opening + Mobile Preservation + Shell Output
- `openspec/specs/pr-html-proxy/spec.md` — PR URL Validation and SSRF Guard + Sanitized HTML Response + Caching + Failure Fallback

These reflect behavior shipped in `f13b58e`: `WindowId "pr"` (16% auto auto 28% / 52%×62% @ ≥900px, zOrder 5, `PrGlyph`/`PrContent` sandbox `allow-same-origin allow-popups` `loading="lazy"` `pr__frame`), `GET /api/pr-html?url=` (PR_RE allowlist, 400 without fetch, Mozilla/5.0, AbortSignal.timeout(8000), 1.5 MB cap, 10-iter fragment loop, script strip, base href, Cache-Control, revalidate 3600, 200 fallback `Open on GitHub`), `lib/shell.ts` gate (`desktopMatches()`→ `--breakpoint-desktop` 900px, `mol3ro:open-pr` sync dispatch vs `window.open` fast/slow, `opening <url>` clickable), `DesktopEnvironment` listener + `prSrc`/`openPrWindow`.

No migration. Rollback remains clear: delete `app/api/pr-html/route.ts`, remove `"pr"` from `WINDOW_IDS`/`WINDOWS`/`INITIAL_WINDOW_STATES`/`prSrc`/listener/CSS, revert `lib/shell.ts`.

## Tasks / Progress — Final-State Facts

Applied **final-state facts** from orchestrator prompt (outrank snapshots):

- Verify warnings are **non-blocking**, not defects to fix. Per `verify-report` (167 lines, evidence_revision `05cd15cc…`, HEAD `f13b58e`): verdict `pass_with_warnings`, blockers 0, critical 0, requirements 7/7, scenarios 13/13, test `npx tsc --noEmit` exit 0, build `npm run build` exit 0. Warnings W-1 through W-4 analyzed and accepted:
  - **W-1 No runner by design** — `strict_tdd:false`, runner unavailable per `openspec/config.yaml`; 51/51 file-content harness + 6/6 PR_RE checks + build/lint/tsc cover 13 scenarios. Non-blocking by project policy.
  - **W-2 Curl was code-inspection not live** — verify ran Node harness not live `http://localhost:3000` curl. Acceptable per hybrid standard; recommend optional live curl spot-check but not blocking archive.
  - **W-3 Title fallback generic** — `PrContent` parses `owner/repo#n` with fallback `"Latest pull request"`; edge handled intentionally per open question `repo#n` optional.
  - **W-4 Fragment loop edge** — `FRAGMENT_RE` single-capture `/i` looped ≤10 sequentially; correct per design, Turbo Frames beyond `include-fragment` degrade to empty replaced fragments (intentional fallback). All non-blocking.
- Build/lint/tsc **all green at archive time** — re-verified during archive:
  - `npm run build` ✅ Compiled successfully in 432 ms (archive-time), TypeScript 761 ms, 7 workers 6/6 pages, route `ƒ /api/pr-html` dynamic revalidate 3600 (prior evidence: 290 ms compile / 762 ms TS per verify-report)
  - `npm run lint` ✅ exit 0 (eslint, 0 errors)
  - `npx tsc --noEmit` ✅ exit 0 (empty output)
  - Evidence revision `sha256:05cd15ccdd12275e1ad05967d94c90a2d4ddd998b4367223c442547a6cfcdf1b` unchanged; no additional commits after `f13b58e`.
- Tasks **20/20 remains accurate** — filesystem `tasks.md` shows 20× `[x]` / 0× `[ ]` (`grep -c` at archive: 20 complete, 0 incomplete). `verify-report` completeness table 20 total / 20 complete / 0 incomplete / 7 reqs / 13 scenarios corroborates. Engram snapshot #646 stale 20× `[ ]` disregarded per authority ranking.
- Actual changed lines ~210 (committed diff stat: shell 138+11, DesktopEnvironment 85+15, latest-repo 28+9, pr-html 122+0, mobile 2+2, desktop 6+0, windows 28+0 plus spec docs 0-openspec staged) under 400 Low risk; single-PR `single-pr` 800 budget respected, no chaining needed.
- Review workload Low, single PR, no chaining needed — consistent with `openspec/config.yaml` persistence `delivery single-pr, review_budget 800, artifact_store hybrid`.
- Files changed final state: 4 implementation files (`app/api/pr-html/route.ts` created, `lib/shell.ts` modified, `components/desktop/DesktopEnvironment.tsx` modified, `styles/desktop.css` + `styles/windows.css` modified) plus `app/api/latest-repo/route.ts` PR-first fallback; `components/ui/Window.tsx` verified unchanged; sandbox iframe; clickable fallback link still present for mobile/new-tab path.

Task Completion Gate **passes**: no unchecked implementation tasks in archived `tasks.md` (exceptional stale-checkbox reconciliation not needed — persisted artifact already correct). `sdd-apply` correctly marked all tasks.

Native Review Receipt Gate **passes**: `reviewGate` structurally absent → no review exists for this candidate; proceed under ordinary policy.

## Verification Summary (at close)

- **Verdict**: PASS WITH WARNINGS (not blocked) — 13/13 scenarios compliant via static + build/type-check + Node harness (by design, no runner). No CRITICAL.
- **Requirements**: 7/7 (desktop-pr-window 3, pr-html-proxy 4)
- **Scenarios**: 13/13
- **Build**: `npm run build` ✓ (Turbopack 16.3.3, 7 workers, `ƒ /api/pr-html` revalidate 3600)
- **Lint**: `npm run lint` ✓
- **TSC**: `npx tsc --noEmit` ✓ (exit 0)
- **Warnings non-blocking**: W-1 no runner by design, W-2 curl inspection-only (recommend live curl spot-check), W-3 title generic fallback, W-4 fragment sequential — none are defects to fix before archive per final-state facts.

## Risks and Next Recommendations

- **Residual risks**: HTML fragility (mirrors `github-html`, GitHub markup change breaks proxy — mitigated by loop ≤10 + fallback + sandbox), SSRF guarded (PR_RE, cap, timeout), dual-mount idempotent, dock 5-icon crowding at 900px visual not measured in CI.
- **Next recommended**: none for this change — SDD cycle complete. Optional follow-ups (non-blocking, Phase 2): live `curl -s http://localhost:3000/api/pr-html?url=https://github.com/mark3labs/mcp-go/pull/966` spot-check + 900/899 viewport manual drag/resize + idle prefetch after `preloadLatestUrl` + markdown API-native render if scrape brittleness grows + stylesheet CSP pruning.
- **Chaining**: not needed. Single-PR closed.

## Artifact Traceability

Read from openspec filesystem at archive time (2026-09-01):
- `openspec/changes/desktop-pr-inline-window/proposal.md`
- `openspec/changes/desktop-pr-inline-window/specs/desktop-pr-window/spec.md`
- `openspec/changes/desktop-pr-inline-window/specs/pr-html-proxy/spec.md`
- `openspec/changes/desktop-pr-inline-window/design.md`
- `openspec/changes/desktop-pr-inline-window/tasks.md` (20/20)
- `openspec/changes/desktop-pr-inline-window/verify-report.md` (PASS WITH WARNINGS)
- `openspec/changes/desktop-pr-inline-window/exploration.md`
- `openspec/changes/desktop-pr-inline-window/apply-progress.md`

Read from Engram (hybrid second store) — observation IDs:
- #642 `sdd/desktop-pr-inline-window/explore` (sync `obs-03a741bb945565a4`)
- #643 `sdd/desktop-pr-inline-window/proposal` (sync `obs-4f0a42db3016f41e`)
- #644 `sdd/desktop-pr-inline-window/spec` (sync `obs-6672ccbec1d6fc97`) — note: spec domain topics collapsed to one in Engram, filesystem has 2 domains
- #645 `sdd/desktop-pr-inline-window/design` (sync `obs-13afadd939697822`)
- #646 `sdd/desktop-pr-inline-window/tasks` (sync `obs-e0218a11f9a79469`) — STALE `[ ]`, superseded by filesystem 20/20
- #647 `Apply progress: desktop-pr-inline-window` (sync `obs-ad286614f751d16c`)
- #648 `sdd/desktop-pr-inline-window/verify-report` (sync `obs-0fd25766e838b8d4`)

Read from droids-mem (hybrid third sync):
- `mem_01M1FD3JT343N9EZKZDESM77EB` explore
- `mem_01M1FD9WY3WMNQGMRRFRYE8SKB` proposal
- `mem_01M1FDGF0BSFN1FA9HHH4PBEVT` spec
- `mem_01M1FDTQQQM5XA0G3J2J588SGX` tasks
- `mem_01M1FEHQFFRCK4FP7763PVYRDN` verify-report

All stored per Execution and Persistence Contract Section C.

## Rules Archive Checked

- No CRITICAL in verify-report (gate not triggered)
- Tasks complete (no stale unchecked to reconcile)
- Archival mechanical copy only (cp/mv + diff -r), never Read→Write
- Spec sync before move, preserved non-delta requirements
- `openspec/changes/archive/` ensured
- `rules.archive: Warn before merging destructive deltas` — none destructive, warning N/A
- Additive archive-report excluded from diff

## SDD Cycle Complete

Change `desktop-pr-inline-window` is fully planned, implemented, verified, and archived. Source of truth (`openspec/specs/desktop-pr-window/spec.md`, `openspec/specs/pr-html-proxy/spec.md`) now reflects shipped behavior. Ready for next change.
