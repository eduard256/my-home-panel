/**
 * Search Tool Cards
 * Glob, Grep, WebSearch, WebFetch tools
 */

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { GlobToolCall, GrepToolCall, WebSearchToolCall, WebFetchToolCall } from '@/types/ai-chat';
import { ToolCard } from './ToolCard';
import { truncatePath } from './toolUtils';

/**
 * File chip component
 */
function FileChip({ path }: { path: string }) {
  const fileName = path.split('/').pop() || path;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Color by extension
  const extColors: Record<string, string> = {
    ts: 'text-blue-400 bg-blue-400/10',
    tsx: 'text-blue-400 bg-blue-400/10',
    js: 'text-yellow-400 bg-yellow-400/10',
    jsx: 'text-yellow-400 bg-yellow-400/10',
    py: 'text-green-400 bg-green-400/10',
    css: 'text-pink-400 bg-pink-400/10',
    html: 'text-orange-400 bg-orange-400/10',
    json: 'text-emerald-400 bg-emerald-400/10',
    md: 'text-white/60 bg-white/10',
  };

  const colorClass = extColors[ext] || 'text-white/50 bg-white/5';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono',
        colorClass
      )}
      title={path}
    >
      {fileName}
    </span>
  );
}

/**
 * Glob Tool Card
 */
export const GlobToolCard = memo(function GlobToolCard({
  tool,
}: {
  tool: GlobToolCall;
}) {
  const hasResult = tool.status === 'completed' && tool.result;
  const files = tool.result?.filenames || [];

  // Preview: first 5 files
  const preview = (
    <div className="px-3 py-2 space-y-2">
      {/* Summary */}
      <div className="text-[10px] text-white/40">
        Found {files.length} {files.length === 1 ? 'file' : 'files'}
      </div>

      {/* First 5 files as paths */}
      {hasResult && files.length > 0 && (
        <div className="space-y-0.5">
          {files.slice(0, 5).map((file, i) => (
            <div key={i} className="font-mono text-[11px] text-white/60 truncate">
              {truncatePath(file, 60)}
            </div>
          ))}
          {files.length > 5 && (
            <div className="text-[10px] text-white/30 pt-1">
              +{files.length - 5} more files
            </div>
          )}
        </div>
      )}

      {/* No files */}
      {hasResult && files.length === 0 && (
        <div className="text-[11px] text-white/30 italic">No files found</div>
      )}

      {/* Running state */}
      {!hasResult && (tool.status === 'running' || tool.status === 'pending') && (
        <div className="text-[10px] text-white/40">Searching...</div>
      )}
    </div>
  );

  // Expanded: all files with chips
  const expanded = hasResult && files.length > 0 ? (
    <div className="p-3 space-y-2">
      <div className="text-[10px] text-white/40">
        Pattern: <span className="font-mono text-white/50">{tool.input.pattern}</span> • {files.length} matches
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-[400px] overflow-y-auto">
        {files.map((file, i) => (
          <FileChip key={i} path={file} />
        ))}
      </div>
    </div>
  ) : null;

  return <ToolCard tool={tool} preview={preview} expanded={expanded} />;
});

/**
 * Grep match line with highlighting
 */
function GrepMatchLine({ line, pattern }: { line: string; pattern: string }) {
  // Simple highlight - find pattern in line
  const parts = line.split(new RegExp(`(${pattern})`, 'gi'));

  return (
    <div className="font-mono text-[11px] leading-5 text-white/70">
      {parts.map((part, i) =>
        part.toLowerCase() === pattern.toLowerCase() ? (
          <mark key={i} className="bg-amber-500/30 text-amber-300 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

/**
 * Grep Tool Card
 */
export const GrepToolCard = memo(function GrepToolCard({
  tool,
}: {
  tool: GrepToolCall;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasResult = tool.status === 'completed' && tool.result;
  const matches = (tool.result?.matches || '').split('\n').filter(Boolean);
  const maxDisplay = 8;
  const displayMatches = showAll ? matches : matches.slice(0, maxDisplay);

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      {hasResult && (
        <div className="space-y-2">
          {/* Pattern info */}
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span className="font-mono text-orange-400">{tool.input.pattern}</span>
            <span>{matches.length} matches</span>
          </div>

          {/* Matches */}
          {matches.length > 0 ? (
            <div className="rounded-md overflow-hidden bg-black/20 border border-white/[0.04]">
              <div className="p-2 space-y-0.5 max-h-[200px] overflow-y-auto">
                {displayMatches.map((line, i) => (
                  <GrepMatchLine key={i} line={line} pattern={tool.input.pattern} />
                ))}
              </div>
              {matches.length > maxDisplay && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full py-1.5 text-[10px] text-white/40 hover:text-white/60 bg-white/[0.02] border-t border-white/[0.04] transition-colors"
                >
                  {showAll ? 'Show less' : `+${matches.length - maxDisplay} more matches`}
                </button>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-white/30 italic">No matches found</div>
          )}
        </div>
      )}
    </ToolCard>
  );
});

/**
 * Web Search Tool Card
 */
export const WebSearchToolCard = memo(function WebSearchToolCard({
  tool,
}: {
  tool: WebSearchToolCall;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasResult = tool.status === 'completed' && tool.result;

  // Parse results (they come as text with URLs)
  // Handle both structured result {results: string} and raw content {content: string}
  const resultObj = tool.result as Record<string, unknown> | null;
  const resultText = typeof resultObj === 'object' && resultObj !== null
    ? ('results' in resultObj ? String(resultObj.results || '') :
       'content' in resultObj ? String(resultObj.content || '') :
       'raw' in resultObj ? String(resultObj.raw || '') : '')
    : '';
  const maxLength = 500;
  const displayText = showAll ? resultText : resultText.slice(0, maxLength);

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      {hasResult && (
        <div className="space-y-2">
          {/* Query */}
          <div className="text-[10px] text-white/40">
            Query: <span className="text-blue-400">{tool.input.query}</span>
          </div>

          {/* Results preview */}
          <div className="rounded-md p-3 bg-black/20 border border-white/[0.04]">
            <div className="text-[11px] text-white/60 whitespace-pre-wrap break-words">
              {displayText}
              {resultText.length > maxLength && !showAll && '...'}
            </div>
          </div>

          {resultText.length > maxLength && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] text-primary/70 hover:text-primary transition-colors"
            >
              {showAll ? 'Show less' : 'Show full results'}
            </button>
          )}
        </div>
      )}
    </ToolCard>
  );
});

/**
 * Web Fetch Tool Card
 */
export const WebFetchToolCard = memo(function WebFetchToolCard({
  tool,
}: {
  tool: WebFetchToolCall;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasResult = tool.status === 'completed' && tool.result;

  let hostname = '';
  try {
    hostname = new URL(tool.input.url).hostname;
  } catch {
    hostname = tool.input.url;
  }

  // Handle both structured result {content: string} and raw content {raw: string}
  const resultObj = tool.result as Record<string, unknown> | null;
  const content = typeof resultObj === 'object' && resultObj !== null
    ? ('content' in resultObj ? String(resultObj.content || '') :
       'raw' in resultObj ? String(resultObj.raw || '') : '')
    : '';
  const maxLength = 400;
  const displayContent = showAll ? content : content.slice(0, maxLength);

  return (
    <ToolCard tool={tool} defaultExpanded={false}>
      {hasResult && (
        <div className="space-y-2">
          {/* URL card */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-black/20 border border-white/[0.04]">
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-cyan-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-white/90 truncate">
                {hostname}
              </div>
              <div className="text-[10px] text-white/40 truncate">
                {tool.input.url}
              </div>
            </div>
          </div>

          {/* Content preview */}
          <div className="rounded-md p-3 bg-black/20 border border-white/[0.04]">
            <div className="text-[11px] text-white/60 whitespace-pre-wrap break-words">
              {displayContent}
              {content.length > maxLength && !showAll && '...'}
            </div>
          </div>

          {content.length > maxLength && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[10px] text-primary/70 hover:text-primary transition-colors"
            >
              {showAll ? 'Show less' : 'Show full content'}
            </button>
          )}
        </div>
      )}
    </ToolCard>
  );
});

export default { GlobToolCard, GrepToolCard, WebSearchToolCard, WebFetchToolCard };
