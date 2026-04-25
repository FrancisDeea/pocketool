import { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import {
  Terminal,
  Play,
  Trash2,
  FileCode2,
  Paintbrush,
  Braces,
  Eye
} from 'lucide-react';
import Button from '@ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ui/Tabs';

import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { html as langHtml } from '@codemirror/lang-html';
import { css as langCss } from '@codemirror/lang-css';
import { javascript as langJs } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

type ViewMode = 'html' | 'css' | 'js';

type ConsoleLog = {
  type: 'log' | 'info' | 'warn' | 'error';
  message: string;
  time: number;
};

const DEFAULT_HTML = `<div class="container">
  <h1>Hello Pocketool 🚀</h1>
  <p>Edita el contenido y ejecuta para ver los cambios.</p>
  <button id="btn">Haz click</button>
</div>`;

const DEFAULT_CSS = `body {
  font-family: system-ui, sans-serif;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #09090b;
  color: #fafafa;
}

.container {
  text-align: center;
  padding: 2rem;
  background: #18181b;
  border-radius: 12px;
  border: 1px solid #27272a;
}

button {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1rem;
}`;

const DEFAULT_JS = `const btn = document.getElementById('btn');
btn.addEventListener('click', () => {
  btn.textContent = '¡Clickeado!';
  console.log('Botón clickeado a las', new Date().toLocaleTimeString());
});`;

// Custom Theme Extension for overlapping with generic UI
const customTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent !important", 
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: '"JetBrains Mono", monospace',
  },
  ".cm-content": {
    padding: "16px 0",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid #181a1f",
    color: "var(--color-text-tertiary)",
    opacity: 0.5,
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--color-text-primary)",
    opacity: 1,
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(99, 102, 241, 0.3) !important",
  }
});

// A small functional wrapper for CodeMirror
function CodeEditor({ 
  value, 
  onChange, 
  lang 
}: { 
  value: string; 
  onChange: (val: string) => void;
  lang: 'html' | 'css' | 'js';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let langExtension;
    switch (lang) {
      case 'html': langExtension = langHtml(); break;
      case 'css': langExtension = langCss(); break;
      case 'js': langExtension = langJs(); break;
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        oneDark,
        customTheme,
        langExtension,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        })
      ]
    });

    const view = new EditorView({
      state,
      parent: containerRef.current
    });
    
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Synchronize external value changes if entirely overwritten
  useEffect(() => {
    if (viewRef.current) {
      const currentVal = viewRef.current.state.doc.toString();
      if (value !== currentVal) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentVal.length, insert: value }
        });
      }
    }
  }, [value]);

  return <div ref={containerRef} className="w-full h-full text-sm" />;
}

export default function CodePlayground() {
  const dbState = useLiveQuery(() => db.toolStates.get('tool:code-playground:state'), []);

  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [script, setScript] = useState(DEFAULT_JS);
  
  const [activeTab, setActiveTab] = useState<ViewMode>('html');
  const [mainTab, setMainTab] = useState<'editor' | 'preview' | 'console'>('editor');
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const [stateLoaded, setStateLoaded] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load state from Dexie
  useEffect(() => {
    if (dbState && !stateLoaded) {
      const data = dbState.content as { html?: string; css?: string; script?: string };
      if (data.html !== undefined) setHtml(data.html);
      if (data.css !== undefined) setCss(data.css);
      if (data.script !== undefined) setScript(data.script);
      setStateLoaded(true);
    }
    if (dbState === null && !stateLoaded) {
      setStateLoaded(true);
    }
  }, [dbState, stateLoaded]);

  // Save state to Dexie
  useEffect(() => {
    if (!stateLoaded) return;
    const timer = setTimeout(() => {
      db.toolStates.put({
        id: 'tool:code-playground:state',
        content: { html, css, script },
        updatedAt: Date.now(),
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [html, css, script, stateLoaded]);

  // Listen for console logs from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.source === 'playground-console') {
        const { type, message } = e.data;
        // Parse the error stack/message if possible to get a better line match
        let formattedMsg = String(message);
        
        // Clean proxy/object notation from stringified representations in basic scripts if needed
        if (type === 'error' && formattedMsg.includes('Límite de ejecución')) {
          formattedMsg = 'El script excedió el límite de 5 segundos (Posible bucle infinito o timeout)';
        }

        setLogs(prev => [...prev, {
          type: type as 'log' | 'info' | 'warn' | 'error',
          message: formattedMsg,
          time: Date.now()
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRun = async () => {
    setIsRunning(true);
    setLogs([]);

    // Add a basic while loop timeout guard
    const safeJsCode = script.replace(
      /while\s*\(([^)]+)\)\s*\{/g, 
      'while($1) { if (Date.now() - __exe_start_time > 5000) throw new Error("Límite de ejecución de 5 segundos excedido");' 
    ).replace(
      /for\s*\(([^)]+)\)\s*\{/g, 
      'for($1) { if (Date.now() - __exe_start_time > 5000) throw new Error("Límite de ejecución de 5 segundos excedido");'
    );

    let docPrefix = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${css}</style>
          <script>
            // Intercept console
            const originalConsole = {
              log: console.log,
              info: console.info,
              warn: console.warn,
              error: console.error
            };

            function safelyStringify(arg) {
              if (typeof arg === 'undefined') return 'undefined';
              if (arg === null) return 'null';
              if (arg instanceof Error) return arg.message;
              if (typeof arg === 'object') {
                try {
                   return JSON.stringify(arg, null, 2);
                } catch(e) {
                   return '[Circular object / Unstringifiable]';
                }
              }
              return String(arg);
            }

            function postLog(type, args) {
              const message = Array.from(args).map(safelyStringify).join(' ');
              window.parent.postMessage({ source: 'playground-console', type, message }, '*');
            }

            console.log = function() { postLog('log', arguments); originalConsole.log.apply(console, arguments); };
            console.info = function() { postLog('info', arguments); originalConsole.info.apply(console, arguments); };
            console.warn = function() { postLog('warn', arguments); originalConsole.warn.apply(console, arguments); };
            console.error = function() { postLog('error', arguments); originalConsole.error.apply(console, arguments); };
            
            window.onerror = function(msg, url, line, col, error) {
              const offset = window.__PLAYGROUND_LINE_OFFSET || 0;
              const originalLine = Math.max(1, line - offset);
              const errorMessage = "Runtime Error: " + msg + " (en línea " + originalLine + ")";
              postLog("error", [errorMessage]);
              return false;
            };

            window.addEventListener('unhandledrejection', function(event) {
              postLog('error', ['Unhandled Promise Rejection:', event.reason]);
            });
          </script>
        </head>
        <body>
          ${html}
          <script>
            window.__PLAYGROUND_LINE_OFFSET = 0; // Placeholder
          </script>
          <script>
            try {
              const __exe_start_time = Date.now();
`;
    const offsetCalc = docPrefix.split('\n').length - 1;
    docPrefix = docPrefix.replace('window.__PLAYGROUND_LINE_OFFSET = 0;', `window.__PLAYGROUND_LINE_OFFSET = ${offsetCalc};`);

    const docSuffix = `
            } catch (e) {
              const offset = window.__PLAYGROUND_LINE_OFFSET || 0;
              let finalStack = '';
              if (e.stack) {
                const stackLines = e.stack.split('\\n');
                finalStack = '\\n' + stackLines.slice(0,2).map(l => l.replace(/:(\\d+):(\\d+)/, (...m) => ':' + Math.max(1, parseInt(m[1]) - offset) + ':' + m[2])).join('\\n');
              }
              console.error(e.message, finalStack);
            }
          </script>
        </body>
      </html>
    `;

    const docContent = docPrefix + safeJsCode + docSuffix;

    if (iframeRef.current) {
      const blob = new Blob([docContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      
      // Cleanup ObjectURL after load
      iframeRef.current.onload = () => {
        URL.revokeObjectURL(url);
        setIsRunning(false);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => setIsRunning(false), 2000);
    }
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    setHtml('');
    setCss('');
    setScript('');
    setShowClearConfirm(false);
    if (iframeRef.current) iframeRef.current.src = 'about:blank';
    setLogs([]);
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100dvh-var(--topbar-height)-3rem)] relative">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between border border-border bg-surface rounded-xl p-2 md:p-3">
        <div className="flex flex-col gap-0.5">
           <span className="text-sm font-semibold text-text-primary px-1">Code Sandbox (JS)</span>
           <span className="text-xs text-text-tertiary px-1 max-md:hidden">Escribe código y pulsa "Ejecutar"</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-danger hover:bg-danger/10 hover:text-danger">
            <Trash2 size={14} />
            Limpiar
          </Button>
          <Button variant="primary" size="sm" onClick={handleRun} disabled={isRunning}>
            <Play size={14} className={isRunning ? "animate-pulse" : ""} />
            Ejecutar
          </Button>
        </div>
      </div>

      {/* Mobile Main Tabs (Visible only on mobile/tablet) */}
      <div className="lg:hidden">
        <Tabs value={mainTab} onValueChange={(val) => setMainTab(val as any)}>
          <TabsList className="w-full justify-around p-1 h-12 bg-surface border-border">
            <TabsTrigger value="editor" className="flex items-center gap-2 py-2">
              <FileCode2 size={16} />
              <span>Editor</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2 py-2">
              <Eye size={16} />
              <span>Preview</span>
            </TabsTrigger>
            <TabsTrigger value="console" className="flex items-center gap-2 py-2">
              <Terminal size={16} />
              <span>Console</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content: Split Editor & Preview */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* Left: Editor */}
        <div className={[
          "flex-[1.2] flex flex-col min-h-[300px] bg-surface border border-border rounded-xl overflow-hidden",
          mainTab !== 'editor' ? 'max-lg:hidden' : ''
        ].join(' ')} data-theme="dark">
          <Tabs value={activeTab} onValueChange={(val: string) => setActiveTab(val as ViewMode)} className="flex flex-col h-full bg-[#282c34]">
             {/* Note: The tabs background mimics one-dark theme for a seamless look */}
            <TabsList className="!rounded-none !border-b !border-[#181a1f] !bg-[#21252b] !justify-start !p-0 !h-10">
              <TabsTrigger 
                value="html" 
                className="!text-xs !px-4 !h-full flex items-center gap-2 !text-white/60 hover:!text-white data-[state=active]:!bg-[#282c34] data-[state=active]:!text-white transition-all !border-r !border-[#181a1f] !shadow-none !rounded-none"
              >
                <FileCode2 size={14} className="text-[#e34f26]" /> 
                <span className="font-medium">HTML</span>
              </TabsTrigger>
              <TabsTrigger 
                value="css" 
                className="!text-xs !px-4 !h-full flex items-center gap-2 !text-white/60 hover:!text-white data-[state=active]:!bg-[#282c34] data-[state=active]:!text-white transition-all !border-r !border-[#181a1f] !shadow-none !rounded-none"
              >
                <Paintbrush size={14} className="text-[#264de4]" /> 
                <span className="font-medium">CSS</span>
              </TabsTrigger>
              <TabsTrigger 
                value="js" 
                className="!text-xs !px-4 !h-full flex items-center gap-2 !text-white/60 hover:!text-white data-[state=active]:!bg-[#282c34] data-[state=active]:!text-white transition-all !border-r !border-[#181a1f] !shadow-none !rounded-none"
              >
                <Braces size={14} className="text-[#f7df1e]" /> 
                <span className="font-medium">JS</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden relative">
              <div className={activeTab === 'html' ? "h-full block" : "hidden"}>
                <CodeEditor value={html} onChange={setHtml} lang="html" />
              </div>
              <div className={activeTab === 'css' ? "h-full block" : "hidden"}>
                 <CodeEditor value={css} onChange={setCss} lang="css" />
              </div>
              <div className={activeTab === 'js' ? "h-full block" : "hidden"}>
                 <CodeEditor value={script} onChange={setScript} lang="js" />
              </div>
            </div>
          </Tabs>
        </div>

        {/* Right: Preview & Console */}
        <div className={[
          "flex-1 flex flex-col gap-4 min-h-0 min-w-0",
          mainTab === 'editor' ? 'max-lg:hidden' : ''
        ].join(' ')}>
          
          {/* Iframe Preview */}
          <div className={[
            "flex-[2] bg-white rounded-xl overflow-hidden border border-border relative min-h-[250px]",
            mainTab === 'console' ? 'max-lg:hidden' : ''
          ].join(' ')}>
             {/* Small header for iframe window to make it look nicer */}
            <div className="h-6 bg-surface border-b border-border w-full flex items-center px-3 gap-1.5 absolute top-0 z-10 opacity-60 pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>
            <iframe 
              ref={iframeRef}
              title="Code Preview"
              className="w-full h-full bg-white border-none mt-6"
              sandbox="allow-scripts allow-popups allow-forms"
            />
          </div>

          {/* Embedded Console */}
          <div className={[
            "flex-1 bg-surface-hover rounded-xl border border-border flex flex-col overflow-hidden min-h-[150px]",
            mainTab === 'preview' ? 'max-lg:hidden' : ''
          ].join(' ')}>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface/50">
              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 uppercase tracking-wide">
                <Terminal size={12} /> Console
              </span>
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] text-text-tertiary hover:text-text-primary uppercase cursor-pointer transition-colors"
                title="Limpiar Consola"
              >
                Limpiar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-text-tertiary italic text-center py-4 opacity-50 flex flex-col items-center gap-2">
                   <Terminal size={24} className="opacity-20" />
                   Esperando ejecución...
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={[`py-1.5 px-2 mb-1 rounded flex gap-3 border transition-colors`, 
                    log.type === 'error' ? 'bg-danger/10 text-danger border-danger/20' : 
                    log.type === 'warn' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                    'bg-surface text-text-secondary border-border/50 hover:bg-surface-hover'
                  ].join(' ')}>
                    <span className="opacity-40 shrink-0 select-none text-[10px] pt-0.5">
                      {new Date(log.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="break-words whitespace-pre-wrap flex-1 leading-relaxed">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Clear Confirm Dialog (Inline) */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl animate-fade-in pointer-events-auto">
          <div className="bg-surface border border-border p-6 rounded-2xl shadow-xl max-w-sm w-full animate-slide-in-bottom">
            <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Trash2 size={20} className="text-danger" /> 
              ¿Limpiar todo el código?
            </h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Esta acción borrará todo el contenido de HTML, CSS y JavaScript permanentemente. ¿Estás seguro?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>Cancelar</Button>
              <Button variant="danger" onClick={confirmClear}>Sí, Limpiar Todo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
