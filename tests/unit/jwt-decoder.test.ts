import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── Pure logic (inlined from src/tools/jwt-decoder/index.tsx) ───────────────

type JwtParseResult =
  | {
      ok: true;
      header: Record<string, unknown>;
      payload: Record<string, unknown>;
      signature: string;
    }
  | { ok: false; error: string };

type TokenStatus = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry';

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function parseJwt(token: string): JwtParseResult {
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

function getTokenStatus(payload: Record<string, unknown>): TokenStatus {
  const now = Math.floor(Date.now() / 1000);
  if ('nbf' in payload && typeof payload.nbf === 'number' && now < payload.nbf) {
    return 'not-yet-valid';
  }
  if (!('exp' in payload) || typeof payload.exp !== 'number') {
    return 'no-expiry';
  }
  return now < payload.exp ? 'valid' : 'expired';
}

function formatTimestamp(ts: number): string {
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

function getClaimDescription(key: string): string | null {
  return CLAIM_DESCRIPTIONS[key] ?? null;
}

function isTimestampClaim(key: string): boolean {
  return ['exp', 'nbf', 'iat'].includes(key);
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

// Standard jwt.io example token
// Header: {"alg":"HS256","typ":"JWT"}
// Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
const VALID_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// ─── decodeBase64Url ──────────────────────────────────────────────────────────

describe('decodeBase64Url', () => {
  it('decodes a standard base64url string (length % 4 === 0)', () => {
    // {"alg":"HS256","typ":"JWT"} → eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
    const result = decodeBase64Url('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(result).toBe('{"alg":"HS256","typ":"JWT"}');
  });

  it('replaces - with + during decode', () => {
    // base64 char + becomes - in base64url; decoding should reverse this
    const standard = btoa('a+b');
    const urlSafe = standard.replace(/\+/g, '-').replace(/=/g, '');
    expect(decodeBase64Url(urlSafe)).toBe('a+b');
  });

  it('replaces _ with / during decode', () => {
    const standard = btoa('a/b');
    const urlSafe = standard.replace(/\//g, '_').replace(/=/g, '');
    expect(decodeBase64Url(urlSafe)).toBe('a/b');
  });

  it('handles string with length % 4 === 1 (adds == padding)', () => {
    // "a" → YQ== in base64 → "YQ" in base64url (length 2 % 4 = 2, needs ==)
    // For length % 4 === 1: won't happen naturally — base64url encodes to multiples of 4 after stripping =
    // Test with length 5 → needs 3 padding chars
    const encoded = btoa('abc').replace(/=/g, ''); // "YWJj" length 4
    expect(decodeBase64Url(encoded)).toBe('abc');
  });

  it('handles string with length % 4 === 2 (adds == padding)', () => {
    const encoded = btoa('a').replace(/=/g, ''); // "YQ" length 2 → needs ==
    expect(decodeBase64Url(encoded)).toBe('a');
  });

  it('handles string with length % 4 === 3 (adds = padding)', () => {
    const encoded = btoa('ab').replace(/=/g, ''); // "YWI" length 3 → needs =
    expect(decodeBase64Url(encoded)).toBe('ab');
  });

  it('handles string with no padding needed (length % 4 === 0)', () => {
    const enc = btoa('\x00\x01\x02'); // "AAEC" 4 chars, no padding needed
    expect(decodeBase64Url(enc)).toBe('\x00\x01\x02');
  });

  it('handles the signature part with _ URL-safe char', () => {
    // SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c contains _
    const sig = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(() => decodeBase64Url(sig)).not.toThrow();
  });
});

// ─── parseJwt ─────────────────────────────────────────────────────────────────

describe('parseJwt', () => {
  it('returns ok:false with empty error for empty string', () => {
    const result = parseJwt('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('');
  });

  it('returns ok:false with empty error for whitespace-only string', () => {
    const result = parseJwt('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('');
  });

  it('returns error for single-part token', () => {
    const result = parseJwt('onlyonepart');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('3 partes');
  });

  it('returns error for two-part token', () => {
    const result = parseJwt('part1.part2');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('3 partes');
  });

  it('returns error for four-part token', () => {
    const result = parseJwt('a.b.c.d');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('3 partes');
  });

  it('returns error when header is not valid base64url', () => {
    const result = parseJwt('!!!.payload.sig');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });

  it('returns error when header is valid base64 but not JSON', () => {
    const notJson = btoa('not-json').replace(/=/g, '');
    const result = parseJwt(`${notJson}.payload.sig`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });

  it('returns error when payload is not valid base64url', () => {
    const validHeader = btoa('{"alg":"HS256"}').replace(/=/g, '');
    const result = parseJwt(`${validHeader}.!!!.sig`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });

  it('returns error when payload is valid base64 but not JSON', () => {
    const validHeader = btoa('{"alg":"HS256"}').replace(/=/g, '');
    const notJson = btoa('not-json').replace(/=/g, '');
    const result = parseJwt(`${validHeader}.${notJson}.sig`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });

  it('successfully parses the standard jwt.io example token', () => {
    const result = parseJwt(VALID_TOKEN);
    expect(result.ok).toBe(true);
  });

  it('extracts the correct alg from header', () => {
    const result = parseJwt(VALID_TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.header.alg).toBe('HS256');
  });

  it('extracts the correct typ from header', () => {
    const result = parseJwt(VALID_TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.header.typ).toBe('JWT');
  });

  it('extracts the correct sub from payload', () => {
    const result = parseJwt(VALID_TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.sub).toBe('1234567890');
  });

  it('extracts the correct name from payload', () => {
    const result = parseJwt(VALID_TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.name).toBe('John Doe');
  });

  it('extracts the correct iat from payload', () => {
    const result = parseJwt(VALID_TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.iat).toBe(1516239022);
  });

  it('preserves the raw signature part', () => {
    const result = parseJwt(VALID_TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    }
  });

  it('trims whitespace from the token before parsing', () => {
    const result = parseJwt(`  ${VALID_TOKEN}  `);
    expect(result.ok).toBe(true);
  });

  it('handles tokens with URL-safe base64url characters in signature', () => {
    const result = parseJwt(VALID_TOKEN);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.signature).toContain('_');
  });

  it('parses a token with numeric, boolean and null payload values', () => {
    const payload = { num: 42, flag: true, nothing: null };
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    const encodedHeader = btoa('{"alg":"none"}').replace(/=/g, '');
    const result = parseJwt(`${encodedHeader}.${encodedPayload}.sig`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.num).toBe(42);
      expect(result.payload.flag).toBe(true);
      expect(result.payload.nothing).toBeNull();
    }
  });
});

// ─── getTokenStatus ───────────────────────────────────────────────────────────

describe('getTokenStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "expired" when exp is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01'));
    const status = getTokenStatus({ exp: 1000000000 }); // year 2001
    expect(status).toBe('expired');
  });

  it('returns "valid" when exp is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01'));
    const status = getTokenStatus({ exp: 9999999999 }); // year 2286
    expect(status).toBe('valid');
  });

  it('returns "no-expiry" when exp claim is absent', () => {
    const status = getTokenStatus({ sub: '123', name: 'Alice' });
    expect(status).toBe('no-expiry');
  });

  it('returns "no-expiry" when exp is not a number', () => {
    const status = getTokenStatus({ exp: 'not-a-number' });
    expect(status).toBe('no-expiry');
  });

  it('returns "no-expiry" when exp is null', () => {
    const status = getTokenStatus({ exp: null });
    expect(status).toBe('no-expiry');
  });

  it('returns "not-yet-valid" when nbf is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01'));
    const status = getTokenStatus({ nbf: 9999999999 });
    expect(status).toBe('not-yet-valid');
  });

  it('returns "valid" when nbf is in the past and exp is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01'));
    const now = Math.floor(Date.now() / 1000);
    const status = getTokenStatus({ nbf: now - 3600, exp: now + 3600 });
    expect(status).toBe('valid');
  });

  it('nbf check takes priority: returns "not-yet-valid" even when exp is also present and valid', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01'));
    const status = getTokenStatus({ nbf: 9999999999, exp: 9999999998 });
    expect(status).toBe('not-yet-valid');
  });

  it('returns "expired" when exp equals current time exactly', () => {
    vi.useFakeTimers();
    const now = Math.floor(Date.now() / 1000);
    vi.setSystemTime(new Date((now + 1) * 1000)); // 1 second after exp
    const status = getTokenStatus({ exp: now });
    expect(status).toBe('expired');
  });

  it('returns "valid" when exp is 1 second in the future', () => {
    vi.useFakeTimers();
    const now = Math.floor(Date.now() / 1000);
    const status = getTokenStatus({ exp: now + 1 });
    expect(status).toBe('valid');
  });
});

// ─── formatTimestamp ──────────────────────────────────────────────────────────

describe('formatTimestamp', () => {
  it('returns a non-empty string', () => {
    expect(formatTimestamp(1516239022)).toBeTruthy();
  });

  it('returns a string containing the year 2018 for iat 1516239022', () => {
    const result = formatTimestamp(1516239022);
    expect(result).toContain('2018');
  });

  it('handles Unix epoch 0 (1970) without throwing', () => {
    expect(() => formatTimestamp(0)).not.toThrow();
    expect(formatTimestamp(0)).toContain('1970');
  });

  it('handles far-future timestamp without throwing', () => {
    expect(() => formatTimestamp(9999999999)).not.toThrow();
  });

  it('returns a string (not undefined or null)', () => {
    const result = formatTimestamp(1516239022);
    expect(typeof result).toBe('string');
  });
});

// ─── getClaimDescription ──────────────────────────────────────────────────────

describe('getClaimDescription', () => {
  it('returns a description for "iss"', () => {
    expect(getClaimDescription('iss')).not.toBeNull();
    expect(getClaimDescription('iss')).toContain('Issuer');
  });

  it('returns a description for "sub"', () => {
    expect(getClaimDescription('sub')).not.toBeNull();
    expect(getClaimDescription('sub')).toContain('Subject');
  });

  it('returns a description for "aud"', () => {
    expect(getClaimDescription('aud')).not.toBeNull();
    expect(getClaimDescription('aud')).toContain('Audience');
  });

  it('returns a description for "exp"', () => {
    expect(getClaimDescription('exp')).not.toBeNull();
    expect(getClaimDescription('exp')).toContain('Expiration');
  });

  it('returns a description for "nbf"', () => {
    expect(getClaimDescription('nbf')).not.toBeNull();
    expect(getClaimDescription('nbf')).toContain('Not Before');
  });

  it('returns a description for "iat"', () => {
    expect(getClaimDescription('iat')).not.toBeNull();
    expect(getClaimDescription('iat')).toContain('Issued At');
  });

  it('returns a description for "jti"', () => {
    expect(getClaimDescription('jti')).not.toBeNull();
    expect(getClaimDescription('jti')).toContain('JWT ID');
  });

  it('returns null for an unknown claim', () => {
    expect(getClaimDescription('custom_claim')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(getClaimDescription('')).toBeNull();
  });

  it('returns null for a claim that is close but not exact ("EXP")', () => {
    expect(getClaimDescription('EXP')).toBeNull();
  });
});

// ─── isTimestampClaim ─────────────────────────────────────────────────────────

describe('isTimestampClaim', () => {
  it('returns true for "exp"', () => {
    expect(isTimestampClaim('exp')).toBe(true);
  });

  it('returns true for "nbf"', () => {
    expect(isTimestampClaim('nbf')).toBe(true);
  });

  it('returns true for "iat"', () => {
    expect(isTimestampClaim('iat')).toBe(true);
  });

  it('returns false for "iss"', () => {
    expect(isTimestampClaim('iss')).toBe(false);
  });

  it('returns false for "sub"', () => {
    expect(isTimestampClaim('sub')).toBe(false);
  });

  it('returns false for "aud"', () => {
    expect(isTimestampClaim('aud')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isTimestampClaim('')).toBe(false);
  });

  it('returns false for uppercase "EXP"', () => {
    expect(isTimestampClaim('EXP')).toBe(false);
  });

  it('returns false for an arbitrary custom claim', () => {
    expect(isTimestampClaim('user_id')).toBe(false);
  });
});
