import { useState, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  ChevronRight,
  ChevronDown,
  Search,
  AlertCircle,
} from 'lucide-react';
import Button from '@ui/Button';
import Badge from '@ui/Badge';

type JsonNodeProps = {
  data: unknown;
  name?: string;
  depth?: number;
  maxDepth: number;
  searchQuery: string;
  isLast?: boolean;
};

function JsonNode({
  data,
  name,
  depth = 0,
  maxDepth,
  searchQuery,
  isLast = true,
}: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < maxDepth);

  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const entries = isObject
    ? Object.entries(data as Record<string, unknown>)
    : [];
  const count = entries.length;

  const matchesSearch =
    searchQuery &&
    (name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (!isObject &&
        String(data).toLowerCase().includes(searchQuery.toLowerCase())));

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
          matchesSearch ? 'bg-accent-muted rounded' : '',
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
          'text-sm font-mono hover:bg-surface-hover rounded',
          matchesSearch ? 'bg-accent-muted' : '',
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
        <span className="text-text-tertiary">
          {isArray ? '[' : '{'}
        </span>
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

export default function JsonViewer() {
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [copied, setCopied] = useState(false);

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
      await navigator.clipboard.writeText(
        JSON.stringify(parsed.data, null, 2),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [parsed]);

  const handleDownload = useCallback(() => {
    if (parsed.ok) {
      const blob = new Blob(
        [JSON.stringify(parsed.data, null, 2)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [parsed]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-var(--topbar-height)-3rem)]">
      {/* Input Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            Input
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleFormat}>
              Formatear
            </Button>
            <Button variant="ghost" size="sm" onClick={handleMinify}>
              Minificar
            </Button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Pega tu JSON aquí...'
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
            {parsed.ok && (
              <Badge variant="accent">{nodeCount} nodos</Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!parsed.ok}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={!parsed.ok}
            >
              <Download size={14} />
              Descargar
            </Button>
          </div>
        </div>

        {/* Search & Depth */}
        {parsed.ok && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
              <Search size={14} className="text-text-tertiary shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por clave o valor..."
                className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <span>Prof:</span>
              <input
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                min={0}
                max={20}
                className="w-12 px-2 py-1 bg-surface border border-border rounded-md text-center text-text-primary outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        <div
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
              data={parsed.data}
              maxDepth={maxDepth}
              searchQuery={searchQuery}
            />
          )}
        </div>
      </div>
    </div>
  );
}
