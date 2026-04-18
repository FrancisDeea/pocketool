# 🧰 Pocketool

Developer tools in your pocket. **Pocketool** is a 100% static, local-first suite of essential utilities for developers. Designed to work fully offline, with total privacy and zero-JS overhead where possible.

## 🚀 Key Features

- **Local-first**: No servers, no tracking. Your data stays in your browser (IndexedDB).
- **100% Static**: Hosted on Cloudflare Pages as a high-performance static site (Astro).
- **Offline Ready**: Full PWA support. Install it and use it anywhere without a connection.
- **Privacy Driven**: No backend, no cookies for tracking, no data collection.

## 🛠️ Tools Included

- **Image Optimizer**: Squoosh-like image compression and resizing using `wasm-vips`.
- **JSON Viewer**: Format and explore large JSON files with ease.
- **Code Playground**: Interactive HTML/CSS/JS/TS editor with real-time preview.
- **Markdown Editor**: GFM-compliant editor with Mermaid diagrams support.
- **Responsive Preview**: Test your URLs across multiple viewports simultaneously.
- **Quick Notes**: Secure, local persistent notes.

## 🏗️ Tech Stack

- **Framework**: [Astro 6](https://astro.build/)
- **UI**: [React 19](https://react.dev/) + [Radix UI](https://www.radix-ui.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **DB (Local)**: [Dexie.js](https://dexie.org/) (IndexedDB)
- **State**: [Nanostores](https://github.com/nanostores/nanostores)

---

## 🤝 How to Contribute (Add your Tool!)

We love new tools! Adding a tool to Pocketool is designed to be plug-and-play.

### 1. Structure
Create a new folder in `src/tools/[your-tool-id]/`. You only need two files:
- `index.tsx`: The main React component for your tool.
- `config.ts`: Metadata (ID, title, icon, etc.).

### 2. Auto-Registration
Don't worry about imports! The registry (`src/tools/registry.ts`) automatically discovers your tool using `import.meta.glob`.

### 3. Guidelines
- **UI Components**: Use atoms from `src/components/ui/`. Do not import external UI libraries directly.
- **Persistence**: If your tool needs to save data, use the `db` (Dexie) instance. Never use `localStorage` for tool data.
- **i18n**: Add your strings to `src/i18n/[lang]/tools.json`.
- **Heavy Libs**: If your tool uses a heavy library (>500KB), load it via a Web Worker.

### 4. PR Process
1. **Fork** the repository.
2. Create a new branch for your tool.
3. Follow the **Conventional Commits** spec (e.g., `feat(my-tool): add new utility`).
4. Ensure your tool has at least one **Vitest** unit test and one **Playwright** e2e test.
5. Open a **Pull Request**!

For deep technical details, check our [.agents/business/instructions.md](.agents/business/instructions.md).

---

## ⚡ Development

```bash
pnpm install
pnpm dev
```

## 📜 License
MIT
