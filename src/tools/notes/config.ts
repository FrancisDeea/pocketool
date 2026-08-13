import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'notes',
  title: 'Quick Notes',
  description: 'Notas rápidas con etiquetas y persistencia local',
  category: 'productivity',
  tags: ['notes', 'tags', 'search', 'productivity', 'local'],
  icon: 'StickyNote',
  creator: 'francisdeea',
  detailedDescription:
    'A fast, distraction-free notepad that automatically saves your thoughts in the browser. Supports creating multiple notes instantly.',
  technicalDescription:
    'Leverages Dexie.js for lightning-speed local persistence using IndexedDB, guaranteeing immediate writes with no network overhead.',
  version: '1.0.0',
  dbKeys: ['tool:notes:list'],
};
