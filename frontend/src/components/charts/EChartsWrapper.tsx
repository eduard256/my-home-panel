import { useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsReactProps } from 'echarts-for-react';

/**
 * EChartsWrapper - Wrapper around ReactECharts to fix React 18 StrictMode unmount issues
 *
 * This component fixes the "Cannot read properties of undefined (reading 'disconnect')"
 * error that occurs in React 18 StrictMode when components are unmounted and remounted.
 */
export function EChartsWrapper(props: EChartsReactProps) {
  const chartRef = useRef<ReactECharts | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Give the chart instance time to clean up properly
      if (chartRef.current) {
        try {
          const instance = chartRef.current.getEchartsInstance();
          if (instance && !instance.isDisposed()) {
            setTimeout(() => {
              if (!isMountedRef.current) {
                instance.dispose();
              }
            }, 0);
          }
        } catch (error) {
          // Silently catch disposal errors in dev mode
          if (process.env.NODE_ENV === 'development') {
            console.debug('ECharts disposal handled:', error);
          }
        }
      }
    };
  }, []);

  return <ReactECharts ref={chartRef} {...props} />;
}
