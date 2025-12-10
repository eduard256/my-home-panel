import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapProps {
  data: number[];
  labels?: string[];
  color?: string;
  className?: string;
  height?: number;
}

/**
 * Heatmap component - 24-hour activity heatmap
 */
export function Heatmap({
  data,
  labels,
  color = '#9b87f5',
  className,
  height = 40,
}: HeatmapProps) {
  // Normalize data to 0-1 range
  const maxValue = Math.max(...data, 1);
  const normalizedData = data.map((v) => v / maxValue);

  // Generate 24 hours labels if not provided
  const hourLabels =
    labels ||
    Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  return (
    <TooltipProvider>
      <div className={cn('flex gap-1', className)} style={{ height }}>
        {normalizedData.map((value, index) => {
          const opacity = Math.max(0.1, value);
          const count = data[index] || 0;

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className="flex-1 rounded-sm transition-all duration-200 hover:scale-110 cursor-default"
                  style={{
                    backgroundColor: count > 0 ? color : 'rgba(255, 255, 255, 0.05)',
                    opacity: count > 0 ? opacity : 1,
                    minWidth: '8px',
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {hourLabels[index]}: {count} trigger{count !== 1 ? 's' : ''}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
