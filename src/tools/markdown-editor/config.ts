import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'markdown-editor',
  title: 'Markdown Editor',
  description: 'Editor con preview, GFM y diagramas Mermaid',
  category: 'text',
  tags: ['markdown', 'editor', 'preview', 'mermaid', 'gfm'],
  icon: 'FileText',
  creator: 'francisdeea',
  detailedDescription: 'A fully-featured markdown editor with live, side-by-side rendering. Provides a robust toolkit to craft documents with ease and export them clean.',
  technicalDescription: 'Implemented with CodeMirror 6 for precise markdown editing and marked.js for real-time parsing to HTML safely. Features persistent caching in Dexie.',
  version: '1.0.0',
  dbKeys: ['tool:markdown-editor:content'],
};
