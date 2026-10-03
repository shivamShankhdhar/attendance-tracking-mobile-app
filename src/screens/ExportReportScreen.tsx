import { AttendanceDataSkeleton } from '../components/AttendanceDataSkeleton';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, {
  Rect,
  Path,
  Circle,
  G,
  Ellipse,
} from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { Palette } from '../constants/colors';
import { AdBanner } from '../components/AdBanner';
import { adMobService } from '../services/adMobService';
import { attendanceApi } from '../services/attendanceApi';
import {
  exportAttendanceReport,
  ExportFormat,
  ExportResult,
} from '../utils/reportExporter';
import { formatFriendlyDate, formatMonthYear } from '../utils/attendance';

interface ExportReportScreenProps {
  workplaceId: string;
  workplaceName?: string;
  initialMonth?: string;
  initialStartDate?: string; initialEndDate?: string; initialStatus?: string; initialEmployeeMemberId?: string;
  onBack: () => void;
}

type RangeMode = 'THIS_MONTH' | 'CUSTOM_RANGE' | 'OTHER_MONTH';

/**
 * Compact, beautifully crafted illustration matching Image 2:
 * Stacked documents with a 3D-styled magnifying glass and sparkles.
 */
function NoAttendanceDataIllustration({ width = 140, height = 96 }: { width?: number; height?: number }) {
  return (
    <View style={styles.illustrationContainer}>
      <Svg width={width} height={height} viewBox="0 0 150 100" fill="none">
        {/* Soft shadow base */}
        <Ellipse cx="75" cy="92" rx="46" ry="6" fill="#E8EEDF" />

        {/* Back Document (tilted soft olive/green) */}
        <G transform="rotate(-12 60 48)">
          <Rect x="30" y="16" width="46" height="60" rx="7" fill="#D3E2C4" />
          <Rect x="37" y="27" width="26" height="3" rx="1.5" fill="#BCD0AC" />
          <Rect x="37" y="35" width="32" height="3" rx="1.5" fill="#BCD0AC" />
          <Rect x="37" y="43" width="22" height="3" rx="1.5" fill="#BCD0AC" />
        </G>

        {/* Front Document (white with crisp rounded corners and subtle shadow border) */}
        <G transform="rotate(4 78 50)">
          <Rect
            x="48"
            y="12"
            width="50"
            height="66"
            rx="8"
            fill="#FFFFFF"
            stroke="#DFE6D6"
            strokeWidth="1.5"
          />
          {/* Header pill indicator */}
          <Rect x="56" y="22" width="22" height="5" rx="2.5" fill="#D5E4C6" />
          {/* Paragraph lines */}
          <Rect x="56" y="33" width="34" height="3.5" rx="1.75" fill="#E2EAD8" />
          <Rect x="56" y="41" width="30" height="3.5" rx="1.75" fill="#E2EAD8" />
          <Rect x="56" y="49" width="32" height="3.5" rx="1.75" fill="#E2EAD8" />
          <Circle cx="60" cy="61" r="2" fill="#C5D7B5" />
        </G>

        {/* Decorative Sparkles & Dotted Trails */}
        <Path
          d="M32 18C32 21 30 23 27 23C30 23 32 25 32 28C32 25 34 23 37 23C34 23 32 21 32 18Z"
          fill="#8CA36E"
        />
        <Path
          d="M112 28C112 30 110 32 107 32C110 32 112 34 112 36C112 34 114 32 116 32C114 32 112 30 112 28Z"
          fill="#8CA36E"
        />
        <Path
          d="M22 38C19 46 29 52 26 60"
          stroke="#A6B990"
          strokeWidth="1.2"
          strokeDasharray="2.5 2.5"
          strokeLinecap="round"
        />
        <Path
          d="M116 50C121 56 114 64 120 70"
          stroke="#A6B990"
          strokeWidth="1.2"
          strokeDasharray="2.5 2.5"
          strokeLinecap="round"
        />

        {/* Magnifying Glass */}
        <Rect
          x="88"
          y="66"
          width="9"
          height="22"
          rx="4"
          transform="rotate(-40 88 66)"
          fill="#48562A"
        />
        <Circle cx="106" cy="84" r="3" fill="#3D4A23" />
        <Circle cx="78" cy="52" r="19" fill="#FFFFFF" stroke="#48562A" strokeWidth="3.8" />
        <Circle cx="78" cy="52" r="15.5" fill="#F4F8EE" fillOpacity="0.88" />
        <Path
          d="M68 45C70 40 77 39 83 40"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

/**
 * Animated searching illustration shown while attendance records are loading.
 */
function SearchingDataIllustration({ width = 130, height = 85 }: { width?: number; height?: number }) {
  return (
    <View style={styles.illustrationContainer}>
      <Svg width={width} height={height} viewBox="0 0 130 85" fill="none">
        {/* Soft base shadow */}
        <Ellipse cx="65" cy="78" rx="42" ry="5" fill="#E8EEDF" />

        {/* Paper Sheet */}
        <Rect
          x="35"
          y="8"
          width="48"
          height="58"
          rx="7"
          fill="#FFFFFF"
          stroke="#DFE6D6"
          strokeWidth="1.5"
        />
        <Rect x="43" y="18" width="20" height="4" rx="2" fill="#D5E4C6" />
        <Rect x="43" y="27" width="30" height="3" rx="1.5" fill="#E2EAD8" />
        <Rect x="43" y="34" width="24" height="3" rx="1.5" fill="#E2EAD8" />
        <Rect x="43" y="41" width="28" height="3" rx="1.5" fill="#E2EAD8" />
        <Rect x="43" y="48" width="18" height="3" rx="1.5" fill="#E2EAD8" />

        {/* Wave rings around magnifying glass */}
        <Circle cx="78" cy="42" r="26" stroke="#8CA36E" strokeWidth="1" strokeDasharray="3 3" opacity={0.4} />
        <Circle cx="78" cy="42" r="20" stroke="#8CA36E" strokeWidth="1.2" strokeDasharray="2 2" opacity={0.7} />

        {/* Magnifying Glass */}
        <Rect
          x="86"
          y="52"
          width="7"
          height="18"
          rx="3.5"
          transform="rotate(-40 86 52)"
          fill="#48562A"
        />
        <Circle cx="100" cy="67" r="2.5" fill="#3D4A23" />
        <Circle cx="76" cy="40" r="16" fill="#FFFFFF" stroke="#48562A" strokeWidth="3" />
        <Circle cx="76" cy="40" r="13" fill="#F4F8EE" fillOpacity="0.88" />
        <Path
          d="M69 34C71 30 76 29 80 30"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function formatShortDateRange(startStr: string, endStr: string): string {
  const formatSingle = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[(m || 1) - 1]} ${y}`;
  };
  return `${formatSingle(startStr)} – ${formatSingle(endStr)}`;
}

function formatPreviewDateRange(startStr: string, endStr: string): string {
  const formatSingle = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[(m || 1) - 1]} ${d}, ${y}`;
  };
  return `${formatSingle(startStr)} – ${formatSingle(endStr)}`;
}

export const ExportReportScreen: React.FC<ExportReportScreenProps> = ({
  workplaceId,
  workplaceName = 'Workplace',
  initialMonth, initialStartDate, initialEndDate, initialStatus, initialEmployeeMemberId,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [exportStatus, setExportStatus] = useState(initialStatus || '');
  const [exportEmployee, setExportEmployee] = useState(initialEmployeeMemberId || '');

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const defaultMonth = initialMonth && initialMonth <= currentMonthStr ? initialMonth : currentMonthStr;

  // State
  const [rangeMode, setRangeMode] = useState<RangeMode>('CUSTOM_RANGE');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('EXCEL');
  const [specificMonth, setSpecificMonth] = useState<string>(defaultMonth);

  // Custom date range state (YYYY-MM-DD)
  const [startDate, setStartDate] = useState<string>(() => {
    if (initialStartDate) return initialStartDate;
    const d = new Date();
    d.setDate(1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    if (initialEndDate) return initialEndDate;
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  // Date picker modal state
  const [datePickerTarget, setDatePickerTarget] = useState<'START' | 'END' | null>(null);

  // Export progress & result modal
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Sync date range when rangeMode changes
  const handleRangeModeChange = (mode: RangeMode) => {
    setRangeMode(mode);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    if (mode === 'THIS_MONTH') {
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${day}`);
    } else if (mode === 'OTHER_MONTH') {
      const targetMonth = specificMonth > currentMonthStr ? currentMonthStr : specificMonth;
      if (targetMonth !== specificMonth) {
        setSpecificMonth(targetMonth);
      }
      const [sy, sm] = targetMonth.split('-').map(Number);
      const lastDay = new Date(sy, sm, 0).getDate();
      setStartDate(`${targetMonth}-01`);
      const endDayStr = targetMonth >= currentMonthStr
        ? todayStr
        : `${targetMonth}-${String(lastDay).padStart(2, '0')}`;
      setEndDate(endDayStr);
    }
  };

  const queryParams = useMemo(() => {
    if (rangeMode === 'THIS_MONTH') {
      return { month: currentMonthStr };
    }
    if (rangeMode === 'OTHER_MONTH') {
      return { month: specificMonth };
    }
    return { startDate, endDate };
  }, [rangeMode, currentMonthStr, specificMonth, startDate, endDate]);

  const periodLabel = useMemo(() => {
    if (rangeMode === 'THIS_MONTH') {
      return formatMonthYear(currentMonthStr);
    }
    if (rangeMode === 'OTHER_MONTH') {
      return formatMonthYear(specificMonth);
    }
    return `${formatFriendlyDate(startDate, 'MMM d, yyyy')} to ${formatFriendlyDate(endDate, 'MMM d, yyyy')}`;
  }, [rangeMode, currentMonthStr, specificMonth, startDate, endDate]);

  // Fetch preview data for the selected range
  const {
    data: reportData,
    isLoading: isPreviewLoading,
    isFetching, isError: isPreviewError, refetch: retryPreview,
  } = useQuery({
    queryKey: ['export-preview', workplaceId, queryParams, exportStatus, exportEmployee],
    queryFn: () => attendanceApi.getReports(workplaceId, { ...queryParams, status: exportStatus || undefined, employeeMemberId: exportEmployee || undefined }),
    enabled: Boolean(workplaceId),
    staleTime: 30000,
  });

  const isSearching = isPreviewLoading || isFetching;
  const recordsCount = reportData?.records?.length ?? 0;
  const hasNoData = !isSearching && !isPreviewError && recordsCount === 0;

  // Preset handlers for Custom Range
  const applyPreset = (preset: 'TODAY' | 'LAST_7' | 'LAST_14' | 'LAST_30') => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    if (preset === 'TODAY') {
      const t = formatDate(today);
      setStartDate(t);
      setEndDate(t);
    } else if (preset === 'LAST_7') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (preset === 'LAST_14') {
      const past = new Date(today);
      past.setDate(past.getDate() - 13);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (preset === 'LAST_30') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    }
  };

  const changeMonth = (offset: number) => {
    if (offset > 0 && specificMonth >= currentMonthStr) {
      return; // Cannot advance to future months
    }
    const [yearStr, monthStr] = specificMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + offset;
    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }
    const newMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    if (offset > 0 && newMonthStr > currentMonthStr) {
      return; // Block future months
    }
    setSpecificMonth(newMonthStr);
    const lastDay = new Date(year, month, 0).getDate();
    setStartDate(`${newMonthStr}-01`);
    const endDayStr = newMonthStr >= currentMonthStr
      ? todayStr
      : `${newMonthStr}-${String(lastDay).padStart(2, '0')}`;
    setEndDate(endDayStr);
  };

  // Preload exactly 1 Rewarded Video Ad when screen opens for instantaneous display
  useEffect(() => {
    adMobService.preloadRewardedAd();
  }, []);

  const handleExport = async () => {
    if (hasNoData) {
      Alert.alert(
        'No Attendance Data',
        'There is no attendance data available for the selected period to export.'
      );
      return;
    }

    if (!reportData) {
      Alert.alert('No Data', 'Unable to retrieve attendance data for the selected period. Please try again.');
      return;
    }

    try {
      setIsExporting(true);

      // Premium Feature: Show 1 Rewarded Video Ad with graceful non-blocking resolution
      await adMobService.showRewardedAdForExport().catch(() => {});

      const result = await exportAttendanceReport({
        workplaceName,
        periodLabel,
        format: selectedFormat,
        data: reportData,
        employeeMemberId: exportEmployee || undefined,
      });

      setExportResult(result);
      if (result.success) {
        setShowSuccessModal(true);
      } else {
        Alert.alert('Export Failed', result.error || 'Could not export file.');
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'An unexpected error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };

  const formattedShortRange = useMemo(() => {
    return formatShortDateRange(startDate, endDate);
  }, [startDate, endDate]);

  const formattedPreviewRange = useMemo(() => {
    return formatPreviewDateRange(startDate, endDate);
  }, [startDate, endDate]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to reports"
        >
          <Feather name="arrow-left" size={20} color={Palette.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Export Report</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{workplaceName}</Text>
        </View>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* SECTION 1: Select Date Range */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Feather name="calendar" size={16} color={Palette.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>1. Select Date Range</Text>
              <Text style={styles.sectionDesc}>Choose the reporting window for attendance</Text>
            </View>
          </View>

          {/* Segmented Control Tabs */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                rangeMode === 'THIS_MONTH' && styles.segmentTabActive,
              ]}
              onPress={() => handleRangeModeChange('THIS_MONTH')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  rangeMode === 'THIS_MONTH' && styles.segmentTabTextActive,
                ]}
              >
                This Month
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                rangeMode === 'CUSTOM_RANGE' && styles.segmentTabActive,
              ]}
              onPress={() => handleRangeModeChange('CUSTOM_RANGE')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  rangeMode === 'CUSTOM_RANGE' && styles.segmentTabTextActive,
                ]}
              >
                Custom Range
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                rangeMode === 'OTHER_MONTH' && styles.segmentTabActive,
              ]}
              onPress={() => handleRangeModeChange('OTHER_MONTH')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  rangeMode === 'OTHER_MONTH' && styles.segmentTabTextActive,
                ]}
              >
                Other Month
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Presets: visible in Custom Range when data exists (Image 1 style) */}
          {rangeMode === 'CUSTOM_RANGE' && !hasNoData && (
            <View style={styles.presetsBlock}>
              <Text style={styles.presetHeading}>Quick Presets</Text>
              <View style={styles.presetsRow}>
                {[
                  { label: 'Today', key: 'TODAY' as const },
                  { label: 'Last 7 Days', key: 'LAST_7' as const },
                  { label: 'Last 14 Days', key: 'LAST_14' as const },
                  { label: 'Last 30 Days', key: 'LAST_30' as const },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.presetChip}
                    onPress={() => applyPreset(item.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetChipText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Start & End Date Inputs */}
          {rangeMode === 'CUSTOM_RANGE' && (
            <View style={styles.dateInputsRow}>
              {/* FROM DATE */}
              <View style={styles.dateInputBox}>
                <Text style={styles.dateInputLabel}>FROM DATE</Text>
                <TouchableOpacity
                  style={styles.dateDisplayRow}
                  onPress={() => setDatePickerTarget('START')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateLeftGroup}>
                    <Feather name="calendar" size={14} color="#526131" style={{ marginRight: 6 }} />
                    <Text style={styles.dateDisplayText}>{startDate}</Text>
                  </View>
                  <Feather name="chevron-down" size={14} color={Palette.textSecondary} />
                </TouchableOpacity>

                {/* Steppers shown in Image 1 */}
                {!hasNoData && (
                  <View style={styles.dateStepperRow}>
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(startDate);
                        d.setDate(d.getDate() - 1);
                        setStartDate(d.toISOString().slice(0, 10));
                      }}
                      style={styles.stepperBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="minus" size={12} color={Palette.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepperSubText}>1 Day</Text>
                    <TouchableOpacity
                      disabled={startDate >= endDate || startDate >= todayStr}
                      onPress={() => {
                        if (startDate >= endDate || startDate >= todayStr) return;
                        const d = new Date(startDate);
                        d.setDate(d.getDate() + 1);
                        const next = d.toISOString().slice(0, 10);
                        if (next <= endDate && next <= todayStr) {
                          setStartDate(next);
                        }
                      }}
                      style={[
                        styles.stepperBtn,
                        (startDate >= endDate || startDate >= todayStr) && styles.stepperBtnDisabled,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="plus"
                        size={12}
                        color={(startDate >= endDate || startDate >= todayStr) ? Palette.border : Palette.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Arrow */}
              <View style={styles.dateInputsSeparator}>
                <Feather name="arrow-right" size={16} color="#9BA590" />
              </View>

              {/* TO DATE */}
              <View style={styles.dateInputBox}>
                <Text style={styles.dateInputLabel}>TO DATE</Text>
                <TouchableOpacity
                  style={styles.dateDisplayRow}
                  onPress={() => setDatePickerTarget('END')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateLeftGroup}>
                    <Feather name="calendar" size={14} color="#526131" style={{ marginRight: 6 }} />
                    <Text style={styles.dateDisplayText}>{endDate}</Text>
                  </View>
                  <Feather name="chevron-down" size={14} color={Palette.textSecondary} />
                </TouchableOpacity>

                {/* Steppers shown in Image 1 */}
                {!hasNoData && (
                  <View style={styles.dateStepperRow}>
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(endDate);
                        d.setDate(d.getDate() - 1);
                        const prev = d.toISOString().slice(0, 10);
                        if (prev >= startDate) {
                          setEndDate(prev);
                        }
                      }}
                      style={styles.stepperBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="minus" size={12} color={Palette.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepperSubText}>1 Day</Text>
                    <TouchableOpacity
                      disabled={endDate >= todayStr}
                      onPress={() => {
                        if (endDate >= todayStr) return;
                        const d = new Date(endDate);
                        d.setDate(d.getDate() + 1);
                        const next = d.toISOString().slice(0, 10);
                        if (next <= todayStr) {
                          setEndDate(next);
                        }
                      }}
                      style={[
                        styles.stepperBtn,
                        endDate >= todayStr && styles.stepperBtnDisabled,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="plus"
                        size={12}
                        color={endDate >= todayStr ? Palette.border : Palette.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* This Month Notice & Date display */}
          {rangeMode === 'THIS_MONTH' && (
            <View style={styles.dateInputsRow}>
              <View style={styles.dateInputBox}>
                <Text style={styles.dateInputLabel}>FROM DATE</Text>
                <View style={styles.dateDisplayRow}>
                  <View style={styles.dateLeftGroup}>
                    <Feather name="calendar" size={14} color="#526131" style={{ marginRight: 6 }} />
                    <Text style={styles.dateDisplayText}>{startDate}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.dateInputsSeparator}>
                <Feather name="arrow-right" size={16} color="#9BA590" />
              </View>
              <View style={styles.dateInputBox}>
                <Text style={styles.dateInputLabel}>TO DATE</Text>
                <View style={styles.dateDisplayRow}>
                  <View style={styles.dateLeftGroup}>
                    <Feather name="calendar" size={14} color="#526131" style={{ marginRight: 6 }} />
                    <Text style={styles.dateDisplayText}>{endDate}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Other Month Switcher */}
          {rangeMode === 'OTHER_MONTH' && (
            <View style={styles.monthPickerContainer}>
              <TouchableOpacity
                onPress={() => changeMonth(-1)}
                style={styles.monthCycleArrow}
                activeOpacity={0.7}
              >
                <Feather name="chevron-left" size={18} color={Palette.textPrimary} />
              </TouchableOpacity>

              <View style={styles.monthCycleCenter}>
                <Text style={styles.monthCycleText}>{formatMonthYear(specificMonth)}</Text>
                <Text style={styles.monthCycleSub}>Period: {startDate} to {endDate}</Text>
              </View>

              <TouchableOpacity
                onPress={() => changeMonth(1)}
                disabled={specificMonth >= currentMonthStr}
                style={[
                  styles.monthCycleArrow,
                  specificMonth >= currentMonthStr && styles.monthCycleArrowDisabled,
                ]}
                activeOpacity={0.7}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={specificMonth >= currentMonthStr ? Palette.border : Palette.textPrimary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SEARCHING STATE: Rendered while attendance data is loading/fetching */}
        {isSearching && (
          <View style={styles.searchingDataCard}>
            <SearchingDataIllustration width={130} height={85} />
            <View style={styles.searchingSpinnerRow}>
              <ActivityIndicator size="small" color="#526131" style={{ marginRight: 8 }} />
              <Text style={styles.searchingTitle}>Searching attendance data…</Text>
            </View>
            <Text style={styles.searchingSub}>
              Checking records and attendance logs for {formattedShortRange}…
            </Text>
          </View>
        )}

        {/* EMPTY STATE: Rendered when search finished and no records found (Image 2) */}
        {!isSearching && hasNoData && (
          <View style={styles.emptyDataCard}>
            <NoAttendanceDataIllustration width={140} height={96} />

            <Text style={styles.emptyTitle}>No attendance data found</Text>
            <Text style={styles.emptySub}>
              There is no attendance data available for the selected date range ({formattedShortRange}).
            </Text>

            <View style={styles.tipsBox}>
              <View style={styles.tipsIconCircle}>
                <Feather name="info" size={13} color="#4A562B" />
              </View>
              <View style={styles.tipsTextColumn}>
                <Text style={styles.tipItem}>• Try selecting a different date range</Text>
                <Text style={styles.tipItem}>• Check if employees have marked attendance</Text>
                <Text style={styles.tipItem}>• Data may take some time to sync</Text>
              </View>
            </View>
          </View>
        )}

        {(exportStatus || exportEmployee) && <View style={styles.sectionCard}><Text style={styles.emptySub}>Active filters: {exportStatus ? exportStatus.replace('_', ' ') : 'All statuses'}{exportEmployee ? ' · Selected employee' : ' · All employees'}</Text><Pressable onPress={() => { setExportStatus(''); setExportEmployee(''); }}><Text style={styles.tipItem}>Clear employee and status filters</Text></Pressable></View>}
        {isPreviewError && <View style={styles.sectionCard}><Text style={styles.emptyTitle}>Unable to load report</Text><Pressable onPress={() => retryPreview()}><Text style={styles.tipItem}>Try again</Text></Pressable></View>}
        {/* SECTION 2: Select File Format (3-Column Grid matching Image 2) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#EEF2FF', borderColor: '#D0DAF5' }]}>
              <Feather name="file-text" size={16} color="#3B5998" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>2. Select File Format</Text>
              <Text style={styles.sectionDesc}>Choose your export document type</Text>
            </View>
          </View>

          {/* 3 Side-by-Side Format Cards */}
          <View style={styles.formatGridRow}>
            {/* Format 1: Excel */}
            <TouchableOpacity
              style={[
                styles.formatGridCard,
                selectedFormat === 'EXCEL' && styles.formatGridCardActive,
              ]}
              onPress={() => setSelectedFormat('EXCEL')}
              activeOpacity={0.8}
            >
              <View style={styles.formatCardTopRow}>
                <View style={[styles.formatIconSquare, { backgroundColor: '#107C41' }]}>
                  <Text style={styles.excelIconText}>X</Text>
                </View>
                <View
                  style={[
                    styles.radioGridOuter,
                    selectedFormat === 'EXCEL' && styles.radioGridOuterActive,
                  ]}
                >
                  {selectedFormat === 'EXCEL' && <View style={styles.radioGridInner} />}
                </View>
              </View>

              <Text style={styles.formatGridTitle}>Excel (.xlsx)</Text>
              <Text style={styles.formatGridSub}>Best for analysis</Text>
            </TouchableOpacity>

            {/* Format 2: PDF */}
            <TouchableOpacity
              style={[
                styles.formatGridCard,
                selectedFormat === 'PDF' && styles.formatGridCardActive,
              ]}
              onPress={() => setSelectedFormat('PDF')}
              activeOpacity={0.8}
            >
              <View style={styles.formatCardTopRow}>
                <View style={[styles.formatIconSquare, { backgroundColor: '#E53935' }]}>
                  <Text style={styles.pdfIconText}>PDF</Text>
                </View>
                <View
                  style={[
                    styles.radioGridOuter,
                    selectedFormat === 'PDF' && styles.radioGridOuterActive,
                  ]}
                >
                  {selectedFormat === 'PDF' && <View style={styles.radioGridInner} />}
                </View>
              </View>

              <Text style={styles.formatGridTitle}>PDF (.pdf)</Text>
              <Text style={styles.formatGridSub}>Print ready report</Text>
            </TouchableOpacity>

            {/* Format 3: CSV */}
            <TouchableOpacity
              style={[
                styles.formatGridCard,
                selectedFormat === 'CSV' && styles.formatGridCardActive,
              ]}
              onPress={() => setSelectedFormat('CSV')}
              activeOpacity={0.8}
            >
              <View style={styles.formatCardTopRow}>
                <View style={[styles.formatIconSquare, { backgroundColor: '#475569' }]}>
                  <MaterialCommunityIcons name="file-delimited-outline" size={15} color="#FFFFFF" />
                </View>
                <View
                  style={[
                    styles.radioGridOuter,
                    selectedFormat === 'CSV' && styles.radioGridOuterActive,
                  ]}
                >
                  {selectedFormat === 'CSV' && <View style={styles.radioGridInner} />}
                </View>
              </View>

              <Text style={styles.formatGridTitle}>CSV (.csv)</Text>
              <Text style={styles.formatGridSub}>For integrations</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DISCLAIMER: Placed in the screen, NOT sticky to bottom */}
        {!isSearching && hasNoData && (
          <View style={styles.screenDisclaimerBox}>
            <View style={styles.warningIconCircle}>
              <Feather name="info" size={13} color="#B45309" />
            </View>
            <Text style={styles.noDataWarningText}>
              Please select a date range with available attendance data to generate a report.
            </Text>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* STICKY BOTTOM SECTION: Ads placed BEFORE the export report button, and Export Report button sticky on the bottom after ads */}
      <View
        style={[
          styles.stickyBottomContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 14 },
        ]}
      >
        {/* 1. Ads sticky at the bottom, placed BEFORE the export report button */}
        <View style={styles.stickyAdSection}>
          <AdBanner position="bottom" safeBottom={false} />
        </View>

        {/* 2. Export Report button sticky on the bottom AFTER ads */}
        <View style={styles.stickyButtonSection}>
          {isSearching ? (
            <View style={styles.sectionCard}>
              <AttendanceDataSkeleton variant="preview" refreshing={!!reportData} />
            </View>
          ) : hasNoData ? (
            <View style={styles.disabledExportBtn}>
              <Feather name="download" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={[styles.disabledExportBtnText, { color: '#FFFFFF' }]}>Export Report</Text>
            </View>
          ) : (
            <View style={styles.floatingPreviewCard}>
              <View style={styles.floatingPreviewLeft}>
                <View style={styles.floatingPreviewIconBadge}>
                  <Feather name="bar-chart-2" size={17} color="#48562A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.floatingPreviewTitle}>Report Preview</Text>
                  <View style={styles.floatingPreviewMetaRow}>
                    <Feather name="calendar" size={11} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text style={styles.floatingPreviewMetaText} numberOfLines={1}>
                      {formattedPreviewRange}
                    </Text>
                  </View>
                  <View style={styles.floatingPreviewMetaRow}>
                    <Feather name="file-text" size={11} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text style={styles.floatingPreviewMetaText} numberOfLines={1}>
                      {selectedFormat === 'EXCEL'
                        ? 'Excel Spreadsheet (.xlsx)'
                        : selectedFormat === 'PDF'
                        ? 'PDF Document (.pdf)'
                        : 'CSV Data File (.csv)'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.floatingExportBtn, isExporting && { opacity: 0.7 }]}
                onPress={handleExport}
                disabled={isExporting}
                activeOpacity={0.85}
              >
                {isExporting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={[styles.floatingExportBtnText, { color: '#FFFFFF' }]}>Preparing...</Text>
                  </View>
                ) : (
                  <>
                    <Feather name="upload" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={[styles.floatingExportBtnText, { color: '#FFFFFF' }]}>Export Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={Boolean(datePickerTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModalContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerHeaderTitle}>
                {datePickerTarget === 'START' ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <TouchableOpacity onPress={() => setDatePickerTarget(null)}>
                <Feather name="x" size={20} color={Palette.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.datePickerCurrentValue}>
              Current: {datePickerTarget === 'START' ? startDate : endDate}
            </Text>

            <View style={styles.modalQuickRow}>
              {[
                { label: '-7d', days: -7 },
                { label: '-1d', days: -1 },
                { label: 'Today', days: 0 },
                { label: '+1d', days: 1 },
                { label: '+7d', days: 7 },
              ].map((btn) => {
                const targetCurrent = datePickerTarget === 'START' ? startDate : endDate;
                const isDisabled = btn.days > 0 && targetCurrent >= todayStr;
                return (
                  <TouchableOpacity
                    key={btn.label}
                    disabled={isDisabled}
                    style={[styles.modalQuickBtn, isDisabled && styles.modalQuickBtnDisabled]}
                    onPress={() => {
                      if (isDisabled) return;
                      const baseDate = new Date(
                        btn.days === 0
                          ? new Date()
                          : targetCurrent
                      );
                      if (btn.days !== 0) {
                        baseDate.setDate(baseDate.getDate() + btn.days);
                      }
                      let formatted = baseDate.toISOString().slice(0, 10);
                      if (formatted > todayStr) {
                        formatted = todayStr;
                      }
                      if (datePickerTarget === 'START') {
                        if (formatted <= endDate) setStartDate(formatted);
                        else {
                          setStartDate(formatted);
                          setEndDate(formatted);
                        }
                      } else {
                        if (formatted >= startDate) setEndDate(formatted);
                        else {
                          setEndDate(formatted);
                          setStartDate(formatted);
                        }
                      }
                    }}
                  >
                    <Text style={[styles.modalQuickBtnText, isDisabled && styles.modalQuickBtnTextDisabled]}>
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setDatePickerTarget(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>

            <AdBanner position="bottom" />
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalSuccessIconBadge}>
              <Feather name="check" size={30} color={Palette.brandPrimary} />
            </View>

            <Text style={styles.modalTitle}>Report Ready!</Text>
            <Text style={styles.modalSubtitle}>
              Your {selectedFormat} attendance report has been generated successfully.
            </Text>

            {exportResult?.filename && (
              <View style={styles.filenameBox}>
                <Feather name="file" size={13} color={Palette.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.filenameText} numberOfLines={1}>
                  {exportResult.filename}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => {
                setShowSuccessModal(false);
                onBack();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </TouchableOpacity>

            <AdBanner position="bottom" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    backgroundColor: Palette.canvas,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  headerRightSpacer: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D4E0C2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  sectionDesc: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceMuted,
    borderRadius: 13,
    padding: 4,
    marginBottom: 14,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: Palette.brandPrimary,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  segmentTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  presetsBlock: {
    marginBottom: 10,
  },
  presetHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 5,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  dateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputBox: {
    flex: 1,
    backgroundColor: Palette.surfaceMuted,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
  },
  dateInputLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 3,
    letterSpacing: 0.4,
  },
  dateDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  dateLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateDisplayText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  dateStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 6,
  },
  stepperBtn: {
    width: 24,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7EF',
  },
  stepperBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#F3F5EC',
  },
  stepperSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  dateInputsSeparator: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAF5',
    borderWidth: 1,
    borderColor: '#DFE5D5',
    borderRadius: 11,
    padding: 8,
  },
  monthCycleArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: '#DFE5D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCycleArrowDisabled: {
    opacity: 0.35,
    backgroundColor: '#F3F5EC',
  },
  monthCycleCenter: {
    alignItems: 'center',
  },
  monthCycleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  monthCycleSub: {
    fontSize: 10.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },

  // Searching state card
  searchingDataCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E9D8',
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchingSpinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  searchingTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  searchingSub: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Empty state card (Image 2)
  emptyDataCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E9D8',
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  tipsBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF4E8',
    borderRadius: 11,
    padding: 10,
    alignItems: 'flex-start',
    width: '100%',
  },
  tipsIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DDE9D1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  tipsTextColumn: {
    flex: 1,
    gap: 3,
  },
  tipItem: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 15,
  },

  // File format selection cards
  formatGridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  formatGridCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
    padding: 12,
    minHeight: 108,
    justifyContent: 'space-between',
  },
  formatGridCardActive: {
    borderColor: Palette.brandPrimary,
    borderWidth: 1.5,
    backgroundColor: Palette.brandTint,
  },
  formatCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  formatIconSquare: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excelIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pdfIconText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  radioGridOuter: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioGridOuterActive: {
    borderColor: Palette.brandPrimary,
  },
  radioGridInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Palette.brandPrimary,
  },
  formatGridTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 1,
  },
  formatGridSub: {
    fontSize: 10.5,
    color: Palette.textSecondary,
    lineHeight: 14,
  },

  // Disclaimer in the screen, NOT sticky
  screenDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE4BE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
    marginBottom: 10,
  },
  warningIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FDE4BE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  noDataWarningText: {
    flex: 1,
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 15,
  },

  // STICKY BOTTOM CONTAINER: Ads before the Export button, and Export button sticky at the very bottom
  stickyBottomContainer: {
    backgroundColor: Palette.canvas,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  stickyAdSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stickyButtonSection: {
    width: '100%',
  },
  disabledExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A8B0A0',
    borderRadius: 13,
    paddingVertical: 13,
  },
  disabledExportBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Floating Preview Pill + Green Export Button
  floatingPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  floatingPreviewLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  floatingPreviewIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  floatingPreviewTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginBottom: 2,
  },
  floatingPreviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingPreviewMetaText: {
    fontSize: 10,
    color: Palette.textSecondary,
    lineHeight: 13,
  },
  floatingExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandPrimary,
    borderRadius: 11,
    paddingHorizontal: 15,
    paddingVertical: 11,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingExportBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 34, 16, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  datePickerModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Palette.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8D8',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  datePickerHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  datePickerCurrentValue: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: 14,
  },
  modalQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  modalQuickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F7EF',
    borderWidth: 1,
    borderColor: '#DFE5D5',
    alignItems: 'center',
  },
  modalQuickBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#EAEFE2',
    borderColor: '#DFE5D5',
  },
  modalQuickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  modalQuickBtnTextDisabled: {
    color: Palette.textMuted,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Palette.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  modalSuccessIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.brandTint,
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  filenameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
    maxWidth: '100%',
  },
  filenameText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  modalPrimaryBtn: {
    width: '100%',
    backgroundColor: '#526131',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
