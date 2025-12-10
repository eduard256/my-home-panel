import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { cn } from '@/lib/utils';
import { EChartsWrapper } from './EChartsWrapper';

interface LineChartSeries {
  name: string;
  data: number[];
  color: string;
}

interface LineChartProps {
  series: LineChartSeries[];
  timestamps?: string[];
  height?: number;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  yAxisMax?: number;
  yAxisFormat?: (value: number) => string;
  onClick?: (dataIndex: number) => void;
}

/**
 * LineChart component - Multi-series line chart with area fill
 */
export function LineChart({
  series,
  timestamps,
  height = 250,
  className,
  showLegend = true,
  showGrid = true,
  yAxisMax,
  yAxisFormat = (v) => `${v.toFixed(0)}%`,
  onClick,
}: LineChartProps) {
  const option: EChartsOption = useMemo(
    () => ({
      grid: {
        top: showLegend ? 40 : 20,
        right: 20,
        bottom: 30,
        left: 50,
      },
      legend: showLegend
        ? {
            show: true,
            top: 0,
            textStyle: { color: '#a0a0a8', fontSize: 12 },
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(22, 22, 29, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        textStyle: { color: '#ffffff', fontSize: 12 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: 'rgba(155, 135, 245, 0.3)' },
        },
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; color: string }[];
          if (!items || !items.length) return '';

          const lines = items.map(
            (item) =>
              `<div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${item.color};"></span>
                <span>${item.seriesName}: ${yAxisFormat(item.value)}</span>
              </div>`
          );

          return `<div style="padding: 4px;">${lines.join('')}</div>`;
        },
      },
      xAxis: {
        type: 'category',
        data: timestamps || series[0]?.data.map((_, i) => i),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b6b70',
          fontSize: 10,
          formatter: (value: string) => {
            // Format timestamp if it looks like ISO date
            if (value.includes('T')) {
              const date = new Date(value);
              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            }
            return value;
          },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yAxisMax || undefined,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b6b70',
          fontSize: 10,
          formatter: yAxisFormat,
        },
        splitLine: {
          show: showGrid,
          lineStyle: { color: 'rgba(255, 255, 255, 0.05)' },
        },
      },
      series: series.map((s) => ({
        name: s.name,
        type: 'line',
        data: s.data,
        smooth: true,
        showSymbol: false,
        lineStyle: {
          color: s.color,
          width: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${s.color}30` },
              { offset: 1, color: `${s.color}00` },
            ],
          },
        },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 3 },
        },
      })),
    }),
    [series, timestamps, showLegend, showGrid, yAxisMax, yAxisFormat]
  );

  const handleChartClick = (params: { dataIndex?: number }) => {
    if (onClick && params.dataIndex !== undefined) {
      onClick(params.dataIndex);
    }
  };

  if (!series || series.length === 0 || !series[0]?.data?.length) {
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
        onEvents={{
          click: handleChartClick,
        }}
      />
    </div>
  );
}
