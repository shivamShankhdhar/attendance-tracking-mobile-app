import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/use-theme';
import { Palette } from '../constants/colors';
import { AdBanner } from './AdBanner';

export function DetailPage({ title, subtitle, children, onBack }: { title: string; subtitle?: string; children: React.ReactNode; onBack?: () => void }) {
  const router = useRouter();
  const { palette } = useTheme();

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.canvas }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.header, { backgroundColor: palette.canvas }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={onBack || (() => router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back}>
          <Feather name="arrow-left" size={21} color={palette.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{title}</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {subtitle ? <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
      <AdBanner position="bottom" />
    </SafeAreaView>
  );
}

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>{children}</View>
    </View>
  );
}

export function DetailRow({ icon, label, value, onPress, danger = false, actionIcon = 'chevron-right', actionLabel }: {
  icon: React.ComponentProps<typeof Feather>['name']; label: string; value?: string; onPress?: () => void; danger?: boolean; actionIcon?: React.ComponentProps<typeof Feather>['name']; actionLabel?: string;
}) {
  const { palette } = useTheme();
  const content = (
    <>
      <Feather name={icon} size={18} color={danger ? palette.danger : palette.brandPrimary} />
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: palette.textPrimary }, danger && { color: palette.danger }]}>{label}</Text>
        {value ? <Text style={[styles.value, { color: palette.textSecondary }]}>{value}</Text> : null}
      </View>
      {onPress ? <Feather name={actionIcon} size={17} color={palette.textSecondary} /> : null}
    </>
  );

  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={actionLabel || label} onPress={onPress} style={[styles.row, { borderBottomColor: palette.border }]}>
      {content}
    </Pressable>
  ) : (
    <View style={[styles.row, { borderBottomColor: palette.border }]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.canvas },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 0, backgroundColor: Palette.canvas },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Palette.textPrimary },
  content: { padding: 20, paddingBottom: 36, gap: 20, width: '100%', maxWidth: 640, alignSelf: 'center' },
  subtitle: { color: Palette.textSecondary, fontSize: 14, lineHeight: 21 },
  section: { gap: 10 },
  sectionTitle: { color: Palette.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginLeft: 4 },
  card: { backgroundColor: Palette.surface, borderRadius: 18, borderWidth: 1, borderColor: Palette.border, overflow: 'hidden' },
  row: { minHeight: 66, flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Palette.border },
  rowText: { flex: 1, gap: 3 },
  label: { fontSize: 15, fontWeight: '600', color: Palette.textPrimary },
  value: { fontSize: 13, color: Palette.textSecondary },
});
