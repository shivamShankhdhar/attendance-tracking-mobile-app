import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { formatSyncTimestamp } from '../utils/attendance';

export interface SyncStatusBannerProps {
  visible: boolean;
  lastSyncedTimestamp?: number | null;
  onRetry?: () => void;
  onClose?: () => void;
  isRetrying?: boolean;
}

export function SyncStatusBanner({
  visible,
  lastSyncedTimestamp,
  onRetry,
  onClose,
  isRetrying = false,
}: SyncStatusBannerProps) {
  const { colors, isDark } = useTheme();
  const [dismissedAlert, setDismissedAlert] = useState<string | null>(null);
  const alertKey = `${visible}:${lastSyncedTimestamp ?? 'none'}`;

  if (!visible || dismissedAlert === alertKey) return null;

  const timeText = lastSyncedTimestamp
    ? formatSyncTimestamp(lastSyncedTimestamp)
    : 'earlier';

  const bannerBg = isDark ? '#261F12' : (colors.pendingTint || '#FBF4D7');
  const borderColor = isDark ? '#463715' : (colors.border || '#E5E7EB');
  const iconBg = isDark ? '#19140B' : (colors.surface || '#FFFFFF');
  const warningColor = colors.pending || '#8C6314';
  const textColor = colors.textPrimary;
  const brandColor = colors.brandPrimary;

  return (
    <View style={[styles.bannerContainer, { backgroundColor: bannerBg, borderBottomColor: borderColor }]}>
      <View style={styles.bannerLeft}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Feather name="cloud-off" size={12} color={warningColor} />
        </View>
        <Text style={[styles.bannerText, { color: textColor }]} numberOfLines={1}>
          Data not refreshed · Last synced {timeText}
        </Text>
      </View>

      <View style={styles.actions}>
        {onRetry && (
          <Pressable
            onPress={onRetry}
            disabled={isRetrying}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: iconBg, borderColor },
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retry syncing data"
          >
            {isRetrying ? <ActivityIndicator size="small" color={brandColor} /> : <Feather name="refresh-cw" size={15} color={brandColor} />}
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            setDismissedAlert(alertKey);
            onClose?.();
          }}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: iconBg, borderColor },
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close data sync notice"
        >
          <Feather name="x" size={16} color={textColor} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 7,
    zIndex: 99,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1,
  },
});
