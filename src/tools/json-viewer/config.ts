import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'json-viewer',
  title: 'JSON Viewer',
  description: 'Explora y formatea JSON de cualquier tamaño',
  category: 'data',
  tags: ['json', 'format', 'tree', 'search', 'validate'],
  icon: 'Braces',
  author: 'pocketool',
  version: '1.0.0',
  dbKeys: ['tool:json-viewer:last-input'],
};
