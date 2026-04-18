---
trigger: always_on
---

# RULES.md — Pocketool

Before writing any line of code, answering any technical question, or making any architectural decision, always read the project's technical instructions file:

```
.agents/business/instructions.md
```

This file contains all architecture decisions, tech stack with exact versions, code conventions, folder structure, design system, persistence strategy, i18n, testing, and CI/CD for the project. It is the single source of truth and must take precedence over any assumption or prior knowledge.

---

## General

- **Always read** `instructions.md` at the start of every task, even if it seems trivial.
- **Never assume** dependency versions. They are specified in `instructions.md` and those are the ones to use.
- **Never propose** alternative technologies without first checking them against the decisions already documented in `instructions.md`.
- **Never create** a new tool, component, or store without following the contracts and conventions defined in `instructions.md`.

---

## Architecture

- This is a **100% static site** (`output: 'static'` in Astro). Never suggest or introduce SSR, server middleware, or Cloudflare Workers.
- Navigation between tools is **SPA-style** using Astro `<ViewTransitions />`. Never use hard links (`<a href>` full reloads) between tools.
- Security headers (COOP/COEP) are applied exclusively via `public/_headers`. Never handle them in code.
- The project has **no backend, no database, no authentication**. Do not introduce any of these unless explicitly requested.
- The app is a **PWA**. Every tool must work fully offline after the first visit.

---

## Persistence — Two-Layer Architecture (CRITICAL)

This rule is non-negotiable. There are exactly two persistence layers and each has a strict scope:

**Layer 1 — localStorage (via `src/utils/storage.ts`):**

- **Only** for global app preferences: theme (`app:theme`), language (`app:lang`), shell UI state.
- Key naming: `app:[key]`
- **Never** use localStorage for anything related to a tool's data or state.

**Layer 2 — Dexie.js / IndexedDB (via `src/db/index.ts`):**

- **Everything** related to a tool goes here. No exceptions, regardless of data size.
- Key naming in `toolStates` table: `tool:[tool-id]:[key]`
- Access via `useLiveQuery` (reactive reads) and `db.toolStates.put()` (writes).
- **Never** call `localStorage`, `sessionStorage`, or the `storage.ts` wrapper from inside a tool component or hook.

---

## Tools System

- Every tool lives in `src/tools/[tool-id]/` and must export `index.tsx` (default React component, no required props) and `config.ts` (ToolConfig interface including `dbKeys`).
- The registry (`src/tools/registry.ts`) is auto-generated via `import.meta.glob`. **Never edit it manually** and never hardcode tool imports elsewhere.
- Tool IDs are **kebab-case, unique, and immutable**. Changing a tool ID is a breaking change (Dexie keys are tied to it).

---

## Styling

- Tailwind CSS 4 is used. There is **no `tailwind.config.mjs`**. All configuration lives in CSS via `@import "tailwindcss"` and `@theme`.
- Never use hardcoded color values. Always use CSS variables (`var(--color-*)`) or Tailwind classes mapped to those variables.
- All four themes (`dark`, `dark-hc`, `light`, `light-hc`) must work automatically via `data-theme` on `<html>`. Every component must be verified against all four.
- Never import styles or components from external libraries directly into tools. Always go through the design system atoms in `src/components/ui/`.

---

## Components

- Radix UI is the primitive library. **Never use Shadcn/ui** — it is explicitly discarded for this project.
- Never use `forwardRef` — React 19 does not require it.
- Components must be accessible. Radix handles ARIA; do not override or remove its accessibility attributes.

---

## Heavy Dependencies & Workers

- Any dependency over ~500KB must be loaded via **dynamic import inside a Web Worker**. Never in the main bundle.
- `wasm-vips` (image-optimizer): loaded in `worker.ts` via dynamic import + Comlink. Terminate the Worker on component unmount.
- TypeScript compiler (code-playground): loaded in `worker.ts` via dynamic import. Use `ts.transpileModule()` for compilation. **Never use esbuild-wasm** — the official TS compiler provides real type errors, esbuild only strips types. Terminate the Worker on component unmount.
- Show a loading indicator to the user while any heavy dependency is downloading for the first time.

---

## PWA

- The app must work fully offline after the first visit. Do not break this assumption when adding new tools or assets.
- WASM files must be included in the Workbox `globPatterns` and the `maximumFileSizeToCacheInBytes` must be set to at least 10MB (wasm-vips exceeds the 2MB default limit).
- COOP/COEP headers required by `SharedArrayBuffer` (image-optimizer, code-playground Workers) are applied **only** on those specific routes via `public/_headers` — never globally. Use `credentialless` for COEP, not `require-corp`.

---

## Image Optimizer Tool

- The comparison UI is a **canvas with two overlapping layers** (original below, processed above) controlled by a draggable slider reveal. Never implement this as a static side-by-side split.
- The slider, pan, and zoom must all work simultaneously and independently. The slider position is unaffected by zoom or pan state.
- **Resize and compression are independent operations** with separate apply buttons. Never combine them into a single "optimize" button.
- The original image is **immutable** — it never changes after upload. The processed layer always shows the result of the latest applied operation.
- **Operation order is fixed:** when both resize and compression are applied, resize always runs first (on the original), then compression runs on the resize result. Make the current pipeline state visible to the user.
- The image Blob is **never persisted in Dexie**. Only format, quality, and resize preferences are saved. The user re-uploads on each session.
- Processing only happens when the user clicks "Apply" — **never in real time** while adjusting sliders or inputs.
- Supported output formats: WEBP, JPEG, PNG, AVIF. The quality slider must be hidden for PNG (lossless).
- The Worker (`wasm-vips` + Comlink) must be loaded via dynamic import and terminated on component unmount.
- Download filename pattern: `[original-name]-pocketool.[format]`

---

## Responsive Preview Tool

- This tool handles **URL mode only**. There is no code editor inside `responsive-preview`. For code editing with preview, use `code-playground`.
- Never attempt to bypass `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`. Show a clear error message instead.
- Scroll sync is implemented via a **SyncSnippet**: a copyable script the user pastes into the target project's `<head>`. Never claim sync works without it.
- Scroll and click sync between iframes uses `postMessage` exclusively. Never access cross-origin iframe DOM directly.
- Viewport state persists in Dexie under `tool:responsive-preview:viewports`.
- Default presets (`isDefault: true`) cannot be deleted, only disabled.
- Use `transform: scale()` for visual scaling. Never resize the iframe element itself.

---

## Code Playground Tool

- The Script panel handles both JS and TS. There are **no separate tabs** for each language. Mode is controlled by an explicit `JS / TS` toggle — never auto-detect silently.
- Use the **official TypeScript compiler** (`typescript` package) in a dedicated Worker. Never use esbuild-wasm.
- The TS compiler Worker must be loaded via dynamic import **only when the user activates TS mode for the first time**. Never in the main bundle.
- Console interception happens **inside the iframe** by overriding `console.*` and sending messages to the parent via `postMessage`. Never intercept from outside the iframe.
- Always implement a **5-second timeout** for code execution to prevent infinite loops.
- The iframe must use `sandbox="allow-scripts"` **without** `allow-same-origin` for security isolation.
- The **Clean button** only clears editor content (HTML, CSS, Script). Never touches snippets, panel state, or run mode. Always show a confirm dialog.
- Built-in snippets are **read-only**. Custom snippets have a hard limit of 50.
- All playground state persists in Dexie. Custom snippets persist in the `snippets` table with `toolId: 'code-playground'`.

---

## Testing

- Every piece of logic must have a Vitest unit test.
- Every tool must have at least one Playwright e2e test covering its critical user flow.
- Tests are part of the Definition of Done. A tool is not complete without its tests.
- Test Dexie operations using `fake-indexeddb` — never a real IndexedDB in unit tests.
- Never mock the `storage.ts` wrapper with direct localStorage mocks — mock the wrapper module itself.

---

## Code Quality

- TypeScript `strict: true` is non-negotiable. Never use `any` without an explanatory comment.
- All imports use path aliases (`@/*`, `@ui/*`, `@tools/*`). Never use relative `../../` imports across domain boundaries.
- Commits must follow Conventional Commits (`feat`, `fix`, `chore`, `refactor`, `test`, `docs`).
- `pnpm` is the only allowed package manager. Never generate `npm` or `yarn` commands.
