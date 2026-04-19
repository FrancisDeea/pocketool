import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'code-playground',
  title: 'Code Playground',
  description: 'Prototyping environment with HTML, CSS, and JS execution.',
  icon: 'Code',
  category: 'preview',
  tags: ['code', 'html', 'css', 'js', 'editor', 'sandbox'],
  creator: 'francisdeea',
  detailedDescription: 'An isolated environment for web prototyping. Write HTML, CSS, and JS/TS code to instantly preview the resulting web application in a secure sandboxed iframe.',
  technicalDescription: 'Built with React, CodeMirror 6, and local Web Workers for unblocking TypeScript transpilation. All state persists securely in Dexie.',
  version: '1.0.0',
  dbKeys: ['tool:code-playground:state', 'tool:code-playground:snippets'],
};
