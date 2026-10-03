import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { useNotificationStore } from '../stores/notificationStore';
import { APP_NAME } from '../constants/app';
import { Fonts } from '../constants/theme';
import { BizoraMark } from './illustrations/BrandAssets';

interface HomeHeaderOptionsProps {
  avatarUrl?: string;
  initials?: string;
  userName?: string;
  userEmail?: string;
  onOpenNotifications: () => void;
  onProfilePress?: () => void;
  onQrPress?: () => void;
  onSearchPress?: () => void;
  qrActive?: boolean;
  containerStyle?: ViewStyle;
}

export function HomeHeaderOptions({
  avatarUrl,
  initials = 'D',
  userName,
  userEmail,
  onOpenNotifications,
  onProfilePress,
  onQrPress,
  onSearchPress,
  qrActive = false,
  containerStyle,
}: HomeHeaderOptionsProps) {
  const { isDark, palette } = useTheme();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  const hasUserProfile = Boolean(userName || userEmail);

  return (
    <View style={[styles.container, containerStyle]}>
      {hasUserProfile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile and settings"
          onPress={onProfilePress}
          style={styles.headerProfileLockup}
        >
          <View style={[styles.avatarButton, isDark ? styles.actionButtonDark : styles.actionButtonLight]}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={[styles.avatarInitials, { color: isDark ? '#F1F5F9' : '#1B2210' }]}>
                  {initials}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerProfileTextCol}>
            <Text numberOfLines={1} style={[styles.headerProfileName, { color: palette.textPrimary }]}>
              {userName || 'Employer'}
            </Text>
            <Text numberOfLines={1} style={[styles.headerProfileEmail, { color: palette.textSecondary }]}>
              {userEmail || 'No email registered'}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View accessibilityRole="header" pointerEvents="none" style={styles.brandLockup}>
          <BizoraMark size={36} color={palette.brandPrimary} />
          <View style={styles.brandTextCol}>
            <Text numberOfLines={1} style={[styles.appName, { color: palette.brandPrimary }]}>
              {APP_NAME}
            </Text>
            <Text numberOfLines={1} style={[styles.dateText, { color: palette.textSecondary }]}>
              {todayLabel}
            </Text>
          </View>
        </View>
      )}

      {/* ─── Right: Search, Notifications and optional user avatar ─── */}
      <View style={styles.actionsWrap}>
        {/* Search Button */}
        {onSearchPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search employees"
            onPress={onSearchPress}
            style={({ pressed }) => [
              styles.actionButton,
              isDark ? styles.actionButtonDark : styles.actionButtonLight,
              pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
            ]}
          >
            <Feather
              name="search"
              size={18}
              color={isDark ? '#F1F5F9' : '#1B2210'}
            />
          </Pressable>
        )}

        {/* QR Button (only shown when onQrPress provided) */}
        {onQrPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open QR code"
            onPress={onQrPress}
            style={({ pressed }) => [
              styles.actionButton,
              isDark ? styles.actionButtonDark : styles.actionButtonLight,
              qrActive && { backgroundColor: palette.brandPrimary, borderColor: palette.brandPrimary },
              pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
            ]}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={18}
              color={qrActive ? '#FFFFFF' : (isDark ? '#F1F5F9' : '#1B2210')}
            />
          </Pressable>
        )}

        {/* Notifications Bell Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          onPress={onOpenNotifications}
          style={({ pressed }) => [
            styles.actionButton,
            isDark ? styles.actionButtonDark : styles.actionButtonLight,
            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Feather
            name="bell"
            size={18}
            color={isDark ? '#F1F5F9' : '#1B2210'}
          />

          {/* Docked Unread Count Badge */}
          {unreadCount > 0 && (
            <View style={[styles.badgeContainer, { backgroundColor: palette.brandPrimary, borderColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
              <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>

        {/* User Avatar Button (Right-most only when not already in header lockup) */}
        {!hasUserProfile && onProfilePress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile and settings"
            onPress={onProfilePress}
            style={({ pressed }) => [
              styles.avatarButton,
              isDark ? styles.actionButtonDark : styles.actionButtonLight,
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={[styles.avatarInitials, { color: isDark ? '#F1F5F9' : '#1B2210' }]}>
                  {initials}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 52,
    position: 'relative',
  },
  brandLockup: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  brandTextCol: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 0,
  },
  appName: {
    maxWidth: 190,
    fontFamily: Fonts.rounded,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 14,
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  actionButtonDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  actionButtonLight: {
    backgroundColor: '#F8F9F3',
    borderColor: '#ECEFE5',
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 21,
    height: 21,
    borderRadius: 10.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 13,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerProfileLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  headerProfileTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerProfileName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerProfileEmail: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
});
