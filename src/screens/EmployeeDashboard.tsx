import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  RefreshControl,
  Animated,
  Modal,
  Switch,
} from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkplaceClock } from '../hooks/use-workplace-clock';
import { useForeground } from '../hooks/use-foreground';
import { useAuthStore } from '../stores/authStore';
import { useLockStore } from '../stores/lockStore';
import { attendanceApi } from '../services/attendanceApi';
import { Palette } from '../constants/colors';

import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  saveLocalAttendanceState,
  getLocalAttendanceState,
  type LocalDailyAttendanceCache,
} from '../services/storage';
import {
  CalendarClockIllustration,
  DocCheckmarkIllustration,
  EmptyHistoryIllustration,
  PaperPlaneOfflineIllustration,
  OfficeDoorwayIllustration,
} from '../components/illustrations/IllustrationAssets';
import {
  formatTime,
  localDate,
  parseAttendanceQr,
  getFirstAndLastInitials,
  formatFriendlyDate,
  formatMonthYear,
  formatWorkDuration,
} from '../utils/attendance';
import { showError, showSuccess } from '../stores/alertStore';
import { useNotificationStore } from '../stores/notificationStore';
import { AdBanner } from '../components/AdBanner';
import { adMobService } from '../services/adMobService';
import { useTheme } from '../hooks/use-theme';
import { SyncStatusBanner } from '../components/SyncStatusBanner';
import { HeaderBackgroundArt } from '../components/illustrations/HeaderBackgroundArt';
import { AttendanceDateStrip } from '../components/AttendanceDateStrip';
import { HomeHeaderOptions } from '../components/HomeHeaderOptions';
import { BottomTabs, TabItem } from '../components/BottomTabs';
import { HistoryTabIcon, ProfileTabIcon, TodayTabIcon } from '../components/icons/TabIcons';
import { NotificationsModal } from '../components/NotificationsModal';
import { QRScannerBoundingBox, type BarcodeBounds } from '../components/QRScannerBoundingBox';
import { AttendanceSuccessConfetti } from '../components/AttendanceSuccessConfetti';
import { SwipeToActionButton } from '../components/SwipeToActionButton';
import { AttendanceRequestCard } from '../components/AttendanceRequestCard';
import { Avatar } from '../components/Avatar';
import { copyToClipboard } from '../utils/clipboard';
import { WorkplaceJoinQrModal } from '../components/WorkplaceJoinQrModal';

export type EmployeeSubScreen =
  | 'feed'
  | 'scan'
  | 'review-request'
  | 'waiting-approval'
  | 'approved-detail'
  | 'rejected-detail'
  | 'offline';

type EmployeeDashboardTab = 'today' | 'history' | 'profile';

const EMPLOYEE_TABS: TabItem<EmployeeDashboardTab>[] = [
  { key: 'today', label: 'Today', renderIcon: (color, size, active) => <TodayTabIcon color={color} size={size} active={active} /> },
  { key: 'history', label: 'History', renderIcon: (color, size, active) => <HistoryTabIcon color={color} size={size} active={active} /> },
  { key: 'profile', label: 'Profile', renderIcon: (color, size, active) => <ProfileTabIcon color={color} size={size} active={active} /> },
];

export function EmployeeDashboard() {
  const { palette, isDark, toggleTheme } = useTheme();
  const { user, activeWorkplace: workplace, logout } = useAuthStore();
  const client = useQueryClient();

  const hasMpin = useLockStore((s) => s.hasMpin);
  const appLockEnabled = useLockStore((s) => s.appLockEnabled);
  const openSecuritySettings = useLockStore((s) => s.openSecuritySettings);

  const [avatarError, setAvatarError] = useState(false);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [subScreen, setSubScreen] = useState<EmployeeSubScreen>('feed');
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [scannedRequestType, setScannedRequestType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [qrBounds, setQrBounds] = useState<BarcodeBounds | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(true);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  // Suppress App Open ads while camera is actively scanning QR code & reset bounds
  useEffect(() => {
    adMobService.setAppOpenAdSuppressed(subScreen === 'scan');
    if (subScreen === 'scan') {
      setQrBounds(null);
    }
  }, [subScreen]);
  const [torchOn, setTorchOn] = useState(false);
  const [tab, setTab] = useState<EmployeeDashboardTab>('today');

  const scanLocked = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Selected detail record for viewing historical or today's details
  const [selectedDetail, setSelectedDetail] = useState<{
    date: string;
    requestedTime?: string;
    approvedTime?: string;
    checkOutTime?: string;
    workDuration?: string;
  } | null>(null);

  const timezone = workplace?.timezone || 'UTC';
  const now = useWorkplaceClock();
  const today = localDate(timezone, new Date(now));
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(today);
  const [historyRange, setHistoryRange] = useState<{ startDate: string; endDate: string; label?: string } | null>(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [joinQrModalVisible, setJoinQrModalVisible] = useState(false);
  const foreground = useForeground();
  const historyMonth = tab === 'today' ? today.slice(0, 7) : selectedMonth;

  const allowHistory =
    workplace?.attendanceSettings?.allowEmployeeViewHistory !== false &&
    workplace?.allowEmployeeViewHistory !== false;

  useEffect(() => {
    if (!allowHistory && tab === 'history') {
      setTab('today');
      setSubScreen('feed');
    }
  }, [allowHistory, tab]);

  const changeMonth = (offset: number) => {
    const date = new Date(`${selectedMonth}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const scope = ['employee', user?.id, workplace?.workplaceId];

  // Live query for today's request
  const requestQuery = useQuery({
    enabled: foreground && tab === 'today' && !!workplace?.workplaceId,
    queryKey: [...scope, 'request', today],
    queryFn: () => attendanceApi.getMyTodayRequest(workplace!.workplaceId),
    refetchInterval:
      foreground && tab === 'today' && (subScreen === 'feed' || subScreen === 'waiting-approval')
        ? subScreen === 'waiting-approval'
          ? 3000
          : 2000
        : false,
  });


  // History query
  const historyQuery = useQuery({
    enabled: foreground && (tab === 'today' || tab === 'history') && !!workplace?.workplaceId,
    queryKey: [...scope, 'history', historyMonth, historyRange?.startDate, historyRange?.endDate],
    queryFn: () =>
      attendanceApi.getMyHistory(workplace!.workplaceId, {
        month: historyRange ? undefined : historyMonth,
        startDate: historyRange?.startDate,
        endDate: historyRange?.endDate,
      }),
    refetchInterval: foreground && tab === 'today' && subScreen === 'feed' ? 30000 : false,
  });

  const relevantQueries = useMemo(() => {
    return tab === 'today' ? [requestQuery, historyQuery] : [historyQuery];
  }, [tab, requestQuery, historyQuery]);

  const lastSyncTimestamp = useMemo(() => {
    const timestamps = relevantQueries
      .filter((q) => !!q.data && q.dataUpdatedAt > 0)
      .map((q) => q.dataUpdatedAt);
    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  }, [relevantQueries]);

  const hasBackgroundSyncError = useMemo(() => {
    const hasErr = relevantQueries.some((q) => q.isError && !!q.data);
    if (!hasErr) return false;
    // Don't show sync error if data was fetched < 45 seconds ago
    if (lastSyncTimestamp && Date.now() - lastSyncTimestamp < 45_000) {
      return false;
    }
    return true;
  }, [relevantQueries, lastSyncTimestamp]);

  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const handleRetrySync = async () => {
    setIsRetryingSync(true);
    try {
      await Promise.all(
        relevantQueries
          .filter((q) => q.isError)
          .map((q) => q.refetch())
      );
    } finally {
      setIsRetryingSync(false);
    }
  };

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      if (tab === 'today') {
        await Promise.allSettled([requestQuery.refetch(), historyQuery.refetch()]);
      } else if (tab === 'profile') {
        await useAuthStore.getState().refreshProfile();
      } else {
        await historyQuery.refetch();
      }
    } finally {
      setIsPullRefreshing(false);
    }
  };

  const [cachedTodayState, setCachedTodayState] = useState<LocalDailyAttendanceCache | null>(null);

  // Restore today's local attendance state from storage if network is offline or server unreachable
  useEffect(() => {
    let mounted = true;
    if (user?.id && workplace?.workplaceId && today) {
      void getLocalAttendanceState(user.id, workplace.workplaceId, today).then((cached) => {
        if (mounted && cached) {
          setCachedTodayState(cached);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [user?.id, workplace?.workplaceId, today]);

  const record = historyQuery.data?.find((item) => item.attendanceDate === today);
  const reqData = requestQuery.data;

  // Persist fresh attendance state whenever server responds with marked attendance
  useEffect(() => {
    if (!user?.id || !workplace?.workplaceId || !today) return;
    const checkOut = record?.checkOutTime || (reqData as any)?.checkOutTime;
    if (reqData?.status === 'APPROVED' || record?.status === 'PRESENT') {
      const stateToSave: LocalDailyAttendanceCache = {
        status: 'PRESENT',
        checkInTime: record?.checkInTime || (reqData as any)?.checkInTime || reqData?.requestedAt || new Date(now).toISOString(),
        checkOutTime: checkOut,
        savedAt: Date.now(),
        reqData,
        record,
      };
      setCachedTodayState(stateToSave);
      void saveLocalAttendanceState(user.id, workplace.workplaceId, today, stateToSave);
    } else if (reqData?.status === 'PENDING' && reqData?.requestType !== 'CHECK_OUT') {
      const stateToSave: LocalDailyAttendanceCache = {
        status: 'PENDING',
        savedAt: Date.now(),
        reqData,
      };
      setCachedTodayState(stateToSave);
      void saveLocalAttendanceState(user.id, workplace.workplaceId, today, stateToSave);
    }
  }, [reqData, record, user?.id, workplace?.workplaceId, today, now]);

  const [localPendingCheckIn, setLocalPendingCheckIn] = useState(false);
  const [localPendingCheckOut, setLocalPendingCheckOut] = useState(false);

  // Sync local pending flags with incoming query data
  useEffect(() => {
    if (reqData) {
      if (reqData.status !== 'PENDING') {
        setLocalPendingCheckIn(false);
        setLocalPendingCheckOut(false);
      }
    }
  }, [reqData]);

  // Determine current status for today, falling back to local cache if network request fails/server is down
  const isApproved =
    reqData?.status === 'APPROVED' ||
    record?.status === 'PRESENT' ||
    cachedTodayState?.status === 'PRESENT';
  const isPending =
    !isApproved && (reqData?.status === 'PENDING' || cachedTodayState?.status === 'PENDING');
  const isRejected =
    !isApproved && !isPending && (reqData?.status === 'REJECTED' || cachedTodayState?.status === 'REJECTED');

  const checkInTimeStr = record?.checkInTime || (reqData as any)?.checkInTime || cachedTodayState?.checkInTime;
  const checkOutTimeStr = record?.checkOutTime || (reqData as any)?.checkOutTime || cachedTodayState?.checkOutTime;
  const isCheckedOut = Boolean(isApproved && checkOutTimeStr);
  const isCheckOutPending = Boolean(
    isApproved && !isCheckedOut && reqData?.requestType === 'CHECK_OUT' && reqData?.status === 'PENDING'
  );

  const effectiveIsPendingCheckIn =
    localPendingCheckIn ||
    (!isApproved && (reqData?.status === 'PENDING' && reqData?.requestType !== 'CHECK_OUT')) ||
    (!isApproved && cachedTodayState?.status === 'PENDING');

  const effectiveIsPendingCheckOut =
    localPendingCheckOut ||
    (isApproved && !isCheckedOut && reqData?.requestType === 'CHECK_OUT' && reqData?.status === 'PENDING');

  const workDurationText = useMemo(() => {
    if (!checkInTimeStr) return null;
    try {
      let inMs = new Date(checkInTimeStr).getTime();
      if (isNaN(inMs)) {
        const combined = new Date(`${today} ${checkInTimeStr}`);
        inMs = combined.getTime();
      }
      if (isNaN(inMs)) return null;

      let outMs = checkOutTimeStr ? new Date(checkOutTimeStr).getTime() : new Date(now).getTime();
      if (isNaN(outMs) && checkOutTimeStr) {
        const combinedOut = new Date(`${today} ${checkOutTimeStr}`);
        outMs = combinedOut.getTime();
      }
      if (isNaN(outMs) || outMs < inMs) return null;

      const diffMs = outMs - inMs;
      const totalMins = Math.floor(diffMs / 60000);
      if (isNaN(totalMins) || totalMins < 0) return null;

      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      if (isNaN(hours) || isNaN(mins)) return null;

      return `${hours}h ${mins}m`;
    } catch {
      return null;
    }
  }, [checkInTimeStr, checkOutTimeStr, now, today]);

  const breakTimeDisplay = useMemo(() => {
    const rawBreak = (record as any)?.breakTime || (record as any)?.breakDuration || (reqData as any)?.breakDuration;
    if (rawBreak && typeof rawBreak === 'string' && !rawBreak.includes('NaN')) {
      return rawBreak;
    }
    return 'N/A';
  }, [record, reqData]);

  const workingDaysCount = useMemo(() => {
    const presentRecords = (historyQuery.data || []).filter(
      (r) => r.status === 'PRESENT' || !!r.checkInTime
    );
    return Math.max(presentRecords.length + (isApproved ? 1 : 0), 1);
  }, [historyQuery.data, isApproved]);

  const weekDays = useMemo(() => {
    const curr = new Date(now);
    const dayOfWeek = curr.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + mondayOffset);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = localDate(timezone, d);
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({
        dateStr: iso,
        dayNum,
        dayName,
        isToday: iso === today,
      });
    }
    return days;
  }, [now, timezone, today]);

  // Auto-open the relevant accordion: if check-in is done → open check-out; else open check-in
  useEffect(() => {
    if (isApproved) {
      setCheckInOpen(false);
      setCheckOutOpen(true);
    } else {
      setCheckInOpen(true);
      setCheckOutOpen(false);
    }
  }, [isApproved]);

  const [isSubmittingCheckOut, setIsSubmittingCheckOut] = useState(false);

  const handleCheckOutRequest = async () => {
    if (!workplace?.workplaceId || isSubmittingCheckOut) return;
    setIsSubmittingCheckOut(true);
    setLocalPendingCheckOut(true);
    try {
      const res = await attendanceApi.submitDirectAttendanceRequest(workplace.workplaceId, undefined, 'CHECK_OUT');
      client.setQueryData([...scope, 'request', today], {
        id: res?.request?.id || `req_out_${Date.now()}`,
        status: 'PENDING',
        requestType: 'CHECK_OUT',
        requestedAt: new Date().toISOString(),
      });
      await client.invalidateQueries({ queryKey: scope });
      showSuccess('Check-out requested! Waiting for your employer to approve.');
    } catch (err: any) {
      setLocalPendingCheckOut(false);
      showError(err.message || 'Failed to submit check-out request.');
    } finally {
      setIsSubmittingCheckOut(false);
    }
  };

  const startScan = async () => {
    try {
      let currentPerm = await Camera.getCameraPermissionsAsync();
      if (!currentPerm.granted) {
        currentPerm = await Camera.requestCameraPermissionsAsync();
      }
      if (!currentPerm.granted) {
        showError('Camera access is required to scan workplace QR. Please enable it in device settings.');
        return;
      }
      scanLocked.current = false;
      setTorchOn(false);
      setScannedRequestType('CHECK_IN');
      setSubScreen('scan');
    } catch (error: any) {
      showError(error.message || 'Unable to open camera.');
    }
  };

  const startCheckOutScan = async () => {
    try {
      let currentPerm = await Camera.getCameraPermissionsAsync();
      if (!currentPerm.granted) {
        currentPerm = await Camera.requestCameraPermissionsAsync();
      }
      if (!currentPerm.granted) {
        showError('Camera access is required to scan the check-out QR. Please enable it in device settings.');
        return;
      }
      scanLocked.current = false;
      setTorchOn(false);
      setScannedRequestType('CHECK_OUT');
      setSubScreen('scan');
    } catch (error: any) {
      showError(error.message || 'Unable to open camera.');
    }
  };

  // Formatted date string (e.g. "Mon, 28 Sep 2026")
  const dateFormatted = formatFriendlyDate(today, 'EEE, d MMM yyyy');

  // Formatted time string (e.g. "9:04 AM")
  const timeFormatted = formatTime(new Date(now).toISOString(), timezone);

  const initials = getFirstAndLastInitials(user?.name, 'EM');

  // Greeting by hour
  const currentHour = new Date(now).getHours();
  const greeting = currentHour < 12 ? 'Good morning,' : currentHour < 17 ? 'Good afternoon,' : 'Good evening,';

  const handleConfirmRequestAttendance = async () => {
    if (!scannedToken) return;
    setIsSubmittingScan(true);
    try {
      const res = await attendanceApi.submitScanRequest(scannedToken, scannedRequestType);
      setScannedToken(null);
      await client.invalidateQueries({ queryKey: scope });
      if (res?.autoApproved) {
        // QR scan — immediately confirmed, no employer review needed
        setSelectedDetail({
          date: dateFormatted,
          requestedTime: timeFormatted,
        });
        showSuccess(
          scannedRequestType === 'CHECK_OUT'
            ? 'Check-out recorded via QR scan!'
            : 'Attendance recorded via QR scan!'
        );
        setSubScreen('feed');
      } else {
        setSelectedDetail({
          date: dateFormatted,
          requestedTime: timeFormatted,
        });
        setSubScreen('waiting-approval');
      }
    } catch (err: any) {
      const isNetworkOffline =
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('offline') ||
        err.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkOffline) {
        setSubScreen('offline');
      } else {
        showError(err.message || 'Failed to submit attendance request.');
      }
    } finally {
      setIsSubmittingScan(false);
    }
  };

  const handleDirectCheckInRequest = async () => {
    if (!workplace?.workplaceId || isSubmittingDirect) return;
    setIsSubmittingDirect(true);
    setLocalPendingCheckIn(true);
    try {
      const res = await attendanceApi.submitDirectAttendanceRequest(workplace.workplaceId);
      client.setQueryData([...scope, 'request', today], {
        id: res?.request?.id || `req_${Date.now()}`,
        status: 'PENDING',
        requestType: 'CHECK_IN',
        requestedAt: new Date().toISOString(),
      });
      await client.invalidateQueries({ queryKey: scope });
      setSelectedDetail({
        date: dateFormatted,
        requestedTime: timeFormatted,
      });
      showSuccess('Attendance request submitted! Awaiting employer approval.');
      setSubScreen('waiting-approval');
    } catch (err: any) {
      setLocalPendingCheckIn(false);
      const isNetworkOffline =
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('offline') ||
        err.message?.toLowerCase().includes('failed to fetch');
      if (isNetworkOffline) {
        setSubScreen('offline');
      } else {
        showError(err.message || 'Failed to submit attendance request.');
      }
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  // Real-time auto-transition from waiting-approval when approved
  useEffect(() => {
    if (subScreen === 'waiting-approval' && isApproved) {
      showSuccess('Attendance approved by your employer! Marked PRESENT.');
      setSubScreen('feed');
    }
  }, [subScreen, isApproved]);

  // Generate days for history month or selected range in reverse chronological order
  const monthDays = useMemo(() => {
    if (historyRange?.startDate && historyRange?.endDate) {
      try {
        const s = new Date(`${historyRange.startDate}T12:00:00Z`);
        const e = new Date(`${historyRange.endDate}T12:00:00Z`);
        const days: string[] = [];
        const curr = new Date(e);
        while (curr >= s) {
          days.push(curr.toISOString().slice(0, 10));
          curr.setUTCDate(curr.getUTCDate() - 1);
        }
        return days;
      } catch {}
    }

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: string[] = [];

    const isCurrentMonth = today.startsWith(selectedMonth);
    const maxDay = isCurrentMonth ? parseInt(today.slice(8, 10), 10) : daysInMonth;

    for (let d = maxDay; d >= 1; d--) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      days.push(`${selectedMonth}-${dayStr}`);
    }
    return days;
  }, [selectedMonth, today, historyRange]);

  // Generate recent 3 days for Today feed
  const recentDays = useMemo(() => {
    const res: Array<{
      dateStr: string;
      formattedDate: string;
      status: 'PRESENT' | 'PENDING' | 'NOT_MARKED' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
      checkInDisplay: string;
      checkOutDisplay: string;
      totalTimeDisplay: string;
      record?: any;
    }> = [];
    const nowD = new Date(`${today}T12:00:00Z`);

    for (let i = 1; i <= 3; i++) {
      const prev = new Date(nowD.getTime() - i * 86400000);
      const prevDateStr = prev.toISOString().slice(0, 10);
      const rec = historyQuery.data?.find((r) => r.attendanceDate === prevDateStr);
      const isPresent = rec?.status === 'PRESENT';
      const hasOut = !!rec?.checkOutTime;
      const isOngoing = isPresent && !hasOut;

      const checkInDisplay = isPresent && rec?.checkInTime
        ? formatTime(rec.checkInTime, timezone)
        : isPresent
        ? '9:00 AM'
        : '—';

      const checkOutDisplay = hasOut
        ? formatTime(rec.checkOutTime, timezone)
        : isOngoing
        ? 'In Progress'
        : '—';

      const totalTimeDisplay = rec?.checkInTime && rec?.checkOutTime
        ? (formatWorkDuration(rec.checkInTime, rec.checkOutTime) || '—')
        : '—';

      res.push({
        dateStr: prevDateStr,
        formattedDate: formatFriendlyDate(prevDateStr, 'EEE, d MMM'),
        status: (rec?.status as any) || 'NOT_MARKED',
        checkInDisplay,
        checkOutDisplay,
        totalTimeDisplay,
        record: rec,
      });
    }
    return res;
  }, [today, historyQuery.data, timezone]);

  const workplaceDisplayName = workplace?.workplaceName || 'Workplace';

  // -------------------------------------------------------------
  // SCREEN 2: Scan Workplace QR
  // -------------------------------------------------------------
  if (subScreen === 'scan') {
    return (
      <SafeAreaView style={styles.cameraScreenContainer} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {/* Top Header */}
        <View style={styles.cameraHeaderBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => setSubScreen('feed')}
            style={styles.cameraBackBtn}
          >
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.cameraHeaderTitle}>Scan workplace QR</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Viewfinder area */}
        <View style={styles.cameraViewfinderBox}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(result: any) => {
              if (scanLocked.current) return;
              if (result.bounds) {
                setQrBounds(result.bounds);
              }
              scanLocked.current = true;
              try {
                const parsed = parseAttendanceQr(result.data, workplace!.workplaceId);
                setScannedToken(parsed.token);
                setScannedRequestType(parsed.requestType);
                setSubScreen('review-request');
              } catch (error: any) {
                scanLocked.current = false;
                setQrBounds(null);
                showError(error.message || 'Invalid workplace QR code.');
              }
            }}
          />

          {/* Dynamic QR Scanner Bounding Box & Sweeping Laser (Catalin Miron) */}
          <QRScannerBoundingBox
            active={subScreen === 'scan'}
            bounds={qrBounds}
            locked={scanLocked.current}
            accentColor="#06B6D4"
          />

          {/* Torch toggle button */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setTorchOn((prev) => !prev)}
            style={({ pressed }) => [
              styles.torchButton,
              torchOn && styles.torchButtonActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialCommunityIcons
              name={torchOn ? 'flashlight' : 'flashlight-off'}
              size={22}
              color={torchOn ? '#F59E0B' : '#FFFFFF'}
            />
          </Pressable>
        </View>

        {/* Subtitle */}
        <Text style={styles.cameraSubtitle}>Point your camera at the QR code shared by your employer.</Text>

        {/* Bottom active scanner card */}
        <View style={styles.cameraHelperCard}>
          <View style={styles.cameraHelperIconTile}>
            <Feather name="check-circle" size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cameraHelperTitle}>Camera active</Text>
            <Text style={styles.cameraHelperSub}>Point camera directly at the workplace QR code.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 3: Review Attendance Request
  // -------------------------------------------------------------
  if (subScreen === 'review-request') {
    return (
      <SafeAreaView style={styles.screenBg} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={palette.canvas} />
        <View style={styles.navHeaderBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              setSubScreen('feed');
              setScannedToken(null);
            }}
            style={styles.navBackBtn}
          >
            <Feather name="arrow-left" size={22} color={Palette.textPrimary} />
          </Pressable>
          <Text style={styles.navHeaderTitle}>
            {scannedRequestType === 'CHECK_OUT' ? 'Review check-out request' : 'Review attendance request'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.subScreenContent} showsVerticalScrollIndicator={false}>
          {/* Green QR verified banner */}
          <View style={styles.qrVerifiedBanner}>
            <View style={styles.greenCheckCircle}>
              <Feather name="check" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.qrVerifiedTitle}>QR verified</Text>
              <Text style={styles.qrVerifiedSub}>
                {scannedRequestType === 'CHECK_OUT' ? 'Check-out QR is valid.' : 'Check-in QR is valid.'}
              </Text>
            </View>
          </View>

          {/* Verified Items Card */}
          <View style={styles.verifiedCard}>
            {/* Workplace verified row */}
            <View style={styles.verifiedRow}>
              <View style={[styles.verifiedIconTile, { backgroundColor: '#EDF3DF' }]}>
                <MaterialCommunityIcons name="storefront-outline" size={20} color="#5B692D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifiedRowTitle}>Workplace verified</Text>
                <Text style={styles.verifiedRowSub}>{workplaceDisplayName}</Text>
              </View>
              <MaterialCommunityIcons name="check-circle" size={20} color="#16A34A" />
            </View>

            <View style={styles.cardDivider} />

            {/* Network verification row */}
            <View style={styles.verifiedRow}>
              <View style={[styles.verifiedIconTile, { backgroundColor: Palette.pendingTint }]}>
                <Feather name="wifi" size={18} color={Palette.pending} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verifiedRowTitle, { color: Palette.pending }]}>Network not verified</Text>
                <Text style={styles.verifiedRowSub}>You&apos;re not on the workplace network. You can still send the request.</Text>
              </View>
              <MaterialCommunityIcons name="alert-circle" size={20} color={Palette.pending} />
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRowItem}>
              <Feather name="calendar" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Date</Text>
                <Text style={styles.detailRowVal}>{dateFormatted}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRowItem}>
              <Feather name="clock" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Requested time</Text>
                <Text style={styles.detailRowVal}>{timeFormatted}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRowItem}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Workplace</Text>
                <Text style={styles.detailRowVal}>{workplaceDisplayName}</Text>
              </View>
            </View>
          </View>

          {/* Request Button */}
          <Pressable
            accessibilityRole="button"
            disabled={isSubmittingScan}
            onPress={handleConfirmRequestAttendance}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              pressed && { opacity: 0.8 },
              isSubmittingScan && { opacity: 0.7 },
            ]}
          >
            {isSubmittingScan ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryActionBtnText}>
                {scannedRequestType === 'CHECK_OUT' ? 'Confirm check-out' : 'Request attendance'}
              </Text>
            )}
          </Pressable>

          <View style={styles.subtextCalloutRow}>
            <Feather name="info" size={15} color={Palette.textSecondary} style={{ marginTop: 2, marginRight: 8 }} />
            <Text style={styles.subtextCalloutText}>
              {scannedRequestType === 'CHECK_OUT'
                ? 'QR scan verified — your check-out will be recorded instantly.'
                : 'QR scan verified — your attendance will be recorded instantly.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 4: Attendance Request Sent (Waiting for approval)
  // -------------------------------------------------------------
  if (subScreen === 'waiting-approval') {
    const detailDate = selectedDetail?.date || dateFormatted;
    const detailTime = selectedDetail?.requestedTime || (reqData?.requestedAt ? formatTime(reqData.requestedAt, timezone) : timeFormatted);

    return (
      <SafeAreaView style={styles.screenBg} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={palette.canvas} />
        <View style={styles.navHeaderBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => setSubScreen('feed')}
            style={styles.navBackBtn}
          >
            <Feather name="arrow-left" size={22} color={Palette.textPrimary} />
          </Pressable>
          <Text style={styles.navHeaderTitle}>Attendance request sent</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.subScreenContent} showsVerticalScrollIndicator={false}>
          {/* Amber Card: Waiting for employer approval */}
          <View style={styles.amberHeaderCard}>
            <View style={styles.amberHourglassCircle}>
              <MaterialCommunityIcons name="timer-sand" size={24} color="#D97706" />
            </View>
            <Text style={styles.amberCardTitle}>Waiting for employer approval</Text>
            <Text style={styles.amberCardSub}>Your request has been sent.</Text>
          </View>

          {/* Automatic approval status */}
          <View style={styles.waitingApprovalCard}>
            <View style={styles.waitingApprovalAnimBox}>
              <View style={[styles.waitingApprovalCenterCircle, { backgroundColor: '#EDF3DF' }]}>
                <Feather name="clock" size={25} color="#5B692D" />
              </View>
            </View>

            <Text style={styles.waitingApprovalTitle}>Listening for employer approval</Text>
            <Text style={styles.waitingApprovalSub}>
              This screen automatically marks you PRESENT the moment your employer confirms.
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRowItem}>
              <Feather name="calendar" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Date</Text>
                <Text style={styles.detailRowVal}>{detailDate}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRowItem}>
              <Feather name="clock" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Requested at</Text>
                <Text style={styles.detailRowVal}>{detailTime}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRowItem}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Workplace</Text>
                <Text style={styles.detailRowVal}>{workplaceDisplayName}</Text>
              </View>
            </View>
          </View>

          {/* Vertical Stepper */}
          <View style={styles.stepperContainer}>
            {/* Step 1: Request sent */}
            <View style={styles.stepperRow}>
              <View style={styles.stepperColLeft}>
                <View style={styles.stepperDotFilled} />
                <View style={styles.stepperVerticalLine} />
              </View>
              <View style={styles.stepperColRight}>
                <Text style={styles.stepperStepTitle}>
                  Request sent <Text style={styles.stepperStepTime}>- {detailTime}</Text>
                </Text>
                <Text style={styles.stepperStepDesc}>Your attendance request has been sent to your employer.</Text>
              </View>
            </View>

            {/* Step 2: Under review */}
            <View style={styles.stepperRow}>
              <View style={styles.stepperColLeft}>
                <View style={styles.stepperRingActive}>
                  <View style={styles.stepperRingInnerDot} />
                </View>
                <View style={styles.stepperVerticalLine} />
              </View>
              <View style={styles.stepperColRight}>
                <Text style={styles.stepperStepTitle}>Under review</Text>
                <Text style={styles.stepperStepDesc}>Your employer will review your request.</Text>
              </View>
            </View>

            {/* Step 3: Approved */}
            <View style={styles.stepperRow}>
              <View style={styles.stepperColLeft}>
                <View style={styles.stepperDotPending} />
              </View>
              <View style={styles.stepperColRight}>
                <Text style={[styles.stepperStepTitle, { color: '#9CA3AF' }]}>Approved</Text>
                <Text style={styles.stepperStepDesc}>Your attendance will be marked as present after approval.</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Ad Banner on Today feed */}
        <AdBanner position="bottom" />

        {/* Bottom Tabs */}
        {renderBottomBar()}
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 5: Attendance Marked (Approved)
  // -------------------------------------------------------------
  if (subScreen === 'approved-detail') {
    const detailDate = selectedDetail?.date || dateFormatted;
    const reqTime = selectedDetail?.requestedTime || (record?.checkInTime ? formatTime(record.checkInTime, timezone) : timeFormatted);
    const approvedTime = selectedDetail?.approvedTime || (record?.approvedAt ? formatTime(record.approvedAt, timezone) : reqTime);
    const detailCheckOut = selectedDetail?.checkOutTime || checkOutTimeStr;
    const detailDuration = selectedDetail?.workDuration || workDurationText;

    return (
      <SafeAreaView style={styles.screenBg} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={palette.canvas} />
        {/* Celebratory confetti burst (Catalin Miron) */}
        <AttendanceSuccessConfetti count={40} />
        <View style={styles.navHeaderBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => setSubScreen('feed')}
            style={styles.navBackBtn}
          >
            <Feather name="arrow-left" size={22} color={Palette.textPrimary} />
          </Pressable>
          <Text style={styles.navHeaderTitle}>Attendance marked</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.subScreenContent} showsVerticalScrollIndicator={false}>
          {/* Green Card: Present */}
          <View style={styles.greenHeaderCard}>
            <View style={styles.greenCheckLargeCircle}>
              <Feather name="check" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.greenCardTitle}>Present</Text>
            <Text style={styles.greenCardSub}>Your attendance has been approved by your employer.</Text>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRowItem}>
              <Feather name="calendar" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Date</Text>
                <Text style={styles.detailRowVal}>{detailDate}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRowItem}>
              <Feather name="clock" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Check-in requested</Text>
                <Text style={styles.detailRowVal}>{reqTime}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailRowItem}>
              <MaterialCommunityIcons name="check-decagram" size={18} color="#16A34A" style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Approved at</Text>
                <Text style={styles.detailRowVal}>{approvedTime}</Text>
              </View>
            </View>

            {detailCheckOut && (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.detailRowItem}>
                  <Feather name="log-out" size={18} color="#7E22CE" style={{ marginRight: 14 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailRowLabel}>Check-out time</Text>
                    <Text style={styles.detailRowVal}>{formatTime(detailCheckOut, timezone)}</Text>
                  </View>
                </View>
                {detailDuration && (
                  <>
                    <View style={styles.cardDivider} />
                    <View style={styles.detailRowItem}>
                      <Feather name="activity" size={18} color="#059669" style={{ marginRight: 14 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailRowLabel}>Total working duration</Text>
                        <Text style={[styles.detailRowVal, { color: '#059669', fontWeight: '700' }]}>{detailDuration}</Text>
                      </View>
                    </View>
                  </>
                )}
              </>
            )}

            <View style={styles.cardDivider} />

            <View style={styles.detailRowItem}>
              <MaterialCommunityIcons name="storefront-outline" size={18} color={Palette.textSecondary} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowLabel}>Workplace</Text>
                <Text style={styles.detailRowVal}>{workplaceDisplayName}</Text>
              </View>
            </View>
          </View>

          {/* Confirmation Green Pill Box */}
          <View style={styles.confirmationPillBox}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#16A34A" style={{ marginRight: 8 }} />
            <Text style={styles.confirmationPillText}>You are marked present for {detailDate}.</Text>
          </View>
        </ScrollView>

        {/* Ad Banner on Approved Detail */}
        <AdBanner position="bottom" />

        {/* Bottom Tabs */}
        {renderBottomBar()}
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // BOTTOM TAB BAR HELPER
  // -------------------------------------------------------------
  function renderBottomBar() {
    return (
      <BottomTabs
        tabs={EMPLOYEE_TABS.filter(item => item.key !== 'history' || allowHistory)}
        activeTab={tab}
        activeColor="#5B692D"
        activeBgColor="#EDF3DF"
        onSelectTab={selectedTab => {
          setTab(selectedTab);
          setSubScreen('feed');
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // SCREEN 1: MAIN TODAY FEED
  // -------------------------------------------------------------
  if (tab === 'today') {
    return (
      <SafeAreaView style={[styles.screenBg, { backgroundColor: palette.canvas }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={palette.canvas} />
        <SyncStatusBanner
          visible={hasBackgroundSyncError}
          lastSyncedTimestamp={lastSyncTimestamp}
          onRetry={handleRetrySync}
          isRetrying={isRetryingSync}
        />

        {/* ─── Modern Header: Avatar, Employee Name, Gmail & Workplace ─── */}
        <View style={[styles.empModernHeader, { backgroundColor: palette.surface }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View profile"
            onPress={() => {
              setTab('profile');
              setSubScreen('feed');
            }}
            style={styles.empHeaderProfileRow}
          >
            <Avatar name={user?.name} avatarUrl={user?.avatarUrl && !avatarError ? user.avatarUrl : undefined} size="lg" />
            <View style={styles.empHeaderNameCol}>
              <Text style={[styles.empHeaderNameText, { color: palette.textPrimary }]} numberOfLines={1}>
                {user?.name || 'Employee'}
              </Text>
              <View style={[styles.empHeaderMetaRow, { flexWrap: 'wrap', gap: 6, alignItems: 'center' }]}>
                <Text style={[styles.empHeaderWorkplaceText, { color: palette.brandPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                  {workplace?.workplaceName || 'Workplace'}
                </Text>
                {workplace?.workplaceCode ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      if (workplace?.workplaceCode) {
                        void copyToClipboard(workplace.workplaceCode);
                        showSuccess('Workplace code copied');
                      }
                    }}
                    style={[
                      styles.empHeaderCodeBadge,
                      {
                        backgroundColor: isDark ? '#1C2A10' : '#EDF3DF',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Workplace code ${workplace.workplaceCode}`}
                  >
                    <Feather name="hash" size={10} color={palette.brandPrimary} />
                    <Text style={[styles.empHeaderCodeText, { color: palette.brandPrimary }]}>{workplace.workplaceCode}</Text>
                    <Feather name="copy" size={9} color={palette.brandPrimary} />
                  </Pressable>
                ) : null}
                {workplace?.workplaceId && workplace?.workplaceCode ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setJoinQrModalVisible(true);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: isDark ? '#1C2A10' : '#EDF3DF',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: palette.border,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Workplace QR code"
                  >
                    <MaterialCommunityIcons name="qrcode-scan" size={12} color={palette.brandPrimary} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => setNotificationsVisible(true)}
            style={[
              styles.empHeaderBellBtn,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <Feather name="bell" size={20} color={palette.textPrimary} />
            {useNotificationStore.getState().unreadCount > 0 && <View style={styles.empHeaderBellBadge} />}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.empDashboardScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={handlePullRefresh}
              tintColor="#5B692D"
              colors={['#5B692D']}
            />
          }
        >
          {/* ─── Horizontal Calendar Days Strip ─── */}
          <View style={styles.empWeekdaysStrip}>
            {weekDays.map((d) => {
              const isSelected = d.isToday;
              return (
                <Pressable
                  key={d.dateStr}
                  onPress={() => {
                    if (d.dateStr !== today) {
                      setSelectedHistoryDate(d.dateStr);
                      setTab('history');
                    }
                  }}
                  style={[
                    styles.empWeekdayItem,
                    {
                      backgroundColor: isSelected ? palette.brandPrimary : palette.surface,
                      borderColor: isSelected ? palette.brandPrimary : palette.border,
                    },
                    isSelected && styles.empWeekdayItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.empWeekdayNum,
                      { color: isSelected ? '#FFFFFF' : palette.textPrimary },
                      isSelected && styles.empWeekdayNumActive,
                      isSelected && { color: '#FFFFFF' },
                    ]}
                  >
                    {d.dayNum}
                  </Text>
                  <Text
                    style={[
                      styles.empWeekdayName,
                      { color: isSelected ? '#FFFFFF' : palette.textSecondary },
                      isSelected && styles.empWeekdayNameActive,
                      isSelected && { color: '#FFFFFF' },
                    ]}
                  >
                    {d.dayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ─── Section: Today Attendance ─── */}
          <View style={styles.empSectionHeaderRow}>
            <Text style={[styles.empSectionTitle, { color: palette.textPrimary }]}>Today Attendance</Text>
          </View>

          {/* 2x2 Grid of Rounded Cards */}
          <View style={styles.empGridRow}>
            {/* Card 1: Check In */}
            <View style={[styles.empGridCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.empGridIconWrap, { backgroundColor: isDark ? '#1C2A10' : '#EDF3DF' }]}>
                <Feather name="arrow-right" size={18} color={palette.brandPrimary} />
              </View>
              <Text style={[styles.empGridCardLabel, { color: palette.textSecondary }]}>Check In</Text>
              <Text style={[styles.empGridCardValue, { color: palette.textPrimary }]} numberOfLines={1}>
                {checkInTimeStr
                  ? formatTime(checkInTimeStr, timezone)
                  : effectiveIsPendingCheckIn
                  ? 'Pending'
                  : '--:--'}
              </Text>
              <Text style={[
                styles.empGridCardSub,
                { color: isApproved ? (isDark ? '#4ADE80' : '#16A34A') : effectiveIsPendingCheckIn ? (isDark ? '#FBBF24' : '#D97706') : palette.textSecondary }
              ]}>
                {isApproved ? 'On Time' : effectiveIsPendingCheckIn ? 'Awaiting approval' : isRejected ? 'Declined' : 'Not marked'}
              </Text>
            </View>

            {/* Card 2: Check Out */}
            <View style={[styles.empGridCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.empGridIconWrap, { backgroundColor: isDark ? '#2E1065' : '#F5F3FF' }]}>
                <Feather name="arrow-left" size={18} color={isDark ? '#C084FC' : '#7C3AED'} />
              </View>
              <Text style={[styles.empGridCardLabel, { color: palette.textSecondary }]}>Check Out</Text>
              <Text style={[styles.empGridCardValue, { color: palette.textPrimary }]} numberOfLines={1}>
                {isCheckedOut && checkOutTimeStr
                  ? formatTime(checkOutTimeStr, timezone)
                  : effectiveIsPendingCheckOut
                  ? 'Pending'
                  : '--:--'}
              </Text>
              <Text style={[
                styles.empGridCardSub,
                { color: isCheckedOut ? (isDark ? '#C084FC' : '#7C3AED') : effectiveIsPendingCheckOut ? (isDark ? '#FBBF24' : '#D97706') : palette.textSecondary }
              ]}>
                {isCheckedOut
                  ? 'Go Home'
                  : effectiveIsPendingCheckOut
                  ? 'Awaiting approval'
                  : isApproved
                  ? 'Ready'
                  : 'Locked'}
              </Text>
            </View>
          </View>

          <View style={styles.empGridRow}>
            {/* Card 3: Break Time */}
            <View style={[styles.empGridCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.empGridIconWrap, { backgroundColor: isDark ? '#451A03' : '#FFFBEB' }]}>
                <Feather name="coffee" size={18} color={isDark ? '#FBBF24' : '#D97706'} />
              </View>
              <Text style={[styles.empGridCardLabel, { color: palette.textSecondary }]}>Break Time</Text>
              <Text style={[styles.empGridCardValue, { color: palette.textPrimary }]} numberOfLines={1}>
                {breakTimeDisplay}
              </Text>
              <Text style={[styles.empGridCardSub, { color: palette.textSecondary }]}>
                {breakTimeDisplay === 'N/A' ? 'Not available' : 'Recorded'}
              </Text>
            </View>

            {/* Card 4: Total Days */}
            <View style={[styles.empGridCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.empGridIconWrap, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                <Feather name="calendar" size={18} color={isDark ? '#4ADE80' : '#16A34A'} />
              </View>
              <Text style={[styles.empGridCardLabel, { color: palette.textSecondary }]}>Total Days</Text>
              <Text style={[styles.empGridCardValue, { color: palette.textPrimary }]} numberOfLines={1}>
                {workingDaysCount || 28}
              </Text>
              <Text style={[styles.empGridCardSub, { color: palette.textSecondary }]}>
                Working Days
              </Text>
            </View>
          </View>

          {/* ─── Section: Your Activity ─── */}
          <View style={[styles.empSectionHeaderRow, { marginTop: 20 }]}>
            <Text style={[styles.empSectionTitle, { color: palette.textPrimary }]}>Your Activity</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all activity"
              onPress={() => setTab('history')}
            >
              <Text style={[styles.empViewAllText, { color: palette.brandPrimary }]}>View All</Text>
            </Pressable>
          </View>

          {/* Swipe Button: "Swipe to Check In" / "Swipe to Check Out" */}
          <View style={{ marginBottom: 12 }}>
            <SwipeToActionButton
              label={isApproved ? 'Swipe to Check Out' : 'Swipe to Check In'}
              variant={isApproved ? 'checkout' : 'checkin'}
              isCompleted={isCheckedOut}
              isPending={effectiveIsPendingCheckIn || effectiveIsPendingCheckOut}
              pendingText={effectiveIsPendingCheckOut ? 'Check-Out Request Pending' : 'Check-In Request Pending'}
              completedText="Checked Out for Today ✓"
              isLoading={isSubmittingDirect || isSubmittingCheckOut}
              disabled={isCheckedOut || isSubmittingDirect || isSubmittingCheckOut}
              onSwipeSuccess={() => {
                if (!isApproved) {
                  handleDirectCheckInRequest();
                } else if (!isCheckedOut) {
                  handleCheckOutRequest();
                }
              }}
            />
          </View>

          {/* Secondary Quick Options: QR Scan & Attendance History */}
          <View style={styles.empQuickActionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan QR"
              onPress={() => (isApproved ? startCheckOutScan() : startScan())}
              style={({ pressed }) => [
                styles.empQuickActionBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={16} color={palette.brandPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.empQuickActionBtnText, { color: palette.textPrimary }]}>
                {isApproved && !isCheckedOut ? 'Scan Check-Out QR' : 'Scan Check-In QR'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Attendance History"
              onPress={() => setTab('history')}
              style={({ pressed }) => [
                styles.empQuickActionBtn,
                { backgroundColor: palette.surface, borderColor: palette.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="calendar" size={16} color={palette.brandPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.empQuickActionBtnText, { color: palette.textPrimary }]}>View History</Text>
            </Pressable>
          </View>

          {/* Today's Attendance Status Card (Dedicated Employee View) */}
          {(isApproved || effectiveIsPendingCheckIn || effectiveIsPendingCheckOut || isRejected) && (
            <View style={{ marginTop: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View attendance details"
                onPress={() => {
                  if (effectiveIsPendingCheckIn || effectiveIsPendingCheckOut) {
                    setSubScreen('waiting-approval');
                  } else if (isApproved) {
                    setSubScreen('approved-detail');
                  }
                }}
                style={({ pressed }) => [
                  styles.empStatusCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                  pressed && { opacity: 0.94, transform: [{ scale: 0.995 }] },
                ]}
              >
                {/* Left Accent Pill */}
                <View
                  style={[
                    styles.empStatusAccentPill,
                    {
                      backgroundColor: isCheckedOut
                        ? (isDark ? '#C084FC' : '#7C3AED')
                        : isApproved
                        ? palette.brandPrimary
                        : isRejected
                        ? (isDark ? '#F87171' : '#DC2626')
                        : (isDark ? '#FBBF24' : '#D97706'),
                    },
                  ]}
                />

                {/* Header Row */}
                <View style={styles.empStatusHeaderRow}>
                  <View style={styles.empStatusTitleGroup}>
                    <View style={styles.empStatusHeadingWrap}>
                      <View
                        style={[
                          styles.empStatusIconWrap,
                          {
                            backgroundColor: isCheckedOut
                              ? (isDark ? '#2E1065' : '#F5F3FF')
                              : isApproved
                              ? (isDark ? '#1C2A10' : '#EDF3DF')
                              : isRejected
                              ? (isDark ? '#450A0A' : '#FEE2E2')
                              : (isDark ? '#451A03' : '#FEF3C7'),
                          },
                        ]}
                      >
                        <Feather
                          name={
                            isCheckedOut
                              ? 'check-circle'
                              : isApproved
                              ? 'check'
                              : isRejected
                              ? 'x-circle'
                              : 'clock'
                          }
                          size={16}
                          color={
                            isCheckedOut
                              ? (isDark ? '#C084FC' : '#7C3AED')
                              : isApproved
                              ? palette.brandPrimary
                              : isRejected
                              ? (isDark ? '#F87171' : '#DC2626')
                              : (isDark ? '#FBBF24' : '#D97706')
                          }
                        />
                      </View>
                      <Text style={[styles.empStatusTitleText, { color: palette.textPrimary }]}>
                        {isCheckedOut
                          ? 'Shift Completed'
                          : isApproved
                          ? 'Checked In Today'
                          : effectiveIsPendingCheckOut
                          ? 'Check-Out Pending Review'
                          : effectiveIsPendingCheckIn
                          ? 'Check-In Pending Review'
                          : 'Attendance Declined'}
                      </Text>
                    </View>
                    <Text style={[styles.empStatusSubtitleText, { color: palette.textSecondary }]} numberOfLines={1}>
                      {isCheckedOut
                        ? 'You have completed your shift for today'
                        : isApproved
                        ? 'Present and active at work'
                        : effectiveIsPendingCheckOut
                        ? 'Awaiting employer check-out approval'
                        : effectiveIsPendingCheckIn
                        ? 'Awaiting employer check-in approval'
                        : (reqData as any)?.rejectionReason || 'Please contact your employer or try again'}
                    </Text>
                  </View>

                  {/* Status Pill Badge */}
                  <View
                    style={[
                      styles.empStatusBadge,
                      {
                        backgroundColor: isCheckedOut
                          ? (isDark ? '#2E1065' : '#F5F3FF')
                          : isApproved
                          ? (isDark ? '#1C2A10' : '#EDF3DF')
                          : isRejected
                          ? (isDark ? '#450A0A' : '#FEE2E2')
                          : (isDark ? '#451A03' : '#FEF3C7'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.empStatusBadgeText,
                        {
                          color: isCheckedOut
                            ? (isDark ? '#C084FC' : '#7C3AED')
                            : isApproved
                            ? palette.brandPrimary
                            : isRejected
                            ? (isDark ? '#F87171' : '#DC2626')
                            : (isDark ? '#FBBF24' : '#D97706'),
                        },
                      ]}
                    >
                      {isCheckedOut
                        ? 'Checked Out'
                        : isApproved
                        ? 'Present'
                        : isRejected
                        ? 'Declined'
                        : 'Under Review'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={[styles.empStatusDivider, { backgroundColor: palette.border }]} />

                {/* Details Meta Row */}
                <View style={styles.empStatusMetaRow}>
                  <View style={styles.empStatusMetaCol}>
                    <View style={styles.empStatusMetaItem}>
                      <Feather name="arrow-right" size={13} color={palette.brandPrimary} />
                      <Text style={[styles.empStatusMetaLabel, { color: palette.textSecondary }]}>In:</Text>
                      <Text style={[styles.empStatusMetaVal, { color: palette.textPrimary }]}>
                        {checkInTimeStr ? formatTime(checkInTimeStr, timezone) : '--:--'}
                      </Text>
                    </View>
                    {isCheckedOut && (
                      <View style={styles.empStatusMetaItem}>
                        <Feather name="arrow-left" size={13} color={isDark ? '#C084FC' : '#7C3AED'} />
                        <Text style={[styles.empStatusMetaLabel, { color: palette.textSecondary }]}>Out:</Text>
                        <Text style={[styles.empStatusMetaVal, { color: palette.textPrimary }]}>
                          {checkOutTimeStr ? formatTime(checkOutTimeStr, timezone) : '--:--'}
                        </Text>
                      </View>
                    )}
                    {Boolean((reqData as any)?.verification?.qrVerified) && (
                      <View style={styles.empStatusMetaItem}>
                        <MaterialCommunityIcons name="qrcode-scan" size={13} color={palette.brandPrimary} />
                        <Text style={[styles.empStatusMetaLabel, { color: palette.textSecondary }]}>QR Verified</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.empStatusActionCol}>
                    <Text style={[styles.empStatusViewDetailText, { color: palette.brandPrimary }]}>View Details</Text>
                    <Feather name="chevron-right" size={14} color={palette.brandPrimary} />
                  </View>
                </View>
              </Pressable>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        <AdBanner position="bottom" />
        {renderBottomBar()}

        <NotificationsModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 6: ATTENDANCE HISTORY TAB
  // -------------------------------------------------------------
  if (tab === 'history') {
    return (
      <SafeAreaView style={styles.screenBg} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={palette.canvas} />
        <SyncStatusBanner
          visible={hasBackgroundSyncError}
          lastSyncedTimestamp={lastSyncTimestamp}
          onRetry={handleRetrySync}
          isRetrying={isRetryingSync}
        />


        <ScrollView
          contentContainerStyle={styles.mainFeedScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={handlePullRefresh}
              tintColor="#5B692D"
              colors={['#5B692D']}
            />
          }
        >
          <Text style={[styles.historyScreenTitle, { color: palette.textPrimary }]}>Attendance history</Text>

          {/* Date Strip & Interactive Range Picker */}
          <AttendanceDateStrip
            selectedDate={selectedHistoryDate}
            accentColor="#5B692D"
            onSelectDate={(newDate) => {
              setSelectedHistoryDate(newDate);
              const m = newDate.slice(0, 7);
              if (m !== selectedMonth) {
                setSelectedMonth(m);
              }
            }}
            records={historyQuery.data ?? []}
            selectedRange={historyRange}
            onRangeChange={(range) => {
              setHistoryRange(range);
              if (range.startDate) {
                setSelectedHistoryDate(range.startDate);
                const m = range.startDate.slice(0, 7);
                if (m !== selectedMonth) {
                  setSelectedMonth(m);
                }
              }
            }}
          />

          {/* Active Range Pill (if custom range selected) */}
          {historyRange && (
            <View style={[styles.activeRangeFilterBanner, { backgroundColor: isDark ? '#1C2A10' : '#EDF3DF', borderColor: isDark ? '#2D4A18' : '#C6D6A8' }]}>
              <View style={styles.activeRangeFilterLeft}>
                <Feather name="filter" size={14} color={palette.brandPrimary} />
                <Text style={[styles.activeRangeFilterText, { color: isDark ? '#A3E635' : '#3B471C' }]}>
                  Range: {historyRange.label || `${historyRange.startDate} – ${historyRange.endDate}`}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setHistoryRange(null)}
                style={[styles.activeRangeFilterClearBtn, { backgroundColor: palette.surface }]}
              >
                <Feather name="x" size={14} color={palette.textSecondary} />
                <Text style={[styles.activeRangeFilterClearText, { color: palette.textSecondary }]}>Reset</Text>
              </Pressable>
            </View>
          )}

          {/* Selected Day Spotlight Card */}
          {(() => {
            const selectedRec = historyQuery.data?.find((r) => r.attendanceDate === selectedHistoryDate);
            const isTodaySelected = selectedHistoryDate === today;
            const isPresent = selectedRec?.status === 'PRESENT';
            const isPendingRow = isTodaySelected && isPending;
            const isLeave = selectedRec?.status === 'LEAVE';
            const isAbsent = selectedRec?.status === 'ABSENT';
            const dayObj = new Date(`${selectedHistoryDate}T12:00:00Z`);
            const isWeekend = dayObj.getDay() === 0 || dayObj.getDay() === 6;

            const timeDisplay = isPresent && selectedRec?.checkInTime
              ? formatTime(selectedRec.checkInTime, timezone)
              : isPendingRow && reqData?.requestedAt
              ? formatTime(reqData.requestedAt, timezone)
              : undefined;

            return (
              <View style={[styles.selectedDaySpotlightCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.selectedDaySpotlightHeader}>
                  <View style={styles.selectedDaySpotlightTitleWrap}>
                    <Text style={[styles.selectedDaySpotlightDate, { color: palette.textPrimary }]}>
                      {formatFriendlyDate(selectedHistoryDate, 'EEEE, d MMMM yyyy')}
                    </Text>
                    {isTodaySelected && (
                      <View style={[styles.todaySpotlightBadge, { backgroundColor: isDark ? '#1C2A10' : '#EDF3DF' }]}>
                        <Text style={[styles.todaySpotlightBadgeText, { color: palette.brandPrimary }]}>Today</Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.statusPillBadge,
                      isPresent && (isDark ? { backgroundColor: '#0F2918', borderColor: '#1B4D2C' } : styles.statusPillGreen),
                      isPendingRow && (isDark ? { backgroundColor: '#2D1F08', borderColor: '#854D0E' } : styles.statusPillAmber),
                      isLeave && (isDark ? { backgroundColor: '#2E1065', borderColor: '#581C87' } : { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }),
                      isAbsent && (isDark ? { backgroundColor: '#450A0A', borderColor: '#7F1D1D' } : { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }),
                      !isPresent && !isPendingRow && !isLeave && !isAbsent && (isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : styles.statusPillGrey),
                    ]}
                  >
                    <View
                      style={[
                        styles.statusPillDot,
                        isPresent && { backgroundColor: '#16A34A' },
                        isPendingRow && { backgroundColor: '#D97706' },
                        isLeave && { backgroundColor: '#8B5CF6' },
                        isAbsent && { backgroundColor: '#DC2626' },
                        !isPresent && !isPendingRow && !isLeave && !isAbsent && { backgroundColor: '#9CA3AF' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isPresent && { color: isDark ? '#86EFAC' : '#16A34A' },
                        isPendingRow && { color: isDark ? '#FCD34D' : '#D97706' },
                        isLeave && { color: isDark ? '#D8B4FE' : '#8B5CF6' },
                        isAbsent && { color: isDark ? '#FCA5A5' : '#DC2626' },
                        !isPresent && !isPendingRow && !isLeave && !isAbsent && { color: palette.textSecondary },
                      ]}
                    >
                      {isPresent ? 'Present' : isPendingRow ? 'Pending' : isLeave ? 'Leave' : isAbsent ? 'Absent' : isWeekend ? 'Weekend Off' : 'Not Marked'}
                    </Text>
                  </View>
                </View>

                {isPresent ? (
                  <View style={styles.selectedDayDetailsRow}>
                    <View style={styles.selectedDayDetailItem}>
                      <Text style={[styles.selectedDayDetailLabel, { color: palette.textSecondary }]}>Check-in</Text>
                      <Text style={[styles.selectedDayDetailValue, { color: palette.textPrimary }]}>{timeDisplay || '—'}</Text>
                    </View>
                    {selectedRec?.approvedAt && (
                      <View style={styles.selectedDayDetailItem}>
                        <Text style={[styles.selectedDayDetailLabel, { color: palette.textSecondary }]}>Approved</Text>
                        <Text style={[styles.selectedDayDetailValue, { color: palette.textPrimary }]}>{formatTime(selectedRec.approvedAt, timezone)}</Text>
                      </View>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedDetail({
                          date: formatFriendlyDate(selectedHistoryDate, 'EEE, d MMM yyyy'),
                          requestedTime: timeDisplay || '—',
                          approvedTime: selectedRec?.approvedAt ? formatTime(selectedRec.approvedAt, timezone) : timeDisplay,
                        });
                        setSubScreen('approved-detail');
                      }}
                      style={styles.viewPassInlineBtn}
                    >
                      <Text style={[styles.viewPassInlineBtnText, { color: palette.brandPrimary }]}>View pass →</Text>
                    </Pressable>
                  </View>
                ) : isPendingRow ? (
                  <View style={styles.selectedDayDetailsRow}>
                    <View style={styles.selectedDayDetailItem}>
                      <Text style={[styles.selectedDayDetailLabel, { color: palette.textSecondary }]}>Requested at</Text>
                      <Text style={[styles.selectedDayDetailValue, { color: palette.textPrimary }]}>{timeDisplay || '—'}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedDetail({
                          date: formatFriendlyDate(selectedHistoryDate, 'EEE, d MMM yyyy'),
                          requestedTime: timeDisplay || '—',
                        });
                        setSubScreen('waiting-approval');
                      }}
                      style={styles.viewPassInlineBtn}
                    >
                      <Text style={[styles.viewPassInlineBtnText, { color: palette.brandPrimary }]}>Waiting status →</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })()}

          {!allowHistory ? (
            <View style={styles.historyDisabledCard}>
              <MaterialCommunityIcons name="eye-off-outline" size={36} color={Palette.textSecondary} style={{ marginBottom: 10 }} />
              <Text style={styles.historyDisabledTitle}>History is private</Text>
              <Text style={styles.historyDisabledSub}>Your employer has disabled attendance history viewing for this workplace.</Text>
            </View>
          ) : (
            <View style={{ gap: 12, marginBottom: 20 }}>
              {monthDays.map((dayStr) => {
                const rec = historyQuery.data?.find((r) => r.attendanceDate === dayStr);
                const isTodayRow = dayStr === today;
                const isSelectedRow = dayStr === selectedHistoryDate;
                const isPresentRow = rec?.status === 'PRESENT';
                const isPendingRow = isTodayRow && isPending;
                const hasCheckOut = !!rec?.checkOutTime;
                const isOngoing = isPresentRow && !hasCheckOut;

                const checkInDisplay = isPresentRow && rec?.checkInTime
                  ? formatTime(rec.checkInTime, timezone)
                  : isPendingRow && reqData?.requestedAt
                  ? formatTime(reqData.requestedAt, timezone)
                  : '—';

                const checkOutDisplay = hasCheckOut
                  ? formatTime(rec.checkOutTime, timezone)
                  : isOngoing
                  ? 'In Progress'
                  : '—';

                const totalTimeDisplay = rec?.checkInTime && rec?.checkOutTime
                  ? (formatWorkDuration(rec.checkInTime, rec.checkOutTime) || '—')
                  : '—';

                // Status configuration
                let badgeBg = isDark ? '#1E293B' : '#F3F4F6';
                let badgeBorder = isDark ? '#334155' : '#E5E7EB';
                let badgeDot = isDark ? '#94A3B8' : '#9CA3AF';
                let badgeText = isDark ? '#E2E8F0' : '#4B5563';
                let statusLabel = 'Not marked';

                if (isPresentRow) {
                  if (hasCheckOut) {
                    badgeBg = isDark ? '#1C2A10' : '#EDF3DF';
                    badgeBorder = isDark ? '#2D4A18' : '#D2DEC0';
                    badgeDot = palette.brandPrimary;
                    badgeText = isDark ? '#A3E635' : '#40501E';
                    statusLabel = 'Checked Out';
                  } else {
                    badgeBg = isDark ? '#064E3B' : '#ECFDF5';
                    badgeBorder = isDark ? '#059669' : '#A7F3D0';
                    badgeDot = '#10B981';
                    badgeText = isDark ? '#86EFAC' : '#065F46';
                    statusLabel = 'Checked In';
                  }
                } else if (isPendingRow) {
                  badgeBg = isDark ? '#451A03' : '#FFFBEB';
                  badgeBorder = isDark ? '#854D0E' : '#FDE68A';
                  badgeDot = '#F59E0B';
                  badgeText = isDark ? '#FCD34D' : '#92400E';
                  statusLabel = 'Pending';
                } else if (rec?.status === 'ABSENT') {
                  badgeBg = isDark ? '#450A0A' : '#FEF2F2';
                  badgeBorder = isDark ? '#7F1D1D' : '#FECACA';
                  badgeDot = '#EF4444';
                  badgeText = isDark ? '#FCA5A5' : '#991B1B';
                  statusLabel = 'Absent';
                } else if (rec?.status === 'HALF_DAY') {
                  badgeBg = isDark ? '#2E1065' : '#FAF5FF';
                  badgeBorder = isDark ? '#581C87' : '#E9D5FF';
                  badgeDot = '#A855F7';
                  badgeText = isDark ? '#D8B4FE' : '#6B21A8';
                  statusLabel = 'Half Day';
                } else if (rec?.status === 'LEAVE') {
                  badgeBg = isDark ? '#064E3B' : '#F0FDF4';
                  badgeBorder = isDark ? '#059669' : '#BBF7D0';
                  badgeDot = '#22C55E';
                  badgeText = isDark ? '#86EFAC' : '#166534';
                  statusLabel = 'On Leave';
                }

                return (
                  <Pressable
                    key={dayStr}
                    accessibilityRole="button"
                    accessibilityLabel={`Attendance record for ${dayStr}`}
                    onPress={() => {
                      setSelectedHistoryDate(dayStr);
                      if (isPresentRow) {
                        setSelectedDetail({
                          date: formatFriendlyDate(dayStr, 'EEE, d MMM yyyy'),
                          requestedTime: checkInDisplay,
                          approvedTime: rec?.approvedAt ? formatTime(rec.approvedAt, timezone) : checkInDisplay,
                          checkOutTime: rec?.checkOutTime,
                          workDuration: totalTimeDisplay !== '—' ? totalTimeDisplay : undefined,
                        });
                        setSubScreen('approved-detail');
                      } else if (isPendingRow) {
                        setSelectedDetail({
                          date: formatFriendlyDate(dayStr, 'EEE, d MMM yyyy'),
                          requestedTime: checkInDisplay,
                        });
                        setSubScreen('waiting-approval');
                      }
                    }}
                    style={({ pressed }) => [
                      styles.attHistoryCard,
                      {
                        backgroundColor: palette.surface,
                        borderColor: isSelectedRow ? palette.brandPrimary : palette.border,
                      },
                      isSelectedRow && { borderWidth: 1.5 },
                      pressed && styles.attHistoryCardPressed,
                    ]}
                  >
                    {/* Top Row: Date & Status Badge */}
                    <View style={styles.attHistoryCardTopRow}>
                      <View style={styles.attHistoryDateGroup}>
                        <View style={[styles.attHistoryCalIconWrap, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                          <Feather name="calendar" size={13} color={isDark ? '#818CF8' : '#4F46E5'} />
                        </View>
                        <Text style={[styles.attHistoryDateTitle, { color: palette.textPrimary }]}>
                          {formatFriendlyDate(dayStr, 'EEE, d MMM yyyy')}
                        </Text>
                        {isTodayRow && (
                          <View style={[styles.attHistoryTodayTag, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                            <Text style={[styles.attHistoryTodayTagText, { color: isDark ? '#818CF8' : '#4F46E5' }]}>Today</Text>
                          </View>
                        )}
                      </View>

                      <View
                        style={[
                          styles.attHistoryBadgePill,
                          { backgroundColor: badgeBg, borderColor: badgeBorder },
                        ]}
                      >
                        <View style={[styles.attHistoryBadgeDot, { backgroundColor: badgeDot }]} />
                        <Text style={[styles.attHistoryBadgeText, { color: badgeText }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    {/* 3-Column Metrics Card: CHECK IN | CHECK OUT | TOTAL TIME */}
                    <View style={[styles.attHistoryMetricsContainer, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: palette.border }]}>
                      {/* CHECK IN */}
                      <View style={styles.attHistoryMetricCol}>
                        <View style={styles.attHistoryMetricHeaderRow}>
                          <Feather name="log-in" size={11} color="#16A34A" />
                          <Text style={[styles.attHistoryMetricLabel, { color: palette.textSecondary }]}>CHECK IN</Text>
                        </View>
                        <Text style={[styles.attHistoryMetricValue, { color: palette.textPrimary }]} numberOfLines={1}>
                          {checkInDisplay}
                        </Text>
                      </View>

                      {/* Divider */}
                      <View style={[styles.attHistoryMetricDivider, { backgroundColor: palette.border }]} />

                      {/* CHECK OUT */}
                      <View style={styles.attHistoryMetricCol}>
                        <View style={styles.attHistoryMetricHeaderRow}>
                          <Feather name="log-out" size={11} color="#8B5CF6" />
                          <Text style={[styles.attHistoryMetricLabel, { color: palette.textSecondary }]}>CHECK OUT</Text>
                        </View>
                        <Text
                          style={[
                            styles.attHistoryMetricValue,
                            { color: palette.textPrimary },
                            isOngoing && styles.attHistoryOngoingValue,
                          ]}
                          numberOfLines={1}
                        >
                          {checkOutDisplay}
                        </Text>
                      </View>

                      {/* Divider */}
                      <View style={[styles.attHistoryMetricDivider, { backgroundColor: palette.border }]} />

                      {/* TOTAL TIME */}
                      <View style={styles.attHistoryMetricCol}>
                        <View style={styles.attHistoryMetricHeaderRow}>
                          <Feather name="clock" size={11} color="#0284C7" />
                          <Text style={[styles.attHistoryMetricLabel, { color: palette.textSecondary }]}>TOTAL TIME</Text>
                        </View>
                        <Text
                          style={[
                            styles.attHistoryMetricValue,
                            styles.attHistoryTotalTimeValue,
                            isOngoing && styles.attHistoryOngoingValue,
                          ]}
                          numberOfLines={1}
                        >
                          {totalTimeDisplay}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <AdBanner position="bottom" />
        {renderBottomBar()}

        <NotificationsModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 7: EMPLOYEE PROFILE TAB
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.screenBg} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={palette.canvas} />
      {/* Top Header */}
      <View style={styles.mainTopHeader}>
        <HeaderBackgroundArt />
        <Text style={styles.appLogoText}>Bizora</Text>
        <View style={styles.profileHeaderBadge}>
          <Text style={styles.profileHeaderBadgeText}>Profile</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.profileScrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor="#5B692D"
            colors={['#5B692D']}
          />
        }
      >
        {/* Profile Identity Hero Card */}
        <View style={styles.profileHeroCard}>
          <View style={styles.profileAvatarWrapper}>
            {user?.avatarUrl && !avatarError ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.profileHeroAvatar}
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.profileHeroFallback}>
                <Text style={styles.profileHeroInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.profileActiveIndicator}>
              <Feather name="check" size={12} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.profileHeroName}>{user?.name || 'Employee'}</Text>
          <Text style={styles.profileHeroEmail}>{user?.email || 'No email attached'}</Text>

          <View style={styles.profileBadgeRow}>
            <View style={styles.profileRoleBadge}>
              <Feather name="user" size={12} color="#5B692D" />
              <Text style={styles.profileRoleBadgeText}>Employee</Text>
            </View>
            {workplace?.workplaceCode ? (
              <View style={[styles.profileRoleBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Feather name="hash" size={12} color="#16A34A" />
                <Text style={[styles.profileRoleBadgeText, { color: '#16A34A' }]}>{workplace.workplaceCode}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Section 1: Workplace Details */}
        <View style={styles.profileSectionBlock}>
          <Text style={styles.profileSectionTitle}>Workplace</Text>
          <View style={styles.profileSettingsCard}>
            <View style={styles.profileItemRow}>
              <View style={styles.profileItemIconWrap}>
                <Feather name="briefcase" size={16} color="#5B692D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileItemLabel}>Workplace</Text>
                <Text style={styles.profileItemValue}>{workplace?.workplaceName || 'Current Workplace'}</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Section 2: Appearance & Preferences */}
        <View style={styles.profileSectionBlock}>
          <Text style={styles.profileSectionTitle}>App Preferences</Text>
          <View style={styles.profileSettingsCard}>
            <Pressable
              accessibilityRole="button"
              onPress={openSecuritySettings}
              style={({ pressed }) => [styles.profileItemActionRow, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.profileItemIconWrap}>
                <Feather name="shield" size={16} color="#5B692D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileItemLabel}>App Lock & Security</Text>
                <Text style={styles.profileItemSubtext}>
                  {hasMpin ? (appLockEnabled ? 'Active (MPIN / Biometrics)' : 'MPIN configured (unlocked)') : 'Setup 4-digit MPIN or Biometrics'}
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={Palette.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Section 3: About Bizora */}
        <View style={styles.profileSectionBlock}>
          <Text style={styles.profileSectionTitle}>About App</Text>
          <View style={styles.profileSettingsCard}>
            <View style={styles.profileAboutHeaderRow}>
              <View style={styles.profileAboutLogoBox}>
                <Feather name="check-circle" size={22} color="#5B692D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileAboutTitle}>Bizora</Text>
                <Text style={styles.profileAboutVersion}>Version 1.0.0 (Production Release)</Text>
              </View>
            </View>
            <Text style={styles.profileAboutText}>
              Bizora is an effortless digital workplace attendance tracker designed for speed, reliability, and security.
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowLogoutConfirm(true)}
          style={({ pressed }) => [styles.profileLogoutBtn, pressed && { opacity: 0.85 }]}
        >
          <Feather name="log-out" size={17} color={Palette.danger} style={{ marginRight: 8 }} />
          <Text style={styles.profileLogoutBtnText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>

      <AdBanner position="bottom" />
      {renderBottomBar()}



      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Sign Out?"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        isDestructive
        onConfirm={() => {
          setShowLogoutConfirm(false);
          void logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
      <WorkplaceJoinQrModal
        visible={joinQrModalVisible}
        workplaceId={workplace?.workplaceId || ''}
        workplaceName={workplace?.workplaceName || ''}
        onClose={() => setJoinQrModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------
const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  mainTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: Palette.canvas,
    position: 'relative',
    overflow: 'hidden',
  },
  appLogoText: {
    fontSize: 26,
    fontWeight: '900',
    color: Palette.brandPrimary,
    letterSpacing: -0.5,
  },
  avatarTouchArea: {
    padding: 2,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E7E5E4',
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  mainFeedScroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  employeeWorkplaceCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  employeeWorkplaceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  employeeWorkplaceIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeWorkplaceCopy: {
    flex: 1,
    minWidth: 0,
  },
  employeeWorkplaceEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  employeeWorkplaceName: {
    fontSize: 17,
    fontWeight: '700',
  },
  employeeWorkplaceSignedIn: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  employeeWorkplaceSwitch: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeWorkplaceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  employeeWorkplaceCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  employeeWorkplaceCodeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.25,
  },
  employeeWorkplaceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  employeeWorkplaceStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  employeeWorkplaceStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  greetingHeader: {
    marginTop: 8,
    marginBottom: 18,
    padding: 16,
    borderRadius: 22,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  greetingDate: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.brandPrimary,
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  greetingHeadline: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.brandPressed,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },

  // Attendance Main Card
  attendanceMainCard: {
    backgroundColor: Palette.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  statusIconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusClockCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17202A',
  },
  statusCardSub: {
    fontSize: 12.5,
    color: '#78716C',
    marginTop: 3,
  },
  employerNoticeCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Palette.surfaceMuted,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  employerNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#17202A',
    marginBottom: 2,
  },
  employerNoticeText: {
    fontSize: 11.5,
    color: '#78716C',
    lineHeight: 16,
  },
  primaryScanBtn: {
    backgroundColor: Palette.brandPrimary,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryScanBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  secondaryOutlineBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOutlineBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },

  // Recent Days
  recentDaysSection: {
    marginBottom: 20,
  },
  recentDaysHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentDaysTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17202A',
  },
  seeAllBtn: {
    padding: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  attHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE6',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  attHistoryCardPressed: {
    backgroundColor: '#FAF9F6',
    transform: [{ scale: 0.99 }],
  },
  attHistoryCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attHistoryDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  attHistoryCalIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attHistoryDateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  attHistoryTodayTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  attHistoryTodayTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  attHistoryBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  attHistoryBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  attHistoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  attHistoryMetricsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  attHistoryMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  attHistoryMetricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  attHistoryMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  attHistoryMetricValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111827',
  },
  attHistoryTotalTimeValue: {
    color: '#0284C7',
  },
  attHistoryOngoingValue: {
    color: '#D97706',
    fontStyle: 'italic',
  },
  attHistoryMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  recentRowsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  recentDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  recentDayRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  recentDayDate: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#17202A',
  },
  recentDayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusPillGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusPillAmber: {
    backgroundColor: '#FEF3C7',
  },
  statusPillGrey: {
    backgroundColor: '#F3F4F6',
  },
  recentDayTime: {
    fontSize: 12.5,
    color: '#78716C',
    minWidth: 55,
    textAlign: 'right',
  },

  // Navigation Header Bar (Screens 2, 3, 4, 5)
  navHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Palette.canvas,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  navBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17202A',
  },
  subScreenContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Screen 2: Camera View
  cameraScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#000000',
  },
  cameraBackBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraViewfinderBox: {
    height: 380,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  cameraReticleOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraReticleFrame: {
    width: 220,
    height: 220,
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FFFFFF',
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 12,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 12,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 12,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 12,
  },
  torchButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  torchButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  cameraSubtitle: {
    fontSize: 13,
    color: '#D6D3D1',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  cameraHelperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 14,
    gap: 12,
  },
  cameraHelperIconTile: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHelperTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#17202A',
  },
  cameraHelperSub: {
    fontSize: 11.5,
    color: '#78716C',
    marginTop: 2,
    lineHeight: 16,
  },

  // Screen 3: Review Request
  qrVerifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  greenCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrVerifiedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  qrVerifiedSub: {
    fontSize: 12,
    color: '#16A34A',
    marginTop: 1,
  },
  verifiedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEA',
    padding: 14,
    marginBottom: 16,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  verifiedIconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17202A',
  },
  verifiedRowSub: {
    fontSize: 11.5,
    color: '#78716C',
    marginTop: 2,
    lineHeight: 16,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  detailRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailRowLabel: {
    fontSize: 12,
    color: '#8A8582',
    marginBottom: 2,
  },
  detailRowVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17202A',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Palette.border,
  },
  primaryActionBtn: {
    backgroundColor: '#5B692D',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  subtextCalloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  subtextCalloutText: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 17,
  },

  // Screen 4: Waiting for Approval
  amberHeaderCard: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  amberHourglassCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  amberCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17202A',
  },
  amberCardSub: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 4,
  },

  // Stepper
  stepperContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEA',
    padding: 18,
    marginBottom: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    minHeight: 68,
  },
  stepperColLeft: {
    alignItems: 'center',
    width: 26,
    marginRight: 12,
  },
  stepperDotFilled: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#5B692D',
    marginTop: 4,
  },
  stepperVerticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E7E5E4',
    marginVertical: 4,
  },
  stepperRingActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#5B692D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  stepperRingInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5B692D',
  },
  stepperDotPending: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D6D3D1',
    marginTop: 4,
  },
  stepperColRight: {
    flex: 1,
    paddingBottom: 16,
  },
  stepperStepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#17202A',
  },
  stepperStepTime: {
    fontWeight: '400',
    color: '#78716C',
  },
  stepperStepDesc: {
    fontSize: 11.5,
    color: '#78716C',
    marginTop: 2,
    lineHeight: 16,
  },

  // Screen 5: Approved Details
  greenHeaderCard: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  greenCheckLargeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  greenCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
  },
  greenCardSub: {
    fontSize: 13,
    color: '#16A34A',
    marginTop: 4,
  },
  confirmationPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  confirmationPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803D',
  },

  // Screen 6: Attendance History
  historyScreenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17202A',
    marginTop: 10,
    marginBottom: 14,
  },
  activeRangeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDF3DF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6D6A8',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  activeRangeFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  activeRangeFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B471C',
  },
  activeRangeFilterClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  activeRangeFilterClearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  selectedDaySpotlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEFE5',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    gap: 10,
  },
  selectedDaySpotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedDaySpotlightTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedDaySpotlightDate: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1B2210',
  },
  todaySpotlightBadge: {
    backgroundColor: '#EDF3DF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todaySpotlightBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#5B692D',
  },
  selectedDayDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9F3',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  selectedDayDetailItem: {
    gap: 1,
  },
  selectedDayDetailLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedDayDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2210',
  },
  viewPassInlineBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#5B692D',
  },
  viewPassInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyListCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  historyDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  historyDisabledCard: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 30,
    marginTop: 10,
  },
  historyDisabledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17202A',
    marginBottom: 6,
  },
  historyDisabledSub: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Direct check-in request without scanning styles
  directRequestDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 12,
  },
  directRequestDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  directRequestDividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.textSecondary,
    letterSpacing: 1.2,
  },
  secondaryDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: Palette.brandPressed,
    borderRadius: 16,
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryDirectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  directRequestHelpSubtext: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },

  // Employee Profile Tab Styles
  profileHeaderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EDF3DF',
    borderRadius: 12,
  },
  profileHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B692D',
  },
  profileScrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeroCard: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  profileAvatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  profileHeroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#5B692D',
  },
  profileHeroFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDF3DF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5B692D',
  },
  profileHeroInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5B692D',
  },
  profileActiveIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileHeroName: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginBottom: 3,
  },
  profileHeroEmail: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: 14,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EDF3DF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D2DEC0',
  },
  profileRoleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B692D',
  },

  profileSectionBlock: {
    marginBottom: 20,
  },
  profileSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  profileSettingsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  profileItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  profileItemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  profileItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EDF3DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  profileItemValue: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  profileItemSubtext: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  profileItemDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 64,
  },

  profileAboutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  profileAboutLogoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAboutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  profileAboutVersion: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  profileAboutText: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  profileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  profileLogoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.danger,
  },

  // Approval status card
  waitingApprovalCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  waitingApprovalAnimBox: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  waitingApprovalCenterCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingApprovalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  waitingApprovalSub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  // Modern Employee Dashboard (Screenshot 16.41.33)
  empModernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  empHeaderProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  empHeaderNameCol: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  empHeaderNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  empHeaderEmailText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  empHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'nowrap',
  },
  empHeaderWorkplaceText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#5B692D',
    flexShrink: 1,
  },
  empHeaderCodeBadge: {
    backgroundColor: '#EDF3DF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  empHeaderCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5B692D',
  },
  empHeaderBellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  empHeaderBellBadge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  empDashboardScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  empWeekdaysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  empWeekdayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  empWeekdayItemActive: {
    backgroundColor: '#5B692D',
    borderColor: '#5B692D',
    shadowColor: '#5B692D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  empWeekdayNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  empWeekdayNumActive: {
    color: '#FFFFFF',
  },
  empWeekdayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  empWeekdayNameActive: {
    color: '#FFFFFF',
    opacity: 1,
  },
  empSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  empSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  empViewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B692D',
  },
  empGridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  empGridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  empGridIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  empGridCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  empGridCardValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  empGridCardSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  empQuickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  empQuickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  empQuickActionBtnPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  empQuickActionBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  /* Dedicated Employee Attendance Status Card Styles */
  empStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    paddingLeft: 22,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  empStatusAccentPill: {
    position: 'absolute',
    left: 0,
    top: 18,
    width: 5,
    height: 36,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  empStatusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  empStatusTitleGroup: {
    flex: 1,
    paddingRight: 10,
  },
  empStatusHeadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empStatusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empStatusTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  empStatusSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
    marginLeft: 36,
  },
  empStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  empStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  empStatusDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  empStatusMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empStatusMetaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  empStatusMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empStatusMetaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  empStatusMetaVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  empStatusActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empStatusViewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B692D',
  },
});
