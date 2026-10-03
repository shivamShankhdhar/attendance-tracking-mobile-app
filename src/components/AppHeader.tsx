import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { Avatar } from './Avatar';
import { DesignTokens } from '../constants/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  avatarUrl?: string;
  onPressProfile?: () => void;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  userName = 'User',
  avatarUrl,
  onPressProfile,
  onBack,
  rightAction,
}: AppHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          >
            <Feather name="arrow-left" size={22} color={Palette.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleColumn}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightRow}>
        {rightAction}
        {onPressProfile && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View profile or switch workplace"
            onPress={onPressProfile}
            style={({ pressed }) => [styles.avatarBtn, pressed && styles.btnPressed]}
          >
            <Avatar name={userName} avatarUrl={avatarUrl} size="sm" showBorder />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignTokens.layout.pageHorizontalPadding,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Palette.canvas,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  titleColumn: {
    flex: 1,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.textPrimary,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.textSecondary,
    marginTop: 2,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBtn: {
    padding: 2,
    borderRadius: 20,
  },
  btnPressed: {
    opacity: 0.7,
  },
});
