import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Palette } from '../constants/colors';

export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    // Auto redirect to main dashboard / root
    const timer = setTimeout(() => {
      router.replace('/');
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redirecting to App...</Text>
      <Pressable onPress={() => router.replace('/')} style={styles.button}>
        <Text style={styles.buttonText}>Go to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Palette.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
