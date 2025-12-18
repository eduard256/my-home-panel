/**
 * Miscellaneous Tool Cards
 * TodoWrite, KillShell, PlanMode, Generic/Unknown tools
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type {
  TodoWriteToolCall,
  KillShellToolCall,
  PlanModeToolCall,
  GenericToolCall,
  TodoItem,
} from '@/types/ai-chat';
import { ToolCard } from './ToolCard';
import { CheckIcon } from '../icons/ToolIcons';

/**
 * Todo item display
 */
function TodoItemDisplay({ item }: { item: TodoItem }) {
  const statusStyles = {
    pending: 'bg-white/10 border-white/20',
    in_progress: 'bg-primary/20 border-primary/40',
    completed: 'bg-emerald-500/20 border-emerald-500/40',
  };

  const statusIcons = {
    pending: (
      <div className="w-3 h-3 rounded-full border border-white/30" />
    ),
    in_progress: (
      <div className="w-3 h-3 rounded-full border-2 border-primary animate-pulse" />
    ),
    completed: (
      <CheckIcon size={12} className="text-emerald-400" />
    ),
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded border',
        statusStyles[item.status]
      )}
    >
      <div className="flex-shrink-0">
        {statusIcons[item.status]}
      </div>
      <span
        className={cn(
          'text-[11px] flex-1',
          item.status === 'completed' ? 'text-white/40 line-through' : 'text-white/80'
        )}
      >
        {item.content}
      </span>
    </div>
  );
}

/**
 * TodoWrite Tool Card
 */
export const TodoWriteToolCard = memo(function TodoWriteToolCard({
  tool,
}: {
  tool: TodoWriteToolCall;
}) {
  const todos = tool.result?.newTodos || tool.input.todos || [];
  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      <div className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/40">Progress</span>
            <span className="text-white/60">
              {completedCount}/{todos.length} tasks
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {todos.map((todo, i) => (
            <TodoItemDisplay key={i} item={todo} />
          ))}
        </div>
      </div>
    </ToolCard>
  );
});

/**
 * KillShell Tool Card
 */
export const KillShellToolCard = memo(function KillShellToolCard({
  tool,
}: {
  tool: KillShellToolCall;
}) {
  const hasResult = tool.status === 'completed' && tool.result;
  const status = tool.result?.status || 'pending';

  const statusMessages: Record<string, { text: string; color: string }> = {
    killed: { text: 'Process terminated', color: 'text-red-400' },
    not_found: { text: 'Process not found', color: 'text-amber-400' },
    error: { text: 'Failed to terminate', color: 'text-red-400' },
    pending: { text: 'Terminating...', color: 'text-white/50' },
  };

  const statusInfo = statusMessages[status] || statusMessages.pending;

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      {hasResult && (
        <div className="flex items-center gap-3 p-2 rounded-md bg-red-500/10 border border-red-500/20">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className={cn('text-xs font-medium', statusInfo.color)}>
              {statusInfo.text}
            </div>
            <div className="text-[10px] text-white/40 font-mono">
              {tool.input.shell_id}
            </div>
          </div>
        </div>
      )}
    </ToolCard>
  );
});

/**
 * PlanMode Tool Card
 */
export const PlanModeToolCard = memo(function PlanModeToolCard({
  tool,
}: {
  tool: PlanModeToolCall;
}) {
  const isEntering = tool.name === 'EnterPlanMode';

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      <div
        className={cn(
          'flex items-center gap-3 p-2 rounded-md border',
          isEntering
            ? 'bg-teal-500/10 border-teal-500/20'
            : 'bg-white/5 border-white/10'
        )}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            isEntering ? 'bg-teal-500/20' : 'bg-white/10'
          )}
        >
          <svg
            className={cn('w-4 h-4', isEntering ? 'text-teal-400' : 'text-white/50')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12H15" />
            <path d="M9 16H13" />
          </svg>
        </div>
        <div>
          <div className={cn('text-xs font-medium', isEntering ? 'text-teal-400' : 'text-white/60')}>
            {isEntering ? 'Entering Plan Mode' : 'Exiting Plan Mode'}
          </div>
          <div className="text-[10px] text-white/40">
            {isEntering
              ? 'Creating implementation strategy'
              : 'Ready for implementation'}
          </div>
        </div>
      </div>
    </ToolCard>
  );
});

/**
 * Generic/Unknown Tool Card
 * For MCP tools and any unrecognized tools
 */
export const GenericToolCard = memo(function GenericToolCard({
  tool,
}: {
  tool: GenericToolCall;
}) {
  const hasResult = tool.status === 'completed' && tool.result;

  // Format JSON nicely
  const formatJSON = (obj: unknown, maxLength = 500): string => {
    const str = JSON.stringify(obj, null, 2);
    if (str.length > maxLength) {
      return str.slice(0, maxLength) + '\n...';
    }
    return str;
  };

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      <div className="space-y-3">
        {/* Input */}
        <div className="space-y-1">
          <div className="text-[10px] text-white/40 uppercase tracking-wide">Input</div>
          <div className="rounded-md p-2 bg-black/20 border border-white/[0.04] overflow-x-auto">
            <pre className="text-[10px] text-white/60 font-mono whitespace-pre-wrap">
              {formatJSON(tool.input) as string}
            </pre>
          </div>
        </div>

        {/* Result */}
        {Boolean(hasResult) && (
          <div className="space-y-1">
            <div className="text-[10px] text-white/40 uppercase tracking-wide">Result</div>
            <div className="rounded-md p-2 bg-black/20 border border-white/[0.04] overflow-x-auto">
              <pre className="text-[10px] text-white/60 font-mono whitespace-pre-wrap">
                {formatJSON(tool.result as unknown) as string}
              </pre>
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  );
});

export default { TodoWriteToolCard, KillShellToolCard, PlanModeToolCard, GenericToolCard };
