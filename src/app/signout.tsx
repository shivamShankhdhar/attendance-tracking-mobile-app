import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { showError } from '../stores/alertStore';

export default function SignOutScreen() {
  const router = useRouter();
  useEffect(() => {
    void useAuthStore.getState().logout()
      .catch((error: Error) => showError(error.message))
      .finally(() => router.replace('/'));
  }, [router]);
  return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
}
