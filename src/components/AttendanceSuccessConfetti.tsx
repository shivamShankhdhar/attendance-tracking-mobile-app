import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
];

interface ConfettiPieceProps {
  index: number;
  color: string;
  startX: number;
  driftX: number;
  delay: number;
  size: { width: number; height: number };
  isCircle?: boolean;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({
  color,
  startX,
  driftX,
  delay,
  size,
  isCircle = false,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 2200 + Math.random() * 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateY = p * (SCREEN_HEIGHT * 0.75) - 40;
    const translateX = startX + Math.sin(p * Math.PI * 3) * driftX;
    const rotateZ = `${p * 720}deg`;
    const rotateX = `${p * 540}deg`;
    const opacity = p > 0.8 ? (1 - p) * 5 : 1;

    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: size.width,
      height: size.height,
      backgroundColor: color,
      borderRadius: isCircle ? size.width / 2 : 2,
      opacity,
      transform: [
        { translateX },
        { translateY },
        { rotateZ },
        { rotateX },
      ],
    };
  });

  return <Animated.View style={animatedStyle} />;
};

interface AttendanceSuccessConfettiProps {
  /** Count of confetti particles (default: 36) */
  count?: number;
  /** Whether the confetti is active */
  active?: boolean;
  /** Optional callback fired when confetti finishes its flight */
  onComplete?: () => void;
}

/**
 * Celebratory Confetti Animation inspired by Catalin Miron's
 * "Confetti Animation Reanimated" (AnimateReactNative.com).
 *
 * Renders celebratory flutter and particle burst on successful attendance
 * marked or approved.
 */
export const AttendanceSuccessConfetti: React.FC<AttendanceSuccessConfettiProps> = ({
  count = 36,
  active = true,
  onComplete,
}) => {
  const pieces = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const startX = (SCREEN_WIDTH * 0.1) + Math.random() * (SCREEN_WIDTH * 0.8);
      const driftX = (Math.random() - 0.5) * 80;
      const delay = Math.random() * 300;
      const isCircle = i % 3 === 0;
      const w = 6 + Math.random() * 6;
      const h = isCircle ? w : 10 + Math.random() * 8;
      return { id: i, color, startX, driftX, delay, size: { width: w, height: h }, isCircle };
    });
  }, [count]);

  useEffect(() => {
    if (active && onComplete) {
      const timer = setTimeout(onComplete, 3200);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          index={piece.id}
          color={piece.color}
          startX={piece.startX}
          driftX={piece.driftX}
          delay={piece.delay}
          size={piece.size}
          isCircle={piece.isCircle}
        />
      ))}
    </View>
  );
};
