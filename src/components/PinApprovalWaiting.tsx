import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { Palette } from '../constants/colors';

export function PinApprovalWaiting({ onError }: { onError: (message: string) => void }) {
  const pending = useAuthStore(state => state.pendingPinApproval);
  const checkStatus = useAuthStore(state => state.checkPinLoginApprovalStatus);
  const clearPending = useAuthStore(state => state.clearPendingPinApproval);
  const status = useQuery({
    queryKey: ['pin-approval', pending?.workplaceId, pending?.employeeCode, pending?.requestedAt],
    queryFn: async () => {
      try { return await checkStatus(); }
      catch (error) { const message = error instanceof Error ? error.message : 'Unable to check approval. Try again.'; onError(message); throw error; }
    },
    enabled: !!pending, refetchInterval: 15000, retry: false,
  });
  return <SafeAreaView style={styles.screen}><View style={styles.card}>
    <View style={styles.icon}><Feather name="clock" size={30} color={Palette.brandPrimary} /></View>
    <Text accessibilityRole="header" style={styles.title}>Waiting for approval</Text>
    <Text style={styles.copy}>Your employer needs to approve your sign-in to {pending?.workplaceName || 'this workplace'}. You’ll continue automatically when it’s approved.</Text>
    <Text style={styles.code}>Employee ID · {pending?.employeeCode}</Text>
    {status.isError && <Text accessibilityRole="alert" style={styles.error}>Couldn’t check approval. Check your connection and retry.</Text>}
    <Pressable accessibilityRole="button" disabled={status.isFetching} onPress={() => status.refetch()} style={styles.button}>{status.isFetching ? <ActivityIndicator size="small" color={Palette.textInverse} /> : <Text style={styles.buttonText}>Check approval</Text>}</Pressable>
    <Pressable accessibilityRole="button" onPress={() => { void clearPending().catch(() => onError('Unable to clear this request. Please try again.')); }} style={styles.cancel}><Text style={styles.cancelText}>Use another sign-in</Text></Pressable>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas, padding: 24, alignItems: 'center', justifyContent: 'center' }, card: { width: '100%', maxWidth: 420, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 24, padding: 24, alignItems: 'center', gap: 18 }, icon: { backgroundColor: Palette.brandTint, padding: 18, borderRadius: 24 }, title: { fontSize: 24, fontWeight: '700', color: Palette.textPrimary }, copy: { fontSize: 14, lineHeight: 23, color: Palette.textSecondary, textAlign: 'center' }, code: { fontSize: 13, fontWeight: '600', color: Palette.brandPrimary }, button: { backgroundColor: Palette.brandPrimary, width: '100%', minHeight: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: Palette.textInverse, fontWeight: '600', fontSize: 15 }, cancel: { padding: 12 }, cancelText: { color: Palette.brandPrimary, fontSize: 14, fontWeight: '600' }, error: { color: Palette.danger, fontSize: 13 },
});
