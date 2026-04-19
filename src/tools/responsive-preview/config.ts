import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'responsive-preview',
  title: 'Responsive Preview',
  description: 'Test your web app across multiple device sizes simultaneously with synced scrolling.',
  icon: 'MonitorSmartphone',
  category: 'preview',
  tags: ['responsive', 'preview', 'iframe', 'sync'],
  author: 'francisdeea',
  version: '1.0.0',
  dbKeys: ['tool:responsive-preview:viewports'], // Persisted DB keys
};
