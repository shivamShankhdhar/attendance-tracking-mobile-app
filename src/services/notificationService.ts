import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { apiRequest } from './api';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore, NotificationType, AppNotificationItem } from '../stores/notificationStore';

// Configure notification behavior for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private isInitialized = false;
  private notificationReceivedListener?: Notifications.Subscription;
  private notificationResponseListener?: Notifications.Subscription;

  /**
   * Initializes the notification service, channels, and listeners
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load persisted in-app notifications
    await useNotificationStore.getState().loadNotifications();

    if (Platform.OS === 'web') return;

    try {
      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('attendance-updates', {
          name: 'Attendance & Workplace Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5B692D',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
        });

        await Notifications.setNotificationChannelAsync('default', {
          name: 'General Updates',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });
      }

      // Listener for incoming notifications received while app is foregrounded
      this.notificationReceivedListener = Notifications.addNotificationReceivedListener((notification) => {
        const { title, body, data } = notification.request.content;
        if (title || body) {
          useNotificationStore.getState().addNotification({
            id: notification.request.identifier,
            title: title || 'New Notification',
            body: body || '',
            type: (data?.type as NotificationType) || 'INFO',
            data: data || {},
          });
        }
      });

      // Listener for notification responses (user tapping on notification)
      this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        const { title, body, data } = response.notification.request.content;
        const notificationId = response.notification.request.identifier;
        if (notificationId) {
          useNotificationStore.getState().markAsRead(notificationId);
        }
        const item: AppNotificationItem = {
          id: notificationId || String(Date.now()),
          title: title || 'Notification',
          body: body || '',
          timestamp: new Date().toISOString(),
          read: true,
          type: (data?.type as NotificationType) || 'INFO',
          data: data || {},
        };
        useNotificationStore.getState().setPendingNotificationAction(item);
        // Handle navigation or custom action from data payload
        this.handleNotificationTap(data, item);
      });
    } catch (err) {
      console.warn('[NotificationService] Failed to initialize listeners/channels:', err);
    }
  }

  /**
   * Registers the device for Expo Push Notifications and syncs token with backend
   */
  async registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    if (!Device.isDevice) {
      console.log('[NotificationService] Must use physical device for remote push notifications.');
      return null;
    }

    try {
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await Notifications.requestPermissionsAsync();
      }

      if (!permission.granted) {
        console.log('[NotificationService] Notification permission was not granted.');
        return null;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;

      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const pushToken = tokenResult.data;

      // Sync push token with backend if user is authenticated
      const currentUserId = userId || useAuthStore.getState().user?.id;
      if (currentUserId && pushToken) {
        try {
          await apiRequest('/auth/push-token', {
            method: 'POST',
            body: { expoPushToken: pushToken },
          });
        } catch (err) {
          console.warn('[NotificationService] Failed to send push token to backend:', err);
        }
      }

      return pushToken;
    } catch (err) {
      console.warn('[NotificationService] Failed to get Expo push token:', err);
      return null;
    }
  }

  /**
   * Triggers or schedules a local push notification using Expo Push Notifications
   */
  async sendLocalNotification(params: {
    title: string;
    body: string;
    data?: Record<string, any>;
    type?: NotificationType;
    sound?: boolean | string;
    triggerSeconds?: number;
  }): Promise<string> {
    const { title, body, data = {}, type = 'INFO', sound = true, triggerSeconds } = params;

    const unread = (useNotificationStore.getState().unreadCount || 0) + 1;

    let notificationId = `local-${Date.now()}`;

    if (Platform.OS !== 'web') {
      try {
        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { ...data, type },
            sound: sound ? 'default' : undefined,
            badge: unread,
            ...(Platform.OS === 'android' ? { channelId: 'attendance-updates' } : {}),
          },
          trigger: triggerSeconds ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds } : null,
        });
      } catch (err) {
        console.warn('[NotificationService] scheduleNotificationAsync error:', err);
      }
    }

    // Record in in-app notification store
    await useNotificationStore.getState().addNotification({
      id: notificationId,
      title,
      body,
      type,
      data,
      read: false,
    });

    return notificationId;
  }

  /**
   * Sets native app badge number
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS !== 'web') {
      try {
        await Notifications.setBadgeCountAsync(count);
      } catch {}
    }
  }

  /**
   * Cleans up subscriptions
   */
  destroy(): void {
    this.notificationReceivedListener?.remove();
    this.notificationResponseListener?.remove();
    this.isInitialized = false;
  }

  private handleNotificationTap(data?: Record<string, any>, item?: AppNotificationItem): void {
    if (!data && !item) return;
    // Handled in app routing or modal if needed
    console.log('[NotificationService] Tapped notification data:', data, item);
  }
}

export const notificationService = new NotificationService();
