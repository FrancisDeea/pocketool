import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'markdown-editor',
  title: 'Markdown Editor',
  description: 'Editor con preview, GFM y diagramas Mermaid',
  category: 'text',
  tags: ['markdown', 'editor', 'preview', 'mermaid', 'gfm'],
  icon: 'FileText',
  author: 'pocketool',
  version: '1.0.0',
  dbKeys: ['tool:markdown-editor:content'],
};
