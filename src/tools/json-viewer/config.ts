import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'json-viewer',
  title: 'JSON Viewer',
  description: 'Explora y formatea JSON de cualquier tamaño',
  category: 'data',
  tags: ['json', 'format', 'tree', 'search', 'validate'],
  icon: 'Braces',
  creator: 'francisdeea',
  detailedDescription:
    'A robust utility to format and inspect structured JSON data. It automatically highlights syntax and makes navigating deep and complex structures effortless.',
  technicalDescription:
    'Parses and safely formats user stringified JSON. Utilizes React components for recursive data-tree rendering to handle deeply nested objects efficiently.',
  version: '1.0.0',
  dbKeys: ['tool:json-viewer:last-input'],
};
