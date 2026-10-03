import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';

export interface TabItem<T extends string> {
  key: T;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  renderIcon?: (color: string, size: number, active: boolean) => React.ReactNode;
  badgeCount?: number;
}

interface BottomTabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onSelectTab: (tab: T) => void;
  activeColor?: string;
  activeBgColor?: string;
}

import { useTheme } from '../hooks/use-theme';

export function BottomTabs<T extends string>({
  tabs,
  activeTab,
  onSelectTab,
  activeColor,
  activeBgColor,
}: BottomTabsProps<T>) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const bottomPadding = Math.max(insets.bottom, 8);
  const resolvedActiveColor = activeColor || palette.brandPrimary;
  const resolvedActiveBg = activeBgColor || palette.brandTint;

  return (
    <View accessibilityRole="tablist" style={[styles.tabBar, { paddingBottom: bottomPadding, backgroundColor: palette.surface, borderTopColor: palette.border }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconColor = isActive ? resolvedActiveColor : palette.textSecondary;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            onPress={() => onSelectTab(tab.key)}
            style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
          >
            <View style={styles.iconContainer}>
              {isActive && (
                <View
                  style={[
                    styles.activeIndicator,
                    styles.activeIconContainer,
                    { backgroundColor: resolvedActiveBg },
                  ]}
                />
              )}
              {tab.renderIcon ? (
                tab.renderIcon(iconColor, 22, isActive)
              ) : tab.icon ? (
                <Feather name={tab.icon} size={22} color={iconColor} />
              ) : null}
              {!!tab.badgeCount && tab.badgeCount > 0 && (
                <View style={[styles.badge, { backgroundColor: palette.danger }]}>
                  <Text style={styles.badgeText}>
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? resolvedActiveColor : palette.textSecondary },
                isActive && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 4,
    elevation: 2,
    shadowColor: Palette.textPrimary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 54,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  tabPressed: {
    opacity: 0.8,
  },
  iconContainer: {
    position: 'relative',
    height: 32,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activeIconContainer: {
    backgroundColor: Palette.brandTint,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  activeTabLabel: {
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    backgroundColor: Palette.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
