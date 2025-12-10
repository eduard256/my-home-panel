import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { cn } from '@/lib/utils';
import { EChartsWrapper } from './EChartsWrapper';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
  showArea?: boolean;
  smooth?: boolean;
}

/**
 * Sparkline chart - minimal line chart for compact metrics display
 */
export function Sparkline({
  data,
  color = '#9b87f5',
  height = 60,
  className,
  showArea = true,
  smooth = true,
}: SparklineProps) {
  const option: EChartsOption = useMemo(
    () => ({
      grid: {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5,
      },
      xAxis: {
        type: 'category',
        show: false,
        data: data.map((_, i) => i),
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 0,
        max: (value: { max: number }) => Math.max(value.max * 1.1, 1),
      },
      series: [
        {
          type: 'line',
          data,
          smooth,
          showSymbol: false,
          lineStyle: {
            color,
            width: 2,
          },
          areaStyle: showArea
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: `${color}40` },
                    { offset: 1, color: `${color}00` },
                  ],
                },
              }
            : undefined,
        },
      ],
      tooltip: {
        show: false,
      },
    }),
    [data, color, showArea, smooth]
  );

  if (!data || data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ height }}
      >
        <div className="text-tiny text-muted">No data</div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <EChartsWrapper
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
