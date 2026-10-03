import { Platform } from 'react-native';
import { Palette, LightPalette, DarkPalette } from './colors';

export const DesignTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12, // Input & Button radius
    lg: 16, // Card radius
    full: 999, // Chip radius
  },
  layout: {
    pageHorizontalPadding: 18,
    cardPadding: 16,
    heroCardPadding: 20,
    buttonHeight: 50,
    minTouchTarget: 44,
    iconSize: 22,
  },
  typography: {
    display: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '700' as const,
    },
    heading: {
      fontSize: 19,
      lineHeight: 26,
      fontWeight: '700' as const,
    },
    subheading: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
    },
    bodyMedium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
    },
    metadata: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
    },
    metric: {
      fontSize: 26,
      lineHeight: 30,
      fontWeight: '700' as const,
    },
    status: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
    },
  },
};

export const Colors = {
  light: {
    text: LightPalette.textPrimary,
    background: LightPalette.canvas,
    backgroundElement: LightPalette.neutralTint,
    backgroundSelected: LightPalette.brandTint,
    textSecondary: LightPalette.textSecondary,
    surface: LightPalette.surface,
    border: LightPalette.border,
    primary: LightPalette.brandPrimary,
  },
  dark: {
    text: LightPalette.textPrimary,
    background: LightPalette.canvas,
    backgroundElement: LightPalette.neutralTint,
    backgroundSelected: LightPalette.brandTint,
    textSecondary: LightPalette.textSecondary,
    surface: LightPalette.surface,
    border: LightPalette.border,
    primary: LightPalette.brandPrimary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
