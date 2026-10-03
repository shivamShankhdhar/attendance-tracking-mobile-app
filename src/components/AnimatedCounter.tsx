import React, { useEffect, useState, useRef } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface AnimatedCounterProps {
  /** Target integer or numeric value */
  value: number;
  /** Suffix appended after the number, e.g. '%' */
  suffix?: string;
  /** Animation duration in ms (default: 800ms) */
  duration?: number;
  /** Style for the text */
  style?: StyleProp<TextStyle>;
}

/**
 * Animated Counter Component inspired by Catalin Miron's
 * "Custom Animated Counter Component" (AnimateReactNative.com).
 *
 * Smoothly rolls/counts up numeric values with ease-out timing when
 * metrics load or update on the dashboard.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  suffix = '',
  duration = 800,
  style,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;
    prevValueRef.current = endVal;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const startTime = Date.now();
    let timer: ReturnType<typeof setInterval>;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * ease);

      setDisplayValue((previous) => previous === current ? previous : current);

      if (progress >= 1) clearInterval(timer);
    };

    timer = setInterval(tick, 50);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <Text style={style}>{displayValue}{suffix}</Text>;
};
