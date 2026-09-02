# mol3ro.com

Retro desktop OS portfolio for Samuel Molero — a single-page personal site that feels like a tiny operating system. Built with Next.js App Router, React 19, and Tailwind v4. Thanks for checking out my profile <3

Live: **https://mol3ro.vercel.app**

---

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript 5** (`strict: true`, `bundler` resolution)
- **Tailwind CSS v4** — no `tailwind.config`, tokens via `@theme` in `styles/theme.css`
- **ESLint** (`eslint-config-next` + `core-web-vitals` + `typescript`)

---

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **npm** (repo ships `package-lock.json`)

---

## Setup & Run

```bash
npm install        # install deps
npm run dev        # next dev — http://localhost:3000
npm run build      # next build (Turbopack) — verifies types + compiles
npm run start      # serve the production build
npm run lint       # bare `eslint`, NOT `next lint`
```

There is no test runner or CI config in this repo by design.

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GITHUB_TOKEN` | No | Raises GitHub API rate limit for `GET /api/latest-repo`. Create at `https://github.com/settings/tokens` (no scopes needed for public data). Without it the route falls back to unauthenticated requests and still returns the profile URL. |

Copy the template:

```bash
cp .env.example .env   # then fill GITHUB_TOKEN if you want
```

All env reads are centralized in `lib/env.ts` — route handlers import from there instead of touching `process.env` directly.

---

## Project Layout

```
app/
  layout.tsx          # root layout, fonts, metadataBase
  page.tsx            # mounts MobileFrame + DesktopEnvironment (CSS picks winner)
  globals.css         # import graph — theme.css outside layer, rest in layer(components)
  api/
    github-html/      # scrapes public GitHub profile into sandboxed iframe
    latest-repo/      # latest PR or pushed repo, uses GITHUB_TOKEN if present
    pr-html/          # PR embed with fragment resolution + size/timeout guards
components/
  desktop/DesktopEnvironment.tsx  # window manager: z-order, drag, 8-dir resize
  mobile/MobileFrame.tsx          # handset shell, shares lib/shell core
  ui/Window.tsx, DockIcon.tsx, AquaButton.tsx, icons.tsx
lib/
  site.ts             # public site constants (EMAIL, PHONE, LINKEDIN, GITHUB_USER)
  env.ts              # centralized typed env (GITHUB_TOKEN)
  shell.ts            # terminal core: COMMANDS map + useShell hook
styles/
  theme.css           # @theme tokens — every literal lives here or in its component css
  desktop.css, windows.css, chrome.css, base.css, mobile.css
public/
  Samuel_Molero_SWE_Resume.pdf
```

Path alias: `@/*` resolves to the repo root (not `src/`).

---

## Architecture Notes

**Both UIs mount at once; CSS picks the winner.** `app/page.tsx` renders `<MobileFrame />` and `<DesktopEnvironment />` simultaneously wrapped in `md:hidden` / `hidden md:block`. Both trees mount and run hooks on every viewport — keep side effects idempotent.

**One shell core, two chromes.** `lib/shell.ts` owns the terminal (`COMMANDS` map + `useShell` hook). Desktop `ShellContent` and mobile `ShellTab` render their own chrome around that core. Adding a key to `COMMANDS` lights it up on both surfaces; mobile auto-generates a tap chip per command. Handlers return `string[] | Promise<string[]>` and are called **synchronously** so `latest` can `window.open` inside the user-gesture tick (awaiting first would get the popup blocked).

**Desktop WM in one file.** `components/desktop/DesktopEnvironment.tsx` owns z-order, pointer-capture drag, and eight-direction resize. Drag/resize writes the DOM directly via `--window-x`/`--window-y` custom properties and `width`/`height` — state commits only on pointer-up. Windows are registered by data: add an id to the `WINDOW_IDS` tuple (types `WindowId`) and an entry in `WINDOWS`; dock icon + window derive from that.

**Styling.** Tailwind v4 with no config file. `app/globals.css` is the import graph — `styles/theme.css` is imported **outside** any cascade layer so its `@theme` feeds Tailwind tokens; every other sheet is in `layer(components)` so utilities still win. Repo convention: no literal color/size/spacing inline in components.

**API routes** (`revalidate = 3600`): `github-html` strips `<script>` and resolves `<include-fragment>` server-side then injects `<base href="https://github.com/">`; `latest-repo` tries latest PR then latest pushed repo, falling back to the profile URL.

---

## Gotchas

- `DESKTOP_DRAG_QUERY` (`min-width: 900px`) is **duplicated** in `--breakpoint-desktop` in `styles/theme.css` — change one, change the other.
- `TopBar` clock uses `suppressHydrationWarning` — server renders build-time UTC, first interval tick corrects it (expected).
- `// ponytail:` comments mark deliberate simplifications with a known ceiling — read before "improving".
- `npm run build` warns about `package-lock.json` outside the git repo when run from a parent dir; set `turbopack.root` in `next.config` if you move the lockfile.

---

## Deployment

Deploys to **Vercel** (see `metadataBase: https://mol3ro.vercel.app` in `app/layout.tsx`). No extra build config needed — `next build` is the entire pipeline. Set `GITHUB_TOKEN` in the Vercel env dashboard if you want authenticated GitHub API calls in production.
