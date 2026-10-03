import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useLockStore } from '../stores/lockStore';
import { AppLockScreen } from '../screens/AppLockScreen';
import { getBootInitializedUserId } from '../services/bootService';

interface AppLockProviderProps {
  children: React.ReactNode;
}

export const AppLockProvider: React.FC<AppLockProviderProps> = ({ children }) => {
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastInitializedUser = useRef<string | null>(null);
  const { initLockState, lockApp, tryBiometricUnlock, resetLockState } = useLockStore.getState();
  const isLocked = useLockStore((s) => s.isLocked);
  const hasMpin = useLockStore((s) => s.hasMpin);
  const appLockEnabled = useLockStore((s) => s.appLockEnabled);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Sync lock state with authentication.
  // bootService already calls initLockState after auth resolves, so on the
  // normal app-open path this effect is a no-op for the initial user.
  useEffect(() => {
    let mounted = true;
    const user = useAuthStore.getState().user;
    if (isAuthenticated && user) {
      // Skip if bootService already initialised this user (the common path)
      if (lastInitializedUser.current === user.id || getBootInitializedUserId() === user.id) {
        lastInitializedUser.current = user.id;
        return;
      }
      // Re-run for a different user (workplace switch, re-login, etc.)
      void initLockState(user).then(() => {
        if (mounted) lastInitializedUser.current = user.id;
      });
    } else {
      lastInitializedUser.current = null;
      resetLockState();
    }
    return () => { mounted = false; };
  }, [isAuthenticated, userId, initLockState, resetLockState]);

  // Handle immediate locking when app goes to background / inactive
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const prev = appState.current;

      if (prev === 'active' && (nextAppState === 'inactive' || nextAppState === 'background')) {
        const { appLockEnabled } = useLockStore.getState();
        if (appLockEnabled) lockApp();
      }

      if (prev.match(/inactive|background/) && nextAppState === 'active') {
        const { isLocked, appLockEnabled, biometricEnabled, isBiometricSupported } = useLockStore.getState();
        if (isLocked && appLockEnabled && biometricEnabled && isBiometricSupported) {
          setTimeout(() => { void tryBiometricUnlock(); }, 50);
        }
      }

      appState.current = nextAppState;
    });
    return () => { subscription.remove(); };
  }, [lockApp, tryBiometricUnlock]);

  return (
    <View style={styles.providerContainer}>
      {children}
      {isAuthenticated && hasMpin && appLockEnabled && isLocked && (
        <View style={styles.fullscreenLockLayer} pointerEvents="auto">
          <AppLockScreen onUnlockSuccess={() => useLockStore.getState().unlockApp()} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  providerContainer: {
    flex: 1,
  },
  fullscreenLockLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 999999,
    elevation: 999,
  },
});
