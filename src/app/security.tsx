import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { SecuritySettingsScreen } from '../screens/SecuritySettingsScreen';
import { useAuthStore } from '../stores/authStore';
export default function SecurityRoute() {
  const router = useRouter();
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  if (!authenticated) return <Redirect href="/" />;
  return <SecuritySettingsScreen onBack={() => router.canGoBack() ? router.back() : router.replace('/settings')} />;
}
