import { create } from 'zustand';
import { readPreference, savePreference } from '../services/storage';

const NOTIFICATIONS_STORAGE_KEY = 'bizora_in_app_notifications';

export type NotificationType = 'ATTENDANCE' | 'REQUEST' | 'SYSTEM' | 'INFO';

export interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string; // ISO string
  read: boolean;
  type: NotificationType;
  data?: Record<string, any>;
}

interface NotificationState {
  notifications: AppNotificationItem[];
  unreadCount: number;
  isLoaded: boolean;
  pendingNotificationAction: AppNotificationItem | null;
  setPendingNotificationAction: (item: AppNotificationItem | null) => void;
  consumePendingNotificationAction: () => AppNotificationItem | null;
  loadNotifications: () => Promise<void>;
  addNotification: (item: Omit<AppNotificationItem, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: string; read?: boolean }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

import { attendanceApi } from '../services/attendanceApi';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoaded: false,
  pendingNotificationAction: null,
  setPendingNotificationAction: (item) => set({ pendingNotificationAction: item }),
  consumePendingNotificationAction: () => {
    const item = get().pendingNotificationAction;
    if (item) set({ pendingNotificationAction: null });
    return item;
  },

  loadNotifications: async () => {
    try {
      // 1. Load locally cached notifications first
      let localList: AppNotificationItem[] = [];
      const stored = await readPreference(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AppNotificationItem[];
          if (Array.isArray(parsed)) {
            localList = parsed;
          }
        } catch {}
      }

      // 2. Fetch real server notifications
      let remoteList: AppNotificationItem[] = [];
      try {
        const remote = await attendanceApi.getMyNotifications();
        if (Array.isArray(remote)) {
          remoteList = remote;
        }
      } catch {
        // Offline or unauthenticated; proceed with local cache
      }

      // Merge and deduplicate by notification ID
      const map = new Map<string, AppNotificationItem>();
      [...remoteList, ...localList].forEach((item) => {
        if (item && item.id && !map.has(item.id)) {
          map.set(item.id, item);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const unread = merged.filter((n) => !n.read).length;

      set({ notifications: merged, unreadCount: unread, isLoaded: true });
      await savePreference(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      set({ isLoaded: true });
    }
  },

  addNotification: async (item) => {
    const newItem: AppNotificationItem = {
      id: item.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: item.title,
      body: item.body,
      timestamp: item.timestamp || new Date().toISOString(),
      read: item.read ?? false,
      type: item.type || 'INFO',
      data: item.data,
    };

    const updated = [newItem, ...get().notifications.filter((n) => n.id !== newItem.id)];
    const unread = updated.filter((n) => !n.read).length;
    set({ notifications: updated, unreadCount: unread });
    await savePreference(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  markAsRead: async (id: string) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    const unread = updated.filter((n) => !n.read).length;
    set({ notifications: updated, unreadCount: unread });
    await savePreference(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  markAllAsRead: async () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });
    await savePreference(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  removeNotification: async (id: string) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    const unread = updated.filter((n) => !n.read).length;
    set({ notifications: updated, unreadCount: unread });
    await savePreference(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  },

  clearAll: async () => {
    set({ notifications: [], unreadCount: 0 });
    await savePreference(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
  },
}));
