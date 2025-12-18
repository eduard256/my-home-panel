/**
 * File Operation Tool Cards
 * Write, Edit, Read tools with beautiful diff display
 */

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { WriteToolCall, EditToolCall, ReadToolCall, DiffHunk } from '@/types/ai-chat';
import { ToolCard } from './ToolCard';

/**
 * Code line component with line number
 */
function CodeLine({
  lineNumber,
  content,
  type = 'normal',
}: {
  lineNumber?: number;
  content: string;
  type?: 'normal' | 'added' | 'removed' | 'context';
}) {
  const bgColors = {
    normal: '',
    added: 'bg-emerald-500/10',
    removed: 'bg-red-500/10',
    context: 'bg-white/[0.02]',
  };

  const textColors = {
    normal: 'text-white/70',
    added: 'text-emerald-400',
    removed: 'text-red-400',
    context: 'text-white/50',
  };

  const prefixes = {
    normal: ' ',
    added: '+',
    removed: '-',
    context: ' ',
  };

  return (
    <div className={cn('flex font-mono text-[11px] leading-5', bgColors[type])}>
      {lineNumber !== undefined && (
        <span className="w-8 flex-shrink-0 text-right pr-2 text-white/20 select-none">
          {lineNumber}
        </span>
      )}
      <span className={cn('w-4 flex-shrink-0 text-center select-none', textColors[type])}>
        {prefixes[type]}
      </span>
      <pre className={cn('flex-1 whitespace-pre-wrap break-all', textColors[type])}>
        {content || ' '}
      </pre>
    </div>
  );
}

/**
 * Truncated code preview with expand functionality
 */
function CodePreview({
  content,
  maxLines = 5,
  showLineNumbers = true,
  startLine = 1,
}: {
  content: string;
  maxLines?: number;
  showLineNumbers?: boolean;
  startLine?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = content.split('\n');
  const hasMore = lines.length > maxLines;
  const displayLines = isExpanded ? lines : lines.slice(0, maxLines);

  return (
    <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04]">
      <div className="overflow-x-auto">
        {displayLines.map((line, i) => (
          <CodeLine
            key={i}
            lineNumber={showLineNumbers ? startLine + i : undefined}
            content={line}
          />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1.5 text-[10px] text-white/40 hover:text-white/60 bg-white/[0.02] border-t border-white/[0.04] transition-colors"
        >
          {isExpanded ? 'Show less' : `Show ${lines.length - maxLines} more lines`}
        </button>
      )}
    </div>
  );
}

/**
 * Unified diff display
 */
function UnifiedDiff({ hunks }: { hunks: DiffHunk[] }) {
  if (!hunks || hunks.length === 0) return null;

  return (
    <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04]">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex}>
          {/* Hunk header */}
          <div className="px-2 py-1 text-[10px] text-white/30 bg-white/[0.02] border-b border-white/[0.04] font-mono">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </div>
          {/* Diff lines */}
          <div className="overflow-x-auto">
            {hunk.lines.map((line, lineIndex) => {
              // Skip "\ No newline at end of file" markers
              if (line.startsWith('\\')) return null;

              const type = line.startsWith('+')
                ? 'added'
                : line.startsWith('-')
                  ? 'removed'
                  : 'context';

              return (
                <CodeLine
                  key={lineIndex}
                  content={line.slice(1)} // Remove the +/- prefix
                  type={type}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Write Tool Card
 */
export const WriteToolCard = memo(function WriteToolCard({
  tool,
}: {
  tool: WriteToolCall;
}) {
  const hasResult = tool.status === 'completed' && tool.result;

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      {hasResult && (
        <div className="space-y-2">
          {/* File path */}
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              NEW
            </span>
            <span className="font-mono truncate">{tool.input.file_path}</span>
          </div>
          {/* Content preview */}
          <CodePreview content={tool.input.content} maxLines={5} />
        </div>
      )}
    </ToolCard>
  );
});

/**
 * Edit Tool Card
 */
export const EditToolCard = memo(function EditToolCard({
  tool,
}: {
  tool: EditToolCall;
}) {
  const hasResult = tool.status === 'completed' && tool.result;
  const hasDiff = hasResult && tool.result?.structuredPatch && tool.result.structuredPatch.length > 0;

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      {hasResult && (
        <div className="space-y-2">
          {/* File path */}
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
              MODIFIED
            </span>
            <span className="font-mono truncate">{tool.input.file_path}</span>
          </div>
          {/* Diff display */}
          {hasDiff ? (
            <UnifiedDiff hunks={tool.result!.structuredPatch} />
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] text-white/30 uppercase tracking-wide">
                Removed
              </div>
              <CodePreview
                content={tool.input.old_string}
                maxLines={3}
                showLineNumbers={false}
              />
              <div className="text-[10px] text-white/30 uppercase tracking-wide">
                Added
              </div>
              <CodePreview
                content={tool.input.new_string}
                maxLines={3}
                showLineNumbers={false}
              />
            </div>
          )}
        </div>
      )}
    </ToolCard>
  );
});

/**
 * Read Tool Card
 */
export const ReadToolCard = memo(function ReadToolCard({
  tool,
}: {
  tool: ReadToolCall;
}) {
  const hasResult = tool.status === 'completed' && tool.result;

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      {hasResult && tool.result?.file && (
        <div className="space-y-2">
          {/* File info */}
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span className="font-mono truncate">{tool.input.file_path}</span>
            <span>{tool.result.file.totalLines} lines</span>
          </div>
          {/* Content preview */}
          <CodePreview
            content={tool.result.file.content}
            maxLines={5}
            startLine={tool.result.file.startLine}
          />
        </div>
      )}
    </ToolCard>
  );
});

export default { WriteToolCard, EditToolCard, ReadToolCard };
