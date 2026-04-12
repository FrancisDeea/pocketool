# PROJECT_RULES.md — Pocketool (Multi-Tool Dev Hub)

> Documento vivo de arquitectura, decisiones técnicas y estándares del proyecto.
> Actualizar con cada decisión relevante que se tome durante el desarrollo.

---

## 1. Visión y Filosofía

**Pocketlab** es una aplicación web de herramientas esenciales para desarrolladores, diseñada con los principios:

- **Local-first:** Sin servidor, sin base de datos remota. Todo vive en el navegador del usuario.
- **Performance-first:** Zero JS innecesario. Arquitectura de islas. Lazy load agresivo.
- **Minimalismo funcional:** La UI sirve a la herramienta, nunca al revés.
- **Escalabilidad por convención:** Añadir una nueva herramienta no requiere tocar código central.

### Herramientas MVP

| ID | Nombre | Descripción |
|----|--------|-------------|
| `json-viewer` | JSON Viewer | Árbol colapsable, búsqueda, formateo, copia y descarga de JSON grandes |
| `markdown-editor` | Markdown Editor | Editor con preview, soporte GFM, diagramas Mermaid, copia y descarga |
| `image-optimizer` | Image Optimizer | Optimizador al estilo Squoosh con wasm-vips, comparación antes/después |
| `notes` | Quick Notes | Gestor de notas rápidas con etiquetas, búsqueda y persistencia local |

---

## 2. Stack Tecnológico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Framework | Astro **6.x** | Arquitectura de islas, zero-JS por defecto, i18n nativo |
| UI (islas interactivas) | React **19** | Concurrent features, ecosistema, compatibilidad con Radix |
| Estilos | Tailwind CSS **4.x** | Utility-first, configuración en CSS (no en JS), `@theme` nativo |
| Estado global | Nanostores **1.2** + @nanostores/persistent | Ligero, isomorfo, compatible con Astro sin overhead |
| Componentes primitivos | Radix UI (latest) | Accesibilidad, headless, sin fricción con Astro (a diferencia de Shadcn) |
| Command Palette | cmdk (latest) | Construido sobre Radix, semántica de búsqueda, ligero |
| Editores de texto | CodeMirror **6** (latest) | Modular, rendimiento superior en móviles vs Monaco, accesibilidad |
| Iconos | Lucide React **1.8** | Tree-shakeable, consistente, mantenido activamente |
| Imágenes (WASM) | wasm-vips + Comlink | Multi-threading real en WebWorker, misma API que libvips |
| Testing unitario | Vitest **4.x** + Testing Library | Nativo con Vite, rápido, compatible con el ecosistema Astro |
| Testing e2e | Playwright **1.59.x** | Estándar de la industria, multi-browser, visual regression |
| Despliegue | Cloudflare Pages | Edge CDN, integración con `_headers`, soporte WASM de primera clase |
| Package manager | pnpm (latest) | Workspace support, eficiencia de disco, más rápido que npm/yarn |

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

No hay archivo de configuración JS. Los plugins se importan también en CSS. Tener esto en cuenta al configurar el proyecto inicial.

### Por qué Radix UI en lugar de Shadcn/ui

Shadcn está diseñado para Next.js y su sistema de componentes asume RSC. En Astro genera fricción en la instalación y el sistema de temas. Radix UI son los **primitivos** sobre los que se construye Shadcn: accesibles, headless y sin dependencias de framework. Se estilizan directamente con Tailwind, dando control total y un bundle más pequeño.

---

## 3. Estructura de Carpetas

```
pocketlab/
├── public/
│   ├── _headers                    # Headers HTTP por ruta (Cloudflare Pages)
│   └── _redirects
├── src/
│   ├── components/                 # Átomos y moléculas del sistema de diseño
│   │   ├── ui/                     # Primitivos (Button, Badge, Tooltip, etc.)
│   │   └── layout/                 # Shell, Sidebar, TopBar, CommandPalette
│   ├── i18n/
│   │   ├── es/
│   │   │   ├── ui.json
│   │   │   └── tools.json
│   │   └── en/
│   │       ├── ui.json
│   │       └── tools.json
│   ├── layouts/
│   │   └── ToolLayout.astro        # Layout base inyectado automáticamente a cada tool
│   ├── pages/
│   │   ├── index.astro             # Home / listado de herramientas
│   │   └── [lang]/
│   │       └── tool/
│   │           └── [slug].astro    # Ruta dinámica que carga la tool correcta
│   ├── stores/
│   │   ├── theme.ts                # Store del tema activo
│   │   └── preferences.ts          # Preferencias globales del usuario
│   ├── tools/                      # Auto-registry: cada carpeta es una tool
│   │   ├── registry.ts             # import.meta.glob — NO tocar manualmente
│   │   ├── json-viewer/
│   │   │   ├── index.tsx
│   │   │   └── config.ts
│   │   ├── markdown-editor/
│   │   │   ├── index.tsx
│   │   │   └── config.ts
│   │   ├── image-optimizer/
│   │   │   ├── index.tsx
│   │   │   ├── config.ts
│   │   │   └── worker.ts           # Web Worker con Comlink
│   │   └── notes/
│   │       ├── index.tsx
│   │       └── config.ts
│   └── utils/
│       ├── storage.ts              # Wrapper de localStorage con manejo de errores
│       ├── i18n.ts                 # Helper de traducciones
│       └── detect-lang.ts          # Detección de idioma por navigator.language
├── tests/
│   ├── unit/                       # Vitest — lógica y componentes
│   └── e2e/                        # Playwright — flujos críticos
├── astro.config.mjs
├── vitest.config.ts
├── playwright.config.ts
└── pnpm-workspace.yaml
```

---

## 4. Sistema de Auto-Registry de Herramientas

### Contrato obligatorio de cada herramienta

Cada carpeta en `src/tools/[tool-id]/` debe exportar:

**`config.ts`**
```typescript
import type { ToolConfig } from '@/tools/registry';

export const config: ToolConfig = {
  id: 'json-viewer',           // kebab-case, único, inmutable
  title: 'JSON Viewer',
  description: 'Explora y formatea JSON de cualquier tamaño',
  category: 'data',            // 'data' | 'text' | 'media' | 'productivity'
  tags: ['json', 'format', 'tree', 'search'],
  icon: 'Braces',              // nombre del icono de Lucide
  author: 'tu-usuario',
  version: '1.0.0',
};
```

**`index.tsx`**
```typescript
// Componente React por defecto, sin props requeridas
export default function JsonViewer() { ... }
```

### `registry.ts` (no modificar manualmente)

```typescript
const toolModules = import.meta.glob('./*/index.tsx');
const configModules = import.meta.glob('./*/config.ts', { eager: true });

export function getAllTools(): ToolConfig[] { ... }
export async function loadTool(id: string) { ... }
```

El layout en `[slug].astro` lee el registry, carga el config, inyecta el shell (título, descripción, autor, márgenes) y renderiza el componente como isla React con `client:load`.

---

## 5. Internacionalización (i18n)

- **Idioma por defecto:** Español (`es`)
- **Detección automática:** Al primer acceso, se lee `navigator.language`. Si el idioma detectado tiene traducción disponible, se redirige a la ruta correcta. La preferencia se persiste en localStorage.
- **Rutas:** `/tool/json-viewer` (es) y `/en/tool/json-viewer` (en). El prefijo del idioma por defecto **no aparece en la URL** (`prefixDefaultLocale: false`).
- **Estructura de traducciones:** Divididas por dominio (`ui.json` para el shell, `tools.json` para textos internos de cada herramienta).
- **Añadir un idioma nuevo:** Crear carpeta en `src/i18n/[lang]/` con los dos JSON. El sistema lo detecta automáticamente.

```typescript
// astro.config.mjs
i18n: {
  defaultLocale: 'es',
  locales: ['es', 'en'],
  routing: { prefixDefaultLocale: false }
}
```

---

## 6. Navegación y Headers de Seguridad

### Estrategia: Site 100% estático + ViewTransitions + `_headers` de Cloudflare Pages

El proyecto usa `output: 'static'` en Astro. No hay servidor, no hay Cloudflare Workers, no hay middleware en runtime. Esto elimina costes y complejidad operacional.

**NO se usan hard links** entre herramientas. La navegación es SPA con `<ViewTransitions />` de Astro.

Los headers especiales que necesita `image-optimizer` (COOP/COEP para habilitar `SharedArrayBuffer` y multi-threading con wasm-vips) se aplican mediante el archivo `public/_headers`, que Cloudflare Pages procesa de forma nativa en el edge sin coste adicional:

**`public/_headers`**
```
/tool/image-optimizer
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless

/assets/*.wasm
  Cross-Origin-Resource-Policy: cross-origin
  Cache-Control: public, max-age=31536000, immutable
```

Este archivo es la solución oficial de Cloudflare Pages para headers por ruta en sites estáticos. No requiere adaptador SSR ni Workers.

> **Regla:** No añadir un adaptador SSR (`@astrojs/cloudflare`) salvo que en el futuro se necesite funcionalidad de servidor real. El coste en complejidad no justifica ninguna ventaja para el MVP.

---

## 7. Persistencia con localStorage

### Wrapper obligatorio

**Nunca usar `localStorage` directamente.** Siempre a través de `src/utils/storage.ts`.

```typescript
// Convención de naming: tool:[tool-id]:[key]
// Ejemplos:
//   tool:json-viewer:input
//   tool:notes:list
//   app:theme
//   app:lang

type StorageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'quota_exceeded' | 'unavailable' | 'parse_error' };

function storageGet<T>(key: string): StorageResult<T>
function storageSet<T>(key: string, value: T): StorageResult<void>
function storageDelete(key: string): void
function storageExport(): Record<string, unknown>  // exporta todo como JSON
function storageImport(backup: Record<string, unknown>): void
```

### Casos cubiertos por el wrapper

| Caso | Comportamiento |
|------|---------------|
| Cuota excedida (`QuotaExceededError`) | Devuelve `{ ok: false, error: 'quota_exceeded' }`. La UI muestra un toast con opción de limpiar datos. |
| Modo incógnito (Safari bloquea storage) | El try/catch detecta el bloqueo. La app funciona en memoria (sin persistencia) y avisa al usuario con un banner no intrusivo. |
| Valor corrupto / JSON inválido | Devuelve `{ ok: false, error: 'parse_error' }`. Se borra la key corrupta y se avisa. |
| Schema desactualizado | Cada tool define una `STORAGE_VERSION`. Si la versión almacenada difiere, se ejecuta una función `migrate()` exportada desde el config de la tool. |
| Backup manual | El usuario puede exportar **todos** sus datos como un único JSON desde Ajustes. También puede importar un backup previo. |
| Datos voluminosos (notas largas, JSONs grandes) | El wrapper comprime con `CompressionStream` (API nativa del navegador) antes de escribir si el valor supera 50KB. |

### Schema versioning por herramienta

```typescript
// En config.ts de cada tool
export const storageVersion = 1;
export function migrate(oldData: unknown, fromVersion: number): CurrentSchema { ... }
```

---

## 8. Lazy Loading de Herramientas Pesadas

### Image Optimizer (wasm-vips)

El Worker y la dependencia `wasm-vips` **no se incluyen en el bundle principal**. Se cargan dinámicamente solo cuando el usuario navega a `/tool/image-optimizer`:

```typescript
// En image-optimizer/index.tsx
const [worker, setWorker] = useState<Remote<VipsWorker> | null>(null);

useEffect(() => {
  let w: Worker;
  (async () => {
    // Dynamic import: no aparece en el bundle inicial
    const { wrap } = await import('comlink');
    w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    setWorker(wrap<VipsWorker>(w));
  })();
  return () => w?.terminate();
}, []);
```

El Worker se destruye (`terminate()`) al desmontar el componente, liberando memoria al navegar a otra herramienta.

---

## 9. Sistema de Temas

4 variantes mediante CSS variables en el atributo `data-theme` del `<html>`:

| Valor | Descripción |
|-------|-------------|
| `light` | Modo claro, contraste estándar |
| `light-hc` | Modo claro, alto contraste (accesibilidad) |
| `dark` | Modo oscuro, contraste estándar |
| `dark-hc` | Modo oscuro, alto contraste (accesibilidad) |

### Convenciones de CSS variables

```css
/* Todas las variables en :root con fallback al tema dark */
:root, [data-theme="dark"] {
  --color-bg: #0d0d0d;
  --color-surface: #1a1a1a;
  --color-border: #2a2a2a;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #888;
  --color-accent: /* por definir con el diseño */;
  --color-accent-hover: /* por definir */;
  --radius-md: 6px;
  --radius-lg: 10px;
}

[data-theme="light"] { ... }
[data-theme="dark-hc"] { ... }
[data-theme="light-hc"] { ... }
```

**Regla:** Los componentes nunca usan colores hardcoded. Siempre `var(--color-*)` o clases Tailwind mapeadas a esas variables.

### Detección inicial del tema

1. Leer `localStorage` (`app:theme`)
2. Si no existe, leer `prefers-color-scheme` + `prefers-contrast`
3. Persistir la elección del usuario

---

## 10. Sistema de Diseño — Átomos

Todos los componentes base viven en `src/components/ui/`. **No importar componentes de librerías externas directamente en las tools.** Siempre usar los átomos del sistema de diseño, que envuelven Radix UI.

Componentes prioritarios para el MVP:

- `Button` — variantes: primary, ghost, danger, icon
- `Tooltip` — Radix Tooltip con estilos del sistema
- `Badge` — para tags y estados
- `Dialog` — Radix Dialog (modales)
- `DropdownMenu` — Radix DropdownMenu
- `Tabs` — Radix Tabs (usado en layout móvil)
- `ScrollArea` — Radix ScrollArea
- `Toast` — notificaciones no intrusivas (errores de storage, copias exitosas)
- `CommandPalette` — cmdk + Radix Dialog, acceso vía `Cmd/Ctrl+K`

---

## 11. Responsividad

| Breakpoint | Layout |
|------------|--------|
| `< 768px` (móvil) | Una sola columna. Input y Output separados por **Tabs** (Radix Tabs). |
| `≥ 768px` (tablet/desktop) | **Dual Panel**: Input a la izquierda, Output a la derecha, resize handle draggable. |

El cambio de layout es responsabilidad de `ToolLayout.astro`, no de cada tool individual.

---

## 12. Testing

### Filosofía

- Testear comportamiento, no implementación.
- Priorizar tests de los flujos críticos sobre cobertura de líneas.
- Los tests son parte del Definition of Done de cada herramienta.

### Vitest (unitario y de componentes)

```typescript
// vitest.config.ts (Vitest 4.x)
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  }
});
```

**Qué testear con Vitest:**
- Lógica de negocio de cada tool (parseo de JSON, formateo de Markdown, etc.)
- El wrapper de `storage.ts` con mocks de localStorage
- El sistema de i18n y detección de idioma
- Componentes UI con Testing Library (interacciones, a11y)
- El sistema de auto-registry

### Playwright (e2e)

**Flujos críticos cubiertos por e2e:**

| Tool | Flujo |
|------|-------|
| JSON Viewer | Pegar JSON → árbol se renderiza → buscar key → resultado correcto |
| JSON Viewer | JSON inválido → error claro al usuario |
| Markdown Editor | Escribir MD → preview actualizado → descargar `.md` |
| Markdown Editor | Bloque Mermaid → diagrama renderizado |
| Image Optimizer | Subir imagen → optimizar → descargar resultado |
| Notes | Crear nota → persistida tras recargar → eliminar nota |
| Global | Command Palette → navegar a tool → tool cargada |
| Global | Cambiar tema → persiste tras recargar |

---

## 13. CI/CD

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

Rama `main` → producción. Ramas de feature → preview URLs automáticas de Cloudflare Pages.

---

## 14. Convenciones de Código

### Nombrado

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes React | PascalCase | `JsonTree.tsx` |
| Hooks | camelCase con `use` | `useLocalStorage.ts` |
| Stores (Nanostores) | camelCase con `$` | `$theme` |
| Utilidades | camelCase | `formatBytes.ts` |
| Constantes | SCREAMING_SNAKE | `MAX_FILE_SIZE` |
| IDs de tools | kebab-case | `json-viewer` |
| Keys de localStorage | `scope:id:key` | `tool:notes:list` |

### TypeScript

- `strict: true` siempre.
- No `any`. Si es inevitable, comentar el motivo con `// eslint-disable-next-line @typescript-eslint/no-explicit-any`.
- Tipos de dominio en `src/types/`. Tipos locales de un componente, junto al componente.
- Preferir `type` sobre `interface` salvo que se necesite extensión o declaración de módulo.

### Imports

Usar alias de path configurados en `tsconfig.json`:
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@ui/*": ["./src/components/ui/*"],
    "@tools/*": ["./src/tools/*"]
  }
}
```

### Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(json-viewer): add collapsible tree with depth limit
fix(storage): handle QuotaExceededError in Safari private mode
chore: update wasm-vips to 0.0.9
```

---

## 15. Añadir una Nueva Herramienta (Checklist)

```
[ ] Crear carpeta src/tools/[nueva-tool]/
[ ] Definir config.ts con todos los campos de ToolConfig
[ ] Crear index.tsx (componente sin props requeridas)
[ ] Añadir textos en src/i18n/es/tools.json y src/i18n/en/tools.json
[ ] Usar solo átomos de src/components/ui/ para la UI
[ ] Usar storage.ts para toda persistencia (nunca localStorage directo)
[ ] Definir storageVersion y función migrate() si usa storage
[ ] Escribir tests unitarios en tests/unit/[nueva-tool]/
[ ] Documentar el flujo e2e crítico en tests/e2e/
[ ] Verificar que funciona en los 4 temas y en móvil/desktop
```

---

## 16. Decisiones Descartadas y su Razón

| Decisión | Descartada por |
|----------|---------------|
| Shadcn/ui | Fricción con Astro, asume Next.js/RSC. Reemplazada por Radix UI directo. |
| Hard links entre tools | Penaliza UX sin necesidad. Los headers COOP/COEP se aplican vía `public/_headers` de Cloudflare Pages, sin servidor ni Workers. |
| Astro Middleware / SSR | Solo funciona con `output: 'static'`. Middleware requiere adaptador SSR, lo que introduce Cloudflare Workers y coste innecesario. |
| Monaco Editor | Bundle demasiado pesado, rendimiento pobre en móviles. Reemplazado por CodeMirror 6. |
| Base de datos externa | Fuera de la filosofía local-first del proyecto. |
| Autenticación | Fuera del scope del MVP. No se contempla en la arquitectura actual. |
| npm / yarn | Reemplazados por pnpm por eficiencia y workspace support. |

---
