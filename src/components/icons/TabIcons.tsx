import React from 'react';
import Svg, { Path, Rect, Circle, Line, G } from 'react-native-svg';
import { Palette } from '../../constants/colors';

interface TabIconProps {
  color?: string;
  size?: number;
  active?: boolean;
}

/**
 * 0. "Home" Tab Icon:
 * Architectural sanctuary with modern roofline, sleek walls, and welcoming portal.
 */
export function HomeTabIcon({
  color = Palette.textSecondary,
  size = 22,
  active = false,
}: TabIconProps) {
  const strokeWidth = active ? 2.1 : 1.75;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Modern Gable Roof */}
      <Path
        d="M3 10.2L12 3l9 7.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* House Body */}
      <Path
        d="M5 9.5V20a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5V9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? Palette.brandTint : 'none'}
      />
      {/* Welcoming Doorway */}
      <Path
        d="M9.5 21.5v-6a1.5 1.5 0 011.5-1.5h2a1.5 1.5 0 011.5 1.5v6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? color : 'none'}
      />
      {/* Active Status Beacon */}
      {active && (
        <Circle cx="12" cy="8" r="1.5" fill={color} />
      )}
    </Svg>
  );
}

/**
 * 1. "Today" Tab Icon:
 * Modern stylized daily planner / dashboard calendar with a glowing live day marker.
 */
export function TodayTabIcon({
  color = Palette.textSecondary,
  size = 22,
  active = false,
}: TabIconProps) {
  const strokeWidth = active ? 2.1 : 1.75;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Calendar body */}
      <Rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? Palette.brandTint : 'none'}
      />
      {/* Top spiral / binding rings */}
      <Line
        x1="7.5"
        y1="2"
        x2="7.5"
        y2="5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1="16.5"
        y1="2"
        x2="16.5"
        y2="5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Divider */}
      <Path
        d="M3 9h18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Today live pulse indicator */}
      {active ? (
        <G>
          <Circle cx="12" cy="14.5" r="3" fill={color} />
          <Circle
            cx="12"
            cy="14.5"
            r="4.8"
            stroke={color}
            strokeWidth={1}
            strokeDasharray="1.5 2"
          />
        </G>
      ) : (
        <G>
          <Circle cx="8" cy="13.5" r="1.25" fill={color} />
          <Circle cx="12" cy="13.5" r="1.25" fill={color} />
          <Circle cx="16" cy="13.5" r="1.25" fill={color} />
          <Circle cx="8" cy="16.8" r="1.25" fill={color} />
          <Circle cx="12" cy="16.8" r="1.25" fill={color} />
          <Circle cx="16" cy="16.8" r="1.25" fill={color} />
        </G>
      )}
    </Svg>
  );
}

/**
 * 2. "Attendance" Tab Icon:
 * Stylized smart check-in badge / biometric attendance verification with checkmark.
 */
export function AttendanceTabIcon({
  color = Palette.textSecondary,
  size = 22,
  active = false,
}: TabIconProps) {
  const strokeWidth = active ? 2.1 : 1.75;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Card Body */}
      <Rect
        x="3.5"
        y="4"
        width="17"
        height="17"
        rx="4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? Palette.brandTint : 'none'}
      />
      {/* Lanyard Clip Hole at Top */}
      <Path
        d="M9.5 2h5a1 1 0 011 1v1.5h-7V3a1 1 0 011-1z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill={active ? color : 'none'}
      />
      {/* Checkmark in Attendance verification */}
      <Path
        d="M7.8 12.8l2.7 2.7 5.7-5.7"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signal / Presence Dots at bottom */}
      <Circle cx="8" cy="18" r="0.9" fill={color} />
      <Circle cx="12" cy="18" r="0.9" fill={color} />
      <Circle cx="16" cy="18" r="0.9" fill={color} />
    </Svg>
  );
}

/**
 * 3. "Employees" Tab Icon:
 * Modern corporate team / squad network with connected hierarchy nodes.
 */
export function EmployeesTabIcon({
  color = Palette.textSecondary,
  size = 22,
  active = false,
}: TabIconProps) {
  const strokeWidth = active ? 2.1 : 1.75;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Primary Leader Avatar */}
      <Circle
        cx="9"
        cy="7"
        r="3.5"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={active ? Palette.brandTint : 'none'}
      />
      <Path
        d="M2.5 19.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Secondary Team Member */}
      <Circle
        cx="16.5"
        cy="7.5"
        r="2.8"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={active ? color : 'none'}
      />
      <Path
        d="M16 13c2.4.4 4.5 2.2 4.5 5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Link pin / squad badge */}
      {active && (
        <Circle cx="9" cy="7" r="1.5" fill={color} />
      )}
    </Svg>
  );
}

/**
 * 4. "Workplace" Tab Icon:
 * Contemporary corporate headquarters building with entrance portal & architectural geometry.
 */
export function WorkplaceTabIcon({
  color = Palette.textSecondary,
  size = 22,
  active = false,
}: TabIconProps) {
  const strokeWidth = active ? 2.1 : 1.75;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Modern Headquarters Silhouette */}
      <Rect
        x="3"
        y="3.5"
        width="18"
        height="17.5"
        rx="3.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill={active ? Palette.brandTint : 'none'}
      />
      {/* Architectural Roof Canopy */}
      <Path
        d="M8 3.5V2h8v1.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Corporate Glass Panes */}
      <Path
        d="M7 8h2.5M14.5 8H17M7 11.5h2.5M14.5 11.5H17"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Main Entrance Portal */}
      <Path
        d="M9.5 21v-4.5a1.5 1.5 0 011.5-1.5h2a1.5 1.5 0 011.5 1.5V21"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={active ? color : 'none'}
      />
    </Svg>
  );
}

/**
 * 5. "History" Tab Icon (for Employee view):
 * Stylized chronometer timeline with rewind/record arc.
 */
export function HistoryTabIcon({
  color = Palette.textSecondary,
  size = 22,
  active = false,
}: TabIconProps) {
  const strokeWidth = active ? 2.1 : 1.75;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Clock Dial */}
      <Circle
        cx="12"
        cy="12"
        r="8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={active ? Palette.brandTint : 'none'}
      />
      {/* Clock Hands */}
      <Path
        d="M12 7.5v5l3.2 2"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Timeline Orbit Arc */}
      <Path
        d="M3.2 12a9 9 0 011.8-5.3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx="5" cy="6.7" r="1.2" fill={color} />
    </Svg>
  );
}

/**
 * 6. "Profile" Tab Icon:
 * Dual-ring user identity badge with account seal.
 */
export function ProfileTabIcon({
  color = Palette.textSecondary,
  size = 22,
  active = false,
}: TabIconProps) {
  const strokeWidth = active ? 2.1 : 1.75;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="8"
        r="4"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={active ? Palette.brandTint : 'none'}
      />
      <Path
        d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {active && (
        <Circle cx="12" cy="8" r="1.5" fill={color} />
      )}
    </Svg>
  );
}
