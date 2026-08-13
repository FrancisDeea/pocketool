import { useState, useMemo } from 'react';
import { Copy, Check, Trash2, AlertCircle, Info } from 'lucide-react';
import Button from '@ui/Button';
import Badge from '@ui/Badge';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

// ── Pure logic (also exported for tests) ─────────────────────────────────────

export interface RegexMatch {
  index: number;
  end: number;
  value: string;
  groups: string[];
}

export interface ParseResult {
  regex: RegExp | null;
  error: string | null;
}

export function parseRegex(pattern: string, flags: string): ParseResult {
  if (!pattern) return { regex: null, error: null };
  try {
    return { regex: new RegExp(pattern, flags), error: null };
  } catch (e) {
    return { regex: null, error: (e as Error).message };
  }
}

export function findMatches(regex: RegExp, text: string): RegexMatch[] {
  if (!text) return [];
  const matches: RegexMatch[] = [];

  if (regex.flags.includes('g') || regex.flags.includes('y')) {
    const r = new RegExp(regex.source, regex.flags);
    let m: RegExpExecArray | null;
    let lastIndex = -1;
    while ((m = r.exec(text)) !== null) {
      if (m.index === lastIndex) {
        r.lastIndex++;
        continue;
      }
      lastIndex = m.index;
      matches.push({
        index: m.index,
        end: m.index + m[0].length,
        value: m[0],
        groups: m.slice(1).map((g) => g ?? ''),
      });
    }
  } else {
    const m = regex.exec(text);
    if (m) {
      matches.push({
        index: m.index,
        end: m.index + m[0].length,
        value: m[0],
        groups: m.slice(1).map((g) => g ?? ''),
      });
    }
  }

  return matches;
}

export interface Segment {
  text: string;
  matched: boolean;
  matchIndex: number | null;
}

export function buildSegments(text: string, matches: RegexMatch[]): Segment[] {
  if (!matches.length) return [{ text, matched: false, matchIndex: null }];

  const segments: Segment[] = [];
  let cursor = 0;

  for (let i = 0; i < matches.length; i++) {
    const { index, end, value } = matches[i];
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), matched: false, matchIndex: null });
    }
    segments.push({ text: value, matched: true, matchIndex: i });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false, matchIndex: null });
  }

  return segments;
}

// ── Saved state shape ─────────────────────────────────────────────────────────

interface RegexState {
  pattern: string;
  flags: string;
  testString: string;
}

const DEFAULT_FLAGS = 'g';

const ALL_FLAGS = [
  { flag: 'g', label: 'g', title: 'Global — find all matches' },
  { flag: 'i', label: 'i', title: 'Case insensitive' },
  { flag: 'm', label: 'm', title: 'Multiline — ^ and $ match line boundaries' },
  { flag: 's', label: 's', title: 'Dot-all — . matches newlines' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function RegexTester() {
  const saved = useLiveQuery(() => db.toolStates.get('tool:regex-tester:state'));

  const savedState = saved?.content as RegexState | undefined;
  const [pattern, setPattern] = useState(savedState?.pattern ?? '');
  const [flags, setFlags] = useState(savedState?.flags ?? DEFAULT_FLAGS);
  const [testString, setTestString] = useState(savedState?.testString ?? '');
  const [copied, setCopied] = useState(false);

  const persist = (next: Partial<RegexState>) => {
    db.toolStates.put({
      id: 'tool:regex-tester:state',
      content: {
        pattern: next.pattern ?? pattern,
        flags: next.flags ?? flags,
        testString: next.testString ?? testString,
      },
      updatedAt: Date.now(),
    });
  };

  const { regex, error } = useMemo(() => parseRegex(pattern, flags), [pattern, flags]);
  const matches = useMemo(() => (regex ? findMatches(regex, testString) : []), [regex, testString]);
  const segments = useMemo(() => buildSegments(testString, matches), [testString, matches]);

  const toggleFlag = (f: string) => {
    const next = flags.includes(f) ? flags.replace(f, '') : flags + f;
    setFlags(next);
    persist({ flags: next });
  };

  const handlePatternChange = (v: string) => {
    setPattern(v);
    persist({ pattern: v });
  };

  const handleTestStringChange = (v: string) => {
    setTestString(v);
    persist({ testString: v });
  };

  const handleClear = () => {
    setPattern('');
    setFlags(DEFAULT_FLAGS);
    setTestString('');
    persist({ pattern: '', flags: DEFAULT_FLAGS, testString: '' });
  };

  const handleCopyRegex = () => {
    if (!pattern) return;
    navigator.clipboard.writeText(`/${pattern}/${flags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100dvh-var(--topbar-height)-3rem)] overflow-y-auto">
      {/* Pattern row */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary font-mono text-lg select-none">/</span>
          <div className="flex-1 relative">
            <input
              type="text"
              value={pattern}
              onChange={(e) => handlePatternChange(e.target.value)}
              placeholder="pattern"
              spellCheck={false}
              className={[
                'w-full px-3 py-2 bg-surface border rounded-lg font-mono text-sm outline-none transition-colors',
                error ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent',
              ].join(' ')}
            />
          </div>
          <span className="text-text-tertiary font-mono text-lg select-none">/</span>
          <span className="text-accent font-mono text-sm w-8">{flags || '\u00a0'}</span>
        </div>

        {/* Flags + actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {ALL_FLAGS.map(({ flag, label, title }) => (
              <button
                key={flag}
                title={title}
                onClick={() => toggleFlag(flag)}
                className={[
                  'px-2 py-0.5 rounded font-mono text-xs border transition-colors',
                  flags.includes(flag)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border text-text-secondary hover:border-accent',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={handleCopyRegex} disabled={!pattern}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!pattern && !testString}
            >
              <Trash2 size={14} /> Clear
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs px-1">
            <AlertCircle size={13} />
            <span className="font-mono">{error}</span>
          </div>
        )}
      </div>

      {/* Match summary */}
      <div className="flex items-center gap-2 min-h-[24px]">
        {pattern && !error && (
          <>
            {matches.length > 0 ? (
              <Badge variant="accent">
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </Badge>
            ) : testString ? (
              <Badge>No matches</Badge>
            ) : null}
          </>
        )}
      </div>

      {/* Main panels */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Test string input */}
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest">
            Test String
          </label>
          <textarea
            value={testString}
            onChange={(e) => handleTestStringChange(e.target.value)}
            placeholder="Paste text to test against your pattern..."
            spellCheck={false}
            className="flex-1 min-h-[180px] lg:min-h-0 w-full px-3 py-2 bg-surface border border-border rounded-lg font-mono text-sm outline-none focus:border-accent resize-none transition-colors"
          />
        </div>

        {/* Highlighted output */}
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest">
            Highlighted Output
          </label>
          <div className="flex-1 min-h-[180px] lg:min-h-0 px-3 py-2 bg-surface border border-border rounded-lg font-mono text-sm overflow-auto whitespace-pre-wrap break-all">
            {testString ? (
              segments.map((seg, i) =>
                seg.matched ? (
                  <mark
                    key={i}
                    className="bg-accent/30 text-text-primary rounded-sm px-0.5"
                    title={`Match ${(seg.matchIndex ?? 0) + 1}`}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )
            ) : (
              <span className="text-text-tertiary">Output will appear here...</span>
            )}
          </div>
        </div>
      </div>

      {/* Match details */}
      {matches.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-text-secondary tracking-widest">
            Match Details
          </label>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {matches.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono"
              >
                <span className="text-accent font-semibold w-6 shrink-0">{i + 1}</span>
                <span className="text-text-primary break-all">
                  {m.value || <em className="text-text-tertiary">empty string</em>}
                </span>
                <span className="text-text-tertiary ml-auto shrink-0">
                  @{m.index}–{m.end}
                </span>
                {m.groups.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {m.groups.map((g, gi) => (
                      <Badge key={gi} variant="accent">
                        ${gi + 1}: {g || '—'}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer hint */}
      {!pattern && (
        <div className="flex items-center gap-2 text-text-tertiary text-xs mt-auto">
          <Info size={13} />
          <span>Enter a pattern above. Flags toggle below the input. Results update live.</span>
        </div>
      )}
    </div>
  );
}
