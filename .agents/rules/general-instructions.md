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

---

## Tools System

- Every tool lives in `src/tools/[tool-id]/` and must export `index.tsx` (default React component, no required props) and `config.ts` (ToolConfig interface).
- The registry (`src/tools/registry.ts`) is auto-generated via `import.meta.glob`. **Never edit it manually** and never hardcode tool imports elsewhere.
- Tool IDs are **kebab-case, unique, and immutable**. Changing a tool ID is a breaking change.

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

## State & Persistence

- **Never use `localStorage` directly.** Always use the wrapper at `src/utils/storage.ts`.
- Key naming convention is strict: `tool:[tool-id]:[key]` for tool data, `app:[key]` for global preferences.
- Every tool that persists data must define `storageVersion` and a `migrate()` function in its `config.ts`.

---

## Heavy Dependencies

- `wasm-vips` and its Worker must be loaded via **dynamic import** only inside the image-optimizer tool. They must never appear in the main bundle.
- Always call `worker.terminate()` when unmounting the image-optimizer component to free memory.

---

## i18n

- Default language is **Spanish (`es`)**. The default locale has no URL prefix.
- Language detection uses `navigator.language` on first visit and persists the result to localStorage (`app:lang`).
- All user-facing strings must exist in both `src/i18n/es/` and `src/i18n/en/`. Never hardcode strings inside components.

---

## Testing

- Every piece of logic must have a Vitest unit test.
- Every tool must have at least one Playwright e2e test covering its critical user flow.
- Tests are part of the Definition of Done. A tool is not complete without its tests.
- Never mock `localStorage` directly — use the `storage.ts` wrapper and mock that instead.

---

## Code Quality

- TypeScript `strict: true` is non-negotiable. Never use `any` without an explanatory comment.
- All imports use path aliases (`@/*`, `@ui/*`, `@tools/*`). Never use relative `../../` imports across domain boundaries.
- Commits must follow Conventional Commits (`feat`, `fix`, `chore`, `refactor`, `test`, `docs`).
- `pnpm` is the only allowed package manager. Never generate `npm` or `yarn` commands.
