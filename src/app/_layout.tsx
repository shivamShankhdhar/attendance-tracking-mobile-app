import '../constants/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { JoinRequestMonitor } from '../components/JoinRequestMonitor';
import { JoinIntegrations } from '../components/JoinIntegrations';
import { useAuthStore } from '../stores/authStore';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Palette } from '../constants/colors';
import { QueryProvider } from '../providers/QueryProvider';
import { CustomAlertModal } from '../components/CustomAlertModal';
import { AppLockProvider } from '../components/AppLockProvider';
import { SplashScreen } from '../screens/SplashScreen';
import { useTheme } from '../hooks/use-theme';
import { boot, resetBoot } from '../services/bootService';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorHeading}>Application Error</Text>
      <Text style={styles.errorMessage}>{error?.message || 'An unexpected error occurred.'}</Text>
      <Pressable onPress={retry} style={styles.retryBtn}>
        <Text style={styles.retryBtnText}>Reload App</Text>
      </Pressable>
    </View>
  );
}

// Start the boot sequence immediately at module load time — before React even
// mounts — so we're not waiting for a useEffect to fire.
const bootPromise = boot();

export default function RootLayout() {
  const userId = useAuthStore(state => state.user?.id);
  const restorationError = useAuthStore((s) => s.restorationError);
  const loading = useAuthStore((s) => s.isLoading);
  const [ready, setReady] = React.useState(false);
  const { palette } = useTheme();

  useEffect(() => {
    let mounted = true;
    void bootPromise.then(
      () => { if (mounted) setReady(true); },
      () => { if (mounted) setReady(true); },
    );
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (userId) {
      // Register for push notifications after auth — non-blocking
      import('../services/notificationService').then(({ notificationService }) => {
        void notificationService.registerForPushNotificationsAsync(userId);
      }).catch(() => {});
    }
  }, [userId]);

  if (!ready) {
    return (
      <SafeAreaProvider style={{ backgroundColor: palette.canvas }}>
        <StatusBar style="dark" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  if (restorationError) {
    return (
      <SafeAreaProvider style={{ backgroundColor: palette.canvas }}>
        <StatusBar style="dark" />
        <View style={[styles.errorContainer, { backgroundColor: palette.canvas }]}>
          <Text style={styles.errorHeading}>Connection unavailable</Text>
          <Text style={[styles.errorMessage, { color: palette.textSecondary }]}>{restorationError}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => { resetBoot(); void boot(); }}
            style={[styles.retryBtn, { backgroundColor: palette.brandPrimary }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => void useAuthStore.getState().logout()}
            style={styles.signOutBtn}
          >
            <Text style={[styles.signOutBtnText, { color: palette.brandPrimary }]}>Sign In Again</Text>
          </Pressable>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: palette.canvas }}>
      <StatusBar style="dark" />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.canvas }}>
        <QueryProvider>
          <AppLockProvider key={userId || 'signed-out'}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.canvas } }} />
            <JoinRequestMonitor />
            <JoinIntegrations />
            <CustomAlertModal />
          </AppLockProvider>
        </QueryProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.danger,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: Palette.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  signOutBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  signOutBtnText: {
    color: Palette.brandPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
});
