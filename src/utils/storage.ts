import type { StorageResult } from '@/types/tool';

/**
 * Wrapper around localStorage with error handling, compression,
 * and schema versioning support.
 *
 * NEVER use localStorage directly — always use this module.
 *
 * Key naming convention:
 *   tool:[tool-id]:[key]  — tool-specific data
 *   app:[key]             — global preferences
 */

const COMPRESSION_THRESHOLD = 50_000; // 50KB

/** Check if localStorage is available */
function isStorageAvailable(): boolean {
  try {
    const testKey = '__pocketool_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/** Check if CompressionStream API is available */
function isCompressionAvailable(): boolean {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined'
  );
}

/** Compress a string using CompressionStream (gzip) */
async function compress(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });

  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const reader = compressedStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  // Encode as base64 for storage
  return `__compressed__:${btoa(String.fromCharCode(...merged))}`;
}

/** Decompress a compressed string */
async function decompress(data: string): Promise<string> {
  const base64 = data.slice('__compressed__:'.length);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  const decompressedStream = stream.pipeThrough(
    new DecompressionStream('gzip'),
  );
  const reader = decompressedStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const decoder = new TextDecoder();
  return chunks.map((c) => decoder.decode(c, { stream: true })).join('');
}

/** Check if a value is compressed */
function isCompressed(value: string): boolean {
  return value.startsWith('__compressed__:');
}

/**
 * Get a value from localStorage.
 */
export function storageGet<T>(key: string): StorageResult<T> {
  if (!isStorageAvailable()) {
    return { ok: false, error: 'unavailable' };
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { ok: false, error: 'parse_error' };
    }

    // Handle compressed values synchronously by returning a parse error
    // and requiring async version for compressed data
    if (isCompressed(raw)) {
      // For compressed data, use storageGetAsync
      return { ok: false, error: 'parse_error' };
    }

    const parsed = JSON.parse(raw) as T;
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: 'parse_error' };
  }
}

/**
 * Get a value from localStorage (async, supports compressed values).
 */
export async function storageGetAsync<T>(
  key: string,
): Promise<StorageResult<T>> {
  if (!isStorageAvailable()) {
    return { ok: false, error: 'unavailable' };
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { ok: false, error: 'parse_error' };
    }

    let value: string;
    if (isCompressed(raw)) {
      value = await decompress(raw);
    } else {
      value = raw;
    }

    const parsed = JSON.parse(value) as T;
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: 'parse_error' };
  }
}

/**
 * Set a value in localStorage. Compresses values larger than 50KB.
 */
export async function storageSet<T>(
  key: string,
  value: T,
): Promise<StorageResult<void>> {
  if (!isStorageAvailable()) {
    return { ok: false, error: 'unavailable' };
  }

  try {
    const serialized = JSON.stringify(value);

    let toStore: string;
    if (
      serialized.length > COMPRESSION_THRESHOLD &&
      isCompressionAvailable()
    ) {
      toStore = await compress(serialized);
    } else {
      toStore = serialized;
    }

    localStorage.setItem(key, toStore);
    return { ok: true, data: undefined };
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      error.name === 'QuotaExceededError'
    ) {
      return { ok: false, error: 'quota_exceeded' };
    }
    return { ok: false, error: 'unavailable' };
  }
}

/**
 * Delete a key from localStorage.
 */
export function storageDelete(key: string): void {
  if (!isStorageAvailable()) return;
  localStorage.removeItem(key);
}

/**
 * Export all pocketool-related data as a JSON object (for backup).
 */
export function storageExport(): Record<string, unknown> {
  if (!isStorageAvailable()) return {};

  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('tool:') || key.startsWith('app:'))) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          data[key] = JSON.parse(raw);
        }
      } catch {
        // Skip corrupted entries
      }
    }
  }
  return data;
}

/**
 * Import a backup JSON object into localStorage.
 */
export async function storageImport(
  backup: Record<string, unknown>,
): Promise<void> {
  for (const [key, value] of Object.entries(backup)) {
    await storageSet(key, value);
  }
}

/**
 * Get the storage version for a tool.
 */
export function getStorageVersion(toolId: string): number | null {
  const result = storageGet<number>(`tool:${toolId}:__version__`);
  if (result.ok) return result.data;
  return null;
}

/**
 * Set the storage version for a tool.
 */
export async function setStorageVersion(
  toolId: string,
  version: number,
): Promise<void> {
  await storageSet(`tool:${toolId}:__version__`, version);
}
