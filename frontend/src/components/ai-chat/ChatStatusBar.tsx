/**
 * Chat Status Bar
 * Displays real-time stats: tokens, cost, context usage, tasks
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TodoItem, ChatSession } from '@/types/ai-chat';

interface ChatStatusBarProps {
  session: ChatSession;
  isStreaming: boolean;
}

/**
 * Format number with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Format cost
 */
function formatCost(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.001) return '<$0.001';
  if (usd < 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/**
 * Stat item component
 */
function StatItem({
  icon,
  value,
  subValue,
  color = 'text-white/50',
}: {
  icon: React.ReactNode;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('opacity-60', color)}>{icon}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-[11px] font-medium tabular-nums', color)}>
          {value}
        </span>
        {subValue && (
          <span className="text-[9px] text-white/30">{subValue}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Token Icon SVG
 */
function TokenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3.5 h-3.5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M8 10h8M8 14h8" />
    </svg>
  );
}

/**
 * Cost Icon SVG
 */
function CostIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3.5 h-3.5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v2M12 16v2" />
      <path d="M9.5 9.5c0-1.1.9-2 2.5-2s2.5.9 2.5 2c0 1.5-2.5 1.5-2.5 3" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Context Icon SVG
 */
function ContextIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3.5 h-3.5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

/**
 * Tasks progress mini display
 */
function TasksProgress({ todos }: { todos: TodoItem[] }) {
  if (todos.length === 0) return null;

  const completed = todos.filter((t) => t.status === 'completed').length;
  const inProgress = todos.find((t) => t.status === 'in_progress');
  const progress = (completed / todos.length) * 100;

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Count */}
      <span className="text-[10px] text-white/50 tabular-nums">
        {completed}/{todos.length}
      </span>

      {/* Current task (truncated) */}
      {inProgress && (
        <span className="text-[10px] text-white/40 truncate max-w-[100px]">
          {inProgress.activeForm}
        </span>
      )}
    </div>
  );
}

/**
 * Streaming indicator
 */
function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-primary"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <span className="text-[10px] text-primary/70">Processing...</span>
    </div>
  );
}

/**
 * Main Chat Status Bar
 */
export const ChatStatusBar = memo(function ChatStatusBar({
  session,
  isStreaming,
}: ChatStatusBarProps) {
  const contextWindow = 200000; // Claude Sonnet 4.5 context window
  // Context = input + output + cache_creation (cache_read doesn't count - it's reused!)
  const totalTokens =
    session.totalTokens.input +
    session.totalTokens.output +
    session.totalTokens.cacheCreation;
  const contextPercent = Math.min((totalTokens / contextWindow) * 100, 100);

  // Determine context color based on usage
  const contextColor =
    contextPercent > 80
      ? 'text-red-400'
      : contextPercent > 50
        ? 'text-amber-400'
        : 'text-emerald-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-4 px-3 py-2 bg-white/[0.02] border-t border-white/[0.06] overflow-x-auto"
    >
      {/* Left: Stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Tokens */}
        <StatItem
          icon={<TokenIcon />}
          value={formatNumber(totalTokens)}
          subValue={(session.totalTokens.cacheRead + session.totalTokens.cacheCreation) > 0
            ? `${formatNumber(session.totalTokens.cacheRead + session.totalTokens.cacheCreation)} cached`
            : undefined}
        />

        {/* Cost */}
        <StatItem
          icon={<CostIcon />}
          value={formatCost(session.totalCost)}
        />

        {/* Context usage */}
        <div className="flex items-center gap-1.5">
          <ContextIcon className={cn('opacity-60', contextColor)} />
          <div className="flex items-center gap-1">
            <span className={cn('text-[11px] font-medium tabular-nums', contextColor)}>
              {contextPercent.toFixed(0)}%
            </span>
            {/* Mini progress bar */}
            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  contextPercent > 80
                    ? 'bg-red-400'
                    : contextPercent > 50
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                )}
                style={{ width: `${contextPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Center: Tasks */}
      <AnimatePresence>
        {session.currentTodos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-shrink-0"
          >
            <TasksProgress todos={session.currentTodos} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right: Streaming indicator */}
      <div className="flex-shrink-0">
        <AnimatePresence>
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StreamingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default ChatStatusBar;
