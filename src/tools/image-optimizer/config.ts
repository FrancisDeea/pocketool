import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'image-optimizer',
  title: 'Image Optimizer',
  description: 'Optimiza imágenes con wasm-vips en el navegador',
  category: 'media',
  tags: ['image', 'optimize', 'webp', 'avif', 'compress'],
  icon: 'Image',
  creator: 'francisdeea',
  contributors: ['creativoma'],
  detailedDescription:
    'A privacy-first tool to resize, convert, and compress images directly in your browser without uploading to any server. Features an interactive visual before-and-after comparison slider.',
  technicalDescription:
    'Leverages HTML5 Canvas for fast rendering operations and native Web APIs for client-side image compression. No server involved.',
  version: '1.0.0',
};
