import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BizoraMark } from '../components/illustrations/BrandAssets';
import { Palette } from '../constants/colors';
import { APP_NAME } from '../constants/app';

export function SplashScreen({ statusText = 'Opening your workplace…' }: { statusText?: string }) {
  return <SafeAreaView style={styles.screen}>
    <View style={styles.brand}>
      <View style={styles.mark}><BizoraMark size={64} /></View>
      <Text style={styles.name}>{APP_NAME}</Text>
      <Text style={styles.tagline}>A simpler day for your team.</Text>
    </View>
    <View accessible accessibilityLabel={statusText} accessibilityState={{ busy: true }} style={styles.status}>
      <ActivityIndicator color={Palette.brandPrimary} size="small" />
      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas, alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', gap: 14 },
  mark: { width: 108, height: 108, borderRadius: 30, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.border },
  name: { color: Palette.textPrimary, fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  tagline: { color: Palette.textSecondary, fontSize: 15 },
  status: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 36 },
  statusText: { color: Palette.textSecondary, fontSize: 13 },
});
