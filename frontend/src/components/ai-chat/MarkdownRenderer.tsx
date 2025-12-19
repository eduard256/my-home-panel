/**
 * Markdown Renderer
 * Beautiful markdown display with syntax highlighting
 */

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parse markdown to React elements
 * Lightweight parser without heavy dependencies
 */
function parseMarkdown(content: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <CodeBlock key={key++} language={lang} code={codeLines.join('\n')} />
      );
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      elements.push(
        <Heading key={key++} level={level as 1 | 2 | 3 | 4 | 5 | 6}>
          {parseInline(text)}
        </Heading>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      elements.push(<hr key={key++} className="my-4 border-white/10" />);
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[\s]*[-*+]\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*+]\s/)) {
        listItems.push(lines[i].replace(/^[\s]*[-*+]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 ml-4 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
              <span className="text-primary mt-1.5 text-[6px]">●</span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^[\s]*\d+\.\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s/)) {
        listItems.push(lines[i].replace(/^[\s]*\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-2 ml-4 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
              <span className="text-white/40 text-xs min-w-[1.5rem]">{idx + 1}.</span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={key++}
          className="my-2 pl-4 border-l-2 border-primary/50 text-white/60 italic"
        >
          {quoteLines.map((ql, idx) => (
            <p key={idx} className="text-sm">
              {parseInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    const paragraphLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].match(/^[\s]*[-*+]\s/) &&
      !lines[i].match(/^[\s]*\d+\.\s/) &&
      !lines[i].startsWith('>')
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    elements.push(
      <p key={key++} className="text-sm text-white/80 leading-relaxed my-1.5">
        {parseInline(paragraphLines.join(' '))}
      </p>
    );
  }

  return elements;
}

/**
 * Parse inline markdown (bold, italic, code, links)
 */
function parseInline(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      result.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 bg-white/10 rounded text-[11px] font-mono text-primary"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      result.push(
        <strong key={key++} className="font-semibold text-white">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      result.push(
        <em key={key++} className="italic text-white/90">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Link
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      result.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-light underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Regular text - find next special character or end
    const nextSpecial = remaining.search(/[`*[]/);
    if (nextSpecial === -1) {
      result.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Special char that didn't match a pattern, treat as text
      result.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      result.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return result;
}

/**
 * Heading component
 */
function Heading({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}) {
  const styles: Record<number, string> = {
    1: 'text-xl font-bold text-white mt-4 mb-2',
    2: 'text-lg font-semibold text-white mt-3 mb-2',
    3: 'text-base font-semibold text-white/90 mt-3 mb-1.5',
    4: 'text-sm font-semibold text-white/90 mt-2 mb-1',
    5: 'text-sm font-medium text-white/80 mt-2 mb-1',
    6: 'text-xs font-medium text-white/70 mt-2 mb-1',
  };

  switch (level) {
    case 1:
      return <h1 className={styles[1]}>{children}</h1>;
    case 2:
      return <h2 className={styles[2]}>{children}</h2>;
    case 3:
      return <h3 className={styles[3]}>{children}</h3>;
    case 4:
      return <h4 className={styles[4]}>{children}</h4>;
    case 5:
      return <h5 className={styles[5]}>{children}</h5>;
    case 6:
      return <h6 className={styles[6]}>{children}</h6>;
    default:
      return <p className={styles[3]}>{children}</p>;
  }
}

/**
 * Code block with syntax highlighting
 */
function CodeBlock({ language, code }: { language: string; code: string }) {
  // Simple syntax highlighting for common patterns
  const highlightCode = (code: string): React.ReactNode[] => {
    const lines = code.split('\n');
    return lines.map((line, lineIndex) => (
      <div key={lineIndex} className="flex">
        <span className="w-8 text-right pr-3 text-white/20 select-none text-[10px]">
          {lineIndex + 1}
        </span>
        <span className="flex-1">
          {highlightLine(line)}
        </span>
      </div>
    ));
  };

  const highlightLine = (line: string): React.ReactNode => {
    // Comment
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      return <span className="text-white/30 italic">{line}</span>;
    }

    // String highlighting
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      // Strings
      const stringMatch = remaining.match(/^(['"`])(?:\\.|[^\\])*?\1/);
      if (stringMatch) {
        parts.push(
          <span key={key++} className="text-emerald-400">
            {stringMatch[0]}
          </span>
        );
        remaining = remaining.slice(stringMatch[0].length);
        continue;
      }

      // Keywords
      const keywordMatch = remaining.match(
        /^(const|let|var|function|return|if|else|for|while|import|export|from|class|interface|type|async|await|try|catch|throw|new|this|true|false|null|undefined|def|self|print|elif|except|lambda|with|as|in|not|and|or|is|None|True|False)\b/
      );
      if (keywordMatch) {
        parts.push(
          <span key={key++} className="text-purple-400">
            {keywordMatch[0]}
          </span>
        );
        remaining = remaining.slice(keywordMatch[0].length);
        continue;
      }

      // Numbers
      const numberMatch = remaining.match(/^\d+\.?\d*/);
      if (numberMatch) {
        parts.push(
          <span key={key++} className="text-amber-400">
            {numberMatch[0]}
          </span>
        );
        remaining = remaining.slice(numberMatch[0].length);
        continue;
      }

      // Functions
      const funcMatch = remaining.match(/^([a-zA-Z_]\w*)\s*(?=\()/);
      if (funcMatch) {
        parts.push(
          <span key={key++} className="text-blue-400">
            {funcMatch[1]}
          </span>
        );
        remaining = remaining.slice(funcMatch[1].length);
        continue;
      }

      // Regular text
      const nextSpecial = remaining.search(/['"`]|\b(const|let|var|function|return|if|else|for|while|import|export|from|class|interface|type|async|await|def|self|print)\b|\d/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return <>{parts}</>;
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden bg-[#0d1117] border border-white/[0.06]">
      {/* Header */}
      {language && (
        <div className="px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.06] text-[10px] text-white/40">
          {language}
        </div>
      )}
      {/* Code */}
      <div className="p-3 overflow-x-auto">
        <pre className="text-[11px] leading-5 font-mono text-white/80">
          {highlightCode(code)}
        </pre>
      </div>
    </div>
  );
}

/**
 * Main Markdown Renderer
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const elements = useMemo(() => parseMarkdown(content), [content]);

  return <div className={cn('markdown-content', className)}>{elements}</div>;
});

export default MarkdownRenderer;
