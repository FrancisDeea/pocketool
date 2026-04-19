import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'regex-tester',
  title: 'Regex Tester',
  description: 'Test and debug regular expressions with live match highlighting',
  category: 'text',
  tags: ['regex', 'regexp', 'test', 'match', 'pattern', 'search'],
  icon: 'Regex',
  author: 'pocketool',
  version: '1.0.0',
  dbKeys: ['tool:regex-tester:state'],
};
