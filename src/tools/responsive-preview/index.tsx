import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import {
  Monitor,
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code2
} from 'lucide-react';
import Button from '@ui/Button';
import Badge from '@ui/Badge';

type Viewport = {
  id: string;
  name: string;
  width: number;
  height: number;
  isDefault?: boolean;
  enabled: boolean;
};

const DEFAULT_VIEWPORTS: Viewport[] = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, isDefault: true, enabled: true },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', width: 393, height: 852, isDefault: true, enabled: true },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, isDefault: true, enabled: true },
  { id: 'desktop-hd', name: 'Desktop HD', width: 1280, height: 720, isDefault: true, enabled: true },
];

const SYNC_SNIPPET = `<script>
(function() {
  const IGNORE_TIME = 50;
  let lastSync = 0;
  window.addEventListener('scroll', () => {
    if (Date.now() - lastSync < IGNORE_TIME) return;
    window.parent.postMessage({ 
      type: 'SYNC_SCROLL', 
      source: window.name, 
      top: window.scrollY, 
      left: window.scrollX,
      maxTop: document.body.scrollHeight - window.innerHeight,
      maxLeft: document.body.scrollWidth - window.innerWidth
    }, '*');
  });
  window.addEventListener('click', (e) => {
    // Basic click sync could be added here later if needed
  });
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'DO_SCROLL') {
      lastSync = Date.now();
      window.scrollTo(e.data.left, e.data.top);
    }
  });
})();
</script>`;

export default function ResponsivePreview() {
  // Persistence for viewports
  const dbViewports = useLiveQuery(
    () => db.toolStates.get('tool:responsive-preview:viewports'),
    [],
  );

  const [viewports, setViewports] = useState<Viewport[]>(DEFAULT_VIEWPORTS);
  const [viewportsLoaded, setViewportsLoaded] = useState(false);
  
  const [url, setUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const [scale, setScale] = useState(0.5);
  
  const [showConfig, setShowConfig] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // New viewport form
  const [newName, setNewName] = useState('');
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');

  const iframeContainerRef = useRef<HTMLDivElement>(null);

  // Load persisted viewports once
  useEffect(() => {
    if (dbViewports && !viewportsLoaded) {
      const saved = dbViewports.content as Viewport[];
      if (Array.isArray(saved) && saved.length > 0) {
        setViewports(saved);
      }
      setViewportsLoaded(true);
    }
    if (dbViewports === null && !viewportsLoaded) {
      setViewportsLoaded(true);
    }
    if (dbViewports === undefined && !viewportsLoaded) {
      // Still loading
    }
  }, [dbViewports, viewportsLoaded]);

  // Save viewports back to DB whenever they change (if loaded)
  useEffect(() => {
    if (!viewportsLoaded) return;
    const timer = setTimeout(() => {
      db.toolStates.put({
        id: 'tool:responsive-preview:viewports',
        content: viewports,
        updatedAt: Date.now(),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [viewports, viewportsLoaded]);

  // Setup cross-iframe sync listener
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // Security: we should idealy check origin, but this tool loads arbitrary user dev servers
      if (e.data?.type === 'SYNC_SCROLL') {
        const { source, top, left } = e.data;
        if (!source || !iframeContainerRef.current) return;

        const iframes = iframeContainerRef.current.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          if (iframe.name && iframe.name !== source && iframe.contentWindow) {
            // Predict scroll values for other iframes
            // We can't know their exact maxTop from outside, so we pass percentages or exact.
            // A perfect sync requires the receiving script to use percentages, but 
            // for simplicity we pass exact top/left to avoid math in the snippet if sizes differ slightly.
            // Wait, passing exact means different height devices won't hit bottom.
            // Let's pass the raw values for now. 
            iframe.contentWindow.postMessage({
              type: 'DO_SCROLL',
              top,
              left
            }, '*');
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = url.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'http://' + finalUrl;
      setUrl(finalUrl);
    }
    setActiveUrl(finalUrl);
  };

  const handleReloadAll = () => {
    if (!iframeContainerRef.current) return;
    const iframes = iframeContainerRef.current.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      // Force reload by resetting src
      if (iframe.src) {
        const currentSrc = iframe.src;
        iframe.src = 'about:blank';
        setTimeout(() => {
          iframe.src = currentSrc;
        }, 10);
      }
    });
  };

  const toggleViewport = (id: string) => {
    setViewports(prev => prev.map(v => v.id === id ? { ...v, enabled: !v.enabled } : v));
  };

  const removeViewport = (id: string) => {
    setViewports(prev => prev.filter(v => v.id !== id || v.isDefault));
  };

  const addViewport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const w = parseInt(newWidth);
    const h = parseInt(newHeight);
    if (!newName.trim() || isNaN(w) || isNaN(h)) return;

    setViewports(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: newName.trim(),
        width: w,
        height: h,
        enabled: true,
      }
    ]);
    setNewName('');
    setNewWidth('');
    setNewHeight('');
  };

  const copySnippet = async () => {
    await navigator.clipboard.writeText(SYNC_SNIPPET);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const enabledViewports = viewports.filter(v => v.enabled);

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--topbar-height)-3rem)]">
      {/* Top Navbar */}
      <div className="flex flex-wrap items-center gap-4 mb-4 bg-surface p-3 rounded-xl border border-border">
        <form onSubmit={handleNavigate} className="flex-1 flex gap-2 min-w-[300px]">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="flex-1 px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm outline-none focus:border-accent text-text-primary"
          />
          <Button type="submit" variant="primary">
            Cargar
          </Button>
        </form>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <label className="text-xs text-text-tertiary">Zoom:</label>
            <input 
              type="range" 
              min="0.25" 
              max="1.5" 
              step="0.05" 
              value={scale} 
              onChange={e => setScale(parseFloat(e.target.value))}
              className="w-24 accent-accent"
            />
            <span className="text-xs font-mono text-text-secondary w-10">{Math.round(scale * 100)}%</span>
          </div>
          
          <Button variant="ghost" size="sm" onClick={handleReloadAll} title="Recargar todos">
            <RefreshCw size={16} />
          </Button>
          
          <Button 
            variant={showConfig ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => { setShowConfig(!showConfig); setShowSnippet(false); }}
            title="Configurar dispositivos"
          >
            <Settings size={16} /> Dispositivos
          </Button>

          <Button 
            variant={showSnippet ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => { setShowSnippet(!showSnippet); setShowConfig(false); }}
            title="Script de sincronización"
          >
            <Code2 size={16} /> Sync Script
          </Button>
        </div>
      </div>

      {/* Snippet Panel */}
      {showSnippet && (
        <div className="mb-4 bg-surface border border-border rounded-xl p-4 animate-fade-in relative shadow-lg">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Code2 size={16} className="text-accent" />
                Script de Sincronización
              </h3>
              <p className="text-xs text-text-tertiary mt-1">
                Pega este script temporalmente en el <code>&lt;head&gt;</code> de tu proyecto local para habilitar el scroll sincronizado entre iframes.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={copySnippet}>
              {copiedSnippet ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              {copiedSnippet ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <pre className="p-3 bg-surface-hover rounded-lg text-xs font-mono text-text-secondary overflow-x-auto border border-border mt-2">
            {SYNC_SNIPPET}
          </pre>
        </div>
      )}

      {/* Config Panel */}
      {showConfig && (
        <div className="mb-4 bg-surface border border-border rounded-xl p-4 animate-fade-in shadow-lg">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Dispositivos Activos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {viewports.map(vp => (
              <div 
                key={vp.id} 
                className={['flex items-center justify-between p-2 rounded-lg border', vp.enabled ? 'border-accent bg-accent-muted/10' : 'border-border bg-surface-hover'].join(' ')}
              >
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer" 
                  onClick={() => toggleViewport(vp.id)}
                >
                  <button className="text-text-tertiary hover:text-text-primary cursor-pointer">
                    {vp.enabled ? <Eye size={16} className="text-accent" /> : <EyeOff size={16} />}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-text-primary">{vp.name} {vp.isDefault && <Badge variant="accent" className="ml-1 scale-75 origin-left">Default</Badge>}</span>
                    <span className="text-[10px] text-text-tertiary font-mono">{vp.width} x {vp.height}</span>
                  </div>
                </div>
                {!vp.isDefault && (
                  <button 
                    onClick={() => removeViewport(vp.id)}
                    className="p-1.5 text-text-tertiary hover:text-danger rounded-md hover:bg-surface transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={addViewport} className="flex gap-2 items-end pt-3 border-t border-border mt-2">
            <div className="flex-1">
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Nombre</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ej: Galaxy S22" className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-md text-xs outline-none focus:border-accent" />
            </div>
            <div className="w-24">
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Ancho</label>
              <input type="number" value={newWidth} onChange={e => setNewWidth(e.target.value)} required placeholder="360" className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-md text-xs font-mono outline-none focus:border-accent" />
            </div>
            <div className="w-24">
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Alto</label>
              <input type="number" value={newHeight} onChange={e => setNewHeight(e.target.value)} required placeholder="800" className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-md text-xs font-mono outline-none focus:border-accent" />
            </div>
            <Button type="submit" variant="ghost" className="mb-px bg-surface-hover border border-border">
              <Plus size={14} /> Añadir
            </Button>
          </form>
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-surface border border-border rounded-xl relative">
        {!activeUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary">
            <Monitor size={48} className="mb-4 opacity-50" />
            <p className="text-sm">Introduce una URL local para previsualizar</p>
            <p className="text-xs mt-2 opacity-70">Nota: Algunas webs bloquean iframes en producción (X-Frame-Options)</p>
          </div>
        ) : (
          <div 
            ref={iframeContainerRef}
            className="p-8 flex flex-wrap gap-8 items-start justify-center origin-top"
            style={{ transform: `scale(${scale})`, width: `${100 / scale}%` }}
          >
            {enabledViewports.map(vp => (
              <div key={vp.id} className="flex flex-col items-center group">
                <div className="flex items-center justify-between w-full mb-2 bg-surface p-2 rounded-t-xl border-x border-t border-border shadow-sm">
                  <span className="text-sm font-medium text-text-primary px-2">{vp.name}</span>
                  <span className="text-xs font-mono bg-surface-hover px-2 py-1 rounded text-text-secondary border border-border">
                    {vp.width}x{vp.height}
                  </span>
                </div>
                <div 
                  className="bg-white rounded-b-xl border border-border overflow-hidden shadow-2xl relative"
                  style={{ width: vp.width, height: vp.height }}
                >
                  <iframe
                    name={`iframe-${vp.id}`}
                    src={activeUrl}
                    className="w-full h-full border-none bg-white"
                    title={`Preview ${vp.name}`}
                    sandbox="allow-scripts allow-forms allow-same-origin allow-presentation allow-popups"
                    loading="lazy"
                  />
                  {/* Overlay for cross-origin error detection - tricky to completely detect without same-origin access, but we can style iframes with white bg so failures show as white pages instead of transparent */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
