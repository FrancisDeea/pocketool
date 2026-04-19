import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'code-playground',
  title: 'Code Playground',
  description: 'Prototyping environment with HTML, CSS, and JS execution.',
  icon: 'Code',
  category: 'preview',
  tags: ['code', 'html', 'css', 'js', 'editor', 'sandbox'],
  author: 'francisdeea',
  version: '1.0.0',
  dbKeys: ['tool:code-playground:state', 'tool:code-playground:snippets'],
};
