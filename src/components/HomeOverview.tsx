import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { AnimatedCounter } from './AnimatedCounter';

type Icon = keyof typeof Feather.glyphMap;

export function HomeAction({
  label,
  icon,
  onPress,
  secondary = false,
  busy = false,
  fullWidth = false,
}: {
  label: string;
  icon: Icon;
  onPress: () => void;
  secondary?: boolean;
  busy?: boolean;
  fullWidth?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        fullWidth && styles.actionFullWidth,
        { backgroundColor: secondary ? palette.brandTint : palette.brandPrimary },
        pressed && styles.pressed,
        busy && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? palette.brandPrimary : palette.textInverse} />
      ) : (
        <Feather name={icon} size={18} color={secondary ? palette.brandPrimary : palette.textInverse} />
      )}
      <Text style={[styles.actionText, { color: secondary ? palette.brandPrimary : palette.textInverse }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function EmployerHomeOverview({
  date,
  total,
  present,
  pending,
  unmarked,
  sessionOpen,
  busy,
  onQr,
  onRequests,
  onAttendance,
}: {
  date: string;
  total: number;
  present: number;
  pending: number;
  unmarked: number;
  sessionOpen: boolean;
  busy: boolean;
  onQr: () => void;
  onRequests: () => void;
  onAttendance: () => void;
}) {
  const { palette, isDark } = useTheme();
  const safeTotal = Math.max(0, total);
  const attendanceRate = safeTotal > 0 ? Math.round((present / safeTotal) * 100) : 0;
  const presentPct = safeTotal > 0 ? Math.min(100, Math.round((present / safeTotal) * 100)) : 0;
  const pendingPct = safeTotal > 0 ? Math.min(100 - presentPct, Math.round((pending / safeTotal) * 100)) : 0;

  return (
    <View
      style={[
        styles.overview,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      {/* 1. Top Section Header */}
      <View style={styles.overviewHeaderRow}>
        <View style={styles.todayTitleGroup}>
          <View style={styles.eyebrowRow}>
            <Feather name="bar-chart-2" size={13} color={palette.brandPrimary} />
            <Text style={[styles.eyebrow, { color: palette.brandPrimary }]}>WORKPLACE OVERVIEW</Text>
          </View>
          <Text style={[styles.caption, { color: palette.textSecondary }]}>{date}</Text>
        </View>

        {/* Live Session Status Pill */}
        <View
          style={[
            styles.sessionBadge,
            {
              backgroundColor: sessionOpen
                ? (isDark ? '#064E3B' : '#DCFCE7')
                : (isDark ? '#334155' : '#F1F5F9'),
              borderColor: sessionOpen
                ? (isDark ? '#059669' : '#86EFAC')
                : (isDark ? '#475569' : '#E2E8F0'),
              borderWidth: 1,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: sessionOpen ? '#16A34A' : '#94A3B8' },
            ]}
          />
          <Text
            style={[
              styles.sessionBadgeText,
              { color: sessionOpen ? (isDark ? '#A7F3D0' : '#15803D') : palette.textSecondary },
            ]}
          >
            {sessionOpen ? 'QR Active' : 'QR Closed'}
          </Text>
        </View>
      </View>

      {/* 2. Attendance Rate & Segmented Progress Card */}
      <View
        style={[
          styles.rateBanner,
          {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.rateTopRow}>
          <View style={{ gap: 2 }}>
            <Text style={[styles.rateSubtitle, { color: palette.textSecondary }]}>
              Team Attendance Rate
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <AnimatedCounter
                value={attendanceRate}
                suffix="%"
                style={[styles.rateNumber, { color: palette.textPrimary }]}
              />
              <Text style={[styles.rateRatio, { color: palette.textSecondary }]}>
                ({present}/{safeTotal} marked)
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View roster"
            onPress={onAttendance}
            style={({ pressed }) => [styles.quickRosterBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.quickRosterText, { color: palette.brandPrimary }]}>Roster</Text>
            <Feather name="arrow-up-right" size={14} color={palette.brandPrimary} />
          </Pressable>
        </View>

        {/* Segmented Progress Track */}
        <View style={[styles.segmentedTrack, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
          {presentPct > 0 && (
            <View
              style={[
                styles.trackSegment,
                { width: `${presentPct}%`, backgroundColor: '#16A34A' },
              ]}
            />
          )}
          {pendingPct > 0 && (
            <View
              style={[
                styles.trackSegment,
                { width: `${pendingPct}%`, backgroundColor: '#F59E0B' },
              ]}
            />
          )}
        </View>

        {/* Legend */}
        <View style={styles.trackLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>
              {present} Present
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>
              {pending} Pending
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]}>
              {unmarked} Unmarked
            </Text>
          </View>
        </View>
      </View>

      {/* 3. 2x2 Metric Cards Grid */}
      <View style={styles.metricGrid}>
        {/* Present Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Present: ${present}`}
          onPress={onAttendance}
          style={({ pressed }) => [
            styles.metricCardModern,
            {
              backgroundColor: isDark ? '#143322' : '#F0FDF4',
              borderColor: isDark ? '#166534' : '#BBF7D0',
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.metricCardHeader}>
            <View
              style={[
                styles.metricIconWrap,
                { backgroundColor: isDark ? '#166534' : '#DCFCE7' },
              ]}
            >
              <Feather name="check-circle" size={16} color="#16A34A" />
            </View>
            <Feather name="chevron-right" size={14} color={isDark ? '#86EFAC' : '#16A34A'} />
          </View>
          <AnimatedCounter
            value={present}
            style={[styles.metricNumberModern, { color: isDark ? '#86EFAC' : '#15803D' }]}
          />
          <Text style={[styles.metricLabelModern, { color: isDark ? '#86EFAC' : '#166534' }]}>
            Present Today
          </Text>
        </Pressable>

        {/* Pending Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pending: ${pending}`}
          onPress={onRequests}
          style={({ pressed }) => [
            styles.metricCardModern,
            {
              backgroundColor: isDark ? '#3D2808' : '#FFFBEB',
              borderColor: isDark ? '#854D0E' : '#FDE68A',
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.metricCardHeader}>
            <View
              style={[
                styles.metricIconWrap,
                { backgroundColor: isDark ? '#854D0E' : '#FEF3C7' },
              ]}
            >
              <Feather name="clock" size={16} color="#D97706" />
            </View>
            <Feather name="chevron-right" size={14} color={isDark ? '#FCD34D' : '#D97706'} />
          </View>
          <AnimatedCounter
            value={pending}
            style={[styles.metricNumberModern, { color: isDark ? '#FDE68A' : '#B45309' }]}
          />
          <Text style={[styles.metricLabelModern, { color: isDark ? '#FDE68A' : '#92400E' }]}>
            Pending Review
          </Text>
        </Pressable>

        {/* Not Marked Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Not Marked: ${unmarked}`}
          onPress={onAttendance}
          style={({ pressed }) => [
            styles.metricCardModern,
            {
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.metricCardHeader}>
            <View
              style={[
                styles.metricIconWrap,
                { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
              ]}
            >
              <Feather name="minus-circle" size={16} color="#64748B" />
            </View>
            <Feather name="chevron-right" size={14} color="#94A3B8" />
          </View>
          <AnimatedCounter
            value={unmarked}
            style={[styles.metricNumberModern, { color: isDark ? '#E2E8F0' : '#334155' }]}
          />
          <Text style={[styles.metricLabelModern, { color: palette.textSecondary }]}>
            Not Marked
          </Text>
        </Pressable>

        {/* Total Employees Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Total team: ${safeTotal}`}
          onPress={onAttendance}
          style={({ pressed }) => [
            styles.metricCardModern,
            {
              backgroundColor: isDark ? '#1F2937' : palette.brandTint,
              borderColor: isDark ? '#374151' : palette.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.metricCardHeader}>
            <View
              style={[
                styles.metricIconWrap,
                { backgroundColor: isDark ? '#374151' : '#FFFFFF' },
              ]}
            >
              <Feather name="users" size={16} color={palette.brandPrimary} />
            </View>
            <Feather name="chevron-right" size={14} color={palette.brandPrimary} />
          </View>
          <AnimatedCounter
            value={safeTotal}
            style={[styles.metricNumberModern, { color: palette.textPrimary }]}
          />
          <Text style={[styles.metricLabelModern, { color: palette.textSecondary }]}>
            Total Team
          </Text>
        </Pressable>
      </View>

      {/* 4. Action Row */}
      <View style={styles.overviewActionsRow}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onQr}
          style={({ pressed }) => [
            styles.overviewPrimaryBtn,
            { backgroundColor: palette.brandPrimary },
            pressed && styles.pressed,
            busy && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="grid" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.overviewPrimaryBtnText}>
            {sessionOpen ? "Show Today's QR" : 'Open QR Session'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onAttendance}
          style={({ pressed }) => [
            styles.overviewSecondaryBtn,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : palette.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <Feather name="calendar" size={16} color={palette.textPrimary} />
          <Text style={[styles.overviewSecondaryBtnText, { color: palette.textPrimary }]}>
            Attendance Roster
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusCard({
  icon,
  label,
  count,
  color,
  background,
  borderColor,
  onPress,
}: {
  icon: Icon;
  label: string;
  count: number;
  color: string;
  background: string;
  borderColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${count}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusCard,
        { backgroundColor: background, borderColor },
        pressed && styles.pressed,
      ]}
    >
      <Feather name={icon} size={18} color={color} />
      <AnimatedCounter value={count} style={[styles.statusCardCount, { color }]} />
      <Text style={[styles.statusCardLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function EmployeeHomeStatus({
  state,
  detail,
  time,
  busy,
  onScan,
  onDetails,
}: {
  state: 'pending' | 'approved' | 'rejected' | 'unmarked';
  detail?: string;
  time?: string;
  busy: boolean;
  onScan: () => void;
  onDetails: () => void;
}) {
  const { palette } = useTheme();
  const states = {
    pending: { title: 'Your request is with your employer', description: 'No need to scan again. We’ll update your status after review.', icon: 'clock' as Icon, color: palette.pending, tint: palette.pendingTint },
    approved: { title: 'You’re checked in for today', description: 'Your attendance has been approved. You’re all set.', icon: 'check-circle' as Icon, color: palette.success, tint: palette.successTint },
    rejected: { title: 'Your check-in needs attention', description: detail || 'Review your request or scan the workplace QR again.', icon: 'alert-circle' as Icon, color: palette.danger, tint: palette.dangerTint },
    unmarked: { title: 'Ready to start your day?', description: 'Scan your workplace QR. Your employer will review the check-in.', icon: 'grid' as Icon, color: palette.brandPrimary, tint: palette.brandTint },
  };
  const status = states[state];

  return (
    <View style={[styles.overview, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.row}>
        <Text style={[styles.eyebrow, { color: palette.textSecondary }]}>YOUR ATTENDANCE</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.tint }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {state === 'unmarked' ? 'Not checked in' : state === 'approved' ? 'Present' : state === 'pending' ? 'Pending' : 'Not approved'}
          </Text>
        </View>
      </View>

      <View style={[styles.statusIcon, { backgroundColor: status.tint }]}>
        <Feather name={status.icon} size={28} color={status.color} />
      </View>

      <Text accessibilityRole="header" style={[styles.statusTitle, { color: palette.textPrimary }]}>{status.title}</Text>
      <Text style={[styles.description, { color: palette.textSecondary }]}>{status.description}</Text>

      {time && time !== '—' ? (
        <View style={styles.session}>
          <Feather name="clock" size={14} color={palette.textSecondary} />
          <Text style={[styles.caption, { color: palette.textSecondary }]}>
            {state === 'approved' ? 'Checked in' : 'Requested'} at {time}
          </Text>
        </View>
      ) : null}

      {state === 'unmarked' || state === 'rejected' ? (
        <HomeAction label={busy ? 'Sending check-in…' : state === 'rejected' ? 'Scan again' : 'Scan workplace QR'} icon="grid" onPress={onScan} busy={busy} />
      ) : (
        <HomeAction label={state === 'pending' ? 'View approval status' : 'View attendance history'} icon="arrow-right" onPress={onDetails} secondary />
      )}
      {state === 'rejected' && <HomeAction label="View request details" icon="file-text" onPress={onDetails} secondary />}
    </View>
  );
}

const styles = StyleSheet.create({
  overview: { borderWidth: 1, borderRadius: 24, padding: 18, gap: 14, marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  todayTitleGroup: { gap: 3 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  caption: { fontSize: 12, lineHeight: 18 },
  headlineRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  copy: { flex: 1, gap: 6 },
  headline: { fontSize: 32, fontWeight: '700', letterSpacing: -0.8 },
  headlineMuted: { fontSize: 20, letterSpacing: -0.4 },
  percentBadge: { minWidth: 76, minHeight: 68, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  percent: { fontSize: 22, fontWeight: '700' },
  percentLabel: { fontSize: 10 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, padding: 12, borderRadius: 16, gap: 4, minHeight: 76 },
  metricCount: { fontSize: 24, fontWeight: '700' },
  metricLabel: { fontSize: 12, fontWeight: '500' },
  statusCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, gap: 5, alignItems: 'center', minHeight: 90 },
  statusCardCount: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  statusCardLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  session: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  sessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  sessionBadgeText: { fontSize: 11, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  actions: { gap: 5 },
  primaryActions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, flexDirection: 'row', minHeight: 50, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionFullWidth: { width: '100%' },
  actionText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  attendanceLink: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  attendanceLinkText: { fontSize: 13, fontWeight: '700' },
  secondary: {},
  secondaryText: {},
  pressed: { opacity: 0.75 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  description: { fontSize: 14, lineHeight: 22 },

  /* Modified Modern Employer Overview Styles */
  overviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateBanner: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  rateTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rateSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  rateNumber: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  rateRatio: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickRosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickRosterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentedTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  trackSegment: {
    height: '100%',
  },
  trackLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCardModern: {
    width: '48.3%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricNumberModern: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  metricLabelModern: {
    fontSize: 11,
    fontWeight: '700',
  },
  overviewActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  overviewPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 22,
  },
  overviewPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  overviewSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  overviewSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
