import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Line, Circle } from 'react-native-svg';
import { Palette } from '../../constants/colors';
import { APP_NAME } from '../../constants/app';

export interface MarkProps {
  size?: number;
  color?: string;
  checkColor?: string;
}

export interface WordmarkProps {
  markSize?: number;
  fontSize?: number;
  color?: string;
}

/**
 * Bizora Brand Mark
 * Combines the dynamic "B" monogram with interconnected workforce & attendance nodes
 * and a central golden status synchronization hub.
 */
export function BizoraMark({
  size = 40,
  color = Palette.brandPrimary,
}: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Outer squircle badge */}
      <Rect x="2" y="2" width="44" height="44" rx="13" fill={color} />
      
      {/* Left Operations Stem (Pillar of "B") */}
      <Rect x="12" y="11" width="5.5" height="26" rx="2.75" fill="#FFFFFF" />

      {/* Upper Loop of "B" (Franchise / Workplace Hub link) */}
      <Path
        d="M15 14H26C29.8 14 32.5 16.2 32.5 19C32.5 21.8 29.8 24 26 24H15"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Lower Loop of "B" (Storefront / Operations link) */}
      <Path
        d="M15 24H27.5C31.5 24 34.5 26.3 34.5 29.5C34.5 32.7 31.5 34 27.5 34H15"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Junction Nodes */}
      <Circle cx="15" cy="14" r="2.5" fill="#FFFFFF" />
      <Circle cx="15" cy="24" r="2.5" fill="#FFFFFF" />
      <Circle cx="15" cy="34" r="2.5" fill="#FFFFFF" />

      {/* Top Node (Workplace Network Hub) */}
      <Circle cx="26" cy="19" r="2.5" fill="#E5A93C" />

      {/* Center Synchronization / Attendance Golden Pip */}
      <Circle cx="20" cy="24" r="2.8" fill="#E5A93C" />
    </Svg>
  );
}

export function BizoraWordmark({
  markSize = 36,
  fontSize = 24,
  color = Palette.textPrimary,
  showTagline = false,
}: {
  markSize?: number;
  fontSize?: number;
  color?: string;
  showTagline?: boolean;
}) {
  return (
    <View style={styles.karyaWordmarkWrap}>
      <BizoraMark size={markSize} />
      <View style={styles.karyaTextCol}>
        <Text style={[styles.karyaTitleText, { fontSize, color }]}>{APP_NAME}</Text>
        {showTagline && (
          <Text style={styles.karyaTaglineText}>WORKFORCE ATTENDANCE OS</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Backward compatibility aliases for existing components
 */
export const KaryaLinkMark = BizoraMark;
export const KaryaLinkWordmark = BizoraWordmark;
export const WorklyMark = BizoraMark;
export const WorklyWordmark = BizoraWordmark;

export function GoogleLogo({ size = 18 }: { size?: number }) {
  const containerSize = size + 10;
  return (
    <View
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <Path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <Path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          fill="#FBBC05"
        />
        <Path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          fill="#EA4335"
        />
      </Svg>
    </View>
  );
}

/**
 * DialpadKeypadIcon
 * 10-dots phone keypad pattern (3x3 grid + 1 centered bottom dot) matching reference design button
 */
export function DialpadKeypadIcon({ size = 20, color = '#2E4D1D' }: { size?: number; color?: string }) {
  const width = size;
  const height = (size * 26) / 22;
  return (
    <Svg width={width} height={height} viewBox="0 0 22 26" fill="none">
      {/* Row 1 */}
      <Circle cx="4" cy="4" r="2.2" fill={color} />
      <Circle cx="11" cy="4" r="2.2" fill={color} />
      <Circle cx="18" cy="4" r="2.2" fill={color} />
      {/* Row 2 */}
      <Circle cx="4" cy="10.5" r="2.2" fill={color} />
      <Circle cx="11" cy="10.5" r="2.2" fill={color} />
      <Circle cx="18" cy="10.5" r="2.2" fill={color} />
      {/* Row 3 */}
      <Circle cx="4" cy="17" r="2.2" fill={color} />
      <Circle cx="11" cy="17" r="2.2" fill={color} />
      <Circle cx="18" cy="17" r="2.2" fill={color} />
      {/* Row 4 (centered) */}
      <Circle cx="11" cy="23.5" r="2.2" fill={color} />
    </Svg>
  );
}

/**
 * ManageTeamsIcon (Badge 1)
 * 3-person silhouette icon in rich green matching reference design
 */
export function ManageTeamsIcon({ size = 26, color = '#2A5222' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Left person */}
      <Circle cx="7" cy="10" r="3.2" fill={color} />
      <Path d="M2.5 21 C2.5 17.5 4.5 15.5 7 15.5 C8.2 15.5 9.3 16 10.1 16.8 C9.4 18 9 19.4 9 21 Z" fill={color} />

      {/* Right person */}
      <Circle cx="21" cy="10" r="3.2" fill={color} />
      <Path d="M25.5 21 C25.5 17.5 23.5 15.5 21 15.5 C19.8 15.5 18.7 16 17.9 16.8 C18.6 18 19 19.4 19 21 Z" fill={color} />

      {/* Center prominent person */}
      <Circle cx="14" cy="8" r="4.2" fill={color} />
      <Path d="M7.5 21.5 C7.5 17.2 10.4 15 14 15 C17.6 15 20.5 17.2 20.5 21.5 Z" fill={color} />
    </Svg>
  );
}

/**
 * TrackAttendanceIcon (Badge 2)
 * Clean clock icon with hour/minute hands in slate teal
 */
export function TrackAttendanceIcon({ size = 24, color = '#18495A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="2.5" fill="none" />
      <Path
        d="M12 7.2 V12 L15.5 14.5"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * StayOrganizedIcon (Badge 3)
 * Rising 3-bar chart icon in warm ochre/amber
 */
export function StayOrganizedIcon({ size = 24, color = '#8A5420' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bar 1 */}
      <Rect x="4" y="14" width="3.4" height="6" rx="1.7" fill={color} />
      {/* Bar 2 */}
      <Rect x="10.3" y="9" width="3.4" height="11" rx="1.7" fill={color} />
      {/* Bar 3 */}
      <Rect x="16.6" y="4" width="3.4" height="16" rx="1.7" fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wordmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmarkText: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  karyaWordmarkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  karyaTextCol: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  karyaTitleText: {
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  karyaTaglineText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5F6B50',
    letterSpacing: 1.2,
    marginTop: 1,
  },
});
