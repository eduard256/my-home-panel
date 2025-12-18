/**
 * Base Tool Card Component
 * Beautiful, expandable card for displaying tool calls with results
 */

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCall, ToolStatus } from '@/types/ai-chat';
import { getToolIcon, SpinnerIcon, CheckIcon, ErrorIcon } from '../icons/ToolIcons';

interface ToolCardProps {
  tool: ToolCall;
  defaultExpanded?: boolean;
  children?: React.ReactNode;
}

/**
 * Format timestamp to HH:MM:SS
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Get human-readable tool name
 */
function getToolDisplayName(name: string): string {
  const nameMap: Record<string, string> = {
    Write: 'Create File',
    Edit: 'Edit File',
    Read: 'Read File',
    Bash: 'Terminal',
    Glob: 'Find Files',
    Grep: 'Search Content',
    WebSearch: 'Web Search',
    WebFetch: 'Fetch URL',
    Task: 'Agent',
    TaskOutput: 'Task Output',
    TodoWrite: 'Tasks',
    KillShell: 'Stop Process',
    EnterPlanMode: 'Plan Mode',
    ExitPlanMode: 'Exit Plan',
  };
  return nameMap[name] || name;
}

/**
 * Get tool description from input
 */
function getToolDescription(tool: ToolCall): string {
  const input = tool.input as Record<string, unknown>;

  switch (tool.name) {
    case 'Write':
    case 'Edit':
    case 'Read':
      return (input.file_path as string)?.split('/').pop() || '';
    case 'Bash':
      return (input.description as string) || truncateCommand(input.command as string);
    case 'Glob':
      return input.pattern as string;
    case 'Grep':
      return input.pattern as string;
    case 'WebSearch':
      return input.query as string;
    case 'WebFetch':
      return new URL(input.url as string).hostname;
    case 'Task':
      return input.subagent_type as string;
    case 'TodoWrite':
      const todos = input.todos as Array<{ content: string }>;
      return `${todos?.length || 0} tasks`;
    case 'KillShell':
      return input.shell_id as string;
    default:
      return '';
  }
}

function truncateCommand(cmd: string, maxLength = 40): string {
  if (!cmd) return '';
  if (cmd.length <= maxLength) return cmd;
  return cmd.slice(0, maxLength) + '...';
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: ToolStatus }) {
  switch (status) {
    case 'running':
    case 'pending':
      return <SpinnerIcon size={14} className="text-primary" />;
    case 'completed':
      return <CheckIcon size={14} />;
    case 'error':
      return <ErrorIcon size={14} />;
    case 'cancelled':
      return <ErrorIcon size={14} className="text-red-500" />;
  }
}

/**
 * Get status-based border color
 */
function getStatusColor(status: ToolStatus): string {
  switch (status) {
    case 'running':
    case 'pending':
      return 'border-l-primary/50';
    case 'completed':
      return 'border-l-emerald-500/50';
    case 'error':
      return 'border-l-red-500/50';
    case 'cancelled':
      return 'border-l-red-500/70';
  }
}

/**
 * Base Tool Card
 */
export const ToolCard = memo(function ToolCard({
  tool,
  defaultExpanded = false,
  children,
}: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const Icon = getToolIcon(tool.name);
  const hasContent = Boolean(children);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'rounded-lg overflow-hidden',
        'bg-white/[0.02] border border-white/[0.06]',
        'border-l-2',
        getStatusColor(tool.status)
      )}
    >
      {/* Header */}
      <button
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
        disabled={!hasContent}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5',
          'text-left transition-colors',
          hasContent && 'hover:bg-white/[0.02] cursor-pointer',
          !hasContent && 'cursor-default'
        )}
      >
        {/* Tool Icon */}
        <div className="flex-shrink-0">
          <Icon size={16} />
        </div>

        {/* Tool Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/90">
              {getToolDisplayName(tool.name)}
            </span>
            <span className="text-xs text-white/40 truncate">
              {getToolDescription(tool)}
            </span>
          </div>
        </div>

        {/* Time & Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-white/30 tabular-nums">
            {formatTime(tool.timestamp)}
          </span>
          <StatusIndicator status={tool.status} />
          {hasContent && (
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-white/30 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isExpanded && hasContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default ToolCard;
