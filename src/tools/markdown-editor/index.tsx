import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Copy, Check, Download, FileText } from 'lucide-react';
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import DOMPurify from 'dompurify';
import Button from '@ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ui/Tabs';

const DEFAULT_MARKDOWN = `# Bienvenido a Markdown Editor

Escribe tu **Markdown** aquí y verás el preview en tiempo real.

## Características

- ✅ Soporte GFM (GitHub Flavored Markdown)
- ✅ Tablas, listas de tareas, código
- ✅ Diagramas Mermaid
- ✅ Copia y descarga

## Ejemplo de código

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Tabla

| Herramienta | Estado |
|-------------|--------|
| JSON Viewer | ✅ Listo |
| Markdown Editor | ✅ Listo |
| Image Optimizer | 🔨 En progreso |

## Diagrama Mermaid

\`\`\`mermaid
sequenceDiagram
  Usuario->>Servidor: Petición de Login
  Servidor-->>Base de Datos: Validar credenciales
  Base de Datos-->>Servidor: Usuario válido
  Servidor-->>Usuario: Acceso permitido
\`\`\`

## Lista de tareas

- [x] Crear proyecto
- [x] Añadir herramientas
- [ ] Publicar v1.0
`;

export default function MarkdownEditor() {
  const [content, setContent] = useState(DEFAULT_MARKDOWN);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const marked = useMemo(() => {
    const m = new Marked();
    m.use(gfmHeadingId());
    return m;
  }, []);

  const html = useMemo(() => {
    try {
      const raw = marked.parse(content) as string;
      return DOMPurify.sanitize(raw);
    } catch {
      return '<p class="text-danger">Error al parsear el Markdown</p>';
    }
  }, [content, marked]);

  // Mermaid rendering
  useEffect(() => {
    if (!previewRef.current) return;
    const currentHtml = html; // capture closure

    const mermaidBlocks =
      previewRef.current.querySelectorAll('code.language-mermaid');
    if (mermaidBlocks.length === 0) return;

    let isStale = false;

    import('mermaid').then(({ default: mermaid }) => {
      if (isStale) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
      });

      mermaidBlocks.forEach(async (block, idx) => {
        const pre = block.parentElement;
        if (!pre) return;

        // Create container while keeping the pre hidden during render
        pre.style.display = 'none';
        
        try {
          const { svg } = await mermaid.render(
            `mermaid-${Date.now()}-${idx}`,
            block.textContent ?? '',
          );
          if (isStale) return; // Drop if another keypress happened
          
          const container = document.createElement('div');
          container.className = 'mermaid-container my-4 flex justify-center';
          container.innerHTML = svg;
          pre.replaceWith(container);
        } catch {
          if (isStale) return;
          pre.style.display = 'block';
          const errorMsg = document.createElement('p');
          errorMsg.className = 'text-danger text-sm mt-2 font-mono';
          errorMsg.textContent = 'Error en parseo Mermaid: sintaxis inválida.';
          pre.appendChild(errorMsg);
        }
      });
    });

    return () => {
      isStale = true;
    };
  }, [html]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownloadMd = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  const handleDownloadHtml = useCallback(() => {
    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    code { background: #f4f4f5; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
    pre { background: #18181b; color: #f4f4f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e4e4e7; padding: 0.5rem 1rem; text-align: left; }
    blockquote { border-left: 4px solid #6366f1; margin: 1rem 0; padding: 0.5rem 1rem; color: #71717a; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [html]);

  return (
    <div className="h-[calc(100dvh-var(--topbar-height)-3rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-text-tertiary" />
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            Markdown Editor
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadMd}>
            <Download size={14} />
            .md
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadHtml}>
            <Download size={14} />
            .html
          </Button>
        </div>
      </div>

      {/* Mobile: Tabs / Desktop: Dual Panel */}
      <div className="h-[calc(100%-2.5rem)]">
        {/* Mobile tabs */}
        <div className="lg:hidden h-full">
          <Tabs defaultValue="editor" className="h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="flex-1 min-h-0">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                className={[
                  'w-full h-full p-4 rounded-xl resize-none',
                  'bg-surface border border-border',
                  'text-sm font-mono text-text-primary',
                  'placeholder:text-text-tertiary',
                  'focus:outline-none focus:border-accent',
                ].join(' ')}
              />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 min-h-0">
              <div
                ref={previewRef}
                className="h-full overflow-auto p-4 rounded-xl bg-surface border border-border prose prose-sm prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop dual panel */}
        <div className="hidden lg:flex gap-4 h-full">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className={[
              'flex-1 p-4 rounded-xl resize-none',
              'bg-surface border border-border',
              'text-sm font-mono text-text-primary',
              'placeholder:text-text-tertiary',
              'focus:outline-none focus:border-accent',
            ].join(' ')}
          />
          <div
            ref={previewRef}
            className="flex-1 overflow-auto p-6 rounded-xl bg-surface border border-border prose prose-sm prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
