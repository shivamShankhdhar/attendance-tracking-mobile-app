import { SwipeTabs } from './SwipeTabs';
import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AttendanceDateField from './AttendanceDateField';
import { Palette } from '../constants/colors';
import { ApiReportsResponse } from '../services/attendanceApi';
import { formatFriendlyDate } from '../utils/attendance';

export const shiftDate = (date: string, offset: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
};
export const validCalendarDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export const attendanceStatuses = ['ALL', 'PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const;
const label = (value: string) => value === 'ALL' ? 'All statuses' : value.replace('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase());

export function FilterPills({ values, selected, onSelect }: { values: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
    {values.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: selected === value }} onPress={() => onSelect(value)} style={[styles.pill, selected === value && styles.selected]}>
      <Text style={[styles.pillText, selected === value && styles.selectedText, selected === value && { color: '#FFFFFF' }]}>{label(value)}</Text>
    </Pressable>)}
  </ScrollView>;
}

export function ExplorerTabs({ values, selected, onSelect, variant = 'underline', badges = {} }: { values: readonly string[]; selected: string; onSelect: (value: string) => void; variant?: 'underline' | 'segmented'; badges?: Record<string, number> }) {
  return (
    <SwipeTabs values={values} selected={selected} onSelect={onSelect}>
    <View accessibilityRole="tablist" style={[styles.tabBar, variant === 'segmented' && styles.segmentedTabBar]}>
      {values.map(value => (
        <Pressable
          key={value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === selected }}
          onPress={() => onSelect(value)}
          style={({ pressed }) => [
            styles.tab,
            variant === 'segmented' && styles.segmentedTab,
            value === selected && (variant === 'segmented' ? styles.segmentedActiveTab : styles.activeTab),
            pressed && styles.tabPressed,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text
              style={[
                styles.tabLabel,
                variant === 'segmented' && styles.segmentedTabLabel,
                value === selected && (variant === 'segmented' ? styles.segmentedActiveTabLabel : styles.activeTabLabel),
                variant === 'segmented' && value === selected && { color: Palette.brandPrimary, fontWeight: '700' },
                variant !== 'segmented' && value === selected && { color: '#FFFFFF', fontWeight: '700' },
              ]}
            >
              {value}
            </Text>
            {(badges[value] ?? 0) > 0 && (
              <View style={{
                backgroundColor: value === selected ? Palette.brandPrimary : '#EF4444',
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700', lineHeight: 12 }}>
                  {badges[value]}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </View>
    </SwipeTabs>
  );
}

export function RangeFilters({ today, start, end, onApply, single = false, deferApply = false, onDraftChange }: { today: string; start: string; end: string; onApply: (start: string, end: string) => void; single?: boolean; deferApply?: boolean; onDraftChange?: (start: string, end: string) => void }) {
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [error, setError] = useState('');
  const apply = (from: string, to: string) => {
    setDraftStart(from); setDraftEnd(to); setError(''); onDraftChange?.(from, to); if (!deferApply) onApply(from, to);
  };
  return <View style={styles.card}>
    <Text style={styles.heading}>{single ? 'Explore a day' : 'Reporting period'}</Text>
    <Text style={styles.caption}>{single ? 'Review check-ins or correct a past record.' : 'Choose a range to update insights, records and exports.'}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {(single ? ['Today', 'Yesterday'] : ['Today', 'Last 7 days', 'Last 30 days', 'This month', 'Last month']).map(preset => <Pressable key={preset} style={styles.pill} accessibilityRole="button" onPress={() => {
        if (preset === 'Yesterday') return apply(shiftDate(today, -1), shiftDate(today, -1));
        if (preset === 'Last month') {
          const last = shiftDate(`${today.slice(0, 7)}-01`, -1);
          return apply(`${last.slice(0, 7)}-01`, last);
        }
        apply(preset === 'Today' ? today : preset === 'This month' ? `${today.slice(0, 7)}-01` : shiftDate(today, preset === 'Last 7 days' ? -6 : -29), today);
      }}><Text style={styles.pillText}>{preset}</Text></Pressable>)}
    </ScrollView>
    <View style={styles.inputs}>
      <View style={styles.field}><Text style={styles.caption}>{single ? 'Date' : 'From'}</Text><AttendanceDateField label={single ? 'Attendance date' : 'Report start date'} value={draftStart} onChange={(value) => { setDraftStart(value); onDraftChange?.(value, draftEnd); }} maximumDate={today} /></View>
      {!single && <View style={styles.field}><Text style={styles.caption}>To</Text><AttendanceDateField label="Report end date" value={draftEnd} onChange={(value) => { setDraftEnd(value); onDraftChange?.(draftStart, value); }} maximumDate={today} /></View>}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {!deferApply && <Pressable accessibilityRole="button" style={styles.apply} onPress={() => {
      const to = single ? draftStart : draftEnd;
      if (!validCalendarDate(draftStart) || !validCalendarDate(to)) return setError('Enter valid dates using YYYY-MM-DD.');
      if (draftStart > to || to > today) return setError('Choose an ordered range ending on or before today.');
      apply(draftStart, to);
    }}><Text style={styles.selectedText}>Apply {single ? 'date' : 'range'}</Text></Pressable>}
    <Text style={styles.caption}>Selected: {start}{!single && ` → ${end}`}</Text>
  </View>;
}

export function ReportInsights({ data, compact = false }: { data?: ApiReportsResponse; compact?: boolean }) {
  const [showTrend, setShowTrend] = useState(true);
  const summary = data?.summary;
  const daily = useMemo(() => data?.daily || [], [data?.daily]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const activeDay = useMemo(() => {
    if (!daily.length) return null;
    if (selectedDate) {
      const found = daily.find(d => d.date === selectedDate);
      if (found) return found;
    }
    return daily[daily.length - 1];
  }, [daily, selectedDate]);

  const max = useMemo(() => Math.max(1, ...daily.map(day => day.total)), [daily]);

  if (!data && !daily.length) return null;

  return (
    <View style={styles.trendContainer}>
      {!compact && (
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>ATTENDANCE OVERVIEW</Text>
          <Text style={styles.heroNumber}>{summary?.attendancePercentage ?? 0}%</Text>
          <Text style={styles.selectedText}>Attendance across marked records</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${summary?.attendancePercentage ?? 0}%` }]} />
          </View>
          <Text style={styles.heroLabel}>Half days count as ½ · Unmarked days are excluded</Text>
          <View style={styles.inputs}>
            <View style={styles.field}><Text style={styles.heroStat}>{summary?.totalRecords ?? 0}</Text><Text style={styles.heroLabel}>Records</Text></View>
            <View style={styles.field}><Text style={styles.heroStat}>{summary?.uniqueEmployees ?? 0}</Text><Text style={styles.heroLabel}>Employees</Text></View>
            <View style={styles.field}><Text style={styles.heroStat}>{summary?.halfDay ?? 0}</Text><Text style={styles.heroLabel}>Half days</Text></View>
          </View>
        </View>
      )}

      {/* Modern Daily Attendance Trends Card */}
      <View style={styles.trendCard}>
        {/* Card Header with Icon, Title, and Collapse Toggle */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showTrend ? 'Hide daily trends' : 'Explore daily trends'}
          onPress={() => setShowTrend(prev => !prev)}
          style={styles.trendHeaderPressable}
        >
          <View style={styles.trendHeaderLeft}>
            <View style={styles.trendIconBadge}>
              <Feather name="trending-up" size={18} color={Palette.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trendTitle}>Daily Attendance Trends</Text>
              <Text style={styles.trendSubtitle}>
                {daily.length > 0
                  ? `${daily.length} day${daily.length === 1 ? '' : 's'} tracked · ${summary?.attendancePercentage ?? 0}% avg attendance`
                  : 'Track day-by-day attendance patterns'}
              </Text>
            </View>
          </View>
          <View style={[styles.trendToggleBtn, showTrend && styles.trendToggleBtnActive]}>
            <Text style={[styles.trendToggleBtnText, showTrend && styles.trendToggleBtnTextActive]}>
              {showTrend ? 'Hide trends −' : 'Explore trends +'}
            </Text>
          </View>
        </Pressable>

        {/* Expanded Trends Content */}
        {showTrend && (
          <>
            {daily.length === 0 ? (
              <View style={styles.trendEmptyState}>
                <Feather name="bar-chart-2" size={24} color={Palette.textSecondary} />
                <Text style={styles.trendEmptyText}>No daily records available for this date range.</Text>
              </View>
            ) : (
              <View style={styles.trendBody}>
                {/* Active Day Inspector Card */}
                {activeDay && (
                  <View style={styles.trendInspectorCard}>
                    <View style={styles.trendInspectorHeader}>
                      <View style={styles.trendInspectorDateRow}>
                        <Feather name="calendar" size={13} color={Palette.brandPrimary} />
                        <Text style={styles.trendInspectorDate}>
                          {formatFriendlyDate(activeDay.date, 'EEEE, d MMM yyyy')}
                        </Text>
                      </View>
                      <View style={styles.trendInspectorBadge}>
                        <Text style={styles.trendInspectorBadgeText}>
                          {activeDay.total} {activeDay.total === 1 ? 'employee' : 'employees'}
                        </Text>
                      </View>
                    </View>

                    {/* Breakdown Badges */}
                    <View style={styles.trendInspectorBreakdownRow}>
                      <View style={[styles.trendInspectorPill, { backgroundColor: '#DCFCE7' }]}>
                        <View style={[styles.trendDot, { backgroundColor: Palette.brandPrimary }]} />
                        <Text style={[styles.trendInspectorPillLabel, { color: '#166534' }]}>
                          Present: {activeDay.present}
                        </Text>
                      </View>

                      {activeDay.halfDay > 0 && (
                        <View style={[styles.trendInspectorPill, { backgroundColor: '#FEF3C7' }]}>
                          <View style={[styles.trendDot, { backgroundColor: '#D97706' }]} />
                          <Text style={[styles.trendInspectorPillLabel, { color: '#92400E' }]}>
                            Half day: {activeDay.halfDay}
                          </Text>
                        </View>
                      )}

                      {activeDay.absent > 0 && (
                        <View style={[styles.trendInspectorPill, { backgroundColor: '#FEE2E2' }]}>
                          <View style={[styles.trendDot, { backgroundColor: '#DC2626' }]} />
                          <Text style={[styles.trendInspectorPillLabel, { color: '#991B1B' }]}>
                            Absent: {activeDay.absent}
                          </Text>
                        </View>
                      )}

                      {activeDay.leave > 0 && (
                        <View style={[styles.trendInspectorPill, { backgroundColor: '#E0E7FF' }]}>
                          <View style={[styles.trendDot, { backgroundColor: '#4F46E5' }]} />
                          <Text style={[styles.trendInspectorPillLabel, { color: '#3730A3' }]}>
                            Leave: {activeDay.leave}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Stacked Bar Chart */}
                <View style={styles.chartWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chartScrollContent}
                  >
                    {daily.map((day) => {
                      const isSelected = activeDay?.date === day.date;
                      const dayMax = Math.max(1, max);
                      // Proportional segment heights filling up to 110px
                      const presentH = Math.round((day.present / dayMax) * 105);
                      const halfDayH = Math.round((day.halfDay / dayMax) * 105);
                      const absentH = Math.round((day.absent / dayMax) * 105);
                      const leaveH = Math.round((day.leave / dayMax) * 105);

                      return (
                        <Pressable
                          key={day.date}
                          accessibilityRole="button"
                          accessibilityLabel={`${day.date}: ${day.present} present, ${day.halfDay} half day, ${day.absent} absent, ${day.leave} leave`}
                          onPress={() => setSelectedDate(day.date)}
                          style={[
                            styles.chartColumn,
                            isSelected && styles.chartColumnSelected,
                          ]}
                        >
                          {/* Total count on top */}
                          <View style={[styles.columnCountBadge, isSelected && styles.columnCountBadgeSelected]}>
                            <Text style={[styles.columnCountText, isSelected && styles.columnCountTextSelected]}>
                              {day.total}
                            </Text>
                          </View>

                          {/* Stacked Bar Track */}
                          <View style={[styles.columnTrack, isSelected && styles.columnTrackSelected]}>
                            {day.total === 0 ? (
                              <View style={styles.columnZeroIndicator} />
                            ) : (
                              <>
                                {leaveH > 0 && (
                                  <View
                                    style={[
                                      styles.barSegment,
                                      { height: leaveH, backgroundColor: '#6366F1' },
                                    ]}
                                  />
                                )}
                                {absentH > 0 && (
                                  <View
                                    style={[
                                      styles.barSegment,
                                      { height: absentH, backgroundColor: '#EF4444' },
                                    ]}
                                  />
                                )}
                                {halfDayH > 0 && (
                                  <View
                                    style={[
                                      styles.barSegment,
                                      { height: halfDayH, backgroundColor: '#F59E0B' },
                                    ]}
                                  />
                                )}
                                {presentH > 0 && (
                                  <View
                                    style={[
                                      styles.barSegment,
                                      { height: presentH, backgroundColor: Palette.brandPrimary },
                                    ]}
                                  />
                                )}
                              </>
                            )}
                          </View>

                          {/* Date Label (Day name + Day date) */}
                          <View style={styles.columnDateBlock}>
                            <Text style={[styles.columnDayName, isSelected && styles.columnDateActive]}>
                              {formatFriendlyDate(day.date, 'EEE')}
                            </Text>
                            <Text style={[styles.columnDayDate, isSelected && styles.columnDateActive]}>
                              {formatFriendlyDate(day.date, 'd')}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Legend */}
                <View style={styles.trendLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Palette.brandPrimary }]} />
                    <Text style={styles.legendLabel}>Present</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.legendLabel}>Half day</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.legendLabel}>Absent</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                    <Text style={styles.legendLabel}>Leave</Text>
                  </View>
                </View>
                <Text style={styles.trendHint}>Tap any date to inspect daily breakdown</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Palette.border },
  tab: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { backgroundColor: Palette.brandPrimary, borderBottomColor: Palette.brandPrimary, borderRadius: 10, marginBottom: 4 },
  tabLabel: { color: Palette.textSecondary, fontSize: 14, fontWeight: '500' },
  activeTabLabel: { color: '#FFFFFF', fontWeight: '700' },
  tabPressed: { backgroundColor: Palette.surfaceMuted },
  segmentedTabBar: { borderBottomWidth: 0, backgroundColor: Palette.surfaceMuted, borderRadius: 14, padding: 4, gap: 4 },
  segmentedTab: { minHeight: 42, borderBottomWidth: 0, borderRadius: 11, paddingVertical: 8 },
  segmentedActiveTab: { backgroundColor: Palette.surface, borderBottomColor: 'transparent', marginBottom: 0, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  segmentedTabLabel: { fontSize: 12, fontWeight: '600' },
  segmentedActiveTabLabel: { color: Palette.brandPrimary, fontWeight: '700' },
  card: { padding: 18, borderRadius: 20, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, gap: 10, marginBottom: 16 },
  heading: { color: Palette.textPrimary, fontSize: 17, fontWeight: '700' },
  caption: { color: Palette.textSecondary, fontSize: 12 },
  pills: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  pill: { borderRadius: 24, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Palette.surface, overflow: 'hidden' },
  selected: { backgroundColor: Palette.brandPrimary, borderColor: Palette.brandPrimary, borderRadius: 24, overflow: 'hidden' },
  pillText: { color: Palette.textPrimary, fontSize: 13, fontWeight: '600' },
  selectedText: { color: Palette.textInverse, fontWeight: '600', fontSize: 14 },
  inputs: { flexDirection: 'row', gap: 12 }, field: { flex: 1, gap: 6 },
  input: { padding: 12, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, color: Palette.textPrimary, fontSize: 14 },
  apply: { backgroundColor: Palette.brandPrimary, padding: 14, borderRadius: 12, alignItems: 'center' },
  error: { color: Palette.danger, fontSize: 13 },
  hero: { backgroundColor: Palette.brandPressed, padding: 24, borderRadius: 24, marginBottom: 16, gap: 12 },
  heroLabel: { color: Palette.brandTint, fontSize: 12 }, heroNumber: { color: Palette.textInverse, fontSize: 48, fontWeight: '700' }, heroStat: { color: Palette.textInverse, fontSize: 24, fontWeight: '700' },
  track: { height: 7, borderRadius: 8, backgroundColor: Palette.brandLight, overflow: 'hidden' }, fill: { height: 7, backgroundColor: Palette.brandTint },
  // Modern Trends Component Styles
  trendContainer: { width: '100%' },
  trendCard: { backgroundColor: Palette.surface, borderRadius: 20, borderWidth: 1, borderColor: Palette.border, padding: 16, marginBottom: 16, gap: 14 },
  trendHeaderPressable: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  trendHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  trendIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: Palette.brandTint, alignItems: 'center', justifyContent: 'center' },
  trendTitle: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary, letterSpacing: -0.3 },
  trendSubtitle: { fontSize: 12, color: Palette.textSecondary, marginTop: 2 },
  trendToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: Palette.surfaceMuted, borderWidth: 1, borderColor: Palette.border },
  trendToggleBtnActive: { backgroundColor: Palette.brandPrimary, borderColor: Palette.brandPrimary },
  trendToggleBtnText: { fontSize: 12, fontWeight: '600', color: Palette.brandPrimary },
  trendToggleBtnTextActive: { color: '#FFFFFF' },
  trendBody: { gap: 14 },
  trendEmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
  trendEmptyText: { fontSize: 13, color: Palette.textSecondary, textAlign: 'center' },
  trendInspectorCard: { backgroundColor: Palette.surfaceMuted, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Palette.border, gap: 10 },
  trendInspectorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendInspectorDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendInspectorDate: { fontSize: 13, fontWeight: '700', color: Palette.textPrimary },
  trendInspectorBadge: { backgroundColor: Palette.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: Palette.border },
  trendInspectorBadgeText: { fontSize: 11, fontWeight: '600', color: Palette.textSecondary },
  trendInspectorBreakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  trendInspectorPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  trendInspectorPillLabel: { fontSize: 11, fontWeight: '700' },
  trendDot: { width: 6, height: 6, borderRadius: 3 },
  chartWrapper: { backgroundColor: Palette.surfaceMuted, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, borderWidth: 1, borderColor: Palette.border },
  chartScrollContent: { flexDirection: 'row', gap: 10, paddingHorizontal: 6, alignItems: 'flex-end' },
  chartColumn: { alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 10 },
  chartColumnSelected: { backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  columnCountBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, minWidth: 20, alignItems: 'center' },
  columnCountBadgeSelected: { backgroundColor: Palette.brandTint },
  columnCountText: { fontSize: 11, fontWeight: '600', color: Palette.textSecondary },
  columnCountTextSelected: { color: Palette.brandPrimary, fontWeight: '700' },
  columnTrack: { width: 28, height: 110, backgroundColor: Palette.surface, borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1, borderColor: Palette.border },
  columnTrackSelected: { borderColor: Palette.brandPrimary, borderWidth: 1.5 },
  barSegment: { width: '100%' },
  columnZeroIndicator: { width: 8, height: 2, backgroundColor: Palette.textSecondary, alignSelf: 'center', marginBottom: 4, borderRadius: 1 },
  columnDateBlock: { alignItems: 'center', gap: 1 },
  columnDayName: { fontSize: 10, fontWeight: '500', color: Palette.textSecondary },
  columnDayDate: { fontSize: 11, fontWeight: '700', color: Palette.textPrimary },
  columnDateActive: { color: Palette.brandPrimary, fontWeight: '800' },
  trendLegendRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, flexWrap: 'wrap', paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: '600', color: Palette.textSecondary },
  trendHint: { textAlign: 'center', fontSize: 11, color: Palette.textSecondary, fontStyle: 'italic', marginTop: 2 },
});
