import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Palette } from '../constants/colors';
import { useTheme } from '../hooks/use-theme';

interface MpinDotsProps {
  total?: number;
  filledCount: number;
  isError?: boolean;
}

export const MpinDots: React.FC<MpinDotsProps> = ({
  total = 4,
  filledCount,
  isError = false,
}) => {
  const { palette } = useTheme();
  const shakeOffset = useSharedValue(0);

  useEffect(() => {
    if (isError) {
      shakeOffset.value = withSequence(
        withTiming(-14, { duration: 60 }),
        withTiming(14, { duration: 60 }),
        withTiming(-10, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-5, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    }
  }, [isError]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  return (
    <Animated.View style={[styles.container, shakeStyle]}>
      {Array.from({ length: total }).map((_, index) => {
        const isFilled = index < filledCount;
        const isActive = index === filledCount;
        return (
          <View
            key={index}
            style={[
              styles.slotCircle,
              { backgroundColor: palette.surface, borderColor: palette.border },
              isActive && [
                styles.slotCircleActive,
                { backgroundColor: palette.brandTint, borderColor: palette.brandPrimary },
              ],
              isFilled && [
                styles.slotCircleFilled,
                { backgroundColor: palette.brandPrimary, borderColor: palette.brandPrimary },
              ],
              isError && isFilled && styles.slotCircleError,
            ]}
          >
            {isError && isFilled ? (
              <View style={styles.errorBullet} />
            ) : isFilled ? (
              <View style={[styles.filledBullet, { backgroundColor: palette.textInverse }]} />
            ) : isActive ? (
              <View style={[styles.activeCursorPip, { backgroundColor: palette.brandPrimary }]} />
            ) : (
              <View style={[styles.emptyPip, { backgroundColor: palette.border }]} />
            )}
          </View>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 6,
  },
  slotCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  slotCircleActive: {
    borderColor: Palette.brandPrimary,
    borderWidth: 2,
    backgroundColor: '#F9FBF2',
    transform: [{ scale: 1.03 }],
    shadowColor: Palette.brandPrimary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  slotCircleFilled: {
    borderColor: Palette.brandPrimary,
    borderWidth: 2,
    backgroundColor: Palette.brandPrimary,
    shadowColor: Palette.brandPrimary,
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  slotCircleError: {
    borderColor: Palette.danger,
    borderWidth: 2,
    backgroundColor: Palette.danger,
    shadowColor: Palette.danger,
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  filledBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  errorBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  activeCursorPip: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Palette.brandPrimary,
    opacity: 0.85,
  },
  emptyPip: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#CAD5B8',
  },
});
