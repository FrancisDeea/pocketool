import type { ToolConfig } from '@/types/tool';

export const config: ToolConfig = {
  id: 'regex-tester',
  title: 'Regex Tester',
  description: 'Test and debug regular expressions with live match highlighting',
  category: 'text',
  tags: ['regex', 'regexp', 'test', 'match', 'pattern', 'search'],
  icon: 'Regex',
  creator: 'creativoma',
  detailedDescription:
    'A comprehensive environment to build, test, and debug Regular Expressions in real-time. Highlights matches and explains expression groups dynamically.',
  technicalDescription:
    'Runs regex execution loops safely with configurable flags, utilizing syntax highlighting libraries to map expression blocks visually to text matches.',
  version: '1.0.0',
  dbKeys: ['tool:regex-tester:state'],
};
