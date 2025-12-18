/**
 * Tool Card Components Export
 * Central export for all tool card components
 */

export { ToolCard } from './ToolCard';
export { WriteToolCard, EditToolCard, ReadToolCard } from './FileToolCards';
export { BashToolCard } from './BashToolCard';
export { GlobToolCard, GrepToolCard, WebSearchToolCard, WebFetchToolCard } from './SearchToolCards';
export { AgentToolCard } from './AgentToolCard';
export { TodoWriteToolCard, KillShellToolCard, PlanModeToolCard, GenericToolCard } from './MiscToolCards';

import { memo } from 'react';
import type { ToolCall } from '@/types/ai-chat';
import { WriteToolCard, EditToolCard, ReadToolCard } from './FileToolCards';
import { BashToolCard } from './BashToolCard';
import { GlobToolCard, GrepToolCard, WebSearchToolCard, WebFetchToolCard } from './SearchToolCards';
import { AgentToolCard } from './AgentToolCard';
import { TodoWriteToolCard, KillShellToolCard, PlanModeToolCard, GenericToolCard } from './MiscToolCards';

/**
 * Universal Tool Card renderer
 * Automatically selects the appropriate card component based on tool name
 */
export const ToolCardRenderer = memo(function ToolCardRenderer({
  tool,
}: {
  tool: ToolCall;
}) {
  switch (tool.name) {
    case 'Write':
      return <WriteToolCard tool={tool as any} />;
    case 'Edit':
      return <EditToolCard tool={tool as any} />;
    case 'Read':
      return <ReadToolCard tool={tool as any} />;
    case 'Bash':
      return <BashToolCard tool={tool as any} />;
    case 'Glob':
      return <GlobToolCard tool={tool as any} />;
    case 'Grep':
      return <GrepToolCard tool={tool as any} />;
    case 'WebSearch':
      return <WebSearchToolCard tool={tool as any} />;
    case 'WebFetch':
      return <WebFetchToolCard tool={tool as any} />;
    case 'Task':
    case 'TaskOutput':
      return <AgentToolCard tool={tool as any} />;
    case 'TodoWrite':
      return <TodoWriteToolCard tool={tool as any} />;
    case 'KillShell':
      return <KillShellToolCard tool={tool as any} />;
    case 'EnterPlanMode':
    case 'ExitPlanMode':
      return <PlanModeToolCard tool={tool as any} />;
    default:
      return <GenericToolCard tool={tool as any} />;
  }
});

export default ToolCardRenderer;
