/**
 * Bash/Terminal Tool Card
 * Beautiful terminal-style display for command execution
 */

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { BashToolCall } from '@/types/ai-chat';
import { ToolCard } from './ToolCard';

/**
 * Terminal output line
 */
function TerminalLine({
  content,
  type = 'output',
}: {
  content: string;
  type?: 'command' | 'output' | 'error';
}) {
  const styles = {
    command: 'text-emerald-400',
    output: 'text-white/70',
    error: 'text-red-400',
  };

  return (
    <div className={cn('font-mono text-[11px] leading-5', styles[type])}>
      {type === 'command' && (
        <span className="text-white/40 select-none mr-2">$</span>
      )}
      <pre className="whitespace-pre-wrap break-all inline">{content}</pre>
    </div>
  );
}

/**
 * Bash Tool Card
 */
export const BashToolCard = memo(function BashToolCard({
  tool,
}: {
  tool: BashToolCall;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasResult = tool.status === 'completed' && tool.result;

  // Split output into lines for truncation
  const outputLines = hasResult ? (tool.result?.stdout || '').split('\n') : [];
  const errorLines = hasResult ? (tool.result?.stderr || '').split('\n').filter(Boolean) : [];
  const maxLines = 8;
  const totalLines = outputLines.length + errorLines.length;
  const needsTruncation = totalLines > maxLines;

  const displayOutputLines = isExpanded
    ? outputLines
    : outputLines.slice(0, Math.max(0, maxLines - errorLines.length));

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      <div className="rounded-md overflow-hidden bg-[#0d1117] border border-white/[0.06]">
        {/* Terminal header */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="ml-2 text-[10px] text-white/30">
            {tool.input.description || 'Terminal'}
          </span>
        </div>

        {/* Terminal content */}
        <div className="p-3 space-y-1 max-h-[300px] overflow-y-auto">
          {/* Command */}
          <TerminalLine content={tool.input.command} type="command" />

          {/* Output */}
          {hasResult && (
            <>
              {displayOutputLines.map((line, i) => (
                <TerminalLine key={`out-${i}`} content={line} type="output" />
              ))}

              {/* Errors */}
              {errorLines.map((line, i) => (
                <TerminalLine key={`err-${i}`} content={line} type="error" />
              ))}

              {/* Exit code if error */}
              {tool.result?.exit_code !== undefined && tool.result.exit_code !== 0 && (
                <div className="pt-2 text-[10px] text-red-400/60">
                  Exit code: {tool.result.exit_code}
                </div>
              )}
            </>
          )}

          {/* Running indicator */}
          {(tool.status === 'running' || tool.status === 'pending') && (
            <div className="flex items-center gap-2 pt-1">
              <div className="w-2 h-4 bg-emerald-400 animate-pulse" />
            </div>
          )}
        </div>

        {/* Expand button */}
        {needsTruncation && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-1.5 text-[10px] text-white/40 hover:text-white/60 bg-white/[0.02] border-t border-white/[0.06] transition-colors"
          >
            {isExpanded ? 'Show less' : `Show ${totalLines - maxLines} more lines`}
          </button>
        )}
      </div>
    </ToolCard>
  );
});

export default BashToolCard;
