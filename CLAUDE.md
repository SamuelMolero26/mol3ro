# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # next dev
npm run build   # next build
npm run start   # serve the production build
npm run lint    # bare `eslint`, NOT `next lint`
```

There is no test runner, no test files, and no CI config in this repo. Don't
look for one, and don't add a testing stack without being asked.

## Memory & Code Intelligence — droids-mem (MANDATORY)

This repo uses **droids-mem** for persistent memory (cross-session) and for
code-graph exploration. Use it instead of ad-hoc grep/file-reading when you
can — the graph answers from a pre-built call graph in one call.

### Persistent memory

`task_type` for this repo is always `mol3ro` — derive it mechanically from the
repo / directory name and reuse the exact same string every session. Inventing a
new slug silently orphans prior continuity.

**At the START of a task, and again whenever the topic shifts:**

```ts
// 1. Curated continuity (session summary + standing rules) when you know the task_type
mem_context({ task_type: "mol3ro", query: "<what you are about to do>" })
// 2. Relevance-ranked prior lessons — needs no task_type
mem_search({ query: "<short description of task>", task_type: "mol3ro" })
// If nothing found and the problem may span repos: mem_search({ query, all_projects: true })
```

Each `mem_search` result includes `overlap_score` (0–1) for literal token
overlap — judge relevance yourself, expand promising hits with `mem_get({ id })`
or `mem_search` → `mem_get`.

**AS YOU WORK — save reusable lessons immediately** (don't wait to be asked):

```ts
mem_save({
  kind: "error_resolution" | "task_pattern" | "user_rule" | "session_summary",
  task_type: "mol3ro",
  title: "Short imperative title",
  what: "What happened / what was attempted (factual context)",
  learned: "Reusable insight to apply next time (max 4096 bytes)",
  tags: "space delimited tokens",
})
```

Save on: architecture/design decisions, bug fixes (with root cause), conventions
established, config/environment changes, non-obvious discoveries, gotchas/edge
cases, user preferences learned. Re-saving the same lesson is harmless
(deduplicated) — prefer saving over forgetting. Thread the `session_id`
returned by `mem_context` / first `mem_save` through later saves in the same
run.

**At the END of a run** (task complete or user wrapping up), save one
`kind: "session_summary"` with Goal / Accomplished / Next Steps / Discoveries.
Check `mem_corpus({})` at session start if you want a health census.

Never put secrets/tokens in any field — tags are stored verbatim.

### Code graph (prefer over grep for TS/JS)

For this TypeScript/Next.js repo the graph is `precision: syntactic`
(approximate — `doc` is empty, constants not indexed, `tests/` excluded).
Cross-check critical findings against source.

```ts
graph_package({ repo: "/Users/samuel/mol3ro", package: "components/desktop" })
graph_symbol({ repo: "/Users/samuel/mol3ro", symbol: "DesktopEnvironment", depth: 1, direction: "both" })
```

- `graph_package` — exported surface of a package (signatures only). Orient
  before drilling into symbols.
- `graph_symbol` — one symbol's source + callers/callees as one-line stubs.
  `direction=up depth=3` = blast radius (`transitive_callers` = how many symbols
  break if you change it). `direction=down` = dependencies. `to: "OtherSymbol"`
  = shortest call path. Expand a stub by re-querying its exact `qname`.
- `graph_build_wait({ repo: "/Users/samuel/mol3ro" })` — block until the graph
  is fresh after you see `freshness.stale` / `carried: true`.

**Before EDITING a function:** call `graph_symbol` with `direction=up depth=3`
and mention the `transitive_callers` count when you state what you learned — it
is the single most useful risk signal.

After every tool call, state briefly what you learned from memory/graph and how
it affects your approach (one-liner is enough).

## What this is

`mol3ro.com` — a single-page personal portfolio built as a retro desktop OS.
Next.js 16 App Router, React 19, Tailwind v4. One route (`/`), two API routes.

## Architecture

### Both UIs render server-side; one survives hydration

`app/page.tsx` renders `<ResponsiveShell />`, which reads the 900px desktop
query through `useSyncExternalStore`. React serves `getServerSnapshot` (`null`)
to both the server render and the hydration render, so the static HTML carries
**both** `<MobileFrame />` and `<DesktopEnvironment />`, CSS-hidden by
`.shell-ssr-mobile` / `.shell-ssr-desktop` in `styles/base.css`. Once the query
resolves, only the matching tree stays mounted.

Two consequences. Both trees mount at least once on every viewport, so keep new
side effects idempotent and cheap. And the shells must never become `ssr: false`
dynamic imports — that empties the server-rendered HTML, which on a portfolio is
the entire payload.

### One shell core, two shell chromes

`lib/shell.ts` owns the terminal: the `COMMANDS` map and the `useShell` hook
(log lines, draft input, scroll pinning). Desktop `ShellContent` and mobile
`ShellTab` render their own chrome around that same core. **Adding a key to
`COMMANDS` lights it up on both surfaces at once** — mobile also auto-generates
a tap chip per command from `COMMAND_NAMES`.

The `COMMANDS` contract: a handler returns `string[]` or `Promise<string[]>`,
and `useShell` is written to render both without branching. Handlers are called
**synchronously** on purpose — the `latest` command claims its popup tab with
`window.open` while the submit is still the active user gesture. Awaiting before
opening gets the popup blocked. Don't refactor `run()` into an `async` function.

### Desktop window manager

`components/desktop/DesktopEnvironment.tsx` is the whole WM in one file — z-order,
pointer-capture drag, and eight-direction resize.

- **Drag/resize writes the DOM directly, not React state.** `applyPosition` sets
  the `--window-x` / `--window-y` custom properties and `moveResize` sets
  `width`/`height` on the element; state is committed once on pointer-up. This is
  deliberate — do not "fix" it into a `setState` per pointermove.
- Windows are registered by data, not by JSX: add an id to the `WINDOW_IDS`
  tuple (which types `WindowId`) and an entry to the `WINDOWS` record. The dock
  icon and the window itself both derive from that entry.
- Drag and resize are gated on `DESKTOP_MEDIA_QUERY` (`min-width: 900px`) from
  `lib/responsive.ts`, the single source shared with `ResponsiveShell`. CSS
  cannot import it, so the value is **duplicated** in `--breakpoint-desktop`
  (`styles/theme.css`) and in the `.shell-ssr-*` query (`styles/base.css`). All
  three carry a comment. Change one, change all three.
- `TopBar`'s clock seeds from the render clock and uses `suppressHydrationWarning`
  on the `<time>` — the server renders build-time UTC and the first interval tick
  corrects it. Expected, not a bug.

`components/ui/Window.tsx` is the presentational frame (titlebar, close button,
resize handle layer). It takes drag/resize handler bundles as props and owns no
state — the WM in `DesktopEnvironment` supplies all behavior.

### Styling

Tailwind v4 with **no `tailwind.config`**. `app/globals.css` is the entire import
graph and the layering is load-bearing:

- `styles/theme.css` is imported **outside any cascade layer** — its `@theme`
  block is what feeds Tailwind its tokens.
- Every other sheet is imported into `layer(components)` so Tailwind utilities
  still win at the call site.

Repo convention (stated at the top of `theme.css`): no literal color, size, or
spacing values inline in components. They go in `theme.css` or in the component
stylesheet that owns them.

### API routes

- `app/api/github-html/route.ts` — server-side scrape of the public GitHub
  profile page, rendered into a sandboxed iframe. It strips **all** `<script>`
  tags (GitHub's bundle boots React and fires same-origin requests that resolve
  against this site, blowing up its own error boundary), resolves the
  `<include-fragment>` contribution calendar server-side, and injects
  `<base href="https://github.com/">`. This is inherently fragile — it breaks
  whenever GitHub changes its markup.
- `app/api/latest-repo/route.ts` — returns `{ url }` for the most recently pushed
  repo, falling back to the profile URL on any failure.

Both set `revalidate = 3600`.

## Gotchas

- `@/*` resolves to the repo root, not to a `src/` directory.
- `// ponytail:` comments mark deliberate simplifications with a known ceiling.
  They are intent, not TODOs — read the comment before "improving" the code under it.

  
