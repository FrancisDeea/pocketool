import {
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Shield,
  History,
  X,
} from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Button from '@ui/Button';
import Badge from '@ui/Badge';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addToolHistory, type ToolHistory } from '@/db';

// ─── Pure logic (exported for tests) ────────────────────────────────────────

export type JwtParseResult =
  | {
      ok: true;
      header: Record<string, unknown>;
      payload: Record<string, unknown>;
      signature: string;
    }
  | { ok: false; error: string };

export type TokenStatus = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry';

export function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  return atob(padded);
}

export function parseJwt(token: string): JwtParseResult {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: '' };
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return {
      ok: false,
      error: 'El token debe tener exactamente 3 partes (header.payload.signature)',
    };
  }
  try {
    const header = JSON.parse(decodeBase64Url(parts[0])) as Record<string, unknown>;
    const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
    return { ok: true, header, payload, signature: parts[2] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Token inválido',
    };
  }
}

export function getTokenStatus(payload: Record<string, unknown>): TokenStatus {
  const now = Math.floor(Date.now() / 1000);
  if ('nbf' in payload && typeof payload.nbf === 'number' && now < payload.nbf) {
    return 'not-yet-valid';
  }
  if (!('exp' in payload) || typeof payload.exp !== 'number') {
    return 'no-expiry';
  }
  return now < payload.exp ? 'valid' : 'expired';
}

export function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ts * 1000));
}

const CLAIM_DESCRIPTIONS: Record<string, string> = {
  iss: 'Issuer — quién emitió el token',
  sub: 'Subject — identificador del usuario',
  aud: 'Audience — destinatarios del token',
  exp: 'Expiration Time — fecha de expiración',
  nbf: 'Not Before — válido a partir de',
  iat: 'Issued At — fecha de emisión',
  jti: 'JWT ID — identificador único del token',
};

export function getClaimDescription(key: string): string | null {
  return CLAIM_DESCRIPTIONS[key] ?? null;
}

export function isTimestampClaim(key: string): boolean {
  return ['exp', 'nbf', 'iat'].includes(key);
}

// ─── Component ───────────────────────────────────────────────────────────────

function formatHistoryDate(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

type CopiedSection = 'header' | 'payload' | 'signature' | null;

function StatusBadge({ status }: { status: TokenStatus }) {
  if (status === 'valid') {
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <ShieldCheck size={12} />
        Válido
      </Badge>
    );
  }
  if (status === 'expired') {
    return (
      <Badge variant="danger" className="flex items-center gap-1">
        <ShieldX size={12} />
        Expirado
      </Badge>
    );
  }
  if (status === 'not-yet-valid') {
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <ShieldAlert size={12} />
        No válido aún
      </Badge>
    );
  }
  return (
    <Badge className="flex items-center gap-1">
      <Shield size={12} />
      Sin expiración
    </Badge>
  );
}

function ClaimRow({ label, value }: { label: string; value: unknown }) {
  const description = getClaimDescription(label);
  const isTs = isTimestampClaim(label) && typeof value === 'number';

  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-semibold text-accent">{label}</span>
        {description && <span className="text-[10px] text-text-tertiary">{description}</span>}
      </div>
      <span className="text-xs font-mono text-text-primary break-all">
        {isTs ? `${String(value)} → ${formatTimestamp(value as number)}` : JSON.stringify(value)}
      </span>
    </div>
  );
}

function Section({
  title,
  content,
  section,
  copied,
  onCopy,
}: {
  title: string;
  content: string;
  section: CopiedSection;
  copied: CopiedSection;
  onCopy: (s: CopiedSection) => void;
}) {
  return (
    <div className="rounded-xl bg-surface border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          {title}
        </span>
        <button
          onClick={() => onCopy(section)}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors cursor-pointer px-2 py-1 rounded hover:bg-surface-hover"
        >
          {copied === section ? <Check size={12} /> : <Copy size={12} />}
          {copied === section ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

export default function JwtDecoder() {
  const savedToken = useLiveQuery(() => db.toolStates.get('tool:jwt-decoder:last-token'), []);

  const [token, setToken] = useState('');
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [copied, setCopied] = useState<CopiedSection>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const history = useLiveQuery(
    () => db.toolHistory.where('toolId').equals('jwt-decoder').reverse().sortBy('timestamp'),
    [],
    []
  );

  useEffect(() => {
    if (savedToken && !tokenLoaded) {
      const content = savedToken.content as string;
      if (content) setToken(content);
      setTokenLoaded(true);
    }
    if (savedToken === null && !tokenLoaded) {
      setTokenLoaded(true);
    }
  }, [savedToken, tokenLoaded]);

  useEffect(() => {
    if (!tokenLoaded) return;
    const timer = setTimeout(() => {
      db.toolStates.put({
        id: 'tool:jwt-decoder:last-token',
        content: token,
        updatedAt: Date.now(),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [token, tokenLoaded]);

  const decoded = useMemo(() => parseJwt(token), [token]);

  const status = useMemo(() => (decoded.ok ? getTokenStatus(decoded.payload) : null), [decoded]);

  const handleCopy = useCallback(
    async (section: CopiedSection) => {
      if (!decoded.ok || !section) return;
      let text = '';
      if (section === 'header') text = JSON.stringify(decoded.header, null, 2);
      else if (section === 'payload') text = JSON.stringify(decoded.payload, null, 2);
      else text = decoded.signature;
      await navigator.clipboard.writeText(text);
      setCopied(section);
      setTimeout(() => setCopied(null), 2000);
    },
    [decoded]
  );

  const handleClear = useCallback(async () => {
    if (decoded.ok && token.trim()) {
      await addToolHistory('jwt-decoder', {
        token: token.trim(),
        timestamp: Date.now(),
      });
    }
    setToken('');
  }, [decoded, token]);

  const handleRestoreHistory = useCallback((entry: ToolHistory) => {
    const data = entry.data as { token: string };
    if (data.token) setToken(data.token);
    setHistoryOpen(false);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-var(--topbar-height)-3rem)]">
      {/* Input Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Token
            </span>
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
                  <div className="absolute top-full left-0 mt-1 z-50 w-72 max-h-64 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg p-1">
                    <div className="px-2 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                      Historial reciente
                    </div>
                    {history.map((entry) => {
                      const data = entry.data as { token: string; timestamp: number };
                      const preview = data.token.slice(0, 50);
                      return (
                        <button
                          key={entry.id}
                          onClick={() => handleRestoreHistory(entry)}
                          className="w-full text-left px-2 py-1.5 text-xs rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
                        >
                          <span className="font-mono truncate block">{preview}…</span>
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
          {token.trim() && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X size={14} />
              Limpiar
            </Button>
          )}
        </div>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Pega tu JWT aquí..."
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
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            Decodificado
          </span>
          {decoded.ok && status && <StatusBadge status={status} />}
        </div>

        <div className="flex-1 overflow-auto">
          {!token.trim() && (
            <div className="h-full flex items-center justify-center text-sm text-text-tertiary">
              El resultado aparecerá aquí
            </div>
          )}

          {token.trim() && !decoded.ok && decoded.error && (
            <div className="flex items-center gap-2 text-danger text-sm p-4 rounded-xl bg-surface border border-border">
              <AlertCircle size={16} className="shrink-0" />
              <span>{decoded.error}</span>
            </div>
          )}

          {decoded.ok && (
            <div className="flex flex-col gap-3">
              <Section
                title="Header"
                content={JSON.stringify(decoded.header, null, 2)}
                section="header"
                copied={copied}
                onCopy={handleCopy}
              />

              <Section
                title="Payload"
                content={JSON.stringify(decoded.payload, null, 2)}
                section="payload"
                copied={copied}
                onCopy={handleCopy}
              />

              {/* Claim annotations */}
              {Object.keys(decoded.payload).some(
                (k) => getClaimDescription(k) !== null || isTimestampClaim(k)
              ) && (
                <div className="rounded-xl bg-surface border border-border overflow-hidden">
                  <div className="px-4 py-2 border-b border-border">
                    <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                      Claims
                    </span>
                  </div>
                  <div className="px-4 py-2">
                    {Object.entries(decoded.payload)
                      .filter(([k]) => getClaimDescription(k) !== null || isTimestampClaim(k))
                      .map(([k, v]) => (
                        <ClaimRow key={k} label={k} value={v} />
                      ))}
                  </div>
                </div>
              )}

              <Section
                title="Signature"
                content={decoded.signature}
                section="signature"
                copied={copied}
                onCopy={handleCopy}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
