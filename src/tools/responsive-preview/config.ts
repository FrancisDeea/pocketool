import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'responsive-preview',
  title: 'Responsive Preview',
  description:
    'Test your web app across multiple device sizes simultaneously with synced scrolling.',
  icon: 'MonitorSmartphone',
  category: 'preview',
  tags: ['responsive', 'preview', 'iframe', 'sync'],
  creator: 'francisdeea',
  detailedDescription:
    'An intuitive tool to visualize any website simultaneously across different device viewports. Includes automatic scroll and interaction synchronization across frames.',
  technicalDescription:
    'Uses multiple concurrent side-by-side iframes scaled using CSS transforms. Achieves complex scroll sync via cross-document postMessage APIs.',
  version: '1.0.0',
  dbKeys: ['tool:responsive-preview:viewports'], // Persisted DB keys
};
