/**
 * Agent/Task Tool Card
 * Beautiful display for nested agent executions
 */

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TaskToolCall, AIStreamEvent } from '@/types/ai-chat';
import { ToolCard } from './ToolCard';
import { AgentIcon, SpinnerIcon, CheckIcon } from '../icons/ToolIcons';

/**
 * Get agent display info
 */
function getAgentInfo(agentType: string): { name: string; color: string } {
  const agents: Record<string, { name: string; color: string }> = {
    'Explore': { name: 'Explorer', color: 'text-violet-400' },
    'Plan': { name: 'Planner', color: 'text-teal-400' },
    'general-purpose': { name: 'General', color: 'text-purple-400' },
    'statusline-setup': { name: 'Setup', color: 'text-blue-400' },
  };
  return agents[agentType] || { name: agentType, color: 'text-purple-400' };
}

/**
 * Mini timeline event for nested agent actions
 */
function AgentTimelineEvent({
  event,
}: {
  event: AIStreamEvent;
}) {
  // Only show tool calls
  if (event.type !== 'assistant') return null;

  const msg = (event as any).message;
  if (!msg?.content) return null;

  const toolUses = msg.content.filter((c: any) => c.type === 'tool_use');
  if (toolUses.length === 0) return null;

  return (
    <>
      {toolUses.map((tool: any, i: number) => (
        <div
          key={i}
          className="flex items-center gap-2 py-1 text-[10px]"
        >
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <span className="text-white/50">{tool.name}</span>
          {tool.input?.file_path && (
            <span className="text-white/30 truncate">
              {(tool.input.file_path as string).split('/').pop()}
            </span>
          )}
          {tool.input?.command && (
            <span className="text-white/30 truncate font-mono">
              {(tool.input.command as string).slice(0, 30)}
            </span>
          )}
        </div>
      ))}
    </>
  );
}

/**
 * Agent Tool Card
 */
export const AgentToolCard = memo(function AgentToolCard({
  tool,
}: {
  tool: TaskToolCall;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasResult = tool.status === 'completed';
  const agentInfo = getAgentInfo(tool.input.subagent_type);

  // Get child events for timeline
  const childEvents = (tool as any).childEvents || [];
  const maxEvents = 5;
  const displayEvents = showAll ? childEvents : childEvents.slice(-maxEvents);

  // Parse output for display
  const outputText = tool.result?.output || '';
  const maxOutputLength = 300;
  const displayOutput = showAll ? outputText : outputText.slice(0, maxOutputLength);

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      <div className="space-y-3">
        {/* Agent header */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <AgentIcon className={agentInfo.color} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn('text-xs font-medium', agentInfo.color)}>
              {agentInfo.name} Agent
            </div>
            <div className="text-[10px] text-white/40 truncate">
              {tool.input.description}
            </div>
          </div>
          <div className="flex-shrink-0">
            {tool.status === 'running' || tool.status === 'pending' ? (
              <SpinnerIcon size={14} className="text-purple-400" />
            ) : (
              <CheckIcon size={14} className="text-emerald-400" />
            )}
          </div>
        </div>

        {/* Mini timeline */}
        {childEvents.length > 0 && (
          <div className="pl-3 border-l border-white/10 space-y-0.5">
            {!showAll && childEvents.length > maxEvents && (
              <div className="text-[10px] text-white/30 py-1">
                ... {childEvents.length - maxEvents} earlier actions
              </div>
            )}
            {displayEvents.map((event: AIStreamEvent, i: number) => (
              <AgentTimelineEvent key={i} event={event} />
            ))}
          </div>
        )}

        {/* Output preview */}
        {hasResult && outputText && (
          <div className="rounded-md p-3 bg-black/20 border border-white/[0.04]">
            <div className="text-[11px] text-white/60 whitespace-pre-wrap break-words">
              {displayOutput}
              {outputText.length > maxOutputLength && !showAll && '...'}
            </div>
          </div>
        )}

        {/* Show more button */}
        {(childEvents.length > maxEvents || outputText.length > maxOutputLength) && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] text-primary/70 hover:text-primary transition-colors"
          >
            {showAll ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Agent ID for resuming */}
        {tool.result?.agentId && (
          <div className="text-[9px] text-white/20 font-mono">
            Agent ID: {tool.result.agentId}
          </div>
        )}
      </div>
    </ToolCard>
  );
});

export default AgentToolCard;
