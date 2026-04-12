import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'image-optimizer',
  title: 'Image Optimizer',
  description: 'Optimiza imágenes con wasm-vips en el navegador',
  category: 'media',
  tags: ['image', 'optimize', 'webp', 'avif', 'compress'],
  icon: 'Image',
  author: 'pocketool',
  version: '1.0.0',
};
