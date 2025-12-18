/**
 * Tool Card Utilities
 * Helper functions for tool card rendering
 */

/**
 * Truncate file path in the middle
 * Example: /very/long/path/to/file.tsx -> /very/.../file.tsx
 */
export function truncatePath(path: string, maxLength = 40): string {
  if (!path || path.length <= maxLength) return path;

  const segments = path.split('/');
  if (segments.length <= 2) return path;

  const fileName = segments[segments.length - 1];
  const firstSegment = segments[0] || '/';

  // If just filename is too long
  if (fileName.length > maxLength - 10) {
    return `${firstSegment}/.../${fileName.slice(0, maxLength - 15)}...${fileName.slice(-8)}`;
  }

  // Build path with middle truncation
  let result = firstSegment;
  let remainingLength = maxLength - fileName.length - 7; // 7 for "/.../"

  for (let i = 1; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (result.length + segment.length + 1 <= remainingLength) {
      result += '/' + segment;
    } else {
      result += '/...';
      break;
    }
  }

  result += '/' + fileName;
  return result;
}

/**
 * Limit lines with fade-out gradient effect
 */
export function limitLines(content: string, maxLines: number): {
  lines: string[];
  hasMore: boolean;
  hiddenCount: number;
} {
  const allLines = content.split('\n');
  const hasMore = allLines.length > maxLines;
  const lines = hasMore ? allLines.slice(0, maxLines) : allLines;
  const hiddenCount = hasMore ? allLines.length - maxLines : 0;

  return { lines, hasMore, hiddenCount };
}

/**
 * Get last N lines from content
 */
export function getLastLines(content: string, count: number): string[] {
  const lines = content.split('\n');
  return lines.slice(-count);
}

/**
 * Format file size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Count diff changes from structured patch
 */
export function countDiffChanges(lines: string[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    if (line.startsWith('-') && !line.startsWith('---')) removed++;
  }

  return { added, removed };
}
