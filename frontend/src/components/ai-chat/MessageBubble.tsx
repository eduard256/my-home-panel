/**
 * Message Bubble Components
 * User and Assistant message display with timeline layout
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UserMessage, AssistantMessage, AssistantContent, ToolCall } from '@/types/ai-chat';
import { ToolCardRenderer } from './tools';
import { MarkdownRenderer } from './MarkdownRenderer';

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
 * Format duration in ms to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Format cost to display string
 */
function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}c`;
  return `$${usd.toFixed(3)}`;
}

/**
 * User Icon SVG
 */
function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-4 h-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/**
 * Assistant Icon SVG
 */
function AssistantIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-4 h-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

/**
 * Streaming cursor
 */
function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
  );
}

/**
 * User Message Bubble
 */
export const UserMessageBubble = memo(function UserMessageBubble({
  message,
}: {
  message: UserMessage;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
    >
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center w-6 flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <UserIcon className="text-white/60" />
        </div>
        <div className="flex-1 w-px bg-gradient-to-b from-white/10 to-transparent mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-medium text-white/80">You</span>
          <span className="text-[10px] text-white/30 tabular-nums">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message bubble */}
        <div className="bg-primary/20 border border-primary/30 rounded-2xl rounded-tl-md px-4 py-2.5 inline-block max-w-[90%]">
          <p className="text-sm text-white/90 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

/**
 * Assistant Message Bubble
 * Contains text content and tool calls in a unified timeline
 */
export const AssistantMessageBubble = memo(function AssistantMessageBubble({
  message,
}: {
  message: AssistantMessage;
}) {
  // Combine content and tools into a single timeline
  interface TimelineItem {
    type: 'text' | 'tool';
    timestamp: string;
    data: AssistantContent | ToolCall;
  }

  const timelineItems: TimelineItem[] = [];

  // Add text content
  for (const content of message.content) {
    timelineItems.push({
      type: 'text',
      timestamp: content.timestamp,
      data: content,
    });
  }

  // Add tool calls
  for (const tool of message.toolCalls) {
    timelineItems.push({
      type: 'tool',
      timestamp: tool.timestamp,
      data: tool,
    });
  }

  // Sort by sequence (guaranteed chronological order)
  timelineItems.sort((a, b) => {
    const seqA = (a.data as any).sequence ?? 0;
    const seqB = (b.data as any).sequence ?? 0;
    return seqA - seqB;
  });

  // Group consecutive text items
  const groupedItems: Array<{
    type: 'text' | 'tool';
    items: TimelineItem[];
  }> = [];

  for (const item of timelineItems) {
    const lastGroup = groupedItems[groupedItems.length - 1];
    if (item.type === 'text' && lastGroup?.type === 'text') {
      lastGroup.items.push(item);
    } else {
      groupedItems.push({ type: item.type, items: [item] });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
    >
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center w-6 flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <AssistantIcon className="text-primary" />
        </div>
        <div className="flex-1 w-px bg-gradient-to-b from-primary/20 to-transparent mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-primary/90">Assistant</span>
          <span className="text-[10px] text-white/30 tabular-nums">
            {formatTime(message.timestamp)}
          </span>
          {message.model && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">
              {message.model.split('-')[0]}
            </span>
          )}
        </div>

        {/* Timeline content */}
        <div className="space-y-3">
          {groupedItems.map((group, groupIndex) => {
            if (group.type === 'text') {
              // Render combined text
              const combinedText = group.items
                .map((item) => (item.data as AssistantContent).text)
                .join('');

              return (
                <div key={groupIndex} className="prose-container">
                  <MarkdownRenderer content={combinedText} />
                  {message.isStreaming &&
                    groupIndex === groupedItems.length - 1 && <StreamingCursor />}
                </div>
              );
            } else {
              // Render tools
              return (
                <div key={groupIndex} className="space-y-2">
                  {group.items.map((item, itemIndex) => (
                    <ToolCardRenderer key={itemIndex} tool={item.data as ToolCall} />
                  ))}
                </div>
              );
            }
          })}

          {/* Empty streaming state */}
          {message.isStreaming && groupedItems.length === 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-white/40">Thinking...</span>
            </div>
          )}
        </div>

        {/* Message footer with stats */}
        {message.isComplete && (message.duration_ms || message.cost_usd) && (
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
            {message.duration_ms && (
              <span className="text-[10px] text-white/30">
                {formatDuration(message.duration_ms)}
              </span>
            )}
            {message.cost_usd && (
              <span className="text-[10px] text-white/30">
                {formatCost(message.cost_usd)}
              </span>
            )}
            {message.usage && (
              <span className="text-[10px] text-white/30">
                {message.usage.input_tokens +
                 message.usage.output_tokens +
                 message.usage.cache_creation_input_tokens} tokens
                {message.usage.cache_read_input_tokens > 0 && (
                  <span className="text-white/20 ml-1">
                    ({(message.usage.cache_read_input_tokens / 1000).toFixed(1)}K cached)
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default { UserMessageBubble, AssistantMessageBubble };
