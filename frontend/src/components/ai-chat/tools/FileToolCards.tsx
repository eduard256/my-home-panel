/**
 * File Operation Tool Cards
 * Write, Edit, Read tools with beautiful diff display
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { WriteToolCall, EditToolCall, ReadToolCall, DiffHunk } from '@/types/ai-chat';
import { ToolCard } from './ToolCard';
import { truncatePath, limitLines, countDiffChanges } from './toolUtils';

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
  const content = tool.input.content || '';
  const { lines, hasMore } = limitLines(content, 7);

  // Preview: file path + first 7 lines with fade-out
  const preview = (
    <div className="px-3 py-2 space-y-2">
      {/* File path with NEW badge */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
          NEW
        </span>
        <span className="font-mono text-white/50">{truncatePath(tool.input.file_path)}</span>
      </div>

      {/* Code preview */}
      {hasResult && (
        <div className="relative">
          <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04]">
            {lines.map((line, i) => (
              <CodeLine key={i} lineNumber={i + 1} content={line} />
            ))}
          </div>

          {/* Fade-out gradient */}
          {hasMore && (
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white/[0.02] to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* Running state */}
      {!hasResult && (tool.status === 'running' || tool.status === 'pending') && (
        <div className="text-[10px] text-white/40">Creating file...</div>
      )}
    </div>
  );

  // Expanded: full content
  const expanded = hasResult ? (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span className="font-mono">{tool.input.file_path}</span>
        <span>{content.split('\n').length} lines</span>
      </div>

      <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04] max-h-[400px] overflow-y-auto">
        {content.split('\n').map((line, i) => (
          <CodeLine key={i} lineNumber={i + 1} content={line} />
        ))}
      </div>
    </div>
  ) : null;

  return <ToolCard tool={tool} preview={preview} expanded={expanded} />;
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

  const structuredPatch = tool.result?.structuredPatch || [];
  const firstHunk = structuredPatch[0];
  const hasMultipleHunks = structuredPatch.length > 1;

  // Calculate diff stats from first hunk
  const diffStats = firstHunk ? countDiffChanges(firstHunk.lines) : { added: 0, removed: 0 };

  // Preview: file path + diff stats + first hunk with context
  const preview = (
    <div className="px-3 py-2 space-y-2">
      {/* File path with MODIFIED badge and diff stats */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
          MODIFIED
        </span>
        <span className="font-mono text-white/50">{truncatePath(tool.input.file_path)}</span>
        {hasResult && hasDiff && (
          <span className="ml-auto flex items-center gap-1.5 text-white/30">
            <span className="text-emerald-400">+{diffStats.added}</span>
            <span className="text-red-400">-{diffStats.removed}</span>
          </span>
        )}
      </div>

      {/* First hunk preview */}
      {hasResult && hasDiff && firstHunk && (
        <div className="relative">
          <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04]">
            {/* Hunk header */}
            <div className="px-2 py-1 text-[10px] text-white/30 bg-white/[0.02] border-b border-white/[0.04] font-mono">
              @@ -{firstHunk.oldStart},{firstHunk.oldLines} +{firstHunk.newStart},{firstHunk.newLines} @@
            </div>

            {/* Show first few lines of diff (max 7 lines with context) */}
            {firstHunk.lines.slice(0, 7).map((line, lineIndex) => {
              if (line.startsWith('\\')) return null;

              const type = line.startsWith('+')
                ? 'added'
                : line.startsWith('-')
                  ? 'removed'
                  : 'context';

              return (
                <CodeLine
                  key={lineIndex}
                  content={line.slice(1)}
                  type={type}
                />
              );
            })}
          </div>

          {/* Multiple hunks indicator */}
          {hasMultipleHunks && (
            <div className="mt-1 text-[10px] text-white/30">
              +{structuredPatch.length - 1} more {structuredPatch.length - 1 === 1 ? 'hunk' : 'hunks'}
            </div>
          )}
        </div>
      )}

      {/* Running state */}
      {!hasResult && (tool.status === 'running' || tool.status === 'pending') && (
        <div className="text-[10px] text-white/40">Editing file...</div>
      )}
    </div>
  );

  // Expanded: all hunks
  const expanded = hasResult && hasDiff ? (
    <div className="p-3 space-y-2">
      <UnifiedDiff hunks={structuredPatch} />
    </div>
  ) : null;

  return <ToolCard tool={tool} preview={preview} expanded={expanded} />;
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
  const file = tool.result?.file;
  const content = file?.content || '';
  const { lines, hasMore } = limitLines(content, 7);

  // Preview: file path + range info + first 7 lines
  const preview = (
    <div className="px-3 py-2 space-y-2">
      {/* File info */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className="font-mono text-white/50">{truncatePath(tool.input.file_path)}</span>
        {hasResult && file && (
          <span className="text-white/30">
            Lines {file.startLine}-{file.startLine + file.numLines - 1} of {file.totalLines}
          </span>
        )}
      </div>

      {/* Content preview */}
      {hasResult && file && (
        <div className="relative">
          <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04]">
            {lines.map((line, i) => (
              <CodeLine
                key={i}
                lineNumber={file.startLine + i}
                content={line}
              />
            ))}
          </div>

          {/* Fade-out gradient */}
          {hasMore && (
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white/[0.02] to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* Running state */}
      {!hasResult && (tool.status === 'running' || tool.status === 'pending') && (
        <div className="text-[10px] text-white/40">Reading file...</div>
      )}
    </div>
  );

  // Expanded: all read content
  const expanded = hasResult && file ? (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span className="font-mono">{tool.input.file_path}</span>
        <span>
          {file.numLines} lines read (total: {file.totalLines})
        </span>
      </div>

      <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04] max-h-[400px] overflow-y-auto">
        {content.split('\n').map((line, i) => (
          <CodeLine
            key={i}
            lineNumber={file.startLine + i}
            content={line}
          />
        ))}
      </div>
    </div>
  ) : null;

  return <ToolCard tool={tool} preview={preview} expanded={expanded} />;
});

export default { WriteToolCard, EditToolCard, ReadToolCard };
