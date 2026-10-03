import { useEffect } from 'react';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../services/api';
import { savePendingJoin } from '../services/workplaceLinks';
import { queryClient } from '../providers/QueryProvider';

export function JoinIntegrations() {
  const router = useRouter();
  const navigation = useRootNavigationState();
  const userId = useAuthStore((s) => s.isAuthenticated ? s.user?.id : undefined);
  useEffect(() => {
    if (!navigation?.key || Constants.executionEnvironment === 'storeClient' || !process.env.EXPO_PUBLIC_BRANCH_KEY) return;
    let current = true;
    let unsubscribe: (() => void) | undefined;
    void import('react-native-branch').then(({ default: branch }) => {
      if (!current) return;
      unsubscribe = branch.subscribe({ onOpenComplete: ({ error, params }) => {
        const token = params?.workplace_token || params?.workspace_token;
        if (error || !params?.['+clicked_branch_link'] || typeof token !== 'string' || token.length > 4096) return;
        void savePendingJoin(token).then(() => {
          if (!current) return;
          queryClient.setQueryData(['pending-join'], token);
          router.replace({ pathname: '/join', params: { token } });
        });
      } });
    }).catch(() => { /* Normal links remain usable when the native integration is not built yet. */ });
    return () => { current = false; unsubscribe?.(); };
  }, [router, navigation?.key]);

  useEffect(() => {
    if (!userId || !navigation?.key || Constants.executionEnvironment === 'storeClient' || !Device.isDevice) return;
    let current = true;
    let cleanup: (() => void) | undefined;
    void import('expo-notifications').then(async (notifications) => {
      if (!current) return;
      notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
      const open = (response: NotificationResponse) => {
        if (!current || useAuthStore.getState().user?.id !== userId) return;
        const data = response.notification.request.content.data;
        if (!data) return;
        if (data.type === 'JOIN_REQUESTED' && typeof data.workplaceId === 'string') router.push({ pathname: '/join-requests', params: { workplaceId: data.workplaceId } });
        else if (['JOIN_APPROVED', 'JOIN_REJECTED'].includes(String(data.type)) && typeof data.requestId === 'string') router.push({ pathname: '/join', params: { requestId: data.requestId } });
      };
      const subscription = notifications.addNotificationResponseReceivedListener(open);
      cleanup = () => subscription.remove();
      const last = await notifications.getLastNotificationResponseAsync();
      if (last) { open(last); await notifications.clearLastNotificationResponseAsync(); }
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) return;
      if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('default', { name: 'Workplace updates', importance: notifications.AndroidImportance.DEFAULT });
      let permission = await notifications.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) permission = await notifications.requestPermissionsAsync();
      if (!permission.granted || !current || useAuthStore.getState().user?.id !== userId) return;
      const token = await notifications.getExpoPushTokenAsync({ projectId });
      if (current && useAuthStore.getState().user?.id === userId) await apiRequest('/auth/push-token', { method: 'POST', body: { expoPushToken: token.data } });
    }).catch(() => { /* The request status remains available without push permission or connectivity. */ });
    return () => { current = false; cleanup?.(); };
  }, [userId, router, navigation?.key]);
  return null;
}
