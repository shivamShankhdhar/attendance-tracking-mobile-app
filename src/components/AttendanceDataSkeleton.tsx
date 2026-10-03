import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Palette } from '../constants/colors';
import { SkeletonBox } from './SkeletonScreens';

type SkeletonVariant = 'daily' | 'summary' | 'records' | 'employees' | 'preview' | 'workplace';

export function AttendanceDataSkeleton({ variant, refreshing = false, rows = 6, label: customLabel }: { variant: SkeletonVariant; refreshing?: boolean; rows?: number; label?: string }) {
  const label = customLabel || `${refreshing ? 'Updating' : 'Loading'} ${variant === 'daily' ? 'attendance' : variant === 'summary' ? 'report summary' : variant === 'records' ? 'attendance records' : variant === 'employees' ? 'employees' : variant === 'workplace' ? 'workplace details' : 'report preview'}…`;
  return (
    <View accessible accessibilityLabel={label} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      {variant !== 'workplace' && <Text style={styles.label}>{label}</Text>}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.content}>
        {variant === 'workplace' ? (
          <View style={styles.workplaceSkeleton}>
            {/* Section 1: Workplace information */}
            <View style={styles.sectionHeaderBox}>
              <SkeletonBox width={160} height={12} borderRadius={4} />
            </View>
            <View style={styles.detailCard}>
              {[
                { labelWidth: 100, valWidth: 140 },
                { labelWidth: 60, valWidth: 190 },
                { labelWidth: 70, valWidth: 130 },
                { labelWidth: 75, valWidth: 120 },
                { labelWidth: 60, valWidth: 100 },
                { labelWidth: 70, valWidth: 130 },
              ].map((row, index) => (
                <View key={index} style={[styles.detailRow, index > 0 && styles.detailRowBorder]}>
                  <SkeletonBox width={18} height={18} borderRadius={5} />
                  <View style={styles.detailRowText}>
                    <SkeletonBox width={row.labelWidth} height={14} borderRadius={4} />
                    <SkeletonBox width={row.valWidth} height={12} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>

            {/* Section 2: Attendance setup */}
            <View style={styles.sectionHeaderBox}>
              <SkeletonBox width={140} height={12} borderRadius={4} />
            </View>
            <View style={styles.detailCard}>
              {[
                { labelWidth: 160, valWidth: 50 },
                { labelWidth: 110, valWidth: 90 },
              ].map((row, index) => (
                <View key={index} style={[styles.detailRow, index > 0 && styles.detailRowBorder]}>
                  <SkeletonBox width={18} height={18} borderRadius={5} />
                  <View style={styles.detailRowText}>
                    <SkeletonBox width={row.labelWidth} height={14} borderRadius={4} />
                    <SkeletonBox width={row.valWidth} height={12} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.detailCard}>
              <View style={styles.actionRowSkeleton}>
                <SkeletonBox width={18} height={18} borderRadius={5} />
                <SkeletonBox width={110} height={14} borderRadius={4} />
              </View>
              <View style={[styles.actionRowSkeleton, styles.detailRowBorder]}>
                <SkeletonBox width={18} height={18} borderRadius={5} />
                <SkeletonBox width={120} height={14} borderRadius={4} />
              </View>
            </View>
          </View>
        ) : variant === 'employees' ? (
          <View style={styles.row}>{[0, 1, 2].map(index => <SkeletonBox key={index} width={92} height={40} borderRadius={20} />)}</View>
        ) : variant === 'preview' ? (
          <View style={styles.row}><SkeletonBox width={40} height={40} borderRadius={12} /><View style={styles.flex}><SkeletonBox width="70%" height={15} /><SkeletonBox width="90%" height={12} /><SkeletonBox width="50%" height={12} /></View></View>
        ) : (
          <>
            {variant === 'summary' && <View style={styles.hero}><SkeletonBox width="55%" height={12} /><SkeletonBox width={116} height={54} /><SkeletonBox width="80%" height={14} /><SkeletonBox width="100%" height={7} /><View style={styles.row}>{[0, 1, 2].map(index => <View key={index} style={styles.flex}><SkeletonBox width={38} height={24} /><SkeletonBox width="75%" height={12} /></View>)}</View></View>}
            {(variant === 'daily' || variant === 'summary') && <View style={styles.row}>{[0, 1, 2].map(index => <View key={index} style={[styles.card, styles.flex]}><SkeletonBox width={30} height={26} /><SkeletonBox width="80%" height={12} /></View>)}</View>}
            {variant === 'daily' && <SkeletonBox width="100%" height={44} borderRadius={12} />}
            {variant !== 'summary' && <View style={styles.card}>
              {variant === 'records' && <View style={styles.row}><SkeletonBox width="40%" height={12} /><SkeletonBox width="20%" height={12} /><SkeletonBox width="25%" height={12} /></View>}
              {Array.from({ length: Math.min(6, Math.max(1, rows)) }, (_, index) => <View key={index} style={styles.record}>
                {variant === 'daily' && <SkeletonBox width={38} height={38} borderRadius={19} />}
                <View style={styles.flex}><SkeletonBox width="85%" height={14} /><SkeletonBox width="55%" height={11} /></View>
                <SkeletonBox width={62} height={24} borderRadius={12} />
                {variant === 'records' && <SkeletonBox width={60} height={12} />}
              </View>)}
            </View>}
            {variant === 'records' && <View style={styles.row}><SkeletonBox width={82} height={38} borderRadius={12} /><View style={styles.flex} /><SkeletonBox width={82} height={38} borderRadius={12} /></View>}
          </>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { marginBottom: 16, gap: 10 },
  content: { gap: 14 },
  label: { color: Palette.textSecondary, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0, gap: 10 },
  card: { borderRadius: 16, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, padding: 16, gap: 12 },
  hero: { borderRadius: 24, backgroundColor: Palette.surfaceMuted, padding: 24, gap: 16 },
  record: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  workplaceSkeleton: { gap: 18 },
  sectionHeaderBox: { paddingLeft: 4, marginBottom: -6 },
  detailCard: { backgroundColor: Palette.surface, borderRadius: 18, borderWidth: 1, borderColor: Palette.border, overflow: 'hidden' },
  detailRow: { minHeight: 66, flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  detailRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Palette.border },
  detailRowText: { flex: 1, gap: 5 },
  actionRowSkeleton: { minHeight: 52, flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
});
