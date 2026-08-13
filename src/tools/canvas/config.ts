import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'canvas',
  title: 'Canvas',
  description: 'Vector canvas tool with infinite workspace and auto-save',
  detailedDescription:
    'A versatile vector canvas tool designed for creating diagrams, sketches, and whiteboards. It features an infinite canvas, basic shapes (rectangles, ellipses, triangles, lines, arrows), freehand sketching with smoothing, and dynamic connectors between shapes. It includes a robust history system (undo/redo), automatic local persistence (Dexie/IndexedDB), and the ability to save named versions of your work.',
  technicalDescription: 'React + Konva.js + Dexie.js + Tailwind CSS 4',
  category: 'productivity',
  tags: ['canvas', 'vector', 'whiteboard', 'diagram', 'shapes'],
  icon: 'Brush',
  creator: 'francisdeea',
  version: '1.0.0',
  dbKeys: ['tool:canvas:autosave', 'tool:canvas:snap', 'tool:canvas:show-grid'],
};
