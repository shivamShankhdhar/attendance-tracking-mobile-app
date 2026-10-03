import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/use-theme';

/**
 * HeaderBackgroundArt:
 * Exact decorative background art from the design mockup:
 * - Soft flowing organic sage waves in top-right
 * - Floating hollow rounded square outline
 * - Drifting soft filled squircles
 *
 * Automatically adapts gracefully between Light Cream and OLED Black modes.
 */
export function HeaderBackgroundArt({
  style,
  offsetWithSafeArea = true,
}: {
  style?: any;
  offsetWithSafeArea?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const top = offsetWithSafeArea ? insets.top : 0;

  const wave1 = isDark ? '#141822' : '#EDF2E1';
  const wave2 = isDark ? '#10141C' : '#E4ECD5';
  const strokeColor = isDark ? '#222938' : '#DCE4CD';
  const dot1 = isDark ? '#171D28' : '#DFE6CF';
  const dot2 = isDark ? '#1A212E' : '#E2E8D3';
  const dot3 = isDark ? '#1E2635' : '#E6ECD8';
  const dot4 = isDark ? '#222C3D' : '#EAF0DC';

  return (
    <View pointerEvents="none" style={[styles.container, { top }, style]}>
      <Svg width="220" height="180" viewBox="0 0 220 180" fill="none">
        {/* Soft flowing outer sage wave */}
        <Path
          d="M60 0 C95 45 130 80 155 110 C180 140 200 165 220 180 L220 0 Z"
          fill={wave1}
          opacity={isDark ? 0.95 : 0.85}
        />
        {/* Secondary inner sage wave */}
        <Path
          d="M110 0 C140 40 170 75 190 105 C205 125 214 140 220 150 L220 0 Z"
          fill={wave2}
          opacity={isDark ? 0.85 : 0.7}
        />

        {/* Large Rounded Square Outline */}
        <Rect
          x="48"
          y="32"
          width="44"
          height="44"
          rx="13"
          stroke={strokeColor}
          strokeWidth="6"
          fill="none"
        />

        {/* Small Filled Floating Squircles drifting down */}
        <Rect x="104" y="66" width="16" height="16" rx="5" fill={dot1} />
        <Rect x="130" y="96" width="18" height="18" rx="5" fill={dot2} />
        <Rect x="164" y="122" width="15" height="15" rx="4" fill={dot3} />
        <Rect x="188" y="148" width="12" height="12" rx="3" fill={dot4} />
      </Svg>
    </View>
  );
}

/**
 * CardWatermarkArt:
 * Translucent rounded squares watermark for the dark olive cards
 * (e.g. "Scan workplace QR" and "Daily QR session" cards).
 */
export function CardWatermarkArt() {
  return (
    <View pointerEvents="none" style={styles.watermarkContainer}>
      {/* Top-left decorative rounded squares */}
      <View style={styles.watermarkTopLeft}>
        <View style={[styles.wmSquare, { width: 34, height: 34, borderRadius: 10, top: -10, left: -6, opacity: 0.14 }]} />
        <View style={[styles.wmSquare, { width: 22, height: 22, borderRadius: 7, top: 12, left: 16, opacity: 0.1 }]} />
        <View style={[styles.wmSquare, { width: 14, height: 14, borderRadius: 4, top: 32, left: 6, opacity: 0.08 }]} />
      </View>

      {/* Bottom-right decorative rounded squares */}
      <View style={styles.watermarkBottomRight}>
        <View style={[styles.wmSquare, { width: 38, height: 38, borderRadius: 11, bottom: -12, right: -8, opacity: 0.14 }]} />
        <View style={[styles.wmSquare, { width: 24, height: 24, borderRadius: 8, bottom: 14, right: 18, opacity: 0.1 }]} />
        <View style={[styles.wmSquare, { width: 16, height: 16, borderRadius: 5, bottom: 6, right: 36, opacity: 0.08 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 220,
    height: 180,
    overflow: 'hidden',
    zIndex: 0,
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: 20,
    zIndex: 0,
  },
  watermarkTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
  },
  watermarkBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 80,
    height: 80,
  },
  wmSquare: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
});

export { WorkplaceCardArtwork } from './WorkplaceCardArtwork';

