import React, { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';

interface Props {
  title: string;
  subtitle: string;
  icon: 'users' | 'bar-chart-2';
  period: string;
  badge?: string;
  onChoosePeriod: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  action?: ReactNode;
  children: ReactNode;
}

export function AttendanceSectionHeader({ title, subtitle, icon, period, badge, onChoosePeriod, onPrevious, onNext, action, children }: Props) {
  return (
    <View style={styles.sticky}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.icon}><Feather name={icon} size={20} color={Palette.brandPrimary} /></View>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
          </View>
          {action}
        </View>
        <View style={styles.periodRow}>
          {onPrevious && <Pressable accessibilityRole="button" accessibilityLabel="Previous attendance day" onPress={onPrevious} style={styles.arrow}><Feather name="chevron-left" size={18} color={Palette.brandPrimary} /></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel={`Change ${title.toLowerCase()} dates: ${period}`} onPress={onChoosePeriod} style={({ pressed }) => [styles.periodButton, pressed && styles.pressed]}>
            <Feather name="calendar" size={15} color={Palette.brandPrimary} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.period}>{period}</Text>
            {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
            <Feather name="chevron-down" size={15} color={Palette.textSecondary} />
          </Pressable>
          {onPrevious && <Pressable accessibilityRole="button" accessibilityLabel="Next attendance day" disabled={!onNext} onPress={onNext} style={[styles.arrow, !onNext && styles.disabled]}><Feather name="chevron-right" size={18} color={Palette.brandPrimary} /></Pressable>}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sticky: { backgroundColor: Palette.canvas, paddingBottom: 14 },
  card: { backgroundColor: Palette.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: Palette.border, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: Palette.brandTint, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: Palette.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { color: Palette.textSecondary, fontSize: 12 },
  periodRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.canvas, borderRadius: 12, borderWidth: 1, borderColor: Palette.border },
  periodButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 13, borderRadius: 12 },
  period: { flex: 1, color: Palette.textPrimary, fontSize: 13, fontWeight: '600' },
  arrow: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: Palette.brandTint, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3 },
  badgeText: { color: Palette.brandPrimary, fontSize: 10, fontWeight: '700' },
  pressed: { backgroundColor: Palette.surfaceMuted },
  disabled: { opacity: 0.3 },
});
