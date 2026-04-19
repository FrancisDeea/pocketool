# PROJECT_RULES.md — Pocketool (Multi-Tool Dev Hub)

> Living document covering architecture, technical decisions, and project standards.
> Update with every relevant decision made during development.

---

## 1. Vision & Philosophy

**Pocketool** is a web application of essential developer tools, built around these principles:

- **Local-first:** No server, no remote database. Everything lives in the user's browser.
- **Performance-first:** Zero unnecessary JS. Island architecture. Aggressive lazy loading.
- **Functional minimalism:** The UI serves the tool, never the other way around.
- **Convention-driven scalability:** Adding a new tool requires no changes to core code.
- **Offline-ready:** The app works without a connection thanks to PWA + Service Worker.

### MVP Tools

| ID                   | Name               | Description                                                               |
| -------------------- | ------------------ | ------------------------------------------------------------------------- |
| `json-viewer`        | JSON Viewer        | Collapsible tree, search, format, copy and download large JSON files      |
| `markdown-editor`    | Markdown Editor    | Editor with preview, GFM support, Mermaid diagrams, copy and download     |
| `image-optimizer`    | Image Optimizer    | Squoosh-style optimizer with wasm-vips, before/after comparison           |
| `notes`              | Quick Notes        | Quick note manager with tags, search, and local persistence               |
| `responsive-preview` | Responsive Preview | Multi-viewport view of external URLs with synchronized scroll and clicks  |
| `code-playground`    | Code Playground    | HTML/CSS/Script editor with preview, console, and snippet library         |

---

## 2. Tech Stack

| Layer                      | Technology                                  | Reason                                                                 |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Framework                  | Astro **6.x**                               | Island architecture, zero-JS by default, native i18n                  |
| UI (interactive islands)   | React **19**                                | Concurrent features, ecosystem, Radix compatibility                    |
| Styling                    | Tailwind CSS **4.x**                        | Utility-first, CSS-based config (not JS), native `@theme`              |
| Global state (UI/prefs)    | Nanostores **1.2** + @nanostores/persistent | Lightweight, isomorphic, only for preferences and UI state             |
| Tool persistence           | Dexie.js (latest)                           | Typed IndexedDB, reactive, ~1GB capacity, binary data support          |
| Primitive components       | Radix UI (latest)                           | Accessibility, headless, no friction with Astro                        |
| Command Palette            | cmdk (latest)                               | Built on Radix, search semantics, lightweight                          |
| Text editors               | CodeMirror **6** (latest)                   | Modular, superior mobile performance vs Monaco, accessible             |
| Icons                      | Lucide React **1.8**                        | Tree-shakeable, consistent, actively maintained                        |
| Images (WASM)              | wasm-vips + Comlink                         | Real multi-threading in WebWorker, same API as libvips                 |
| TS compiler (Playground)   | typescript (official, latest)               | Real type-checking, full errors, complete fidelity                     |
| PWA                        | @vite-pwa/astro (latest)                    | Service Worker, offline, WASM caching, installable                     |
| Unit testing               | Vitest **4.x** + Testing Library            | Native with Vite, fast, compatible with the Astro ecosystem            |
| E2E testing                | Playwright **1.59.x**                       | Industry standard, multi-browser, visual regression                    |
| Deployment                 | Cloudflare Pages                            | Edge CDN, `_headers` integration, first-class WASM support             |
| Package manager            | pnpm (latest)                               | Workspace support, disk efficiency, faster than npm/yarn               |

### Important note: Tailwind CSS 4

Tailwind 4 removes `tailwind.config.mjs`. Configuration now lives in CSS:

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-accent: /* to be defined */;
  --font-mono: "Space Mono", monospace;
  /* rest of the design system tokens */
}
```

No JS config file. Plugins are also imported in CSS.

### Why Radix UI instead of Shadcn/ui

Shadcn is designed for Next.js and assumes RSC. In Astro it creates friction. Radix UI are the primitives Shadcn is built on: accessible, headless, and framework-agnostic. They are styled directly with Tailwind, giving full control and a smaller bundle.

### Why the official TypeScript compiler instead of esbuild-wasm

esbuild only transpiles (strips types) but does not verify them. The official TypeScript compiler does full type-checking: errors with line, column, and exact message. In a TS playground, showing real type errors is the difference between a useful tool and one that gives false confidence. The size is similar (~6MB vs ~8MB) and both are loaded lazily in a Worker.

---

## 3. Persistence Architecture (Two Layers)

Persistence is split into two layers with clear, non-interchangeable responsibilities.

### Layer 1: localStorage — Preferences and UI state

Managed exclusively via `src/utils/storage.ts`. Only for small, global, frequently synchronously accessed data that does NOT belong to any specific tool.

**What goes in localStorage:**

- Active theme (`app:theme`)
- Preferred language (`app:lang`)
- Shell panel visibility state (sidebar, topbar)
- Any global app preference

**What does NOT go in localStorage:** anything related to a tool's content or state. No exceptions.

### Layer 2: Dexie.js (IndexedDB) — Tool data

Everything that belongs to a tool, regardless of size, goes into IndexedDB via Dexie. This includes small data like the last URL of `responsive-preview` or large data like notes, saved JSON, or playground history.

**Advantages over localStorage for tool data:**

- ~1GB capacity vs ~10MB
- Native binary data support (processed images, Blobs)
- Non-blocking async API
- Real transactions
- Indexed queries

### Database definition (`src/db/index.ts`)

```typescript
import Dexie, { type EntityTable } from "dexie";

// Main table: persistent state for each tool
interface ToolState {
  id: string;       // 'tool:[tool-id]:[key]' — Primary Key
  content: unknown; // tool data, typed within each tool
  updatedAt: number; // timestamp for sorting and expiry
}

// History/session table (optional per tool)
interface ToolHistory {
  id?: number;    // autoincrement
  toolId: string; // 'json-viewer', 'code-playground', etc.
  timestamp: number;
  data: unknown;
}

// Playground snippets table
interface Snippet {
  id: string;      // uuid
  toolId: string;  // 'code-playground'
  name: string;
  description: string;
  lang: "html" | "css" | "js" | "ts";
  content: string;
  isBuiltIn: boolean;
  createdAt: number;
}

// Notes table
interface Note {
  id: string; // uuid
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

class PocketoolDB extends Dexie {
  toolStates!: EntityTable<ToolState, "id">;
  toolHistory!: EntityTable<ToolHistory, "id">;
  snippets!: EntityTable<Snippet, "id">;
  notes!: EntityTable<Note, "id">;

  constructor() {
    super("PocketoolDB");
    this.version(1).stores({
      toolStates: "id, updatedAt",
      toolHistory: "++id, toolId, timestamp",
      snippets: "id, toolId, isBuiltIn, createdAt",
      notes: "id, updatedAt, *tags",
    });
  }
}

export const db = new PocketoolDB();
```

### Dexie ID convention

```
tool:[tool-id]:[key]

Examples:
  tool:json-viewer:last-input
  tool:responsive-preview:last-url
  tool:responsive-preview:viewports
  tool:code-playground:editor-html
  tool:code-playground:editor-css
  tool:code-playground:editor-script
  tool:code-playground:preferences
  tool:markdown-editor:content
```

### Dexie access hooks

Each tool accesses Dexie via `useLiveQuery` from `dexie-react-hooks` for automatic reactivity, and `db.toolStates.put()` / `db.toolStates.get()` for direct writes and reads.

```typescript
// Reactive read pattern in a tool
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

const state = useLiveQuery(
  () => db.toolStates.get("tool:json-viewer:last-input"),
  [],
);

// Write pattern
await db.toolStates.put({
  id: "tool:json-viewer:last-input",
  content: value,
  updatedAt: Date.now(),
});
```

### localStorage wrapper (`src/utils/storage.ts`)

For the global preferences layer. Never for tool data.

```typescript
type StorageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: "quota_exceeded" | "unavailable" | "parse_error" };

function storageGet<T>(key: string): StorageResult<T>;
function storageSet<T>(key: string, value: T): StorageResult<void>;
function storageDelete(key: string): void;
function storageExport(): Record<string, unknown>;
function storageImport(backup: Record<string, unknown>): void;
```

Covered cases:

| Case                   | Behavior                                          |
| ---------------------- | ------------------------------------------------- |
| Quota exceeded         | Toast with option to clear data                   |
| Safari private mode    | App works in-memory, non-intrusive banner         |
| Corrupted JSON         | Deletes the key, notifies the user                |
| Outdated schema        | `migrate()` function in the tool's config         |
| Manual backup          | Export/import everything as JSON from Settings    |

---

## 4. PWA — Progressive Web App

### Goal

Pocketool works completely offline once installed. The Service Worker caches all static assets, including heavy WASM files (`wasm-vips`, the TypeScript compiler).

### Integration with Astro 6 + Cloudflare Pages

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa"; // @vite-pwa/astro uses VitePWA internally

export default defineConfig({
  output: "static",
  integrations: [react()],
  vite: {
    plugins: [
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        workbox: {
          // Critical: wasm-vips and typescript exceed the default 2MB limit
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
          globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
          // Cache strategy for WASM: cache-first, valid for 1 year
          runtimeCaching: [
            {
              urlPattern: /\.wasm$/,
              handler: "CacheFirst",
              options: {
                cacheName: "wasm-cache",
                expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        manifest: {
          name: "Pocketool",
          short_name: "Pocketool",
          description: "Developer tools in your pocket",
          theme_color: "#0d0d0d",
          background_color: "#0d0d0d",
          display: "standalone",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
  },
});
```

### COOP/COEP conflict with Service Worker

The PWA Service Worker and `SharedArrayBuffer` (required for wasm-vips and the TS compiler in a Worker) both require COOP/COEP headers. However, applying them globally breaks external resources (iframes in `responsive-preview`).

**Solution:** apply COOP/COEP headers only on the routes that need them, via `public/_headers`. The Service Worker works correctly with this selective configuration because the SW scope covers the entire app but the restrictive headers only affect the routes that define them.

```
# public/_headers

/tool/image-optimizer
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless

/tool/code-playground
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless

/assets/*.wasm
  Cross-Origin-Resource-Policy: cross-origin
  Cache-Control: public, max-age=31536000, immutable
```

> **Note:** `credentialless` (instead of `require-corp`) is less restrictive and allows loading external resources without needing the `CORP` header on each one. It is the right choice for an app that embeds third-party iframes.

### Offline behavior

- First visit: the SW installs and caches all assets.
- Subsequent visits: served from cache, no network required.
- Updates: `registerType: 'autoUpdate'` updates the SW in the background and reloads the app when done.
- IndexedDB (Dexie) persists between sessions regardless of network state.

---

## 5. Folder Structure

```
pocketool/
├── public/
│   ├── _headers                        # HTTP headers per route (Cloudflare Pages)
│   ├── _redirects
│   └── icons/                          # PWA icons (192, 512)
├── src/
│   ├── components/
│   │   ├── ui/                         # Primitives (Button, Badge, Tooltip, etc.)
│   │   └── layout/                     # Shell, Sidebar, TopBar, CommandPalette
│   ├── db/
│   │   └── index.ts                    # Dexie: database and table definitions
│   ├── i18n/
│   │   ├── es/
│   │   │   ├── ui.json
│   │   │   └── tools.json
│   │   └── en/
│   │       ├── ui.json
│   │       └── tools.json
│   ├── layouts/
│   │   └── ToolLayout.astro            # Base layout injected into each tool
│   ├── pages/
│   │   ├── index.astro
│   │   └── [lang]/
│   │       └── tool/
│   │           └── [slug].astro
│   ├── stores/
│   │   ├── theme.ts                    # Nanostore: active theme (localStorage)
│   │   └── preferences.ts             # Nanostore: global preferences (localStorage)
│   ├── tools/
│   │   ├── registry.ts                 # import.meta.glob — do NOT edit manually
│   │   ├── json-viewer/
│   │   │   ├── index.tsx
│   │   │   └── config.ts
│   │   ├── markdown-editor/
│   │   │   ├── index.tsx
│   │   │   └── config.ts
│   │   ├── image-optimizer/
│   │   │   ├── index.tsx
│   │   │   ├── config.ts
│   │   │   └── worker.ts               # Web Worker wasm-vips + Comlink
│   │   ├── notes/
│   │   │   ├── index.tsx
│   │   │   └── config.ts
│   │   ├── responsive-preview/
│   │   │   ├── index.tsx
│   │   │   ├── config.ts
│   │   │   ├── components/
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   ├── ViewportFrame.tsx
│   │   │   │   ├── ViewportGrid.tsx
│   │   │   │   └── ViewportManager.tsx
│   │   │   └── hooks/
│   │   │       ├── useSyncBridge.ts
│   │   │       └── useViewports.ts
│   │   └── code-playground/
│   │       ├── index.tsx
│   │       ├── config.ts
│   │       ├── worker.ts               # Web Worker official TypeScript compiler
│   │       ├── components/
│   │       │   ├── Toolbar.tsx
│   │       │   ├── EditorPanel.tsx
│   │       │   ├── PreviewPanel.tsx
│   │       │   ├── ConsolePanel.tsx
│   │       │   └── SnippetsDrawer.tsx
│   │       └── hooks/
│   │           ├── usePlayground.ts
│   │           ├── useConsole.ts
│   │           ├── useTsCompiler.ts
│   │           └── useSnippets.ts
│   └── utils/
│       ├── storage.ts                  # localStorage wrapper (global preferences only)
│       ├── i18n.ts
│       └── detect-lang.ts
├── tests/
│   ├── unit/
│   └── e2e/
├── astro.config.mjs
├── vitest.config.ts
├── playwright.config.ts
└── pnpm-workspace.yaml
```

---

## 6. Tool Auto-Registry System

### Required contract for each tool

**`config.ts`**

```typescript
import type { ToolConfig } from "@/tools/registry";

export const config: ToolConfig = {
  id: "json-viewer",
  title: "JSON Viewer",
  description: "Explore and format JSON of any size",
  category: "data", // 'data' | 'text' | 'media' | 'productivity' | 'preview'
  tags: ["json", "format", "tree", "search"],
  icon: "Braces", // Lucide icon name
  author: "your-username",
  version: "1.0.0",
  dbKeys: ["tool:json-viewer:last-input"], // keys this tool uses in Dexie
};
```

**`index.tsx`**

```typescript
export default function JsonViewer() { ... }
```

### `registry.ts` (do not edit manually)

```typescript
const toolModules = import.meta.glob('./*/index.tsx');
const configModules = import.meta.glob('./*/config.ts', { eager: true });

export function getAllTools(): ToolConfig[] { ... }
export async function loadTool(id: string) { ... }
```

---

## 7. Internationalization (i18n)

- **Default language:** Spanish (`es`)
- **Detection:** `navigator.language` on first access. Preference persisted in localStorage (`app:lang`) via Nanostores.
- **Routes:** `/tool/json-viewer` (es), `/en/tool/json-viewer` (en). No prefix for the default language.
- **Strings:** never hardcoded in components. Always from `src/i18n/[lang]/`.

```typescript
// astro.config.mjs
i18n: {
  defaultLocale: 'es',
  locales: ['es', 'en'],
  routing: { prefixDefaultLocale: false }
}
```

---

## 8. Navigation and Security Headers

The project uses `output: 'static'`. No server, no SSR, no Cloudflare Workers. Navigation is SPA with Astro's `<ViewTransitions />`. Headers are managed exclusively via `public/_headers`.

```
# public/_headers

/tool/image-optimizer
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless

/tool/code-playground
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless

/assets/*.wasm
  Cross-Origin-Resource-Policy: cross-origin
  Cache-Control: public, max-age=31536000, immutable
```

---

## 9. Lazy Loading of Heavy Dependencies

Any dependency exceeding ~500KB must be loaded via dynamic import inside a Web Worker, never in the main bundle.

### Image Optimizer (wasm-vips)

```typescript
// image-optimizer/index.tsx
useEffect(() => {
  let w: Worker;
  (async () => {
    const { wrap } = await import("comlink");
    w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    setWorker(wrap<VipsWorker>(w));
  })();
  return () => w?.terminate();
}, []);
```

### Code Playground (TypeScript compiler)

```typescript
// code-playground/worker.ts — loaded only when the user activates TS mode
import * as ts from "typescript";

self.onmessage = ({ data: { code, id } }) => {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      strict: true,
    },
  });

  // Collect type diagnostics
  const diagnostics =
    ts.transpileModule(code, {
      compilerOptions: { strict: true },
      reportDiagnostics: true,
    }).diagnostics ?? [];

  self.postMessage({ id, output: result.outputText, diagnostics });
};
```

The Worker is destroyed on component unmount to free the ~6MB compiler from memory.

---

## 10. Theme System

4 variants via `data-theme` on `<html>`:

| Value      | Description                               |
| ---------- | ----------------------------------------- |
| `dark`     | Dark mode, standard contrast (default)    |
| `dark-hc`  | Dark mode, high contrast                  |
| `light`    | Light mode, standard contrast             |
| `light-hc` | Light mode, high contrast                 |

Detected from `prefers-color-scheme` + `prefers-contrast` on first access. Persisted in localStorage (`app:theme`) via Nanostores. Never use hardcoded colors — always `var(--color-*)`.

---

## 11. Design System — Atoms

All base components in `src/components/ui/`. Tools never import directly from external libraries.

Priority components for MVP: `Button`, `Tooltip`, `Badge`, `Dialog`, `DropdownMenu`, `Tabs`, `ScrollArea`, `Toast`, `CommandPalette`.

---

## 12. Responsiveness

| Breakpoint | Layout                                                               |
| ---------- | -------------------------------------------------------------------- |
| `< 768px`  | Single column. Panels separated by Radix Tabs.                       |
| `≥ 768px`  | Dual Panel: Input left, Output right, draggable resize handle.       |

Layout switching is the responsibility of `ToolLayout.astro`, not of each individual tool.

---

## 13. Testing

### Philosophy

- Test behavior, not implementation.
- Tests are part of the Definition of Done. A tool without tests is not complete.

### Vitest

```typescript
// vitest.config.ts (Vitest 4.x)
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
});
```

What to test: logic of each tool, storage.ts wrapper, i18n system, auto-registry, Dexie operations (with fake-indexeddb).

### Playwright (e2e)

| Tool               | Critical flow                                                    |
| ------------------ | ---------------------------------------------------------------- |
| JSON Viewer        | Paste JSON → tree renders → search key → correct result          |
| JSON Viewer        | Invalid JSON → clear error shown                                 |
| Markdown Editor    | Write MD → preview updates → download `.md`                      |
| Markdown Editor    | Mermaid block → diagram rendered                                 |
| Image Optimizer    | Upload image → optimize → download                               |
| Notes              | Create note → persists after reload → delete                     |
| Responsive Preview | Valid URL → iframes render with correct widths                   |
| Responsive Preview | Blocked URL → error visible                                      |
| Code Playground    | HTML+CSS → preview updates                                       |
| Code Playground    | JS → console.log → appears in console                            |
| Code Playground    | TS with type error → error in console                            |
| Global             | Command Palette → navigate to tool                               |
| Global             | Change theme → persists after reload                             |
| Global             | Install PWA → works offline                                      |

---

## 14. CI/CD

```
GitHub → push/PR → GitHub Actions
  ├── pnpm install
  ├── pnpm typecheck
  ├── pnpm lint
  ├── pnpm test (Vitest)
  ├── pnpm build
  └── Cloudflare Pages (auto-deploy on merge to main)

PRs → Playwright e2e on Cloudflare Pages preview URL
```

---

## 15. Code Conventions

| Element           | Convention          | Example              |
| ----------------- | ------------------- | -------------------- |
| React components  | PascalCase          | `JsonTree.tsx`       |
| Hooks             | camelCase with `use`| `useLocalStorage.ts` |
| Nanostores stores | camelCase with `$`  | `$theme`             |
| Utilities         | camelCase           | `formatBytes.ts`     |
| Constants         | SCREAMING_SNAKE     | `MAX_FILE_SIZE`      |
| Tool IDs          | kebab-case          | `json-viewer`        |
| Dexie keys        | `tool:id:key`       | `tool:notes:list`    |
| localStorage keys | `app:key`           | `app:theme`          |

- TypeScript `strict: true` always. No `any` without a comment.
- Path aliases: `@/*`, `@ui/*`, `@tools/*`. No relative cross-domain imports.
- Commits: Conventional Commits (`feat`, `fix`, `chore`, `refactor`, `test`, `docs`).
- `pnpm` exclusively.

---

## 16. Adding a New Tool (Checklist)

```
[ ] Create folder src/tools/[new-tool]/
[ ] Define config.ts with all ToolConfig fields + dbKeys
[ ] Create index.tsx (component with no required props)
[ ] Add strings to src/i18n/es/tools.json and src/i18n/en/tools.json
[ ] Use only atoms from src/components/ui/ for UI
[ ] Use Dexie (db) for all tool data persistence
[ ] Never use localStorage directly from a tool
[ ] Write unit tests in tests/unit/[new-tool]/
[ ] Document and cover the critical e2e flow in tests/e2e/
[ ] Verify it works across all 4 themes and on mobile/desktop
[ ] Verify it works offline (PWA)
```

---

## 17. Spec: `image-optimizer`

### Concept

Squoosh-style image optimizer with an interactive comparison canvas (zoom, pan, slider reveal), multi-format compression, and resizing. All operations run in a Web Worker with wasm-vips — no server, no third-party uploads.

### Comparison canvas (main UI)

The main container is an interactive canvas with two overlapping layers:

- **Bottom layer (always):** original image, never modified.
- **Top layer:** processed image (result of the last applied operation), with a dynamic `clip-path` controlled by the slider.

The slider is a draggable vertical bar that visually splits the canvas in two. Dragging it reveals more or less of the processed image over the original. The slider is always visible and interactive regardless of zoom level.

**Canvas interactions:**

- **Pan:** drag with mouse or touch moves both layers simultaneously.
- **Zoom:** mouse wheel or pinch on mobile. Range: 0.1x – 10x. Reset zoom and fit-to-screen buttons in toolbar.
- **Slider:** drag horizontally between 0% and 100% of the width.

**Info panel (always visible above canvas):**

- Left: `Original · 691 KB · 1920×1080`
- Right: `Result · 140 KB · 1280×720 · WEBP · -79.6%`

The savings percentage is colored green if positive and red if the result is larger than the original.

### Independent operations

Resize and compression are independent operations with their own controls and apply button. They can be used separately or in combination. The result of each operation becomes the current processed image shown on the right side of the slider.

**Operation order when both are used:** resize is always applied first (on the original), and compression is applied on the resize result. If the user applies compression and then resize, the resize is applied on the original and the previous compression is discarded from the pipeline (the final result is resize only). This avoids ambiguity. The UI must make the current pipeline state clear.

**Pipeline state:**

```typescript
type ProcessedState = {
  blob: Blob;
  width: number;
  height: number;
  format: OutputFormat;
  sizeBytes: number;
  operations: ("resize" | "compress")[];
};
```

### Resize controls

- **Width presets:** Original (no resize), 1920px, 1280px, 800px, 400px.
- **Custom:** free numeric width input (in px).
- **Maintain ratio:** toggle active by default. When active, height is calculated automatically. When disabled, an editable height input appears.
- **"Apply resize" button:** processes in the Worker and updates the processed image.

### Compression controls

- **Format:** WEBP · JPEG · PNG · AVIF. Tab/pill selector.
- **Quality:** slider 1–100. Only visible for lossy formats (WEBP, JPEG, AVIF). PNG is lossless, no slider shown.
- **"Apply compression" button:** processes in the Worker and updates the processed image.

### Download

A single always-visible "Download" button downloads the current state of the processed image (or the original if no operation has been applied). The filename follows the pattern: `[original-name]-pocketool.[format]`.

### Worker (wasm-vips + Comlink)

```typescript
// image-optimizer/worker.ts
import { expose } from 'comlink';
import Vips from 'wasm-vips';

const api = {
  async resize(blob: Blob, width: number, height: number | null): Promise<Blob> { ... },
  async compress(blob: Blob, format: OutputFormat, quality: number): Promise<Blob> { ... },
};

expose(api);
```

Loaded via dynamic import in `index.tsx`. Destroyed with `worker.terminate()` on component unmount.

### Persistence (Dexie)

```typescript
// tool:image-optimizer:last-format  → OutputFormat
// tool:image-optimizer:last-quality → number
// tool:image-optimizer:last-resize  → { preset: string, width: number, height: number | null, keepRatio: boolean }
```

The image itself is **not persisted** in Dexie — it is a binary Blob that the user re-uploads each session. Only format, quality, and resize preferences are remembered.

### Supported formats

| Format | Lossy | Lossless | wasm-vips support |
| ------ | ----- | -------- | ----------------- |
| WEBP   | ✅    | ✅       | ✅                |
| JPEG   | ✅    | ❌       | ✅                |
| PNG    | ❌    | ✅       | ✅                |
| AVIF   | ✅    | ✅       | ✅                |

### File structure

```
src/tools/image-optimizer/
├── index.tsx
├── config.ts
├── worker.ts                      # wasm-vips + Comlink
├── components/
│   ├── CompareCanvas.tsx          # Interactive canvas with pan, zoom, and slider
│   ├── SliderReveal.tsx           # Draggable comparison bar
│   ├── ResizeControls.tsx         # Presets, custom input, ratio toggle
│   ├── CompressControls.tsx       # Format, quality slider
│   └── ImageInfoBar.tsx           # Original vs Result with metrics
└── hooks/
    ├── useImageProcessor.ts       # Orchestrates Worker, pipeline state
    ├── useCanvasInteraction.ts    # Pan, zoom, mouse/touch events
    └── useSlider.ts               # Slider reveal state and drag
```

### Required e2e tests

| Flow              | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| Upload image      | Drag & drop or file picker → image appears in canvas                |
| WEBP compression  | Apply → result visible on right side → info bar updated             |
| PNG compression   | No quality slider visible → correct result                          |
| AVIF compression  | Apply → result visible                                              |
| Resize preset     | Select 800px → Apply → dimensions updated in info bar               |
| Custom resize     | Enter 600px with ratio → height calculated automatically            |
| Resize + Compress | Apply resize → apply compression → result combines both             |
| Slider            | Drag slider → clip-path changes → both images visible               |
| Zoom              | Scroll → zoom in/out → pan → slider still functional                |
| Download          | Download button → file with correct name and format                 |

---

## 18. Spec: `responsive-preview`

### Concept

Simultaneous multi-viewport view for testing **external URLs** across multiple screen sizes at once, with synchronized scroll and clicks. URL-only mode — no code editor (that is `code-playground`).

### Persistence (Dexie)

```typescript
// tool:responsive-preview:last-url → string
// tool:responsive-preview:viewports → Viewport[]
// tool:responsive-preview:sync → boolean
```

### Viewport synchronization

Since Same-Origin Policy prevents reading the scroll of external iframes, synchronization is implemented with a **SyncSnippet**: a modal that shows an ~8-line script the user copies and pastes into the `<head>` of the local project they are testing. That script listens to the local `window` scroll and emits `window.parent.postMessage({ type: 'SYNC_SCROLL', scrollY })`. The parent component receives the message and propagates it to the rest of the iframes.

This approach is honest about the technical limitation and provides a practical solution for the real use case (testing a local project).

**Click sync:** same mechanism via `postMessage`, only works if the target site cooperates.

Synchronization is toggled on/off with a switch. A clear notice is always shown that it requires the script in the target project.

### Viewports and presets

| Name     | Width  | Orientation |
| -------- | ------ | ----------- |
| Mobile S | 320px  | portrait    |
| Mobile L | 390px  | portrait    |
| Tablet   | 768px  | portrait    |
| Laptop   | 1280px | landscape   |
| Desktop  | 1440px | landscape   |

Base presets: non-deletable (`isDefault: true`), only deactivatable. Users can add custom viewports. Everything persists in Dexie.

### Layout

Horizontal scroll. `transform: scale()` so each iframe fits on screen while maintaining its real width. Click on viewport → focus mode (full screen). Escape → back to grid.

### Documented limitations

- **X-Frame-Options / CSP:** sites with `frame-ancestors 'none'` cannot be embedded. Clear message to user.
- **Sync:** requires the target site to include the SyncSnippet. Without it, no sync.
- **No screenshot capture:** out of MVP scope.

### File structure

```
src/tools/responsive-preview/
├── index.tsx
├── config.ts
├── components/
│   ├── Toolbar.tsx
│   ├── ViewportFrame.tsx
│   ├── ViewportGrid.tsx
│   ├── ViewportManager.tsx
│   └── SyncSnippet.tsx       # Modal with the script to copy
└── hooks/
    ├── useSyncBridge.ts
    └── useViewports.ts
```

### Required e2e tests

| Flow            | Description                                                    |
| --------------- | -------------------------------------------------------------- |
| Valid URL       | Paste URL → iframes render → label shows correct width         |
| Blocked URL     | X-Frame-Options → error message visible                        |
| Custom viewport | Add 1024px → appears in grid → persists after reload           |
| Viewport toggle | Deactivate → disappears from grid without being deleted        |
| Focus mode      | Click → full screen → Escape returns to grid                   |
| SyncSnippet     | Modal opens → code visible and copyable                        |

---

## 19. Spec: `code-playground`

### Concept

Code playground with three hideable panels: Editor (HTML/CSS/Script), Preview (iframe), and Console. Supports JS and TS with the official TypeScript compiler in a dedicated Worker. Includes a built-in snippet library and custom snippets saved in Dexie.

### Panels

- **Editor:** HTML / CSS / Script tabs. CodeMirror 6 per tab. JS/TS toggle in the Script panel toolbar.
- **Preview:** iframe with `srcdoc`. Auto-update (debounced 500ms) or manual based on run mode.
- **Console:** intercepts `console.*` + `window.onerror` + `window.onunhandledrejection` inside the iframe via `postMessage`. Shows type, message, and stack trace.

### TypeScript compilation

The official TypeScript compiler (`typescript` package) is loaded in a dedicated Worker via dynamic import, only when the user activates TS mode for the first time. Shows a loading indicator while downloading (~6MB). The Worker is destroyed on component unmount. Provides full type errors with line and column, not just transpilation.

### Security sandbox

```html
<iframe sandbox="allow-scripts" srcdoc="..."></iframe>
```

The `sandbox="allow-scripts"` attribute without `allow-same-origin` completely isolates the executed code. A 5s timeout aborts executions that do not finish (infinite loops).

### Snippets

**Built-in (read-only):** curated collection in Dexie, seeded on the tool's first launch.

| Category  | Examples                                                  |
| --------- | --------------------------------------------------------- |
| JS Utils  | debounce, throttle, deep clone, sleep, fetch wrapper      |
| Array     | groupBy, chunk, flatten, unique, zip                      |
| DOM       | querySelector helper, event delegation, drag & drop base  |
| CSS       | reset, flexbox center, responsive grid, custom scrollbar  |
| TS        | utility types, generic typed fetch                        |

**Custom:** saved in the `snippets` Dexie table. Limit: 50. Inserting over existing content → confirm dialog.

### Persistence (Dexie)

```typescript
// tool:code-playground:editor-html    → string
// tool:code-playground:editor-css     → string
// tool:code-playground:editor-script  → string
// tool:code-playground:lang           → 'js' | 'ts'
// tool:code-playground:active-tab     → 'html' | 'css' | 'script'
// tool:code-playground:panels         → { editor: boolean, preview: boolean, console: boolean }
// tool:code-playground:run-mode       → 'auto' | 'manual'
// Custom snippets → snippets Dexie table (toolId: 'code-playground')
```

### Clean button

Clears only the editor content (HTML, CSS, Script). Never touches snippets, panel preferences, or run mode. Confirm dialog required.

### File structure

```
src/tools/code-playground/
├── index.tsx
├── config.ts
├── worker.ts                  # TypeScript compiler Worker
├── components/
│   ├── Toolbar.tsx
│   ├── EditorPanel.tsx
│   ├── PreviewPanel.tsx
│   ├── ConsolePanel.tsx
│   └── SnippetsDrawer.tsx
└── hooks/
    ├── usePlayground.ts
    ├── useConsole.ts
    ├── useTsCompiler.ts
    └── useSnippets.ts
```

### Required e2e tests

| Flow             | Description                                          |
| ---------------- | ---------------------------------------------------- |
| HTML/CSS         | Write → preview updates → styles applied             |
| JS               | `console.log('ok')` → appears in console             |
| TS               | Typed code → compiles → executes                     |
| TS error         | Wrong type → compilation error in console            |
| Infinite loop    | `while(true){}` → timeout → message in console       |
| Built-in snippet | Insert → content in correct tab                      |
| Custom snippet   | Create → persists after reload → can be deleted      |
| Clean            | Confirm → editor empty → snippets intact             |
| Panels           | Hide preview → state persists after reload           |

---

## 20. Discarded Decisions and Reasons

| Decision                                        | Discarded because                                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Shadcn/ui                                       | Friction with Astro/RSC. Replaced by direct Radix UI.                                                                  |
| Hard links between tools                        | Penalizes UX. Headers via `public/_headers`, no full reload.                                                           |
| Astro Middleware / SSR                          | Requires Workers and cost. 100% static site.                                                                           |
| Monaco Editor                                   | Heavy bundle, poor mobile performance. CodeMirror 6 chosen.                                                            |
| External database                               | Outside local-first philosophy.                                                                                        |
| Authentication                                  | Out of MVP scope.                                                                                                      |
| npm / yarn                                      | Replaced by pnpm.                                                                                                      |
| localStorage for tool data                      | ~10MB limit, synchronous, no binary support. Dexie covers all tool cases with more capacity and a better API.          |
| esbuild-wasm as TS compiler                     | Only transpiles, does not verify types. Official TypeScript gives complete errors and is similar in size.              |
| Code mode in responsive-preview                 | Responsibility of `code-playground`. `responsive-preview` handles external URLs only.                                  |
| Separate JS/TS tabs in playground               | A single Script panel with an explicit toggle is cleaner.                                                              |
| Remote code execution (Piston API)              | Breaks local-first philosophy. TS/JS locally covers the main use case.                                                 |
| Dexie for global preferences (theme, language)  | Small data with frequent synchronous access. localStorage via Nanostores is more appropriate.                          |

---
