/** Category of a tool */
export type ToolCategory = 'data' | 'text' | 'media' | 'productivity';

/** Configuration contract every tool must export from config.ts */
export type ToolConfig = {
  /** Unique kebab-case identifier (immutable once published) */
  id: string;
  /** Human-readable title */
  title: string;
  /** Short description of what the tool does */
  description: string;
  /** Tool category for filtering */
  category: ToolCategory;
  /** Search tags */
  tags: string[];
  /** Lucide icon name */
  icon: string;
  /** Author username */
  author: string;
  /** Semver version */
  version: string;
  /** Storage schema version (required if tool persists data) */
  storageVersion?: number;
  /** Migration function for storage schema changes */
  migrate?: (oldData: unknown, fromVersion: number) => unknown;
};

/** Result type for storage operations */
export type StorageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'quota_exceeded' | 'unavailable' | 'parse_error' };

/** Theme variants */
export type ThemeMode = 'light' | 'light-hc' | 'dark' | 'dark-hc';

/** Supported locales */
export type Locale = 'es' | 'en';
