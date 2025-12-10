import { useState, useEffect, useRef } from 'react';

/**
 * Hook that smoothly animates a numeric value from current to target
 * Updates happen every frame for smooth animation
 */
export function useAnimatedValue(
  targetValue: number,
  duration: number = 900, // Animation duration in ms (slightly longer)
  step: number = 0.3 // Step size for value changes
): number {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetRef = useRef(targetValue);

  useEffect(() => {
    targetRef.current = targetValue;

    // Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    // If values are very close, just set directly
    if (Math.abs(displayValue - targetValue) < step) {
      setDisplayValue(targetValue);
      return;
    }

    // Calculate interval to complete animation in ~duration ms
    const diff = Math.abs(targetValue - displayValue);
    const steps = Math.ceil(diff / step);
    const intervalMs = Math.max(duration / steps, 30); // At least 30ms between updates

    animationRef.current = setInterval(() => {
      setDisplayValue((current) => {
        const target = targetRef.current;
        const difference = target - current;

        // If we're close enough, snap to target
        if (Math.abs(difference) < step) {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }
          return target;
        }

        // Move by step in the right direction
        if (difference > 0) {
          return Math.round((current + step) * 10) / 10;
        } else {
          return Math.round((current - step) * 10) / 10;
        }
      });
    }, intervalMs);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [targetValue, duration, step]);

  return displayValue;
}

/**
 * Hook for animating percentage values (0-100)
 */
export function useAnimatedPercent(targetValue: number, duration: number = 800): number {
  return useAnimatedValue(targetValue, duration, 1);
}

/**
 * Hook for animating byte values (returns formatted string)
 */
export function useAnimatedBytes(
  targetValue: number,
  duration: number = 800
): { value: number; animated: number } {
  const animated = useAnimatedValue(targetValue, duration, 0);
  return { value: targetValue, animated };
}
