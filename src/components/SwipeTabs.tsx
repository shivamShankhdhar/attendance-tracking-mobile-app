import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { swipeTabIndex } from '../utils/tabSwipe';

const ParentSwipe = createContext<PanGesture | null>(null);

interface SwipeTabsProps<T extends string> {
  values: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Clean tab gesture container without sliding/swapping animations.
 * Switches tabs instantly and cleanly on swipe or tap.
 */
export function SwipeTabs<T extends string>({
  values,
  selected,
  onSelect,
  children,
  style,
}: SwipeTabsProps<T>) {
  const parent = useContext(ParentSwipe);
  const index = values.indexOf(selected);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(values.length > 1 && index >= 0)
      .maxPointers(1)
      .activeOffsetX([-25, 25])
      .failOffsetY([-20, 20])
      .onEnd((event, success) => {
        'worklet';
        if (!success) return;
        const next = swipeTabIndex(index, values.length, event.translationX, event.translationY, event.velocityX);
        if (next !== index) {
          scheduleOnRN(onSelect, values[next]);
        }
      });

    // An inner swipe must not also switch the parent tab
    if (parent) pan.blocksExternalGesture(parent);
    return pan;
  }, [index, values, onSelect, parent]);

  return (
    <ParentSwipe.Provider value={gesture}>
      <GestureDetector gesture={gesture} touchAction="pan-y">
        <View collapsable={false} style={style}>
          {children}
        </View>
      </GestureDetector>
    </ParentSwipe.Provider>
  );
}

export const swipePageStyle = StyleSheet.create({ page: { flex: 1 } }).page;
