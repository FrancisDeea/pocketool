import {
  Copy,
  Check,
  Download,
  ChevronRight,
  ChevronDown,
  Search,
  AlertCircle,
  ChevronUp,
  Maximize2,
  Minimize2,
  Regex,
  History,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Button from '@ui/Button';
import Badge from '@ui/Badge';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addToolHistory, type ToolHistory } from '@/db';

type JsonNodeProps = {
  data: unknown;
  name?: string;
  depth?: number;
  maxDepth: number;
  searchQuery: string;
  exactMatch: boolean;
  isLast?: boolean;
};

function JsonNode({
  data,
  name,
  depth = 0,
  maxDepth,
  searchQuery,
  exactMatch,
  isLast = true,
}: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < maxDepth);

  // Auto-expand when search query changes
  useEffect(() => {
    if (searchQuery) setExpanded(true);
    else setExpanded(depth < maxDepth);
  }, [searchQuery, depth, maxDepth]);

  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const entries = isObject ? Object.entries(data as Record<string, unknown>) : [];
  const count = entries.length;

  const matchesSearch = useMemo(() => {
    if (!searchQuery) return false;
    if (exactMatch) {
      const matchName = name === searchQuery;
      const matchData = !isObject && String(data) === searchQuery;
      return matchName || matchData;
    }
    const q = searchQuery.toLowerCase();
    const matchName = name?.toLowerCase().includes(q) ?? false;
    const matchData = !isObject && String(data).toLowerCase().includes(q);
    return matchName || matchData;
  }, [searchQuery, exactMatch, name, data, isObject]);

  const getValueColor = (val: unknown): string => {
    if (val === null) return 'text-text-tertiary';
    switch (typeof val) {
      case 'string':
        return 'text-success';
      case 'number':
        return 'text-accent';
      case 'boolean':
        return 'text-warning';
      default:
        return 'text-text-primary';
    }
  };

  const renderValue = (val: unknown): string => {
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    return String(val);
  };

  if (!isObject) {
    return (
      <div
        className={[
          'flex items-center gap-1 py-0.5 pl-4',
          'text-sm font-mono',
          matchesSearch ? 'match-node bg-accent-muted rounded transition-colors' : '',
        ].join(' ')}
        style={{ paddingLeft: `${(depth + 1) * 20}px` }}
      >
        {name !== undefined && (
          <>
            <span className="text-text-secondary">"{name}"</span>
            <span className="text-text-tertiary">: </span>
          </>
        )}
        <span className={getValueColor(data)}>{renderValue(data)}</span>
        {!isLast && <span className="text-text-tertiary">,</span>}
      </div>
    );
  }

  return (
    <div>
      <div
        className={[
          'flex items-center gap-1 py-0.5 cursor-pointer select-none',
          'text-sm font-mono hover:bg-surface-hover rounded transition-colors',
          matchesSearch ? 'match-node bg-accent-muted' : '',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-text-tertiary w-4 shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {name !== undefined && (
          <>
            <span className="text-text-secondary">"{name}"</span>
            <span className="text-text-tertiary">: </span>
          </>
        )}
        <span className="text-text-tertiary">{isArray ? '[' : '{'}</span>
        {!expanded && (
          <>
            <span className="text-text-tertiary text-xs ml-1">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
            <span className="text-text-tertiary">
              {isArray ? ']' : '}'}
              {!isLast ? ',' : ''}
            </span>
          </>
        )}
      </div>

      {expanded && (
        <>
          {entries.map(([key, val], idx) => (
            <JsonNode
              key={key}
              data={val}
              name={isArray ? undefined : key}
              depth={depth + 1}
              maxDepth={maxDepth}
              searchQuery={searchQuery}
              exactMatch={exactMatch}
              isLast={idx === count - 1}
            />
          ))}
          <div
            className="text-sm font-mono text-text-tertiary py-0.5"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            <span className="w-4 inline-block" />
            {isArray ? ']' : '}'}
            {!isLast ? ',' : ''}
          </div>
        </>
      )}
    </div>
  );
}

function formatHistoryDate(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export default function JsonViewer() {
  // Load last saved input from Dexie
  const savedInput = useLiveQuery(() => db.toolStates.get('tool:json-viewer:last-input'), []);
  const [input, setInput] = useState('');
  const [inputLoaded, setInputLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exactMatch, setExactMatch] = useState(false);
  const [maxDepth, setMaxDepth] = useState(3);
  const [copied, setCopied] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(-1);
  const [treeKey, setTreeKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // History entries
  const history = useLiveQuery(
    () => db.toolHistory.where('toolId').equals('json-viewer').reverse().sortBy('timestamp'),
    [],
    []
  );

  // Load persisted input once
  useEffect(() => {
    if (savedInput && !inputLoaded) {
      const content = savedInput.content as string;
      if (content) setInput(content);
      setInputLoaded(true);
    }
    if (savedInput === undefined && !inputLoaded) {
      // Still loading
    }
    if (savedInput === null && !inputLoaded) {
      setInputLoaded(true);
    }
  }, [savedInput, inputLoaded]);

  // Persist input to Dexie (debounced)
  useEffect(() => {
    if (!inputLoaded) return;
    const timer = setTimeout(() => {
      db.toolStates.put({
        id: 'tool:json-viewer:last-input',
        content: input,
        updatedAt: Date.now(),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [input, inputLoaded]);

  const parsed = useMemo(() => {
    if (!input.trim()) return { ok: false as const, error: '' };
    try {
      return { ok: true as const, data: JSON.parse(input) as unknown };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : 'Invalid JSON',
      };
    }
  }, [input]);

  // Scroll to matches logic
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    // Slight timeout allows React to re-render expanded states and DOM classes first
    const timer = setTimeout(() => {
      const matches = scrollContainerRef.current!.querySelectorAll('.match-node');
      setMatchCount(matches.length);

      // If we have matches but currentMatch is uninitialized or out of bounds, reset it
      if (matches.length > 0) {
        if (currentMatch >= matches.length || currentMatch === -1) {
          setCurrentMatch(0);
        }
      } else {
        setCurrentMatch(-1);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [parsed, searchQuery, currentMatch]); // Added currentMatch to avoid stale closure if needed, though we only use it for range check

  useEffect(() => {
    if (!scrollContainerRef.current || currentMatch === -1) return;
    const matches = scrollContainerRef.current.querySelectorAll('.match-node');
    if (matches.length === 0) return;

    // Clear previous highlights
    matches.forEach((el) => {
      el.classList.remove('bg-accent', 'text-white', '[&_*]:text-white');
      el.classList.add('bg-accent-muted');
    });

    // Highlight current match
    const target = matches[currentMatch] as HTMLElement;
    if (target) {
      target.classList.remove('bg-accent-muted');
      target.classList.add('bg-accent', 'text-white', '[&_*]:text-white');
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [currentMatch]); // Only runs when currentMatch changes manually or via range reset

  const handleNextMatch = useCallback(() => {
    if (matchCount > 0) {
      setCurrentMatch((prev) => (prev + 1) % matchCount);
    }
  }, [matchCount]);

  const handlePrevMatch = useCallback(() => {
    if (matchCount > 0) {
      setCurrentMatch((prev) => (prev - 1 + matchCount) % matchCount);
    }
  }, [matchCount]);

  const nodeCount = useMemo(() => {
    if (!parsed.ok) return 0;
    let count = 0;
    const walk = (val: unknown) => {
      count++;
      if (val && typeof val === 'object') {
        Object.values(val as Record<string, unknown>).forEach(walk);
      }
    };
    walk(parsed.data);
    return count;
  }, [parsed]);

  const handleFormat = useCallback(() => {
    if (parsed.ok) {
      setInput(JSON.stringify(parsed.data, null, 2));
    }
  }, [parsed]);

  const handleMinify = useCallback(() => {
    if (parsed.ok) {
      setInput(JSON.stringify(parsed.data));
    }
  }, [parsed]);

  const handleCopy = useCallback(async () => {
    if (parsed.ok) {
      await navigator.clipboard.writeText(JSON.stringify(parsed.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [parsed]);

  const handleDownload = useCallback(() => {
    if (parsed.ok) {
      const blob = new Blob([JSON.stringify(parsed.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [parsed]);

  const handleClear = useCallback(async () => {
    if (parsed.ok && input.trim()) {
      // Save to history before clearing
      await addToolHistory('json-viewer', {
        input: input.trim(),
        timestamp: Date.now(),
      });
    }
    setInput('');
  }, [parsed, input]);

  const handleRestoreHistory = useCallback((entry: ToolHistory) => {
    const data = entry.data as { input: string };
    if (data.input) setInput(data.input);
    setHistoryOpen(false);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-var(--topbar-height)-3rem)]">
      {/* Input Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Input
            </span>
            {/* History dropdown */}
            <div className="relative">
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                disabled={history.length === 0}
                className={[
                  'p-1 rounded text-text-tertiary transition-colors cursor-pointer',
                  history.length > 0
                    ? 'hover:text-text-primary hover:bg-surface-hover'
                    : 'opacity-40',
                ].join(' ')}
                title="Historial"
              >
                <History size={14} />
              </button>
              {historyOpen && history.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setHistoryOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 z-50 w-64 max-h-64 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg p-1">
                    <div className="px-2 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                      Historial reciente
                    </div>
                    {history.map((entry) => {
                      const data = entry.data as { input: string; timestamp: number };
                      const preview = data.input.slice(0, 60).replace(/\n/g, ' ');
                      return (
                        <button
                          key={entry.id}
                          onClick={() => handleRestoreHistory(entry)}
                          className="w-full text-left px-2 py-1.5 text-xs rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors truncate cursor-pointer"
                        >
                          <span className="font-mono">{preview}…</span>
                          <span className="block text-[10px] text-text-tertiary mt-0.5">
                            {formatHistoryDate(entry.timestamp)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleFormat}>
              Formatear
            </Button>
            <Button variant="ghost" size="sm" onClick={handleMinify}>
              Minificar
            </Button>
            {input.trim() && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X size={14} />
                Limpiar
              </Button>
            )}
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pega tu JSON aquí..."
          spellCheck={false}
          className={[
            'flex-1 w-full p-4 rounded-xl resize-none',
            'bg-surface border border-border',
            'text-sm font-mono text-text-primary',
            'placeholder:text-text-tertiary',
            'focus:outline-none focus:border-accent',
            'transition-colors duration-[var(--transition-fast)]',
          ].join(' ')}
        />
      </div>

      {/* Output Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Output
            </span>
            {parsed.ok && <Badge variant="accent">{nodeCount} nodos</Badge>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!parsed.ok}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} disabled={!parsed.ok}>
              <Download size={14} />
              Descargar
            </Button>
          </div>
        </div>

        {/* Search & Depth */}
        {parsed.ok && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg focus-within:border-accent transition-colors">
              <Search size={14} className="text-text-tertiary shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) handlePrevMatch();
                    else handleNextMatch();
                  }
                }}
                placeholder="Buscar por clave o valor..."
                className="flex-1 min-w-0 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-tertiary"
              />
              <button
                onClick={() => setExactMatch(!exactMatch)}
                className={[
                  'p-1.5 rounded transition-colors',
                  exactMatch
                    ? 'text-white bg-accent'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover',
                ].join(' ')}
                title="Coincidencia Exacta"
              >
                <Regex size={14} />
              </button>
              {searchQuery && matchCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-text-tertiary shrink-0">
                  <span>
                    {currentMatch + 1}/{matchCount}
                  </span>
                  <div className="flex bg-surface-hover rounded-md border border-border">
                    <button onClick={handlePrevMatch} className="p-1 hover:text-text-primary">
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={handleNextMatch}
                      className="p-1 hover:text-text-primary border-l border-border"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <span>Prof:</span>
              <input
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                min={0}
                max={100}
                className="w-12 px-2 py-1 bg-surface border border-border rounded-md text-center text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => {
                  setMaxDepth(100);
                  setTreeKey((k) => k + 1);
                }}
                className="p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary rounded border border-transparent hover:border-border transition-colors"
                title="Expandir todo"
              >
                <Maximize2 size={14} />
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMaxDepth(0);
                  setTreeKey((k) => k + 1);
                }}
                className="p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary rounded border border-transparent hover:border-border transition-colors"
                title="Colapsar todo"
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className={[
            'flex-1 overflow-auto rounded-xl',
            'bg-surface border border-border p-4',
          ].join(' ')}
        >
          {!input.trim() && (
            <div className="h-full flex items-center justify-center text-sm text-text-tertiary">
              El resultado aparecerá aquí
            </div>
          )}
          {input.trim() && !parsed.ok && (
            <div className="flex items-center gap-2 text-danger text-sm">
              <AlertCircle size={16} />
              <span>JSON inválido: {parsed.error}</span>
            </div>
          )}
          {parsed.ok && (
            <JsonNode
              key={treeKey}
              data={parsed.data}
              maxDepth={maxDepth}
              searchQuery={searchQuery}
              exactMatch={exactMatch}
            />
          )}
        </div>
      </div>
    </div>
  );
}
