# Contributing to Pocketool

Thanks for taking the time to contribute! This document covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Adding a New Tool](#adding-a-new-tool)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Testing](#testing)

---

## Code of Conduct

Be respectful, constructive, and collaborative. We welcome contributors of all experience levels.

---

## Getting Started

**Requirements:** Node >= 22.12.0 and pnpm.

```bash
# Fork and clone
git clone https://github.com/<your-username>/pocketool.git
cd pocketool

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

---

## Project Structure

```
src/
├── components/ui/     # Shared UI atoms (Button, Badge, etc.)
├── db/                # Dexie (IndexedDB) schema and instance
├── i18n/              # Translation files (en/, es/)
├── layouts/           # Astro shell layout
├── pages/             # Astro page routes
└── tools/             # One folder per tool
    └── [tool-id]/
        ├── index.tsx  # Main React component
        └── config.ts  # Tool metadata

tests/
├── unit/              # Vitest unit tests
└── e2e/               # Playwright end-to-end tests
```

---

## Adding a New Tool

Tools are auto-registered via `import.meta.glob` — no manual wiring needed.

### 1. Create the folder

```
src/tools/my-tool/
├── index.tsx
└── config.ts
```

### 2. Define the config

```ts
// src/tools/my-tool/config.ts
import type { ToolConfig } from '@/tools/types';
import { Wrench } from 'lucide-react';

const config: ToolConfig = {
  id: 'my-tool',
  title: 'My Tool',
  description: 'Does something useful.',
  icon: Wrench,
};

export default config;
```

### 3. Build the component

```tsx
// src/tools/my-tool/index.tsx
export default function MyTool() {
  return <div>Hello from My Tool</div>;
}
```

### Rules

| Concern             | Rule                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| **UI components**   | Use atoms from `src/components/ui/`. No external UI libs.                   |
| **Persistence**     | Use the `db` Dexie instance (`src/db`). Never `localStorage` for tool data. |
| **State keys**      | Follow the pattern `tool:[tool-id]:[key]` for `toolStates` records.         |
| **i18n**            | Add strings to `src/i18n/en/tools.json` and `src/i18n/es/tools.json`.       |
| **Heavy libraries** | Anything > 500 KB must be loaded via a dynamic import or Web Worker.        |

---

## Development Workflow

```bash
pnpm dev          # Dev server at localhost:4321
pnpm build        # Production build
pnpm typecheck    # TypeScript + Astro check
pnpm lint         # ESLint
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright end-to-end tests
```

---

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

| Type       | When to use                          |
| ---------- | ------------------------------------ |
| `feat`     | New tool or feature                  |
| `fix`      | Bug fix                              |
| `refactor` | Code change with no behaviour change |
| `test`     | Adding or updating tests             |
| `docs`     | Documentation only                   |
| `chore`    | Tooling, deps, config                |

**Examples:**

```
feat(base64): add encoder/decoder tool
fix(json-viewer): correct search match count off-by-one
docs: add CONTRIBUTING guide
```

---

## Pull Request Guidelines

1. **Branch** from `master` using a descriptive name: `feat/my-tool`, `fix/issue-description`.
2. Keep PRs focused — one tool or one fix per PR.
3. Include at least one **unit test** (Vitest) and one **e2e test** (Playwright) for new tools.
4. Fill in the PR template: describe what changed and how to test it.
5. Ensure `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass before opening the PR.

---

## Testing

**Unit tests** live in `tests/unit/` and run with Vitest. Test pure logic only — no Dexie mocking required for most cases.

```bash
pnpm test           # Run once
pnpm test:watch     # Watch mode
```

**End-to-end tests** live in `tests/e2e/` and run with Playwright across Chrome, Firefox, and Safari.

```bash
pnpm test:e2e
```

For a new tool, the minimum expected coverage is:

- Unit: core logic functions (data transforms, validators, helpers)
- E2E: happy path (tool loads, performs its main action, output is correct)
