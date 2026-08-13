import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'jwt-decoder',
  title: 'JWT Decoder',
  description: 'Decodifica y visualiza JSON Web Tokens',
  category: 'data',
  tags: ['jwt', 'token', 'decode', 'auth', 'security'],
  icon: 'KeyRound',
  creator: 'creativoma',
  detailedDescription:
    'Easily decode JSON Web Tokens (JWT) directly in the browser to inspect header and payload data without ever sending sensitive tokens to an external server.',
  technicalDescription:
    'Decodes base64-encoded strings natively and parses JWT structures cleanly. Completely serverless and executes instantly on the client side.',
  version: '1.0.0',
  dbKeys: ['tool:jwt-decoder:last-token'],
};
