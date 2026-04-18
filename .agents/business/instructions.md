# PROJECT_RULES.md — Pocketool (Multi-Tool Dev Hub)

> Documento vivo de arquitectura, decisiones técnicas y estándares del proyecto.
> Actualizar con cada decisión relevante que se tome durante el desarrollo.

---

## 1. Visión y Filosofía

**Pocketool** es una aplicación web de herramientas esenciales para desarrolladores, diseñada con los principios:

- **Local-first:** Sin servidor, sin base de datos remota. Todo vive en el navegador del usuario.
- **Performance-first:** Zero JS innecesario. Arquitectura de islas. Lazy load agresivo.
- **Minimalismo funcional:** La UI sirve a la herramienta, nunca al revés.
- **Escalabilidad por convención:** Añadir una nueva herramienta no requiere tocar código central.
- **Offline-ready:** La app funciona sin conexión gracias a PWA + Service Worker.

### Herramientas MVP

| ID                   | Nombre             | Descripción                                                             |
| -------------------- | ------------------ | ----------------------------------------------------------------------- |
| `json-viewer`        | JSON Viewer        | Árbol colapsable, búsqueda, formateo, copia y descarga de JSON grandes  |
| `markdown-editor`    | Markdown Editor    | Editor con preview, soporte GFM, diagramas Mermaid, copia y descarga    |
| `image-optimizer`    | Image Optimizer    | Optimizador al estilo Squoosh con wasm-vips, comparación antes/después  |
| `notes`              | Quick Notes        | Gestor de notas rápidas con etiquetas, búsqueda y persistencia local    |
| `responsive-preview` | Responsive Preview | Vista multi-viewport de URLs externas con scroll y clicks sincronizados |
| `code-playground`    | Code Playground    | Editor HTML/CSS/Script con preview, consola y biblioteca de snippets    |

---

## 2. Stack Tecnológico

| Capa                       | Tecnología                                  | Razón                                                               |
| -------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Framework                  | Astro **6.x**                               | Arquitectura de islas, zero-JS por defecto, i18n nativo             |
| UI (islas interactivas)    | React **19**                                | Concurrent features, ecosistema, compatibilidad con Radix           |
| Estilos                    | Tailwind CSS **4.x**                        | Utility-first, configuración en CSS (no en JS), `@theme` nativo     |
| Estado global (UI/prefs)   | Nanostores **1.2** + @nanostores/persistent | Ligero, isomorfo, solo para preferencias y estado de UI             |
| Persistencia de tools      | Dexie.js (latest)                           | IndexedDB tipado, reactivo, capacidad ~1GB, datos binarios          |
| Componentes primitivos     | Radix UI (latest)                           | Accesibilidad, headless, sin fricción con Astro                     |
| Command Palette            | cmdk (latest)                               | Construido sobre Radix, semántica de búsqueda, ligero               |
| Editores de texto          | CodeMirror **6** (latest)                   | Modular, rendimiento superior en móviles vs Monaco, accesibilidad   |
| Iconos                     | Lucide React **1.8**                        | Tree-shakeable, consistente, mantenido activamente                  |
| Imágenes (WASM)            | wasm-vips + Comlink                         | Multi-threading real en WebWorker, misma API que libvips            |
| Compilador TS (Playground) | typescript (oficial, latest)                | Type-checking real, errores completos, fidelidad total              |
| PWA                        | @vite-pwa/astro (latest)                    | Service Worker, offline, cacheo de WASM, instalable                 |
| Testing unitario           | Vitest **4.x** + Testing Library            | Nativo con Vite, rápido, compatible con el ecosistema Astro         |
| Testing e2e                | Playwright **1.59.x**                       | Estándar de la industria, multi-browser, visual regression          |
| Despliegue                 | Cloudflare Pages                            | Edge CDN, integración con `_headers`, soporte WASM de primera clase |
| Package manager            | pnpm (latest)                               | Workspace support, eficiencia de disco, más rápido que npm/yarn     |

### Nota importante: Tailwind CSS 4

Tailwind 4 elimina el archivo `tailwind.config.mjs`. La configuración ahora vive en CSS:

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-accent: /* por definir */;
  --font-mono: "Space Mono", monospace;
  /* resto de tokens del sistema de diseño */
}
```

No hay archivo de configuración JS. Los plugins se importan también en CSS.

### Por qué Radix UI en lugar de Shadcn/ui

Shadcn está diseñado para Next.js y asume RSC. En Astro genera fricción. Radix UI son los primitivos sobre los que se construye Shadcn: accesibles, headless y sin dependencias de framework. Se estilizan directamente con Tailwind, dando control total y bundle más pequeño.

### Por qué TypeScript oficial en lugar de esbuild-wasm

esbuild solo transpila (elimina tipos) pero no verifica tipos. El compilador oficial de TypeScript hace type-checking completo: errores con línea, columna y mensaje exacto. En un playground de TS, mostrar errores de tipo reales es la diferencia entre una herramienta útil y una que da falsa seguridad. El peso es similar (~6MB vs ~8MB) y ambos se cargan en un Worker con lazy load.

---

## 3. Arquitectura de Persistencia (Dos Capas)

La persistencia está dividida en dos capas con responsabilidades claras y no intercambiables.

### Capa 1: localStorage — Preferencias y estado de UI

Gestionado exclusivamente via `src/utils/storage.ts`. Solo para datos pequeños, globales y de acceso síncrono frecuente que NO pertenecen a ninguna tool concreta.

**Qué va en localStorage:**

- Tema activo (`app:theme`)
- Idioma preferido (`app:lang`)
- Estado de visibilidad de paneles del shell (sidebar, topbar)
- Cualquier preferencia global de la app

**Qué NO va en localStorage:** nada relacionado con el contenido o estado de una tool. Sin excepciones.

### Capa 2: Dexie.js (IndexedDB) — Datos de herramientas

Todo lo que pertenece a una tool, sin importar el tamaño, va en IndexedDB via Dexie. Esto incluye datos pequeños como la última URL de `responsive-preview` o datos grandes como notas, JSONs guardados o historial del playground.

**Ventajas sobre localStorage para datos de tools:**

- Capacidad ~1GB vs ~10MB
- Soporte nativo de datos binarios (imágenes procesadas, Blobs)
- API asíncrona no bloqueante
- Transacciones reales
- Consultas indexadas

### Definición de la base de datos (`src/db/index.ts`)

```typescript
import Dexie, { type EntityTable } from "dexie";

// Tabla principal: estado persistente de cada tool
interface ToolState {
  id: string; // 'tool:[tool-id]:[key]' — Primary Key
  content: unknown; // datos de la tool, tipados en cada tool
  updatedAt: number; // timestamp para ordenar y expirar
}

// Tabla de historial/sesiones (opcional por tool)
interface ToolHistory {
  id?: number; // autoincrement
  toolId: string; // 'json-viewer', 'code-playground', etc.
  timestamp: number;
  data: unknown;
}

// Tabla de snippets del playground
interface Snippet {
  id: string; // uuid
  toolId: string; // 'code-playground'
  name: string;
  description: string;
  lang: "html" | "css" | "js" | "ts";
  content: string;
  isBuiltIn: boolean;
  createdAt: number;
}

// Tabla de notas
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

### Convención de IDs en Dexie

```
tool:[tool-id]:[key]

Ejemplos:
  tool:json-viewer:last-input
  tool:responsive-preview:last-url
  tool:responsive-preview:viewports
  tool:code-playground:editor-html
  tool:code-playground:editor-css
  tool:code-playground:editor-script
  tool:code-playground:preferences
  tool:markdown-editor:content
```

### Hooks de acceso a Dexie

Cada tool accede a Dexie mediante `useLiveQuery` de `dexie-react-hooks` para reactividad automática, y `db.toolStates.put()` / `db.toolStates.get()` para escritura y lectura directa.

```typescript
// Patrón de lectura reactiva en una tool
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

const state = useLiveQuery(
  () => db.toolStates.get("tool:json-viewer:last-input"),
  [],
);

// Patrón de escritura
await db.toolStates.put({
  id: "tool:json-viewer:last-input",
  content: value,
  updatedAt: Date.now(),
});
```

### Wrapper de localStorage (`src/utils/storage.ts`)

Para la capa de preferencias globales. Nunca para datos de tools.

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

Casos cubiertos:

| Caso                  | Comportamiento                                 |
| --------------------- | ---------------------------------------------- |
| Cuota excedida        | Toast con opción de limpiar datos              |
| Modo incógnito Safari | App funciona en memoria, banner no intrusivo   |
| JSON corrupto         | Borra la key, avisa al usuario                 |
| Schema desactualizado | Función `migrate()` en config de la tool       |
| Backup manual         | Exportar/importar todo como JSON desde Ajustes |

---

## 4. PWA — Progressive Web App

### Objetivo

Pocketool funciona completamente offline una vez instalada. El Service Worker cachea todos los assets estáticos, incluyendo los archivos WASM pesados (`wasm-vips`, el compilador de TypeScript).

### Integración con Astro 6 + Cloudflare Pages

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa"; // @vite-pwa/astro usa VitePWA internamente

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
          // Crítico: wasm-vips y typescript superan el límite por defecto de 2MB
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
          globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
          // Estrategia de caché para WASM: cache-first, válido 1 año
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

### Conflicto COOP/COEP con Service Worker

El Service Worker de la PWA y `SharedArrayBuffer` (necesario para wasm-vips y el compilador TS en Worker) requieren los headers COOP/COEP. Sin embargo, aplicarlos globalmente rompe recursos externos (iframes en `responsive-preview`).

**Solución:** aplicar los headers COOP/COEP solo en las rutas que los necesitan, via `public/_headers`. El Service Worker funciona correctamente con esta configuración selectiva porque el scope del SW cubre toda la app pero los headers restrictivos solo afectan a las rutas que los definen.

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

> **Nota:** `credentialless` (en lugar de `require-corp`) es menos restrictivo y permite cargar recursos externos sin necesitar el header `CORP` en cada uno. Es la opción correcta para una app que embebe iframes de terceros.

### Comportamiento offline

- Primera visita: el SW se instala y cachea todos los assets.
- Visitas siguientes: se sirve desde caché, sin red.
- Actualización: `registerType: 'autoUpdate'` actualiza el SW en segundo plano y recarga la app al terminar.
- IndexedDB (Dexie) persiste entre sesiones independientemente del estado de la red.

---

## 5. Estructura de Carpetas

```
pocketool/
├── public/
│   ├── _headers                        # Headers HTTP por ruta (Cloudflare Pages)
│   ├── _redirects
│   └── icons/                          # Iconos PWA (192, 512)
├── src/
│   ├── components/
│   │   ├── ui/                         # Primitivos (Button, Badge, Tooltip, etc.)
│   │   └── layout/                     # Shell, Sidebar, TopBar, CommandPalette
│   ├── db/
│   │   └── index.ts                    # Dexie: definición de la BD y tablas
│   ├── i18n/
│   │   ├── es/
│   │   │   ├── ui.json
│   │   │   └── tools.json
│   │   └── en/
│   │       ├── ui.json
│   │       └── tools.json
│   ├── layouts/
│   │   └── ToolLayout.astro            # Layout base inyectado a cada tool
│   ├── pages/
│   │   ├── index.astro
│   │   └── [lang]/
│   │       └── tool/
│   │           └── [slug].astro
│   ├── stores/
│   │   ├── theme.ts                    # Nanostore: tema activo (localStorage)
│   │   └── preferences.ts             # Nanostore: preferencias globales (localStorage)
│   ├── tools/
│   │   ├── registry.ts                 # import.meta.glob — NO tocar manualmente
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
│   │       ├── worker.ts               # Web Worker compilador TypeScript oficial
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
│       ├── storage.ts                  # Wrapper localStorage (solo preferencias globales)
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

## 6. Sistema de Auto-Registry de Herramientas

### Contrato obligatorio de cada herramienta

**`config.ts`**

```typescript
import type { ToolConfig } from "@/tools/registry";

export const config: ToolConfig = {
  id: "json-viewer",
  title: "JSON Viewer",
  description: "Explora y formatea JSON de cualquier tamaño",
  category: "data", // 'data' | 'text' | 'media' | 'productivity' | 'preview'
  tags: ["json", "format", "tree", "search"],
  icon: "Braces", // nombre del icono de Lucide
  author: "tu-usuario",
  version: "1.0.0",
  dbKeys: ["tool:json-viewer:last-input"], // keys que esta tool usa en Dexie
};
```

**`index.tsx`**

```typescript
export default function JsonViewer() { ... }
```

### `registry.ts` (no modificar manualmente)

```typescript
const toolModules = import.meta.glob('./*/index.tsx');
const configModules = import.meta.glob('./*/config.ts', { eager: true });

export function getAllTools(): ToolConfig[] { ... }
export async function loadTool(id: string) { ... }
```

---

## 7. Internacionalización (i18n)

- **Idioma por defecto:** Español (`es`)
- **Detección:** `navigator.language` en el primer acceso. Preferencia persistida en localStorage (`app:lang`) via Nanostores.
- **Rutas:** `/tool/json-viewer` (es), `/en/tool/json-viewer` (en). Sin prefijo para el idioma por defecto.
- **Strings:** nunca hardcodeados en componentes. Siempre desde `src/i18n/[lang]/`.

```typescript
// astro.config.mjs
i18n: {
  defaultLocale: 'es',
  locales: ['es', 'en'],
  routing: { prefixDefaultLocale: false }
}
```

---

## 8. Navegación y Headers de Seguridad

El proyecto usa `output: 'static'`. Sin servidor, sin SSR, sin Cloudflare Workers. La navegación es SPA con `<ViewTransitions />` de Astro. Los headers se gestionan exclusivamente via `public/_headers`.

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

## 9. Lazy Loading de Dependencias Pesadas

Toda dependencia que supere ~500KB debe cargarse con dynamic import dentro de un Web Worker, nunca en el bundle principal.

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
// code-playground/worker.ts — se carga solo cuando el usuario activa modo TS
import * as ts from "typescript";

self.onmessage = ({ data: { code, id } }) => {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      strict: true,
    },
  });

  // Recoger diagnósticos de tipo
  const diagnostics =
    ts.transpileModule(code, {
      compilerOptions: { strict: true },
      reportDiagnostics: true,
    }).diagnostics ?? [];

  self.postMessage({ id, output: result.outputText, diagnostics });
};
```

El Worker se destruye al desmontar el componente para liberar los ~6MB del compilador de memoria.

---

## 10. Sistema de Temas

4 variantes mediante `data-theme` en `<html>`:

| Valor      | Descripción                                   |
| ---------- | --------------------------------------------- |
| `dark`     | Modo oscuro, contraste estándar (por defecto) |
| `dark-hc`  | Modo oscuro, alto contraste                   |
| `light`    | Modo claro, contraste estándar                |
| `light-hc` | Modo claro, alto contraste                    |

Detectado de `prefers-color-scheme` + `prefers-contrast` en el primer acceso. Persistido en localStorage (`app:theme`) via Nanostores. Nunca usar colores hardcoded — siempre `var(--color-*)`.

---

## 11. Sistema de Diseño — Átomos

Todos los componentes base en `src/components/ui/`. Las tools nunca importan de librerías externas directamente.

Componentes prioritarios para el MVP: `Button`, `Tooltip`, `Badge`, `Dialog`, `DropdownMenu`, `Tabs`, `ScrollArea`, `Toast`, `CommandPalette`.

---

## 12. Responsividad

| Breakpoint | Layout                                                                |
| ---------- | --------------------------------------------------------------------- |
| `< 768px`  | Una columna. Paneles separados por Radix Tabs.                        |
| `≥ 768px`  | Dual Panel: Input izquierda, Output derecha, resize handle draggable. |

El cambio de layout es responsabilidad de `ToolLayout.astro`, no de cada tool.

---

## 13. Testing

### Filosofía

- Testear comportamiento, no implementación.
- Tests son parte del Definition of Done. Una tool sin tests no está completa.

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

Qué testear: lógica de cada tool, wrapper de storage.ts, sistema i18n, auto-registry, operaciones Dexie (con fake-indexeddb).

### Playwright (e2e)

| Tool               | Flujo crítico                                                  |
| ------------------ | -------------------------------------------------------------- |
| JSON Viewer        | Pegar JSON → árbol renderiza → buscar key → resultado correcto |
| JSON Viewer        | JSON inválido → error claro                                    |
| Markdown Editor    | Escribir MD → preview actualizado → descargar `.md`            |
| Markdown Editor    | Bloque Mermaid → diagrama renderizado                          |
| Image Optimizer    | Subir imagen → optimizar → descargar                           |
| Notes              | Crear nota → persiste tras recargar → eliminar                 |
| Responsive Preview | URL válida → iframes renderizan con anchos correctos           |
| Responsive Preview | URL bloqueada → error visible                                  |
| Code Playground    | HTML+CSS → preview actualizado                                 |
| Code Playground    | JS → console.log → aparece en consola                          |
| Code Playground    | TS con error de tipo → error en consola                        |
| Global             | Command Palette → navegar a tool                               |
| Global             | Cambiar tema → persiste tras recargar                          |
| Global             | Instalar PWA → funciona offline                                |

---

## 14. CI/CD

```
GitHub → push/PR → GitHub Actions
  ├── pnpm install
  ├── pnpm typecheck
  ├── pnpm lint
  ├── pnpm test (Vitest)
  ├── pnpm build
  └── Cloudflare Pages (deploy automático en merge a main)

PRs → Playwright e2e en Cloudflare Pages preview URL
```

---

## 15. Convenciones de Código

| Elemento          | Convención          | Ejemplo              |
| ----------------- | ------------------- | -------------------- |
| Componentes React | PascalCase          | `JsonTree.tsx`       |
| Hooks             | camelCase con `use` | `useLocalStorage.ts` |
| Stores Nanostores | camelCase con `$`   | `$theme`             |
| Utilidades        | camelCase           | `formatBytes.ts`     |
| Constantes        | SCREAMING_SNAKE     | `MAX_FILE_SIZE`      |
| IDs de tools      | kebab-case          | `json-viewer`        |
| Keys Dexie        | `tool:id:key`       | `tool:notes:list`    |
| Keys localStorage | `app:key`           | `app:theme`          |

- TypeScript `strict: true` siempre. No `any` sin comentario.
- Path aliases: `@/*`, `@ui/*`, `@tools/*`. Sin imports relativos cross-domain.
- Commits: Conventional Commits (`feat`, `fix`, `chore`, `refactor`, `test`, `docs`).
- `pnpm` exclusivamente.

---

## 16. Añadir una Nueva Herramienta (Checklist)

```
[ ] Crear carpeta src/tools/[nueva-tool]/
[ ] Definir config.ts con todos los campos de ToolConfig + dbKeys
[ ] Crear index.tsx (componente sin props requeridas)
[ ] Añadir textos en src/i18n/es/tools.json y src/i18n/en/tools.json
[ ] Usar solo átomos de src/components/ui/ para la UI
[ ] Usar Dexie (db) para toda persistencia de datos de la tool
[ ] Nunca usar localStorage directamente desde una tool
[ ] Escribir tests unitarios en tests/unit/[nueva-tool]/
[ ] Documentar y cubrir el flujo e2e crítico en tests/e2e/
[ ] Verificar que funciona en los 4 temas y en móvil/desktop
[ ] Verificar que funciona offline (PWA)
```

---

## 17. Especificación: `image-optimizer`

### Concepto

Optimizador de imágenes al estilo Squoosh con un canvas de comparación interactivo (zoom, pan, slider reveal), compresión a múltiples formatos y redimensionado. Todas las operaciones se ejecutan en un Web Worker con wasm-vips — sin servidor, sin subidas a terceros.

### Canvas de comparación (UI principal)

El contenedor principal es un canvas interactivo con dos capas superpuestas:

- **Capa inferior (siempre):** imagen original, nunca modificada.
- **Capa superior:** imagen procesada (resultado de la última operación aplicada), con `clip-path` dinámico controlado por el slider.

El slider es una barra vertical arrastrable que divide visualmente el canvas en dos mitades. Arrastrarlo revela más o menos imagen procesada sobre la original. El slider es siempre visible e interactivo independientemente del nivel de zoom.

**Interacciones del canvas:**

- **Pan:** arrastrar con ratón o touch mueve ambas capas simultáneamente.
- **Zoom:** rueda del ratón o pinch en móvil. Rango: 0.1x – 10x. Botones de reset zoom y fit-to-screen en la toolbar.
- **Slider:** arrastrarlo horizontalmente entre 0% y 100% del ancho.

**Panel de información (siempre visible encima del canvas):**

- Izquierda: `Original · 691 KB · 1920×1080`
- Derecha: `Resultado · 140 KB · 1280×720 · WEBP · -79.6%`

El porcentaje de ahorro se colorea en verde si es positivo y en rojo si el resultado pesa más que el original.

### Operaciones independientes

Resize y compresión son operaciones independientes con sus propios controles y botón de aplicar. Se pueden usar por separado o en combinación. El resultado de cada operación se convierte en la imagen procesada actual y se muestra en el lado derecho del slider.

**Orden de operaciones cuando se usan ambas:** el resize siempre se aplica primero (sobre la original), y la compresión se aplica sobre el resultado del resize. Si el usuario aplica compresión y después resize, el resize se aplica sobre la original y la compresión anterior queda descartada del pipeline (el resultado final es solo resize). Esto evita ambigüedad. La UI debe dejar claro el estado actual del pipeline.

**Pipeline de estado:**

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

### Controles de Resize

- **Presets de ancho:** Original (sin resize), 1920px, 1280px, 800px, 400px.
- **Custom:** input numérico de ancho libre (en px).
- **Mantener ratio:** toggle activo por defecto. Cuando está activo, el alto se calcula automáticamente. Cuando está desactivado, aparece un input de alto editable.
- **Botón "Aplicar resize":** procesa en el Worker y actualiza la imagen procesada.

### Controles de Compresión

- **Formato:** WEBP · JPEG · PNG · AVIF. Selector tipo tab/pill.
- **Calidad:** slider 1–100. Solo visible para formatos con pérdida (WEBP, JPEG, AVIF). PNG es sin pérdida, no muestra slider.
- **Botón "Aplicar compresión":** procesa en el Worker y actualiza la imagen procesada.

### Descarga

Un único botón "Descargar" siempre visible descarga el estado actual de la imagen procesada (o la original si no se ha aplicado ninguna operación). El nombre del archivo sigue el patrón: `[nombre-original]-pocketool.[formato]`.

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

Cargado via dynamic import en `index.tsx`. Destruido con `worker.terminate()` al desmontar el componente.

### Persistencia (Dexie)

```typescript
// tool:image-optimizer:last-format  → OutputFormat
// tool:image-optimizer:last-quality → number
// tool:image-optimizer:last-resize  → { preset: string, width: number, height: number | null, keepRatio: boolean }
```

La imagen en sí **no se persiste** en Dexie — es un Blob binario que el usuario vuelve a subir en cada sesión. Solo se recuerdan las preferencias de formato, calidad y resize.

### Formatos soportados

| Formato | Con pérdida | Sin pérdida | Soporte wasm-vips |
| ------- | ----------- | ----------- | ----------------- |
| WEBP    | ✅          | ✅          | ✅                |
| JPEG    | ✅          | ❌          | ✅                |
| PNG     | ❌          | ✅          | ✅                |
| AVIF    | ✅          | ✅          | ✅                |

### Estructura de archivos

```
src/tools/image-optimizer/
├── index.tsx
├── config.ts
├── worker.ts                      # wasm-vips + Comlink
├── components/
│   ├── CompareCanvas.tsx          # Canvas interactivo con pan, zoom y slider
│   ├── SliderReveal.tsx           # Barra draggable de comparación
│   ├── ResizeControls.tsx         # Presets, custom input, ratio toggle
│   ├── CompressControls.tsx       # Formato, calidad slider
│   └── ImageInfoBar.tsx           # Original vs Resultado con métricas
└── hooks/
    ├── useImageProcessor.ts       # Orquesta Worker, estado del pipeline
    ├── useCanvasInteraction.ts    # Pan, zoom, eventos de ratón/touch
    └── useSlider.ts               # Estado y arrastre del slider reveal
```

### Tests e2e obligatorios

| Flujo             | Descripción                                                        |
| ----------------- | ------------------------------------------------------------------ |
| Subir imagen      | Drag & drop o file picker → imagen aparece en canvas               |
| Compresión WEBP   | Aplicar → resultado visible en lado derecho → info bar actualizada |
| Compresión PNG    | Sin slider de calidad visible → resultado correcto                 |
| Compresión AVIF   | Aplicar → resultado visible                                        |
| Resize preset     | Seleccionar 800px → Aplicar → dimensiones actualizadas en info bar |
| Resize custom     | Introducir 600px con ratio → alto calculado automáticamente        |
| Resize + Compress | Aplicar resize → aplicar compresión → resultado combina ambas      |
| Slider            | Arrastrar slider → clip-path cambia → ambas imágenes visibles      |
| Zoom              | Scroll → zoom in/out → pan → slider sigue funcional                |
| Descarga          | Botón descargar → archivo con nombre correcto y formato correcto   |

---

## 18. Especificación: `responsive-preview`

### Concepto

Vista multi-viewport simultánea para testear **URLs externas** en varios tamaños de pantalla a la vez, con scroll y clicks sincronizados. Solo modo URL — sin editor de código (eso es `code-playground`).

### Persistencia (Dexie)

```typescript
// tool:responsive-preview:last-url → string
// tool:responsive-preview:viewports → Viewport[]
// tool:responsive-preview:sync → boolean
```

### Sincronización entre viewports

Dado que Same-Origin Policy impide leer el scroll de iframes externos, la sincronización se implementa con un **SyncSnippet**: un modal que muestra un script de ~8 líneas que el usuario copia y pega en el `<head>` del proyecto local que está testeando. Ese script escucha el scroll del `window` local y emite `window.parent.postMessage({ type: 'SYNC_SCROLL', scrollY })`. El componente padre recibe el mensaje y lo propaga al resto de iframes.

Este enfoque es honesto con la limitación técnica y da una solución práctica para el caso de uso real (testear un proyecto local).

**Click sync:** mismo mecanismo vía `postMessage`, solo funciona si el sitio coopera.

La sincronización se activa/desactiva con un toggle. Siempre se muestra un aviso claro de que requiere el script en el proyecto destino.

### Viewports y presets

| Nombre   | Ancho  | Orientación |
| -------- | ------ | ----------- |
| Mobile S | 320px  | portrait    |
| Mobile L | 390px  | portrait    |
| Tablet   | 768px  | portrait    |
| Laptop   | 1280px | landscape   |
| Desktop  | 1440px | landscape   |

Presets base: no eliminables (`isDefault: true`), solo desactivables. El usuario puede añadir viewports custom. Todo persiste en Dexie.

### Layout

Scroll horizontal. `transform: scale()` para que cada iframe quepa en pantalla manteniendo su ancho real. Click en viewport → modo focus (pantalla completa). Escape → vuelve al grid.

### Limitaciones documentadas

- **X-Frame-Options / CSP:** sitios con `frame-ancestors 'none'` no pueden embeberse. Mensaje claro al usuario.
- **Sync:** requiere que el sitio destino incluya el SyncSnippet. Sin él, no hay sync.
- **Sin captura de pantalla:** fuera del MVP.

### Estructura de archivos

```
src/tools/responsive-preview/
├── index.tsx
├── config.ts
├── components/
│   ├── Toolbar.tsx
│   ├── ViewportFrame.tsx
│   ├── ViewportGrid.tsx
│   ├── ViewportManager.tsx
│   └── SyncSnippet.tsx       # Modal con el script a copiar
└── hooks/
    ├── useSyncBridge.ts
    └── useViewports.ts
```

### Tests e2e obligatorios

| Flujo           | Descripción                                                   |
| --------------- | ------------------------------------------------------------- |
| URL válida      | Pegar URL → iframes renderizan → label muestra ancho correcto |
| URL bloqueada   | X-Frame-Options → mensaje de error visible                    |
| Viewport custom | Añadir 1024px → aparece en grid → persiste tras recargar      |
| Viewport toggle | Desactivar → desaparece del grid sin eliminarse               |
| Focus mode      | Click → pantalla completa → Escape vuelve al grid             |
| SyncSnippet     | Modal abre → código visible y copiable                        |

---

## 19. Especificación: `code-playground`

### Concepto

Playground de código con tres paneles ocultables: Editor (HTML/CSS/Script), Preview (iframe) y Console. Soporta JS y TS con el compilador oficial de TypeScript en un Worker dedicado. Incluye biblioteca de snippets built-in y snippets custom guardados en Dexie.

### Paneles

- **Editor:** pestañas HTML / CSS / Script. CodeMirror 6 por pestaña. Toggle JS/TS en la toolbar del panel Script.
- **Preview:** iframe con `srcdoc`. Actualización auto (debounced 500ms) o manual según run mode.
- **Console:** intercepta `console.*` + `window.onerror` + `window.onunhandledrejection` dentro del iframe via `postMessage`. Muestra tipo, mensaje y stack trace.

### Compilación TypeScript

El compilador oficial de TypeScript (`typescript` package) se carga en un Worker dedicado via dynamic import, únicamente cuando el usuario activa el modo TS por primera vez. Muestra indicador de carga mientras descarga (~6MB). El Worker se destruye al desmontar el componente. Proporciona errores de tipo completos con línea y columna, no solo transpilación.

### Sandbox de seguridad

```html
<iframe sandbox="allow-scripts" srcdoc="..."></iframe>
```

El atributo `sandbox="allow-scripts"` sin `allow-same-origin` aísla completamente el código ejecutado. Un timeout de 5s aborta ejecuciones que no terminan (loops infinitos).

### Snippets

**Built-in (solo lectura):** colección curada en Dexie, sembrada en el primer arranque de la tool.

| Categoría | Ejemplos                                                 |
| --------- | -------------------------------------------------------- |
| JS Utils  | debounce, throttle, deep clone, sleep, fetch wrapper     |
| Array     | groupBy, chunk, flatten, unique, zip                     |
| DOM       | querySelector helper, event delegation, drag & drop base |
| CSS       | reset, flexbox center, grid responsive, custom scrollbar |
| TS        | tipos utilitarios, generic fetch tipado                  |

**Custom:** guardados en la tabla `snippets` de Dexie. Límite: 50. Al insertar sobre contenido existente → confirm dialog.

### Persistencia (Dexie)

```typescript
// tool:code-playground:editor-html    → string
// tool:code-playground:editor-css     → string
// tool:code-playground:editor-script  → string
// tool:code-playground:lang           → 'js' | 'ts'
// tool:code-playground:active-tab     → 'html' | 'css' | 'script'
// tool:code-playground:panels         → { editor: boolean, preview: boolean, console: boolean }
// tool:code-playground:run-mode       → 'auto' | 'manual'
// Snippets custom → tabla snippets de Dexie (toolId: 'code-playground')
```

### Botón Clean

Limpia solo el contenido del editor (HTML, CSS, Script). Nunca toca snippets, preferencias de paneles ni run mode. Confirm dialog obligatorio.

### Estructura de archivos

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

### Tests e2e obligatorios

| Flujo            | Descripción                                        |
| ---------------- | -------------------------------------------------- |
| HTML/CSS         | Escribir → preview actualiza → estilos aplicados   |
| JS               | `console.log('ok')` → aparece en consola           |
| TS               | Código con tipos → compila → ejecuta               |
| TS error         | Tipo incorrecto → error de compilación en consola  |
| Loop infinito    | `while(true){}` → timeout → mensaje en consola     |
| Snippet built-in | Insertar → contenido en pestaña correcta           |
| Snippet custom   | Crear → persiste tras recargar → se puede eliminar |
| Clean            | Confirm → editor vacío → snippets intactos         |
| Paneles          | Ocultar preview → estado persiste tras recargar    |

---

## 20. Decisiones Descartadas y su Razón

| Decisión                                        | Descartada por                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Shadcn/ui                                       | Fricción con Astro/RSC. Reemplazada por Radix UI directo.                                                           |
| Hard links entre tools                          | Penaliza UX. Headers via `public/_headers`, sin recarga completa.                                                   |
| Astro Middleware / SSR                          | Requiere Workers y coste. Site 100% estático.                                                                       |
| Monaco Editor                                   | Bundle pesado, mal rendimiento en móviles. CodeMirror 6.                                                            |
| Base de datos externa                           | Fuera de filosofía local-first.                                                                                     |
| Autenticación                                   | Fuera del scope del MVP.                                                                                            |
| npm / yarn                                      | Reemplazados por pnpm.                                                                                              |
| localStorage para datos de tools                | Límite de ~10MB, síncrono, sin soporte binario. Dexie cubre todos los casos de tools con más capacidad y mejor API. |
| esbuild-wasm como compilador TS                 | Solo transpila, no verifica tipos. TypeScript oficial da errores completos y pesa menos.                            |
| Modo código en responsive-preview               | Responsabilidad de `code-playground`. `responsive-preview` solo URLs externas.                                      |
| Pestañas JS/TS separadas en playground          | Un único panel Script con toggle explícito es más limpio.                                                           |
| Ejecución remota de código (Piston API)         | Rompe filosofía local-first. TS/JS en local cubre el caso de uso principal.                                         |
| Dexie para preferencias globales (tema, idioma) | Datos pequeños y de acceso síncrono frecuente. localStorage via Nanostores es más adecuado.                         |

---
