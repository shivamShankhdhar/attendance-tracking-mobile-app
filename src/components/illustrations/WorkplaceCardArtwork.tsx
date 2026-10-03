import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../../hooks/use-theme';

/**
 * WorkplaceCardArtwork:
 * Elegant architectural and geometric artwork tailored for the Active Workplace section.
 * Features:
 * - Soft layered brand gradient curves
 * - Stylized modern office/workplace building silhouettes
 * - Translucent beacon rings and floating geometric accent squircle dots
 *
 * Automatically adapts between Light theme and Dark Obsidian theme with
 * non-blocking pointer events.
 */
export function WorkplaceCardArtwork({ style }: { style?: any }) {
  const { isDark } = useTheme();

  // Color tokens tailored to theme
  const waveColor1 = isDark ? '#064E3B' : '#E8F5E9';
  const waveColor2 = isDark ? '#0F766E' : '#D1FAE5';
  const buildingFill = isDark ? '#1E293B' : '#F1F5F9';
  const buildingStroke = isDark ? '#334155' : '#CBD5E1';
  const accentGlow = isDark ? '#10B981' : '#059669';
  const accentSecondary = isDark ? '#06B6D4' : '#0284C7';
  const dotColor = isDark ? '#34D399' : '#10B981';

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      <Svg width="220" height="130" viewBox="0 0 220 130" fill="none">
        <Defs>
          <LinearGradient id="wpWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={waveColor1} stopOpacity={isDark ? 0.35 : 0.6} />
            <Stop offset="100%" stopColor={waveColor2} stopOpacity={isDark ? 0.2 : 0.4} />
          </LinearGradient>

          <LinearGradient id="wpTowerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={accentGlow} stopOpacity={isDark ? 0.22 : 0.14} />
            <Stop offset="100%" stopColor={buildingFill} stopOpacity={isDark ? 0.4 : 0.25} />
          </LinearGradient>
        </Defs>

        {/* Ambient background organic wave */}
        <Path
          d="M70 0 C110 30 140 50 160 85 C178 115 195 125 220 130 L220 0 Z"
          fill="url(#wpWaveGrad)"
        />

        {/* Secondary inner contour wave */}
        <Path
          d="M120 0 C150 25 175 55 190 90 C198 108 208 120 220 125 L220 0 Z"
          fill={waveColor2}
          opacity={isDark ? 0.25 : 0.45}
        />

        {/* Architectural tower 1 (taller, right side) */}
        <Rect
          x="166"
          y="24"
          width="36"
          height="106"
          rx="6"
          fill="url(#wpTowerGrad)"
          stroke={buildingStroke}
          strokeWidth="1.2"
          opacity={0.8}
        />

        {/* Architectural tower 1 windows */}
        <Rect x="173" y="34" width="7" height="6" rx="1.5" fill={accentGlow} opacity={isDark ? 0.5 : 0.35} />
        <Rect x="187" y="34" width="7" height="6" rx="1.5" fill={accentGlow} opacity={isDark ? 0.35 : 0.25} />
        <Rect x="173" y="46" width="7" height="6" rx="1.5" fill={accentGlow} opacity={isDark ? 0.4 : 0.3} />
        <Rect x="187" y="46" width="7" height="6" rx="1.5" fill={accentGlow} opacity={isDark ? 0.55 : 0.4} />
        <Rect x="173" y="58" width="7" height="6" rx="1.5" fill={accentGlow} opacity={isDark ? 0.3 : 0.2} />
        <Rect x="187" y="58" width="7" height="6" rx="1.5" fill={accentGlow} opacity={isDark ? 0.45 : 0.35} />
        <Rect x="173" y="70" width="7" height="6" rx="1.5" fill={accentGlow} opacity={isDark ? 0.5 : 0.3} />
        <Rect x="187" y="70" width="7" height="6" rx="1.5" fill={accentGlow} opacity={isDark ? 0.35 : 0.25} />

        {/* Architectural tower 2 (medium, left of tower 1) */}
        <Rect
          x="134"
          y="48"
          width="28"
          height="82"
          rx="5"
          fill="url(#wpTowerGrad)"
          stroke={buildingStroke}
          strokeWidth="1.2"
          opacity={0.7}
        />
        {/* Tower 2 windows */}
        <Rect x="141" y="58" width="5" height="5" rx="1.2" fill={accentSecondary} opacity={isDark ? 0.6 : 0.35} />
        <Rect x="151" y="58" width="5" height="5" rx="1.2" fill={accentSecondary} opacity={isDark ? 0.4 : 0.25} />
        <Rect x="141" y="68" width="5" height="5" rx="1.2" fill={accentSecondary} opacity={isDark ? 0.35 : 0.2} />
        <Rect x="151" y="68" width="5" height="5" rx="1.2" fill={accentSecondary} opacity={isDark ? 0.55 : 0.4} />
        <Rect x="141" y="78" width="5" height="5" rx="1.2" fill={accentSecondary} opacity={isDark ? 0.45 : 0.3} />
        <Rect x="151" y="78" width="5" height="5" rx="1.2" fill={accentSecondary} opacity={isDark ? 0.3 : 0.2} />

        {/* Modern architectural canopy / lower terrace */}
        <Rect
          x="114"
          y="76"
          width="22"
          height="54"
          rx="4"
          fill="url(#wpTowerGrad)"
          stroke={buildingStroke}
          strokeWidth="1"
          opacity={0.6}
        />

        {/* Radiating beacon rings over the buildings */}
        <Circle cx="184" cy="24" r="8" stroke={accentGlow} strokeWidth="1" strokeDasharray="3,3" opacity={isDark ? 0.6 : 0.4} />
        <Circle cx="184" cy="24" r="16" stroke={accentGlow} strokeWidth="0.8" opacity={isDark ? 0.35 : 0.25} />
        <Circle cx="184" cy="24" r="2.5" fill={accentGlow} opacity={isDark ? 0.8 : 0.6} />

        {/* Delicate floating geometric squircle / dots */}
        <Circle cx="96" cy="42" r="3" fill={dotColor} opacity={isDark ? 0.4 : 0.3} />
        <Circle cx="112" cy="26" r="2" fill={dotColor} opacity={isDark ? 0.5 : 0.35} />
        <Rect x="82" y="64" width="7" height="7" rx="2" fill={accentSecondary} opacity={isDark ? 0.3 : 0.2} />
        <Circle cx="72" cy="92" r="2.5" fill={dotColor} opacity={isDark ? 0.35 : 0.25} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 220,
    overflow: 'hidden',
    zIndex: 0,
  },
});
