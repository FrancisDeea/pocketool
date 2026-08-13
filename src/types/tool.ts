/** Category of a tool */
export type ToolCategory = 'data' | 'text' | 'media' | 'productivity' | 'preview';

/** GitHub, Linkedin, Email contact info for a contributor/creator */
export type Contributor = {
  id: string;
  name: string;
  github: string;
  email?: string;
  linkedin?: string;
};

/** Configuration contract every tool must export from config.ts */
export type ToolConfig = {
  /** Unique kebab-case identifier (immutable once published) */
  id: string;
  /** Human-readable title */
  title: string;
  /** Short description of what the tool does */
  description: string;
  /** Elaborated description of the tool's use case and features */
  detailedDescription?: string;
  /** Concise technical description (e.g., 'React + CodeMirror + Web Worker') */
  technicalDescription?: string;
  /** Tool category for filtering */
  category: ToolCategory;
  /** Search tags */
  tags: string[];
  /** Lucide icon name */
  icon: string;
  /** Creator ID referencing a Contributor */
  creator: string;
  /** Contributor IDs referencing Contributors */
  contributors?: string[];
  /** Author username (deprecated, use creator) */
  author?: string;
  /** Semver version */
  version: string;
  /** Dexie keys this tool uses (for documentation and cleanup) */
  dbKeys?: string[];
};

/** Result type for storage operations */
export type StorageResult<T> =
  { ok: true; data: T } | { ok: false; error: 'quota_exceeded' | 'unavailable' | 'parse_error' };

/** Theme variants */
export type ThemeMode = 'light' | 'light-hc' | 'dark' | 'dark-hc';

/** Supported locales */
export type Locale = 'es' | 'en';
