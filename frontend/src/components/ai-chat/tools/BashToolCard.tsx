/**
 * Bash/Terminal Tool Card
 * Beautiful terminal-style display for command execution
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { BashToolCall } from '@/types/ai-chat';
import { ToolCard } from './ToolCard';
import { getLastLines } from './toolUtils';

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
  const hasResult = tool.status === 'completed' && tool.result;

  const stdout = hasResult ? (tool.result?.stdout || '') : '';
  const stderr = hasResult ? (tool.result?.stderr || '') : '';
  const hasError = stderr.length > 0;

  // Preview: command + smart output (stderr if exists, otherwise last 5 lines of stdout)
  const preview = (
    <div className="px-3 py-2 space-y-1 relative">
      {/* Command - always visible */}
      <TerminalLine content={tool.input.command} type="command" />

      {/* Smart output */}
      {hasResult && (
        <div className="relative">
          {hasError ? (
            // Show all stderr if exists (it's important!)
            <div className="space-y-1">
              {stderr.split('\n').filter(Boolean).map((line, i) => (
                <TerminalLine key={`err-${i}`} content={line} type="error" />
              ))}
            </div>
          ) : (
            // Show last 5 lines of stdout
            <div className="space-y-1">
              {getLastLines(stdout, 5).map((line, i) => (
                <TerminalLine key={`out-${i}`} content={line} type="output" />
              ))}
            </div>
          )}

          {/* Fade-out gradient hint */}
          {stdout.split('\n').length > 5 && !hasError && (
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white/[0.02] to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* Running indicator */}
      {(tool.status === 'running' || tool.status === 'pending') && (
        <div className="flex items-center gap-2 pt-1">
          <div className="w-2 h-4 bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/40">Running...</span>
        </div>
      )}
    </div>
  );

  // Expanded: full terminal with all output
  const expanded = hasResult ? (
    <div className="p-3">
      <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04]">
        {/* Terminal content */}
        <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
          {/* Command */}
          <TerminalLine content={tool.input.command} type="command" />

          {/* All stdout */}
          {stdout.split('\n').map((line, i) => (
            <TerminalLine key={`out-${i}`} content={line} type="output" />
          ))}

          {/* All stderr */}
          {stderr.split('\n').filter(Boolean).map((line, i) => (
            <TerminalLine key={`err-${i}`} content={line} type="error" />
          ))}

          {/* Exit code if error */}
          {tool.result?.exit_code !== undefined && tool.result.exit_code !== 0 && (
            <div className="pt-2 text-[10px] text-red-400/60">
              Exit code: {tool.result.exit_code}
            </div>
          )}
        </div>

        {/* Footer with metadata */}
        <div className="px-3 py-2 border-t border-white/[0.04] bg-white/[0.02]">
          <div className="flex items-center gap-3 text-[10px] text-white/30">
            {tool.result?.exit_code !== undefined && (
              <span>Exit: {tool.result.exit_code}</span>
            )}
            <span>{stdout.length + stderr.length} bytes</span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <ToolCard
      tool={tool}
      preview={preview}
      expanded={expanded}
    />
  );
});

export default BashToolCard;
