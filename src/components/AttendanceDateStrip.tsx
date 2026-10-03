import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO, isValid, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, startOfMonth, endOfMonth, isWithinInterval, addDays, subDays } from 'date-fns';
import { Palette } from '../constants/colors';
import { useTheme } from '../hooks/use-theme';
import { formatFriendlyDate, formatMonthYear } from '../utils/attendance';
import { AdBanner } from './AdBanner';

export type AttendanceDotStatus = 'ON_TIME' | 'LATE' | 'LEAVE' | 'ABSENT' | 'OFF' | 'PENDING';

export interface AttendanceRecordItem {
  attendanceDate: string;
  status: 'PRESENT' | 'PENDING' | 'NOT_MARKED' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  checkInTime?: string;
  approvedAt?: string;
}

interface AttendanceDateStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  records?: AttendanceRecordItem[];
  getStatusForDate?: (date: string) => AttendanceDotStatus | null;
  onRangeChange?: (range: { startDate: string; endDate: string; label?: string }) => void;
  selectedRange?: { startDate: string; endDate: string; label?: string } | null;
  payCycle?: string | number;
  workingDays?: number;
  initialMonth?: string; // YYYY-MM
  accentColor?: string;
}

export function AttendanceDateStrip({
  selectedDate,
  onSelectDate,
  records = [],
  getStatusForDate,
  onRangeChange,
  selectedRange,
  payCycle,
  workingDays,
  initialMonth,
  accentColor,
}: AttendanceDateStripProps) {
  const { palette, isDark } = useTheme();
  // Current visible base date for the horizontal strip
  const [currentBaseDate, setCurrentBaseDate] = useState(() => {
    try {
      return selectedDate ? parseISO(selectedDate) : new Date();
    } catch {
      return new Date();
    }
  });

  // Range Picker Modal visibility
  const [pickerVisible, setPickerVisible] = useState(false);
  const [internalRange, setInternalRange] = useState<{ startDate: string; endDate: string; label?: string } | null>(
    selectedRange ?? null
  );
  const scrollRef = useRef<ScrollView>(null);

  // Sync internalRange if selectedRange changes externally
  useEffect(() => {
    if (selectedRange !== undefined) {
      setInternalRange(selectedRange);
    }
  }, [selectedRange]);

  // Sync currentBaseDate if selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      try {
        const d = parseISO(selectedDate);
        if (isValid(d)) {
          setCurrentBaseDate(d);
        }
      } catch {
        // keep current
      }
    }
  }, [selectedDate]);

  // Map records by date for fast O(1) status lookup
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecordItem>();
    records.forEach((rec) => {
      if (rec.attendanceDate) {
        map.set(rec.attendanceDate, rec);
      }
    });
    return map;
  }, [records]);

  // Helper to determine dot status
  const resolveStatus = (dateStr: string): AttendanceDotStatus => {
    if (getStatusForDate) {
      const custom = getStatusForDate(dateStr);
      if (custom) return custom;
    }
    const rec = recordMap.get(dateStr);
    if (!rec) {
      // Check if weekend
      try {
        const d = parseISO(dateStr);
        const day = d.getDay();
        if (day === 0 || day === 6) return 'OFF';
      } catch {}
      return 'OFF';
    }

    if (rec.status === 'PRESENT') {
      if (rec.checkInTime) {
        try {
          const d = new Date(rec.checkInTime);
          const hours = d.getHours();
          const minutes = d.getMinutes();
          if (hours > 10 || (hours === 10 && minutes > 0)) {
            return 'LATE';
          }
        } catch {}
      }
      return 'ON_TIME';
    }
    if (rec.status === 'HALF_DAY') {
      return 'LATE';
    }
    if (rec.status === 'LEAVE') {
      return 'LEAVE';
    }
    if (rec.status === 'ABSENT') {
      return 'ABSENT';
    }
    if (rec.status === 'PENDING') {
      return 'PENDING';
    }
    return 'OFF';
  };

  // Generate date strip items for currentBaseDate's month (1st through last day of month)
  const stripDates = useMemo(() => {
    try {
      const start = startOfMonth(currentBaseDate);
      const end = endOfMonth(currentBaseDate);
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [currentBaseDate]);

  // Calculate working days in current month
  const calculatedWorkingDays = useMemo(() => {
    if (typeof workingDays === 'number') return workingDays;
    try {
      const start = startOfMonth(currentBaseDate);
      const end = endOfMonth(currentBaseDate);
      const days = eachDayOfInterval({ start, end });
      return days.filter((d) => d.getDay() !== 0).length; // Monday through Saturday
    } catch {
      return 22;
    }
  }, [currentBaseDate, workingDays]);

  const activePayCycle = payCycle ?? currentBaseDate.getMonth() + 1;
  const monthHeaderTitle = format(currentBaseDate, 'MMMM yyyy');

  // Navigation handlers (step by 7 days or month boundary)
  const handlePrev = () => {
    try {
      const base = selectedDate ? parseISO(selectedDate) : currentBaseDate;
      const nextDate = subDays(base, 7);
      setCurrentBaseDate(nextDate);
      const dateStr = format(nextDate, 'yyyy-MM-dd');
      onSelectDate(dateStr);
    } catch {
      const prevMonth = subMonths(currentBaseDate, 1);
      setCurrentBaseDate(prevMonth);
      onSelectDate(format(prevMonth, 'yyyy-MM-dd'));
    }
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleNext = () => {
    try {
      const base = selectedDate ? parseISO(selectedDate) : currentBaseDate;
      let nextDate = addDays(base, 7);
      const today = new Date();
      if (nextDate > today) nextDate = today;
      setCurrentBaseDate(nextDate);
      const dateStr = format(nextDate, 'yyyy-MM-dd');
      onSelectDate(dateStr);
    } catch {
      const nextMonth = addMonths(currentBaseDate, 1);
      const today = new Date();
      if (nextMonth > today) return;
      setCurrentBaseDate(nextMonth);
      onSelectDate(format(nextMonth, 'yyyy-MM-dd'));
    }
  };

  // Center selected item in scroll
  useEffect(() => {
    if (stripDates.length > 0 && selectedDate) {
      const idx = stripDates.findIndex((d) => format(d, 'yyyy-MM-dd') === selectedDate);
      if (idx >= 0 && scrollRef.current) {
        const itemWidth = 60; // 52 width + 8 margin
        const offset = Math.max(0, idx * itemWidth - 120);
        scrollRef.current.scrollTo({ x: offset, animated: true });
      }
    }
  }, [selectedDate, stripDates]);

  return (
    <View style={[styles.cardContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {/* ─── Top Header Row ─── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {/* Calendar Icon Badge */}
          <View style={[styles.calendarIconBadge, { backgroundColor: isDark ? '#1C2A10' : '#EDF3DF' }]}>
            <Feather name="calendar" size={18} color={palette.brandPrimary} />
          </View>

          {/* Month Title & Subtitle with Chevron */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select date range or month"
            onPress={() => setPickerVisible(true)}
            style={({ pressed }) => [styles.monthTitleWrap, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.monthTitleRow}>
              <Text style={[styles.monthTitleText, { color: palette.textPrimary }]}>{monthHeaderTitle}</Text>
              <Feather name="chevron-down" size={17} color={palette.textPrimary} style={{ marginLeft: 3 }} />
            </View>
            <Text style={[styles.subtitleText, { color: palette.textSecondary }]}>
              {calculatedWorkingDays} Working Days • Pay Cycle #{activePayCycle}
            </Text>
          </Pressable>
        </View>

        {/* Previous & Next Navigation Arrows */}
        <View style={styles.navControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            onPress={handlePrev}
            style={({ pressed }) => [
              styles.navBtn,
              { backgroundColor: isDark ? '#1F2937' : '#F8F9F3', borderColor: palette.border },
              pressed && styles.navBtnPressed,
            ]}
          >
            <Feather name="chevron-left" size={18} color={palette.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            onPress={handleNext}
            style={({ pressed }) => [
              styles.navBtn,
              { backgroundColor: isDark ? '#1F2937' : '#F8F9F3', borderColor: palette.border },
              pressed && styles.navBtnPressed,
            ]}
          >
            <Feather name="chevron-right" size={18} color={palette.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* ─── Horizontal Date Strip ─── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripScrollContent}
        style={styles.stripScrollView}
      >
        {stripDates.map((dayDate) => {
          const dateStr = format(dayDate, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > todayStr;
          const isInRange =
            !isSelected &&
            !isFuture &&
            !!internalRange &&
            !!internalRange.startDate &&
            !!internalRange.endDate &&
            dateStr >= internalRange.startDate &&
            dateStr <= internalRange.endDate;
          const dayName = format(dayDate, 'EEE');
          const dayNumber = format(dayDate, 'd');
          const dotStatus = resolveStatus(dateStr);
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

          return (
            <Pressable
              key={dateStr}
              accessibilityRole="button"
              disabled={isFuture}
              accessibilityLabel={`${dayName}, ${dayNumber} ${isFuture ? 'Future date' : dotStatus}`}
              onPress={() => {
                if (!isFuture) onSelectDate(dateStr);
              }}
              style={({ pressed }) => [
                styles.dayCard,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F9FAF4',
                  borderColor: palette.border,
                },
                isInRange && (isDark ? { backgroundColor: '#1C2A10', borderColor: '#2D4A18' } : styles.dayCardInRange),
                isSelected && styles.dayCardSelected,
                isSelected && {
                  backgroundColor: palette.brandPrimary,
                  borderColor: palette.brandPrimary,
                  shadowColor: palette.brandPrimary,
                },
                !isSelected && !isInRange && isWeekend && (isDark ? { backgroundColor: '#111827' } : styles.dayCardWeekend),
                pressed && !isSelected && !isFuture && styles.dayCardPressed,
                isFuture && { opacity: 0.32 },
              ]}
            >
              {/* Day name (e.g. MON) */}
              <Text
                style={[
                  styles.dayNameText,
                  { color: palette.textSecondary },
                  !isSelected && !isInRange && isWeekend && styles.dayNameWeekend,
                  isInRange && (isDark ? { color: '#A3E635' } : styles.dayNameInRange),
                  isSelected && styles.dayNameSelected,
                  isSelected && { color: '#FFFFFF', fontWeight: '700' },
                ]}
              >
                {dayName}
              </Text>

              {/* Day number (e.g. 21) */}
              <Text
                style={[
                  styles.dayNumberText,
                  { color: palette.textPrimary },
                  isInRange && (isDark ? { color: '#A3E635' } : styles.dayNumberInRange),
                  isSelected && styles.dayNumberSelected,
                  isSelected && { color: '#FFFFFF', fontWeight: '800' },
                ]}
              >
                {dayNumber}
              </Text>

              {/* Status Dot (Hidden for future dates) */}
              {!isFuture && (
                <View
                  style={[
                    styles.statusDot,
                    getDotStyle(dotStatus, isSelected),
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ─── Bottom Status Legend Bar ─── */}
      <View style={[styles.legendBar, { backgroundColor: isDark ? '#1F2937' : '#F8F9F3' }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
          <Text style={[styles.legendLabel, { color: palette.textSecondary }]}>On-Time</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#B45309' }]} />
          <Text style={[styles.legendLabel, { color: palette.textSecondary }]}>Late</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
          <Text style={[styles.legendLabel, { color: palette.textSecondary }]}>Leave</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
          <Text style={[styles.legendLabel, { color: palette.textSecondary }]}>Absent</Text>
        </View>
      </View>

      {/* ─── Full Flow Date Range Picker Modal ─── */}
      <DateRangePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        selectedDate={selectedDate}
        records={records}
        onApplyRange={({ startDate, endDate, label }) => {
          setPickerVisible(false);
          setInternalRange({ startDate, endDate, label });
          if (onRangeChange) {
            onRangeChange({ startDate, endDate, label });
          }
          if (startDate) {
            onSelectDate(startDate);
            try {
              setCurrentBaseDate(parseISO(startDate));
            } catch {}
          }
        }}
      />
    </View>
  );
}

/**
 * Returns dynamic dot styling according to dot status and selection state
 */
function getDotStyle(status: AttendanceDotStatus, isSelected: boolean) {
  if (isSelected) {
    switch (status) {
      case 'ON_TIME':
        return { backgroundColor: '#4ADE80' }; // Bright mint green
      case 'LATE':
        return { backgroundColor: '#FDE047' }; // Bright yellow
      case 'LEAVE':
        return { backgroundColor: '#C084FC' }; // Bright lavender
      case 'ABSENT':
        return { backgroundColor: '#F87171' }; // Bright red
      case 'PENDING':
        return { backgroundColor: '#FBBF24' };
      default:
        return { backgroundColor: 'rgba(255,255,255,0.7)' };
    }
  }

  switch (status) {
    case 'ON_TIME':
      return { backgroundColor: '#16A34A' };
    case 'LATE':
      return { backgroundColor: '#B45309' };
    case 'LEAVE':
      return { backgroundColor: '#8B5CF6' };
    case 'ABSENT':
      return { backgroundColor: '#DC2626' };
    case 'PENDING':
      return { backgroundColor: '#D97706' };
    case 'OFF':
    default:
      return { backgroundColor: '#E2E6D5' };
  }
}

/* ─────────────────────────────────────────────────────────────
 * DATE RANGE PICKER MODAL (Full interactive date range selection)
 * ───────────────────────────────────────────────────────────── */
interface DateRangePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  records: AttendanceRecordItem[];
  onApplyRange: (range: { startDate: string; endDate: string; label?: string }) => void;
}

type PresetKey = 'TODAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

function DateRangePickerModal({
  visible,
  onClose,
  selectedDate,
  records,
  onApplyRange,
}: DateRangePickerModalProps) {
  const { palette, isDark } = useTheme();
  const [activeMonthDate, setActiveMonthDate] = useState(() => {
    try {
      return selectedDate ? parseISO(selectedDate) : new Date();
    } catch {
      return new Date();
    }
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [activePreset, setActivePreset] = useState<PresetKey>('THIS_MONTH');
  const [rangeStart, setRangeStart] = useState<string>(selectedDate || todayStr);
  const [rangeEnd, setRangeEnd] = useState<string>(selectedDate || todayStr);

  // Quick preset handlers
  const handleSelectPreset = (preset: PresetKey) => {
    setActivePreset(preset);
    const now = new Date();
    let s = now;
    let e = now;

    if (preset === 'TODAY') {
      s = now;
      e = now;
    } else if (preset === 'THIS_WEEK') {
      s = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      e = weekEnd > now ? now : weekEnd;
    } else if (preset === 'LAST_WEEK') {
      const prevWeekDay = subDays(now, 7);
      s = startOfWeek(prevWeekDay, { weekStartsOn: 1 });
      e = endOfWeek(prevWeekDay, { weekStartsOn: 1 });
    } else if (preset === 'THIS_MONTH') {
      s = startOfMonth(now);
      e = now;
      setActiveMonthDate(now);
    } else if (preset === 'LAST_MONTH') {
      const lastMonthDate = subMonths(now, 1);
      s = startOfMonth(lastMonthDate);
      e = endOfMonth(lastMonthDate);
      setActiveMonthDate(lastMonthDate);
    }

    setRangeStart(format(s, 'yyyy-MM-dd'));
    setRangeEnd(format(e, 'yyyy-MM-dd'));
  };

  // Calendar cell click handler (handles single-click start and second-click end range)
  const handleDayPress = (dayStr: string) => {
    if (dayStr > todayStr) return; // Future dates cannot be selected
    setActivePreset('CUSTOM');
    if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
      setRangeStart(dayStr);
      setRangeEnd(dayStr);
    } else {
      // If start is after clicked day, swap
      if (dayStr < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(dayStr);
      } else {
        setRangeEnd(dayStr);
      }
    }
  };

  // Days in current month grid
  const monthDays = useMemo(() => {
    try {
      const monthStart = startOfMonth(activeMonthDate);
      const monthEnd = endOfMonth(activeMonthDate);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: gridStart, end: gridEnd });
    } catch {
      return [];
    }
  }, [activeMonthDate]);

  // Count working days in currently selected range
  const rangeWorkingDays = useMemo(() => {
    if (!rangeStart || !rangeEnd) return 0;
    try {
      const days = eachDayOfInterval({ start: parseISO(rangeStart), end: parseISO(rangeEnd) });
      return days.filter((d) => d.getDay() !== 0).length;
    } catch {
      return 1;
    }
  }, [rangeStart, rangeEnd]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <Pressable accessibilityLabel="Close modal" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[modalStyles.sheetCard, { backgroundColor: palette.surface }]}>
          {/* Sheet Header */}
          <View style={modalStyles.sheetHeader}>
            <View style={modalStyles.sheetHeaderTitleRow}>
              <View style={[modalStyles.calendarIconBadge, { backgroundColor: isDark ? '#1C2A10' : '#EDF3DF' }]}>
                <Feather name="calendar" size={17} color={palette.brandPrimary} />
              </View>
              <Text style={[modalStyles.sheetTitle, { color: palette.textPrimary }]}>Select Date Range</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: isDark ? '#1F2937' : '#F8F9F3' }]}>
              <Feather name="x" size={20} color={palette.textPrimary} />
            </Pressable>
          </View>

          {/* Quick Presets Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={modalStyles.presetsRow}>
            {(['THIS_MONTH', 'TODAY', 'THIS_WEEK', 'LAST_WEEK', 'LAST_MONTH'] as PresetKey[]).map((p) => {
              const isActive = activePreset === p;
              const labels: Record<PresetKey, string> = {
                TODAY: 'Today',
                THIS_WEEK: 'This Week',
                LAST_WEEK: 'Last Week',
                THIS_MONTH: 'This Month',
                LAST_MONTH: 'Last Month',
                CUSTOM: 'Custom',
              };
              return (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  onPress={() => handleSelectPreset(p)}
                  style={[
                    modalStyles.presetChip,
                    {
                      backgroundColor: isActive ? palette.brandPrimary : (isDark ? '#1F2937' : '#F8F9F3'),
                      borderColor: isActive ? palette.brandPrimary : palette.border,
                    },
                    isActive && modalStyles.presetChipActive,
                  ]}
                >
                  <Text
                    style={[
                      modalStyles.presetChipText,
                      { color: isActive ? '#FFFFFF' : palette.textSecondary },
                      isActive && modalStyles.presetChipTextActive,
                    ]}
                  >
                    {labels[p]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Month Switcher Header */}
          <View style={modalStyles.monthSwitcherRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveMonthDate((d) => subMonths(d, 1))}
              style={[modalStyles.monthArrowBtn, { backgroundColor: isDark ? '#1F2937' : '#F8F9F3' }]}
            >
              <Feather name="chevron-left" size={18} color={palette.textPrimary} />
            </Pressable>
            <Text style={[modalStyles.activeMonthTitle, { color: palette.textPrimary }]}>{format(activeMonthDate, 'MMMM yyyy')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveMonthDate((d) => addMonths(d, 1))}
              style={[modalStyles.monthArrowBtn, { backgroundColor: isDark ? '#1F2937' : '#F8F9F3' }]}
            >
              <Feather name="chevron-right" size={18} color={palette.textPrimary} />
            </Pressable>
          </View>

          {/* Weekday Labels Row */}
          <View style={modalStyles.weekdaysRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
              <Text key={`${w}-${i}`} style={[modalStyles.weekdayColHeader, { color: palette.textSecondary }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={modalStyles.calendarGrid}>
            {monthDays.map((d, index) => {
              const dayStr = format(d, 'yyyy-MM-dd');
              const isFuture = dayStr > todayStr;
              const isCurrentMonth = isSameMonth(d, activeMonthDate);
              const isMultiDayRange = !!(rangeStart && rangeEnd && rangeStart !== rangeEnd);
              const isStart = dayStr === rangeStart;
              const isEnd = dayStr === rangeEnd;
              const isInRange =
                !isFuture &&
                isMultiDayRange &&
                isWithinInterval(d, {
                  start: parseISO(rangeStart),
                  end: parseISO(rangeEnd),
                });

              return (
                <Pressable
                  key={dayStr}
                  accessibilityRole="button"
                  disabled={isFuture}
                  onPress={() => handleDayPress(dayStr)}
                  style={[
                    modalStyles.dayCell,
                    isInRange && (isDark ? { backgroundColor: '#1C2A10' } : modalStyles.dayCellInRange),
                    isMultiDayRange && isStart && modalStyles.dayCellStart,
                    isMultiDayRange && isEnd && modalStyles.dayCellEnd,
                    isFuture && { opacity: 0.28 },
                  ]}
                >
                  <View
                    style={[
                      modalStyles.dayCellInner,
                      (isStart || isEnd) && { backgroundColor: palette.brandPrimary },
                    ]}
                  >
                    <Text
                      style={[
                        modalStyles.dayCellText,
                        { color: palette.textPrimary },
                        !isCurrentMonth && modalStyles.dayCellTextMuted,
                        (isStart || isEnd) && modalStyles.dayCellTextWhite,
                        (isStart || isEnd) && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {format(d, 'd')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Range Summary & Apply Action */}
          <View style={modalStyles.footerWrap}>
            <View style={[modalStyles.rangeSummaryBox, { backgroundColor: isDark ? '#1F2937' : '#F8F9F3', borderColor: palette.border }]}>
              <Feather name="calendar" size={14} color={palette.brandPrimary} />
              <Text style={[modalStyles.rangeSummaryText, { color: palette.textSecondary }]}>
                {rangeStart === rangeEnd
                  ? formatFriendlyDate(rangeStart, 'd MMM yyyy')
                  : `${formatFriendlyDate(rangeStart, 'd MMM')} – ${formatFriendlyDate(rangeEnd, 'd MMM yyyy')}`}
                {' • '}
                <Text style={{ fontWeight: '700', color: palette.textPrimary }}>
                  {rangeWorkingDays} working day{rangeWorkingDays !== 1 ? 's' : ''}
                </Text>
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onApplyRange({
                  startDate: rangeStart,
                  endDate: rangeEnd,
                  label:
                    rangeStart === rangeEnd
                      ? formatFriendlyDate(rangeStart, 'd MMM yyyy')
                      : `${formatFriendlyDate(rangeStart, 'd MMM')} - ${formatFriendlyDate(rangeEnd, 'd MMM yyyy')}`,
                });
              }}
              style={[modalStyles.applyBtn, { backgroundColor: palette.brandPrimary }]}
            >
              <Text style={modalStyles.applyBtnText}>Apply Selection</Text>
            </Pressable>
          </View>
          <AdBanner position="bottom" safeBottom />
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
 * STYLES
 * ───────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEFE5',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginVertical: 10,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  calendarIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EDF3DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleWrap: {
    flex: 1,
    gap: 2,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2210',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8F9F3',
    borderWidth: 1,
    borderColor: '#ECEFE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPressed: {
    backgroundColor: '#EDF3DF',
  },
  stripScrollView: {
    marginHorizontal: -4,
  },
  stripScrollContent: {
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: 6,
  },
  dayCard: {
    width: 52,
    height: 76,
    borderRadius: 18,
    backgroundColor: '#F9FAF4',
    borderWidth: 1,
    borderColor: '#ECEFE5',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  dayCardWeekend: {
    backgroundColor: '#F4F5EE',
  },
  dayCardPressed: {
    backgroundColor: '#ECEFE5',
  },
  dayCardSelected: {
    backgroundColor: '#5B692D', // Authentic Bizora Olive
    borderColor: '#5B692D',
    shadowColor: '#5B692D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  dayCardInRange: {
    backgroundColor: '#EDF3DF',
    borderColor: '#C6D6A8',
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayNameWeekend: {
    color: '#9CA3AF',
  },
  dayNameSelected: {
    color: '#FFFFFF',
  },
  dayNameInRange: {
    color: '#3B471C',
  },
  dayNumberText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1B2210',
    marginVertical: 1,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  dayNumberInRange: {
    color: '#1B2210',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9F3',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 32, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '92%',
    gap: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EDF3DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2210',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    backgroundColor: '#F8F9F3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#ECEFE5',
  },
  presetChipActive: {
    backgroundColor: '#5B692D',
    borderColor: '#5B692D',
  },
  presetChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthSwitcherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  monthArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8F9F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B2210',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  weekdayColHeader: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInRange: {
    backgroundColor: '#EDF3DF',
  },
  dayCellStart: {
    backgroundColor: '#EDF3DF',
    borderTopLeftRadius: 21,
    borderBottomLeftRadius: 21,
  },
  dayCellEnd: {
    backgroundColor: '#EDF3DF',
    borderTopRightRadius: 21,
    borderBottomRightRadius: 21,
  },
  dayCellInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInnerSelected: {
    backgroundColor: '#5B692D',
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B2210',
  },
  dayCellTextMuted: {
    color: '#9CA3AF',
  },
  dayCellTextWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerWrap: {
    gap: 12,
    marginTop: 6,
  },
  rangeSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9F3',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFE5',
  },
  rangeSummaryText: {
    fontSize: 12.5,
    color: '#4B5563',
  },
  applyBtn: {
    backgroundColor: '#5B692D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#5B692D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
