import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

// AdMob is native-only. Keep it out of the browser and static-render bundles.
export const AdBanner: FC<{
  style?: StyleProp<ViewStyle>;
  position?: 'bottom' | 'inline';
  variant?: 'docked' | 'card';
  safeBottom?: boolean;
}> = () => null;
