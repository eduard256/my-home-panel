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
import type {
  ToolCall,
  WriteToolCall,
  EditToolCall,
  ReadToolCall,
  BashToolCall,
  GlobToolCall,
  GrepToolCall,
  WebSearchToolCall,
  WebFetchToolCall,
  TaskToolCall,
  TodoWriteToolCall,
  KillShellToolCall,
  PlanModeToolCall,
  GenericToolCall as GenericToolCallType,
} from '@/types/ai-chat';
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
      return <WriteToolCard tool={tool as WriteToolCall} />;
    case 'Edit':
      return <EditToolCard tool={tool as EditToolCall} />;
    case 'Read':
      return <ReadToolCard tool={tool as ReadToolCall} />;
    case 'Bash':
      return <BashToolCard tool={tool as BashToolCall} />;
    case 'Glob':
      return <GlobToolCard tool={tool as GlobToolCall} />;
    case 'Grep':
      return <GrepToolCard tool={tool as GrepToolCall} />;
    case 'WebSearch':
      return <WebSearchToolCard tool={tool as WebSearchToolCall} />;
    case 'WebFetch':
      return <WebFetchToolCard tool={tool as WebFetchToolCall} />;
    case 'Task':
    case 'TaskOutput':
      return <AgentToolCard tool={tool as TaskToolCall} />;
    case 'TodoWrite':
      return <TodoWriteToolCard tool={tool as TodoWriteToolCall} />;
    case 'KillShell':
      return <KillShellToolCard tool={tool as KillShellToolCall} />;
    case 'EnterPlanMode':
    case 'ExitPlanMode':
      return <PlanModeToolCard tool={tool as PlanModeToolCall} />;
    default:
      return <GenericToolCard tool={tool as GenericToolCallType} />;
  }
});

export default ToolCardRenderer;
