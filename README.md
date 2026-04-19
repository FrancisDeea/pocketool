# 🧰 Pocketool

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

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

## 🤝 Contributing

We love new tools and bug fixes! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, tool architecture, commit conventions, and PR guidelines.

---

## ⚡ Development

```bash
pnpm install
pnpm dev
```

## 📜 License

[MIT](LICENSE) © FrancisDeea
