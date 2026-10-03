import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SwipeToActionButtonProps {
  label: string;
  isCompleted?: boolean;
  isPending?: boolean;
  pendingText?: string;
  completedText?: string;
  variant?: 'checkin' | 'checkout';
  onSwipeSuccess: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const KNOB_SIZE = 48;
const BUTTON_HEIGHT = 58;

export function SwipeToActionButton({
  label,
  isCompleted = false,
  isPending = false,
  pendingText = 'Request Pending',
  completedText = 'Completed for Today ✓',
  variant = 'checkin',
  onSwipeSuccess,
  isLoading = false,
  disabled = false,
}: SwipeToActionButtonProps) {
  const initialWidth = Dimensions.get('window').width - 40;
  const [containerWidth, setContainerWidth] = useState(initialWidth);
  const pan = useRef(new Animated.Value(0)).current;
  const isTriggered = useRef(false);

  // Keep refs up-to-date so PanResponder never suffers from stale closures
  const maxSlideRef = useRef(Math.max(0, initialWidth - KNOB_SIZE - 10));
  const disabledRef = useRef(disabled);
  const isPendingRef = useRef(isPending);
  const isCompletedRef = useRef(isCompleted);
  const isLoadingRef = useRef(isLoading);
  const onSwipeSuccessRef = useRef(onSwipeSuccess);

  disabledRef.current = disabled;
  isPendingRef.current = isPending;
  isCompletedRef.current = isCompleted;
  isLoadingRef.current = isLoading;
  onSwipeSuccessRef.current = onSwipeSuccess;

  useEffect(() => {
    const max = Math.max(0, containerWidth - KNOB_SIZE - 10);
    maxSlideRef.current = max;
  }, [containerWidth]);

  useEffect(() => {
    pan.setValue(0);
    isTriggered.current = false;
  }, [variant, isCompleted, isPending]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !disabledRef.current &&
          !isPendingRef.current &&
          !isCompletedRef.current &&
          !isLoadingRef.current,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabledRef.current &&
          !isPendingRef.current &&
          !isCompletedRef.current &&
          !isLoadingRef.current &&
          Math.abs(gesture.dx) > 3,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          !disabledRef.current &&
          !isPendingRef.current &&
          !isCompletedRef.current &&
          !isLoadingRef.current &&
          Math.abs(gesture.dx) > 3,
        onPanResponderGrant: () => {
          // Started drag
        },
        onPanResponderMove: (_, gesture) => {
          const max = maxSlideRef.current;
          if (max <= 0 || isTriggered.current) return;
          const newX = Math.max(0, Math.min(gesture.dx, max));
          pan.setValue(newX);
        },
        onPanResponderRelease: (_, gesture) => {
          const max = maxSlideRef.current;
          if (max <= 0 || isTriggered.current) return;
          if (gesture.dx >= max * 0.45) {
            isTriggered.current = true;
            Animated.timing(pan, {
              toValue: max,
              duration: 160,
              useNativeDriver: false,
            }).start(() => {
              onSwipeSuccessRef.current?.();
            });
          } else {
            Animated.spring(pan, {
              toValue: 0,
              useNativeDriver: false,
              bounciness: 6,
              speed: 16,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 6,
          }).start();
        },
      }),
    [pan]
  );

  // Render Pending state
  if (isPending) {
    return (
      <View style={[styles.container, styles.pendingContainer]}>
        <View style={styles.pendingKnob}>
          <ActivityIndicator size="small" color="#D97706" />
        </View>
        <View style={styles.textWrap} pointerEvents="none">
          <Text style={styles.pendingLabel}>{pendingText}</Text>
          <Text style={styles.pendingSubLabel}>Awaiting employer review</Text>
        </View>
        <Feather name="clock" size={20} color="#D97706" style={{ marginRight: 16 }} />
      </View>
    );
  }

  // Render Completed state
  if (isCompleted) {
    return (
      <View style={[styles.container, styles.completedContainer]}>
        <View style={styles.completedKnob}>
          <Feather name="check" size={22} color="#16A34A" />
        </View>
        <View style={styles.textWrap} pointerEvents="none">
          <Text style={styles.completedLabel}>{completedText}</Text>
        </View>
        <Feather name="check-circle" size={20} color="#16A34A" style={{ marginRight: 16 }} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: '#5B692D' }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) {
          setContainerWidth(w);
          maxSlideRef.current = Math.max(0, w - KNOB_SIZE - 10);
        }
      }}
    >
      {/* Background Label */}
      <View style={styles.textWrap} pointerEvents="none">
        <Text style={[styles.sliderLabel, { color: '#FFFFFF', fontWeight: '700' }]}>
          {isLoading ? 'Processing…' : label}
        </Text>
      </View>

      {/* Chevrons track indicator on the right */}
      <View style={styles.trackArrow} pointerEvents="none">
        <Feather name="chevrons-right" size={22} color="rgba(255, 255, 255, 0.55)" />
      </View>

      {/* Draggable Knob - attached to PanResponder without child Pressables stealing events */}
      <Animated.View
        style={[
          styles.knob,
          {
            transform: [{ translateX: pan }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.knobInner} pointerEvents="none">
          {isLoading ? (
            <ActivityIndicator size="small" color="#5B692D" />
          ) : (
            <Feather name="arrow-right" size={22} color="#5B692D" />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BUTTON_HEIGHT,
    borderRadius: 29,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#5B692D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
    userSelect: 'none',
  },
  textWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingHorizontal: 54,
  },
  sliderLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  trackArrow: {
    position: 'absolute',
    right: 18,
    zIndex: 1,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    left: 5,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  knobInner: {
    width: '100%',
    height: '100%',
    borderRadius: KNOB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.05,
  },
  pendingKnob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  pendingLabel: {
    color: '#B45309',
    fontSize: 15,
    fontWeight: '700',
  },
  pendingSubLabel: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  completedContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.05,
  },
  completedKnob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  completedLabel: {
    color: '#15803D',
    fontSize: 15,
    fontWeight: '700',
  },
});

