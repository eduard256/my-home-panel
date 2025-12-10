import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { cn } from '@/lib/utils';
import { EChartsWrapper } from './EChartsWrapper';

interface BarChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  className?: string;
  showLabels?: boolean;
}

/**
 * BarChart component - Simple bar chart for trigger/event counts
 */
export function BarChart({
  data,
  labels,
  color = '#9b87f5',
  height = 200,
  className,
  showLabels = true,
}: BarChartProps) {
  const option: EChartsOption = useMemo(
    () => ({
      grid: {
        top: 20,
        right: 20,
        bottom: showLabels ? 30 : 10,
        left: 40,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(22, 22, 29, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        textStyle: { color: '#ffffff', fontSize: 12 },
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: 'rgba(155, 135, 245, 0.1)' },
        },
      },
      xAxis: {
        type: 'category',
        data: labels || data.map((_, i) => i.toString()),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: showLabels
          ? {
              color: '#6b6b70',
              fontSize: 10,
            }
          : { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b6b70',
          fontSize: 10,
        },
        splitLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.05)' },
        },
      },
      series: [
        {
          type: 'bar',
          data,
          barWidth: '60%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color },
                { offset: 1, color: `${color}80` },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${color}` },
                  { offset: 1, color: `${color}cc` },
                ],
              },
            },
          },
        },
      ],
    }),
    [data, labels, color, showLabels]
  );

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-white/5 rounded-xl',
          className
        )}
        style={{ height }}
      >
        <div className="text-sm text-muted">No data available</div>
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
