import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'notes',
  title: 'Quick Notes',
  description: 'Notas rápidas con etiquetas y persistencia local',
  category: 'productivity',
  tags: ['notes', 'tags', 'search', 'productivity', 'local'],
  icon: 'StickyNote',
  author: 'pocketool',
  version: '1.0.0',
  dbKeys: ['tool:notes:list'],
};
