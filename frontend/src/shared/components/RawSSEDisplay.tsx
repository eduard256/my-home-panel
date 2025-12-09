import { motion } from 'framer-motion';

interface RawSSEDisplayProps {
  lines: string[];
}

/**
 * Component to display raw SSE output without any parsing.
 * This will show the raw JSON data from the AI backend.
 * Parsing and formatting will be added later.
 */
export function RawSSEDisplay({ lines }: RawSSEDisplayProps) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-16 h-16 rounded-full bg-[#9b87f5]/10 flex items-center justify-center mb-4">
          <span className="text-3xl">🤖</span>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Начните диалог с AI
        </h3>
        <p className="text-sm text-[#a0a0a8] max-w-xs">
          Задайте вопрос или попросите выполнить команду
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 font-mono text-xs">
      {lines.map((line, index) => (
        <motion.div
          key={`${index}-${line.slice(0, 20)}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className={`
            p-2 rounded-lg break-all
            ${
              line.startsWith('[Error')
                ? 'bg-red-500/10 text-red-400'
                : line.startsWith('[Request')
                ? 'bg-yellow-500/10 text-yellow-400'
                : line.startsWith('data:')
                ? 'bg-[#16161d] text-[#a0a0a8] border-l-2 border-[#9b87f5]'
                : line.startsWith('event:')
                ? 'bg-[#9b87f5]/10 text-[#9b87f5]'
                : 'bg-[#16161d] text-[#6b6b70]'
            }
          `}
        >
          {line}
        </motion.div>
      ))}
    </div>
  );
}
