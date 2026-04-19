import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'jwt-decoder',
  title: 'JWT Decoder',
  description: 'Decodifica y visualiza JSON Web Tokens',
  category: 'data',
  tags: ['jwt', 'token', 'decode', 'auth', 'security'],
  icon: 'KeyRound',
  author: 'pocketool',
  version: '1.0.0',
  dbKeys: ['tool:jwt-decoder:last-token'],
};
