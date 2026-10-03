import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNotificationStore, AppNotificationItem, NotificationType } from '../stores/notificationStore';
import { useThemeStore } from '../stores/themeStore';
import { formatFriendlyDate } from '../utils/attendance';
import { AdBanner } from './AdBanner';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotificationStore();
  const { isDark, palette } = useThemeStore();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'ATTENDANCE':
        return <Feather name="check-circle" size={18} color="#16A34A" />;
      case 'REQUEST':
        return <Feather name="clock" size={18} color="#D97706" />;
      case 'SYSTEM':
        return <Feather name="shield" size={18} color="#7C3AED" />;
      case 'INFO':
      default:
        return <Feather name="bell" size={18} color="#5B692D" />;
    }
  };

  const getNotificationBg = (type: NotificationType) => {
    switch (type) {
      case 'ATTENDANCE':
        return '#F0FDF4';
      case 'REQUEST':
        return '#FFFBEB';
      case 'SYSTEM':
        return '#FAF5FF';
      case 'INFO':
      default:
        return '#F4F7EC';
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffMs = Date.now() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return formatFriendlyDate(iso, 'd MMM');
    } catch {
      return 'Recently';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close notifications modal" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetCard, { backgroundColor: isDark ? palette.surface : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerBellBadge, { backgroundColor: isDark ? palette.surfaceMuted : '#EDF3DF' }]}>
                <Feather name="bell" size={18} color={palette.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: isDark ? palette.textPrimary : '#1B2210' }]}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadChip}>
                  <Text style={styles.unreadChipText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              {unreadCount > 0 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={markAllAsRead}
                  style={[styles.markReadBtn, { backgroundColor: isDark ? palette.surfaceMuted : '#F8F9F3' }]}
                >
                  <Text style={[styles.markReadBtnText, { color: palette.primary }]}>Mark read</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? palette.surfaceMuted : '#F8F9F3' }]}>
                <Feather name="x" size={20} color={palette.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFilter('ALL')}
              style={[
                styles.filterChip,
                { backgroundColor: isDark ? palette.surfaceMuted : '#F8F9F3', borderColor: isDark ? palette.border : '#ECEFE5' },
                filter === 'ALL' && [styles.filterChipActive, { backgroundColor: palette.primary, borderColor: palette.primary }],
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isDark ? palette.textSecondary : '#6B7280' },
                  filter === 'ALL' && styles.filterChipTextActive,
                ]}
              >
                All ({notifications.length})
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFilter('UNREAD')}
              style={[
                styles.filterChip,
                { backgroundColor: isDark ? palette.surfaceMuted : '#F8F9F3', borderColor: isDark ? palette.border : '#ECEFE5' },
                filter === 'UNREAD' && [styles.filterChipActive, { backgroundColor: palette.primary, borderColor: palette.primary }],
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isDark ? palette.textSecondary : '#6B7280' },
                  filter === 'UNREAD' && styles.filterChipTextActive,
                ]}
              >
                Unread ({unreadCount})
              </Text>
            </Pressable>
          </View>

          {/* Notifications List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            style={styles.listView}
          >
            {displayedNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? palette.surfaceMuted : '#F8F9F3' }]}>
                  <Feather name="bell-off" size={28} color={isDark ? palette.textMuted : '#9CA3AF'} />
                </View>
                <Text style={[styles.emptyTitle, { color: isDark ? palette.textPrimary : '#1B2210' }]}>
                  {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: isDark ? palette.textSecondary : '#6B7280' }]}>
                  {filter === 'UNREAD'
                    ? "You've read all your recent notifications."
                    : 'Check-in updates and workplace announcements will appear here.'}
                </Text>
              </View>
            ) : (
              displayedNotifications.map((item) => {
                const iconBg = isDark ? palette.surfaceMuted : getNotificationBg(item.type);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => markAsRead(item.id)}
                    style={({ pressed }) => [
                      styles.notifCard,
                      {
                        backgroundColor: isDark ? palette.surface : '#FFFFFF',
                        borderColor: isDark ? palette.border : '#ECEFE5',
                      },
                      !item.read && {
                        backgroundColor: isDark ? palette.surfaceMuted : '#FBFDF9',
                        borderColor: isDark ? palette.primary : '#C6D6A8',
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={[styles.notifIconWrap, { backgroundColor: iconBg }]}>
                      {getNotificationIcon(item.type)}
                    </View>

                    <View style={styles.notifBody}>
                      <View style={styles.notifHeaderRow}>
                        <Text style={[styles.notifTitle, { color: isDark ? palette.textPrimary : '#1B2210' }, !item.read && styles.notifTitleBold]}>
                          {item.title}
                        </Text>
                        {!item.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={[styles.notifMessage, { color: isDark ? palette.textSecondary : '#4B5563' }]}>{item.body}</Text>
                      <Text style={styles.notifTime}>{formatTimestamp(item.timestamp)}</Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete notification"
                      onPress={() => removeNotification(item.id)}
                      style={styles.deleteBtn}
                    >
                      <Feather name="trash-2" size={14} color={isDark ? palette.textMuted : '#9CA3AF'} />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <View style={styles.footerRow}>
              <Pressable
                accessibilityRole="button"
                onPress={clearAll}
                style={styles.clearAllBtn}
              >
                <Text style={styles.clearAllText}>Clear all notifications</Text>
              </Pressable>
            </View>
          )}

          <AdBanner position="bottom" safeBottom />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 32, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerBellBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDF3DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2210',
    letterSpacing: -0.3,
  },
  unreadChip: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unreadChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8F9F3',
  },
  markReadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B692D',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8F9F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8F9F3',
    borderWidth: 1,
    borderColor: '#ECEFE5',
  },
  filterChipActive: {
    backgroundColor: '#5B692D',
    borderColor: '#5B692D',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listView: {
    maxHeight: 380,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEFE5',
    padding: 12,
    gap: 10,
  },
  notifCardUnread: {
    backgroundColor: '#FBFDF9',
    borderColor: '#C6D6A8',
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBody: {
    flex: 1,
    gap: 2,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1B2210',
    flex: 1,
  },
  notifTitleBold: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
    marginLeft: 6,
  },
  notifMessage: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 17,
  },
  notifTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8F9F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2210',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 240,
  },
  footerRow: {
    alignItems: 'center',
    paddingTop: 4,
  },
  clearAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
