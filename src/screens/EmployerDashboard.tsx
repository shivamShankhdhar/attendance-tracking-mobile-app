import { SwipeTabs, swipePageStyle } from '../components/SwipeTabs';
import { WorkplaceTab } from '../components/WorkplaceTab';
import { AttendanceDataSkeleton } from '../components/AttendanceDataSkeleton';
import { RangeFilters, FilterPills, ExplorerTabs, ReportInsights, shiftDate, attendanceStatuses, validCalendarDate } from '../components/AttendanceExplorer';
import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Share,
  Platform,
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { copyToClipboard } from '../utils/clipboard';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';
import { useWorkplaceClock } from '../hooks/use-workplace-clock';
import { useForeground } from '../hooks/use-foreground';
import { useAuthStore } from '../stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkplaceSwitcherModal } from '../components/WorkplaceSwitcherModal';
import { WorkplaceJoinQrModal } from '../components/WorkplaceJoinQrModal';
import { SyncStatusBanner } from '../components/SyncStatusBanner';
import {
  formatTime,
  localDate,
  getFirstAndLastInitials,
  formatFriendlyDate,
  formatHeaderDate,
  formatMonthYear,
  formatWorkDuration,
  maskEmail,
} from '../utils/attendance';
import { Employee, Invitation } from '../types/attendance';
import { showSuccess, showError } from '../stores/alertStore';
import {
  attendanceApi,
  ApiAttendanceRecord,
} from '../services/attendanceApi';
import { Avatar } from '../components/Avatar';
import { AdBanner } from '../components/AdBanner';
import { adMobService } from '../services/adMobService';
import { BottomTabs, TabItem } from '../components/BottomTabs';
import {
  TodayTabIcon,
  AttendanceTabIcon,
  EmployeesTabIcon,
  WorkplaceTabIcon,
} from '../components/icons/TabIcons';
import { StatusChip } from '../components/StatusChip';
import { PrimaryButton, SecondaryButton, DangerButton } from '../components/Buttons';
import { TextField } from '../components/TextField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DateSwitcher } from '../components/DateSwitcher';
import { HomeHeaderOptions } from '../components/HomeHeaderOptions';
import { NotificationsModal } from '../components/NotificationsModal';
import {
  DocCheckmarkIllustration,
  PeopleGroupPlusIllustration,
  SearchEmptyDocIllustration,
  EnvelopePersonPlusIllustration,
  BarChartSearchIllustration,
  SessionClosedPadlockIllustration,
  EmptyTeamIllustration,
  StorefrontShopIllustration,
  DualPhoneReviewedIllustration,
  CalendarClockIllustration,
  EmptyRequestsIllustration,
} from '../components/illustrations/IllustrationAssets';
import { HeaderBackgroundArt } from '../components/illustrations/HeaderBackgroundArt';
import {
  EmployerTodaySkeleton,
  EmployerRequestsSkeleton,
  EmployerEmployeesSkeleton,
} from '../components/SkeletonScreens';
import { AttendanceRequestCard } from '../components/AttendanceRequestCard';

export type EmployerNavTab = 'today' | 'attendance' | 'employees' | 'workplace';

const EMPLOYER_TABS: TabItem<EmployerNavTab>[] = [
  {
    key: 'today',
    label: 'Today',
    renderIcon: (color, size, active) => <TodayTabIcon color={color} size={size} active={active} />,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    renderIcon: (color, size, active) => <AttendanceTabIcon color={color} size={size} active={active} />,
  },
  {
    key: 'employees',
    label: 'Employees',
    renderIcon: (color, size, active) => <EmployeesTabIcon color={color} size={size} active={active} />,
  },
  {
    key: 'workplace',
    label: 'Workplace',
    renderIcon: (color, size, active) => <WorkplaceTabIcon color={color} size={size} active={active} />,
  },
];
const EMPLOYER_TAB_KEYS = EMPLOYER_TABS.map((item) => item.key);

export interface RequestDetailItem {
  id: string;
  initials?: string;
  avatarUrl?: string;
  name: string;
  code: string;
  email?: string;
  role?: string;
  time: string;
  date?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  qrVerified: boolean;
  wifiVerified: boolean;
  locationName?: string;
  locationVerified?: boolean;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestType: 'CHECK_IN' | 'CHECK_OUT';
}

export type EmployerScreenState =
  | { name: 'tabs' }
  | { name: 'request-detail'; request: RequestDetailItem }
  | { name: 'manual-attendance'; employee?: Employee }
  | { name: 'employee-detail'; employee: Employee }
  | { name: 'employee-search' };

export function EmployerDashboard({ initialTab = 'today', initialScreen, onTabChange }: { initialTab?: EmployerNavTab; initialScreen?: EmployerScreenState; onTabChange?: (tab: EmployerNavTab) => void } = {}) {
  const { palette, isDark } = useTheme();
  const { user, activeWorkplace: authWorkplace, memberships, selectWorkplace } = useAuthStore();
  const router = useRouter();
  const effectiveWorkplaceId = authWorkplace?.workplaceId || '';
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);
  const [workplaceSection, setWorkplaceSection] = useState('Overview');
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [employeePinModalVisible, setEmployeePinModalVisible] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const mutationLock = useRef(false);
  const timezone = authWorkplace?.timezone || 'UTC';
  const now = useWorkplaceClock();
  const today = localDate(timezone, new Date(now));
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceView, setAttendanceView] = useState<'Mark' | 'Requests' | 'Daily' | 'Reports'>('Mark');
  const [attendanceSection, setAttendanceSection] = useState('Roster');
  const [reportSection, setReportSection] = useState('Summary');
  const [reportRange, setReportRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [reportStatus, setReportStatus] = useState('ALL');
  const [reportEmployee, setReportEmployee] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportSort, setReportSort] = useState('Newest first');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [reportLimit, setReportLimit] = useState(6);
  const [employeeRenderLimit, setEmployeeRenderLimit] = useState(40);
  const [historyRenderLimit, setHistoryRenderLimit] = useState(40);
  const [employeeDetailTab, setEmployeeDetailTab] = useState<'details' | 'attendances' | 'reports'>('details');
  const [employeeReportRange, setEmployeeReportRange] = useState<{ startDate: string; endDate: string }>({ startDate: `${today.slice(0, 7)}-01`, endDate: today });
  const [employeeReportStatus, setEmployeeReportStatus] = useState('ALL');
  const [employeeReportDraftStatus, setEmployeeReportDraftStatus] = useState('ALL');
  const [employeeReportDraftRange, setEmployeeReportDraftRange] = useState({ startDate: `${today.slice(0, 7)}-01`, endDate: today });
  const [employeeReportFiltersVisible, setEmployeeReportFiltersVisible] = useState(false);
  const [manualDate, setManualDate] = useState(today);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const reportDates = reportRange || { startDate: `${reportMonth}-01`, endDate: reportMonth === today.slice(0, 7) ? today : shiftDate(`${reportMonth}-01`, new Date(Number(reportMonth.slice(0, 4)), Number(reportMonth.slice(5)), 0).getDate() - 1) };
  const reportPeriodDisplay = useMemo(() => {
    if (!reportRange) return formatMonthYear(reportMonth);
    if (reportDates.startDate === reportDates.endDate) return formatFriendlyDate(reportDates.startDate, 'd MMM yyyy');
    if (reportDates.startDate.slice(0, 7) === reportDates.endDate.slice(0, 7)) {
      return `${formatFriendlyDate(reportDates.startDate, 'd')}–${formatFriendlyDate(reportDates.endDate, 'd MMM yyyy')}`;
    }
    return `${formatFriendlyDate(reportDates.startDate, 'd MMM')} – ${formatFriendlyDate(reportDates.endDate, 'd MMM yyyy')}`;
  }, [reportRange, reportMonth, reportDates]);
  const reportQuery = { ...reportDates, status: reportStatus === 'ALL' ? undefined : reportStatus, employeeMemberId: reportEmployee || undefined };
  const scope = ['employer', user?.id, effectiveWorkplaceId];
  const [activeTab, setActiveTab] = useState<EmployerNavTab>(initialTab || 'today');
  const foreground = useForeground();
  useEffect(() => { onTabChange?.(activeTab); }, [activeTab, onTabChange]);
  const selectEmployerTab = useCallback((tab: EmployerNavTab | 'reports') => {
    if (tab === 'reports') { setAttendanceView('Reports'); setReportSection('Summary'); }
    else if (tab === 'attendance') { setAttendanceView('Mark'); }
    setActiveTab(tab === 'reports' ? 'attendance' : tab);
  }, []);
  const selectAttendanceView = (view: string) => {
    setAttendanceView(view as 'Mark' | 'Requests' | 'Daily' | 'Reports');
    setAttendanceSection('Roster');
    setReportSection('Summary');
  };



  const [navStack, setNavStack] = useState<EmployerScreenState[]>(initialScreen ? [initialScreen] : [{ name: 'tabs' }]);
  const currentScreen = navStack[navStack.length - 1];

  const pushScreen = (screen: EmployerScreenState) => {
    setNavStack((prev) => [...prev, screen]);
  };

  const popScreen = () => {
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const [screenFadeAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    screenFadeAnim.setValue(0.7);
    Animated.timing(screenFadeAnim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [navStack.length, currentScreen.name, screenFadeAnim]);

  const openDailyQr = () => {
    // Navigate to Attendance → Mark tab (QR lives there)
    selectAttendanceView('Mark');
    setActiveTab('attendance');
  };
  const openRequestsQueue = () => {
    selectAttendanceView('Mark');
    setActiveTab('attendance');
  };
  const openRequestDetail = (request: RequestDetailItem) => {
    setDetailDecisionState(request.status === 'APPROVED' ? 'approved' : 'idle');
    setDetailErrorMsg('');
    setDetailApprovedAt(request.time || '');
    setDetailRejectionText('Location appears to be outside office premises based on network details.');
    pushScreen({ name: 'request-detail', request });
  };
  const openManualAttendance = (employee?: Employee) => {
    setManualTargetEmp(employee || null);
    setManualReason('');
    setManualDate(activeTab === 'attendance' && attendanceView === 'Daily' ? attendanceDate : today);
    pushScreen({ name: 'manual-attendance', employee });
  };
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberStep, setAddMemberStep] = useState<'choose' | 'link' | 'email'>('choose');
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const openAddEmployee = () => {
    setAddMemberStep('choose');
    setNewEmpEmail('');
    setNewEmpName('');
    setNewEmpCode('');
    setCreatedInvite(null);
    setInviteLinkCopied(false);
    setInviteCodeCopied(false);
    setShowAddMemberModal(true);
  };

  const handleShareWorkplaceInvite = async () => {
    const link =
      generatedLink ||
      quickJoinQrQuery.data?.joinLink ||
      `https://www.bizora.shivamshankhdhar.online/join?code=${effectiveWorkplaceCode}`;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(link);
        showSuccess('Invite link copied to clipboard.');
      } else {
        await Share.share({
          title: `Join ${workplaceName || 'our workplace'}`,
          message: `Join ${workplaceName || 'our workplace'} on Bizora Attendance:\nWorkplace Code: ${effectiveWorkplaceCode}\nJoin Link: ${link}`,
          url: link,
        });
      }
    } catch {
      showError('Unable to open share sheet.');
    }
  };

  const handleCopyModalWorkplaceCode = async () => {
    if (!effectiveWorkplaceCode) return;
    await copyToClipboard(effectiveWorkplaceCode);
    setInviteCodeCopied(true);
    setTimeout(() => setInviteCodeCopied(false), 2000);
  };

  const handleCopyModalLink = async () => {
    const link =
      generatedLink ||
      quickJoinQrQuery.data?.joinLink ||
      `https://www.bizora.shivamshankhdhar.online/join?code=${effectiveWorkplaceCode}`;
    await copyToClipboard(link);
    setInviteLinkCopied(true);
    setTimeout(() => setInviteLinkCopied(false), 2000);
  };
  const openEmployeeDetail = (employee: Employee) => {
    setNewPin('');
    setEmployeeDetailTab('details');
    setEmployeeReportRange({ startDate: `${today.slice(0, 7)}-01`, endDate: today });
    setEmployeeReportStatus('ALL');
    pushScreen({ name: 'employee-detail', employee });
  };
  const openSettings = () => router.push('/settings');
  const [dedicatedEmpSearch, setDedicatedEmpSearch] = useState('');
  const [dedicatedEmpFilter, setDedicatedEmpFilter] = useState<'ALL' | 'ACTIVE' | 'PRESENT' | 'NOT_MARKED'>('ALL');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const selectedRequestDetail: RequestDetailItem | null =
    currentScreen.name === 'request-detail' ? currentScreen.request : null;

  const detailEmp: Employee | null =
    currentScreen.name === 'employee-detail' ? currentScreen.employee : null;

  // Image 3 Request Detail State:
  const [detailDecisionState, setDetailDecisionState] = useState<'idle' | 'approving' | 'approved' | 'reject-form' | 'rejecting' | 'error'>('idle');
  const [detailErrorMsg, setDetailErrorMsg] = useState('');
  const [detailApprovedAt, setDetailApprovedAt] = useState('');
  const [detailRejectionText, setDetailRejectionText] = useState('Location appears to be outside office premises based on network details.');

  // Image 4 Request Queue Toast:
  const [queueToast, setQueueToast] = useState<string | null>(null);
  // Image 4 In-line approving card ID:
  const [approvingCardId, setApprovingCardId] = useState<string | null>(null);

  // Detail screen & dialog state
  const [requestDetailRejectionReason, setRequestDetailRejectionReason] = useState('QR was shared outside workplace.');
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);

  // Close session confirm dialog
  const [qrTab, setQrTab] = useState<'checkin' | 'checkout'>('checkin');
  const [showCloseSessionConfirm, setShowCloseSessionConfirm] = useState(false);

  // Reject request confirm dialog
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('QR was shared outside workplace.');

  // Manual attendance state
  const [manualTargetEmp, setManualTargetEmp] = useState<Employee | null>(null);
  const [manualStatus, setManualStatus] = useState<Employee['status']>('PRESENT');
  const [manualReason, setManualReason] = useState('');


  // Add Employee state
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [createdInvite, setCreatedInvite] = useState<Invitation | null>(null);

  // Sub-tabs & filters
  const [requestTab, setRequestTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [empSubTab, setEmpSubTab] = useState<'team' | 'active' | 'invitations' | 'join-requests'>('team');
  const [empSearch, setEmpSearch] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<string>('ALL');

  // Workplace Join QR & Join Requests state
  const [joinQrModalVisible, setJoinQrModalVisible] = useState(false);
  const [processingJoinReqId, setProcessingJoinReqId] = useState<string | null>(null);
  const [rejectJoinReqTarget, setRejectJoinReqTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectJoinReqReason, setRejectJoinReqReason] = useState('Not an active employee.');

  // Header Quick Access QR Popover & Workplace Code Copy state
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const qrButtonRef = useRef<View>(null);
  const [qrButtonAnchor, setQrButtonAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showQuickQrPopover, setShowQuickQrPopover] = useState(false);
  const [showAttendanceQrModal, setShowAttendanceQrModal] = useState(false);
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);
  const [showMarkInstructionsModal, setShowMarkInstructionsModal] = useState(false);
  const [attendanceQrTab, setAttendanceQrTab] = useState<'checkin' | 'checkout'>('checkin');
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [homeSectionTab, setHomeSectionTab] = useState<'hub' | 'pulse' | 'approvals'>('hub');
  const [homePulseFilter, setHomePulseFilter] = useState<'ALL' | 'PRESENT' | 'NOT_MARKED'>('ALL');

  // Exact Tooltip Geometry: Anchored directly below the QR button
  const tooltipWidth = Math.min(292, windowWidth - 32);
  const tooltipRight = 16;
  const tooltipTop = qrButtonAnchor
    ? Math.min(
        Math.max(qrButtonAnchor.y + qrButtonAnchor.height + 6, insets.top + 70),
        windowHeight - 340
      )
    : insets.top + (Platform.OS === 'ios' ? 98 : 88);

  const buttonCenterX = qrButtonAnchor
    ? qrButtonAnchor.x + qrButtonAnchor.width / 2
    : windowWidth - 33;
  const arrowOffsetFromCardRight = Math.max(
    14,
    Math.min(tooltipWidth - 26, (windowWidth - tooltipRight) - buttonCenterX - 8)
  );

  const effectiveWorkplaceCode = useMemo(() => {
    return (
      authWorkplace?.workplaceCode ||
      memberships.find((m) => m.workplaceId === effectiveWorkplaceId)?.workplaceCode ||
      effectiveWorkplaceId.slice(-6).toUpperCase()
    );
  }, [authWorkplace, memberships, effectiveWorkplaceId]);

  const quickJoinQrQuery = useQuery({
    queryKey: ['quick-access-join-qr', effectiveWorkplaceId],
    queryFn: () => attendanceApi.getJoinQr(effectiveWorkplaceId),
    enabled: showQuickQrPopover && !!effectiveWorkplaceId,
    staleTime: 60000,
  });

  const handleCopyWorkplaceCode = async () => {
    if (!effectiveWorkplaceCode) return;
    await copyToClipboard(effectiveWorkplaceCode);
    setIsCodeCopied(true);
    setTimeout(() => setIsCodeCopied(false), 2000);
  };

  const handleCopyJoinLink = async () => {
    const link =
      quickJoinQrQuery.data?.joinLink ||
      quickJoinQrQuery.data?.deepLink ||
      `https://www.bizora.shivamshankhdhar.online/join?code=${effectiveWorkplaceCode}`;
    await copyToClipboard(link);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const workplaceName = authWorkplace?.workplaceName || '';
  const employerName = user?.name || '';
  const initials = useMemo(() => getFirstAndLastInitials(employerName, 'SS'), [employerName]);
  const [avatarError, setAvatarError] = useState(false);
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [openSessionStatus, setOpenSessionStatus] = useState('');
  const todayDateFormatted = formatFriendlyDate(today, 'EEE, MMM d, yyyy');
  const isMainTabs = currentScreen.name === 'tabs';
  const sessionQuery = useQuery({ queryKey: [...scope, 'session', today], queryFn: () => attendanceApi.getTodaySession(effectiveWorkplaceId), enabled: !!effectiveWorkplaceId && ((foreground && isMainTabs && (activeTab === 'today' || activeTab === 'attendance')) || showAttendanceQrModal) });
  const rosterQuery = useQuery({ queryKey: [...scope, 'roster', today], queryFn: () => attendanceApi.getTodayRoster(effectiveWorkplaceId), enabled: !!effectiveWorkplaceId && ((isMainTabs && (activeTab === 'today' || activeTab === 'employees')) || currentScreen.name === 'employee-search'), staleTime: 60000, refetchOnWindowFocus: false });
  const requestsQuery = useQuery({ queryKey: [...scope, 'requests', today], queryFn: () => attendanceApi.getWorkplaceRequests(effectiveWorkplaceId), enabled: !!effectiveWorkplaceId && isMainTabs && (activeTab === 'today' || activeTab === 'attendance'), refetchInterval: foreground && isMainTabs && activeTab === 'today' ? 10000 : false });
  const employeesQuery = useQuery({
    queryKey: [...scope, 'employees'],
    queryFn: () => attendanceApi.getEmployees(effectiveWorkplaceId),
    enabled: !!effectiveWorkplaceId && (isMainTabs && (activeTab === 'employees' || activeTab === 'attendance') || currentScreen.name === 'employee-detail' || currentScreen.name === 'manual-attendance' || currentScreen.name === 'employee-search'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
  const joinRequestsQuery = useQuery({
    queryKey: ['admin-join-requests', user?.id, effectiveWorkplaceId],
    queryFn: () => attendanceApi.getWorkplaceJoinRequests(effectiveWorkplaceId),
    enabled: !!effectiveWorkplaceId && isMainTabs && (activeTab === 'employees' || activeTab === 'workplace'),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const workplaceJoinRequests = useMemo(() => joinRequestsQuery.data || [], [joinRequestsQuery.data]);
  const pendingJoinRequests = useMemo(() => workplaceJoinRequests.filter((r) => r.status === 'PENDING'), [workplaceJoinRequests]);
  const selectedRosterQuery = useQuery({ queryKey: [...scope, 'roster', attendanceDate], queryFn: () => attendanceApi.getTodayRoster(effectiveWorkplaceId, attendanceDate), enabled: !!effectiveWorkplaceId && isMainTabs && activeTab === 'attendance' && attendanceView === 'Daily' });
  const reportsQuery = useQuery({ queryKey: [...scope, 'reports', reportQuery], queryFn: () => attendanceApi.getReports(effectiveWorkplaceId, reportQuery), enabled: !!effectiveWorkplaceId && isMainTabs && activeTab === 'attendance' && attendanceView === 'Reports' });
  const historyQuery = useQuery({ queryKey: [...scope, 'history', detailEmp?.id], queryFn: () => attendanceApi.getEmployeeHistory(effectiveWorkplaceId, detailEmp!.id), enabled: !!detailEmp });
  const employeeReportsQuery = useQuery({
    queryKey: [...scope, 'employee-reports', detailEmp?.id, employeeReportRange, employeeReportStatus],
    queryFn: () => attendanceApi.getReports(effectiveWorkplaceId, {
      ...employeeReportRange,
      employeeMemberId: detailEmp!.id,
      status: employeeReportStatus === 'ALL' ? undefined : employeeReportStatus,
    }),
    enabled: !!effectiveWorkplaceId && !!detailEmp && employeeDetailTab === 'reports',
  });

  const relevantQueries = useMemo(() => {
    if (activeTab === 'today') return [sessionQuery, rosterQuery, requestsQuery];
    if (activeTab === 'attendance') {
      if (attendanceView === 'Mark') return [sessionQuery, requestsQuery];
      if (attendanceView === 'Requests') return [requestsQuery];
      if (attendanceView === 'Daily') return [selectedRosterQuery, employeesQuery];
      return [reportsQuery, employeesQuery];
    }
    if (activeTab === 'employees' || activeTab === 'workplace') return [employeesQuery, joinRequestsQuery];
    return [rosterQuery, sessionQuery];
  }, [
    activeTab,
    attendanceView,
    sessionQuery,
    rosterQuery,
    requestsQuery,
    selectedRosterQuery,
    reportsQuery,
    employeesQuery,
    joinRequestsQuery,
  ]);

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

  const [isSyncRetrying, setIsSyncRetrying] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      await Promise.allSettled(relevantQueries.map((query) => query.refetch()));
    } finally {
      setIsPullRefreshing(false);
    }
  };
  const handleRetrySync = async () => {
    setIsSyncRetrying(true);
    try {
      await Promise.all(
        relevantQueries
          .filter((q) => q.isError)
          .map((q) => q.refetch())
      );
    } finally {
      setIsSyncRetrying(false);
    }
  };

  const loadWorkplaceData = () => queryClient.invalidateQueries({ queryKey: scope });
  const liveSession = sessionQuery.data;
  const liveCounts = rosterQuery.data?.counts;
  const liveReportsMetrics = reportsQuery.data?.summary || reportsQuery.data?.metrics;
  const liveReportsRecords = reportsQuery.data?.records || [];
  const filteredReportRecords = useMemo(() => [...liveReportsRecords].sort((a, b) => reportSort === 'Employee A–Z' ? (a.employee.name || '').localeCompare(b.employee.name || '') : reportSort === 'Oldest first' ? a.attendanceDate.localeCompare(b.attendanceDate) : b.attendanceDate.localeCompare(a.attendanceDate)), [liveReportsRecords, reportSort]);
  const reportPageCount = Math.max(1, Math.ceil(filteredReportRecords.length / 6));
  const reportPage = Math.min(Math.ceil(reportLimit / 6), reportPageCount);
  const empHistoryRecords: ApiAttendanceRecord[] = useMemo(() => {
    if (!detailEmp || !historyQuery.data) return [];
    if (Array.isArray(historyQuery.data)) return historyQuery.data;
    if (Array.isArray((historyQuery.data as any)?.records)) return (historyQuery.data as any).records;
    return [];
  }, [detailEmp, historyQuery.data]);
  const currentMonthAttendanceStats = useMemo(() => {
    const currentMonth = today.slice(0, 7);
    const monthRecords = empHistoryRecords.filter((record) =>
      record.attendanceDate.startsWith(currentMonth)
    );

    const targetMonth = monthRecords.length > 0
      ? currentMonth
      : (empHistoryRecords[0]?.attendanceDate?.slice(0, 7) || currentMonth);

    const targetRecords = empHistoryRecords.filter((record) =>
      record.attendanceDate.startsWith(targetMonth)
    );

    const presentCount = targetRecords.filter((r) => r.status === 'PRESENT').length;
    const halfDayCount = targetRecords.filter((r) => r.status === 'HALF_DAY').length;
    const absentCount = targetRecords.filter((r) => r.status === 'ABSENT').length;
    const leaveCount = targetRecords.filter((r) => r.status === 'LEAVE').length;

    const effectivePresent = presentCount + halfDayCount * 0.5;

    const isCurrentMonth = targetMonth === currentMonth;
    const year = parseInt(targetMonth.slice(0, 4), 10) || new Date().getFullYear();
    const monthIdx = (parseInt(targetMonth.slice(5, 7), 10) || 1) - 1;

    const totalDaysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const upToDay = isCurrentMonth
      ? Math.min(totalDaysInMonth, Math.max(1, parseInt(today.slice(8, 10), 10) || 1))
      : totalDaysInMonth;

    let elapsedWorkingDays = 0;
    for (let d = 1; d <= upToDay; d++) {
      const dt = new Date(year, monthIdx, d);
      if (dt.getDay() !== 0) {
        elapsedWorkingDays++;
      }
    }

    const totalDays = Math.max(
      elapsedWorkingDays,
      targetRecords.length,
      presentCount + halfDayCount + absentCount,
      1
    );

    const percentage = Math.min(100, Math.round((effectivePresent / totalDays) * 100));

    let statusColor = '#10B981';
    let statusBg = isDark ? '#064E3B35' : '#ECFDF5';
    let statusBorder = isDark ? '#065F46' : '#A7F3D0';
    let standingLabel = 'Excellent';

    if (percentage >= 85) {
      statusColor = '#10B981';
      statusBg = isDark ? '#064E3B35' : '#ECFDF5';
      statusBorder = isDark ? '#065F46' : '#A7F3D0';
      standingLabel = 'Excellent';
    } else if (percentage >= 70) {
      statusColor = '#059669';
      statusBg = isDark ? '#064E3B30' : '#ECFDF5';
      statusBorder = isDark ? '#047857' : '#D1FAE5';
      standingLabel = 'Good';
    } else if (percentage >= 50) {
      statusColor = '#D97706';
      statusBg = isDark ? '#78350F35' : '#FFFBEB';
      statusBorder = isDark ? '#92400E' : '#FDE68A';
      standingLabel = 'Average';
    } else {
      statusColor = '#DC2626';
      statusBg = isDark ? '#7F1D1D35' : '#FEF2F2';
      statusBorder = isDark ? '#991B1B' : '#FECACA';
      standingLabel = 'Needs Attention';
    }

    const monthDate = new Date(year, monthIdx, 1);
    const monthLabel = isCurrentMonth
      ? `This Month (${formatFriendlyDate(monthDate, 'MMM yyyy')})`
      : formatFriendlyDate(monthDate, 'MMMM yyyy');

    return {
      presentDays: effectivePresent,
      presentCount,
      halfDayCount,
      absentCount,
      leaveCount,
      totalDays,
      percentage,
      statusColor,
      statusBg,
      statusBorder,
      standingLabel,
      monthLabel,
    };
  }, [empHistoryRecords, today, isDark]);
  const detailAttendanceDate = activeTab === 'attendance' ? attendanceDate : today;
  const detailAttendance = useMemo(() => {
    if (!detailEmp) return undefined;
    const roster = activeTab === 'attendance'
      ? selectedRosterQuery.data?.attendanceDate === detailAttendanceDate ? selectedRosterQuery.data.roster : undefined
      : rosterQuery.data?.roster;
    const rosterRecord = roster?.find((record) => record.memberId === detailEmp.id);
    if (rosterRecord) return rosterRecord;
    return empHistoryRecords.find((record) => record.attendanceDate === detailAttendanceDate);
  }, [detailEmp, activeTab, attendanceDate, today, detailAttendanceDate, selectedRosterQuery.data, rosterQuery.data, empHistoryRecords]);
  const detailWorkedDuration = detailAttendance?.checkInTime && detailAttendance?.checkOutTime
    ? formatWorkDuration(detailAttendance.checkInTime, detailAttendance.checkOutTime)
    : null;
  const filteredEmployeeHistoryRecords = empHistoryRecords;
  const visibleHistoryRecords = useMemo(() => filteredEmployeeHistoryRecords.slice(0, historyRenderLimit), [filteredEmployeeHistoryRecords, historyRenderLimit]);
  const empHistoryMap: Record<string, ApiAttendanceRecord[]> = detailEmp ? { [detailEmp.id]: empHistoryRecords } : {};
  const showRequestsSkeleton = requestsQuery.isLoading && !requestsQuery.data;
  const isSessionOpen = liveSession?.session.status === 'OPEN' && new Date(liveSession.session.expiresAt).getTime() > now;
  const sessionQrPayload = liveSession?.qrPayload || '';
  const sessionCheckoutQrPayload = liveSession?.checkoutQrPayload || '';
  const sessionOpenedAt = formatTime(liveSession?.session.openedAt, timezone);
  const totalEmployeesCount = liveCounts?.totalEmployees ?? 0;
  const presentCount = liveCounts?.presentCount ?? 0;
  const pendingCount = liveCounts?.pendingCount ?? 0;
  const notMarkedCount = liveCounts?.notMarkedCount ?? 0;
  const effectiveRequests = useMemo<RequestDetailItem[]>(() => (requestsQuery.data || []).map((r) => ({
    id: r.id, initials: getFirstAndLastInitials(r.employee.name, 'EM'),
    avatarUrl: (r.employee as any).avatarUrl || (r.employee as any).user?.avatarUrl,
    name: r.employee.name,
    email: (r.employee as any).email || (r.employee as any).user?.email || (r as any).email || '',
    code: r.employee.code || '—', time: formatTime(r.requestedAt, timezone),
    date: r.attendanceDate, qrVerified: r.verification.qrVerified, wifiVerified: r.verification.wifiVerified,
    locationName: workplaceName, locationVerified: r.verification.locationVerified ?? false, notes: r.verification.notes, status: r.status,
    requestType: r.requestType || 'CHECK_IN',
  })), [requestsQuery.data, timezone, workplaceName]);
  const pendingRequests = useMemo(() => effectiveRequests.filter((r) => r.status === 'PENDING'), [effectiveRequests]);
  const approvedRequests = useMemo(() => effectiveRequests.filter((r) => r.status === 'APPROVED'), [effectiveRequests]);
  const rejectedRequests = useMemo(() => effectiveRequests.filter((r) => r.status === 'REJECTED'), [effectiveRequests]);
  const horizontalCardWidth = pendingRequests.length === 1 ? (windowWidth - 40) : Math.min(windowWidth - 64, 340);
  const visibleRosterData = activeTab === 'attendance' ? selectedRosterQuery.data : rosterQuery.data;
  const effectiveRoster = useMemo(() => (visibleRosterData?.roster || []).map((r) => ({
    ...r, initials: getFirstAndLastInitials(r.name, 'EM'), code: r.employeeCode,
    avatarUrl: r.avatarUrl,
    time: formatTime(r.status === 'PENDING' ? r.requestedAt : r.checkInTime, timezone),
    checkInDisplay: r.checkInTime ? formatTime(r.checkInTime, timezone) : '—',
    checkOutDisplay: r.checkOutTime ? formatTime(r.checkOutTime, timezone) : '—',
    totalTimeDisplay: r.checkInTime && r.checkOutTime ? formatWorkDuration(r.checkInTime, r.checkOutTime) || '—' : '—',
  })), [visibleRosterData, timezone]);
  const attendanceStatusCounts = useMemo(() => {
    const counts = { PRESENT: 0, PENDING: 0, NOT_MARKED: 0 };
    for (const employee of visibleRosterData?.roster || []) {
      if (employee.status in counts) counts[employee.status as keyof typeof counts] += 1;
    }
    return counts;
  }, [visibleRosterData]);
  const filteredAttendanceRoster = useMemo(() => {
    const search = attendanceSearch.trim().toLowerCase();
    return effectiveRoster.filter((employee) => {
      if (attendanceFilter !== 'ALL' && employee.status !== attendanceFilter) return false;
      return !search || employee.name.toLowerCase().includes(search) || employee.code.toLowerCase().includes(search);
    });
  }, [effectiveRoster, attendanceFilter, attendanceSearch]);
  const filteredPulseRoster = useMemo(() => {
    if (homePulseFilter === 'PRESENT') {
      return effectiveRoster.filter((e) => e.status === 'PRESENT' || e.status === 'HALF_DAY');
    }
    if (homePulseFilter === 'NOT_MARKED') {
      return effectiveRoster.filter((e) => e.status === 'NOT_MARKED' || e.status === 'ABSENT');
    }
    return effectiveRoster;
  }, [effectiveRoster, homePulseFilter]);
  const effectiveEmployees = useMemo<Employee[]>(() => {
    const statuses = new Map(rosterQuery.data?.roster.map((r) => [r.memberId, r.status]));
    return (employeesQuery.data || []).map((e) => ({
      id: e.id,
      name: e.name,
      email: e.invitedEmail,
      code: e.employeeCode,
      avatarUrl: e.avatarUrl,
      status: statuses.get(e.id) || 'NOT_MARKED',
      membershipStatus: e.status,
      hasPin: e.hasPin,
      joinedAt: e.joinedAt,
    }));
  }, [employeesQuery.data, rosterQuery.data]);
  const directoryEmployees = useMemo(() => empSubTab === 'active'
    ? effectiveEmployees.filter((employee) => employee.membershipStatus === 'ACTIVE' || !employee.membershipStatus)
    : effectiveEmployees, [effectiveEmployees, empSubTab]);
  const activeEmployeesCount = useMemo(() => effectiveEmployees.filter((employee) => employee.membershipStatus === 'ACTIVE' || !employee.membershipStatus).length, [effectiveEmployees]);
  const invitedEmployees = useMemo(() => effectiveEmployees.filter((employee) => employee.membershipStatus === 'INVITED'), [effectiveEmployees]);
  const visibleInvitedEmployees = useMemo(() => invitedEmployees.slice(0, employeeRenderLimit), [invitedEmployees, employeeRenderLimit]);
  const visibleJoinRequests = useMemo(() => workplaceJoinRequests.slice(0, employeeRenderLimit), [workplaceJoinRequests, employeeRenderLimit]);
  const filteredDirectoryEmployees = useMemo(() => {
    const query = empSearch.trim().toLowerCase();
    return query ? directoryEmployees.filter((employee) =>
      employee.name.toLowerCase().includes(query) || (employee.code || '').toLowerCase().includes(query) ||
      employee.email?.toLowerCase().includes(query)
    ) : directoryEmployees;
  }, [directoryEmployees, empSearch]);
  const visibleDirectoryEmployees = useMemo(() => filteredDirectoryEmployees.slice(0, employeeRenderLimit), [filteredDirectoryEmployees, employeeRenderLimit]);
  const filteredDedicatedEmployees = useMemo(() => {
    const q = dedicatedEmpSearch.trim().toLowerCase();
    return effectiveEmployees.filter((emp) => {
      if (dedicatedEmpFilter === 'ACTIVE' && emp.membershipStatus !== 'ACTIVE' && emp.membershipStatus) {
        return false;
      }
      if (dedicatedEmpFilter === 'PRESENT' && emp.status !== 'PRESENT') {
        return false;
      }
      if (dedicatedEmpFilter === 'NOT_MARKED' && emp.status !== 'NOT_MARKED') {
        return false;
      }
      if (!q) return true;
      const nameMatch = emp.name.toLowerCase().includes(q);
      const emailMatch = (emp.email || '').toLowerCase().includes(q);
      const codeMatch = (emp.code || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || codeMatch;
    });
  }, [effectiveEmployees, dedicatedEmpSearch, dedicatedEmpFilter]);
  const openRosterEmployee = (id: string) => { const employee = effectiveEmployees.find((e) => e.id === id); if (employee) openEmployeeDetail(employee); };
  const runMutation = async (action: () => Promise<void>) => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setIsMutating(true);
    try { await action(); }
    catch (error) { showError(error instanceof Error ? error.message : 'Unable to save. Please try again.'); }
    finally { mutationLock.current = false; setIsMutating(false); }
  };
  const changeReportMonth = (offset: number) => {
    const currentMonth = today.slice(0, 7);
    if (offset > 0 && reportMonth >= currentMonth) return;
    const date = new Date(`${reportMonth}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    const nextMonthStr = date.toISOString().slice(0, 7);
    if (offset > 0 && nextMonthStr > currentMonth) return;
    setReportMonth(nextMonthStr);
  };
  const handleDetailApprove = async (id: string) => {
    setDetailDecisionState('approving');
    try {
      await attendanceApi.approveRequest(effectiveWorkplaceId, id);
      const currentTime = formatTime(new Date().toISOString(), timezone);
      setDetailApprovedAt(currentTime);
      setDetailDecisionState('approved');
      setQueueToast(`${selectedRequestDetail?.name || 'Employee'}'s attendance approved. The request has been moved to Approved.`);
      void loadWorkplaceData();
    } catch (err: any) {
      setDetailErrorMsg(err.message || 'Something went wrong. Please try again.');
      setDetailDecisionState('error');
    }
  };

  const handleDetailConfirmReject = async (id: string) => {
    setDetailDecisionState('rejecting');
    try {
      await attendanceApi.rejectRequest(effectiveWorkplaceId, id, detailRejectionText.trim());
      setQueueToast(`${selectedRequestDetail?.name || 'Employee'}'s request rejected.`);
      void loadWorkplaceData();
      popScreen();
    } catch (err: any) {
      setDetailErrorMsg(err.message || 'Something went wrong. Please try again.');
      setDetailDecisionState('error');
    }
  };

  const handleInlineQueueApprove = async (reqItem: RequestDetailItem) => {
    setApprovingCardId(reqItem.id);
    try {
      await attendanceApi.approveRequest(effectiveWorkplaceId, reqItem.id);
      setQueueToast(`${reqItem.name}'s attendance approved. The request has been moved to Approved.`);
      void loadWorkplaceData();
    } catch (err: any) {
      showError(err.message || 'Failed to approve request.');
    } finally {
      setApprovingCardId(null);
    }
  };

  const handleApprove = (id: string) => runMutation(async () => {
    await attendanceApi.approveRequest(effectiveWorkplaceId, id);
    if (currentScreen.name === 'request-detail') popScreen();
    await loadWorkplaceData(); showSuccess('Attendance approved.');
  });
  const handleConfirmReject = () => runMutation(async () => {
    if (!rejectTargetId) return;
    await attendanceApi.rejectRequest(effectiveWorkplaceId, rejectTargetId, rejectionReason.trim());
    setRejectTargetId(null); if (currentScreen.name === 'request-detail') popScreen();
    await loadWorkplaceData(); showSuccess('Request rejected.');
  });
  const handleConfirmCloseSession = () => runMutation(async () => {
    await attendanceApi.closeSession(effectiveWorkplaceId);
    setShowCloseSessionConfirm(false); popScreen(); await loadWorkplaceData(); showSuccess('Attendance closed for today.');
  });
  const handleOpenSession = async () => {
    if (isOpeningSession || mutationLock.current) return;
    mutationLock.current = true;
    setIsOpeningSession(true);
    setOpenSessionStatus('Opening attendance session...');
    try {
      setOpenSessionStatus('Creating session & generating secure QR code...');
      await attendanceApi.openSession(effectiveWorkplaceId);
      setOpenSessionStatus('Updating live workplace session...');
      await loadWorkplaceData();
      showSuccess('Attendance session opened! QR code is ready.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to open session. Please try again.');
    } finally {
      setIsOpeningSession(false);
      setOpenSessionStatus('');
      mutationLock.current = false;
    }
  };
  const handleSaveManualAttendance = () => runMutation(async () => {
    if (!manualTargetEmp || !manualReason.trim()) throw new Error('Choose an employee and supply a correction reason.');
    await attendanceApi.markManualAttendance(effectiveWorkplaceId, { employeeMemberId: manualTargetEmp.id, attendanceDate: manualDate, status: manualStatus as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE', correctionReason: manualReason.trim() });
    if (showManualAttendanceModal) {
      setShowManualAttendanceModal(false);
    } else {
      popScreen();
    }
    await loadWorkplaceData();
    showSuccess('Attendance saved.');
  });
  const handleSaveAddEmployee = () => runMutation(async () => {
    if (!newEmpEmail.trim()) throw new Error('Enter the employee email.');
    const res = await attendanceApi.addEmployee(effectiveWorkplaceId, { email: newEmpEmail.trim(), name: newEmpName.trim() || undefined, employeeCode: newEmpCode.trim() || undefined });
    const fullLink = res.joinLink || `https://www.bizora.shivamshankhdhar.online/join/${res.inviteToken}`;
    setCreatedInvite({ id: res.employee.id, email: res.employee.invitedEmail || newEmpEmail.trim(), token: res.inviteToken, joinLink: fullLink });
    await loadWorkplaceData(); showSuccess('Employee invitation created. Share the code or link with them.');
  });
  const handleResetEmployeePin = (id: string, name: string) => runMutation(async () => {
    if (!/^\d{4,6}$/.test(newPin)) throw new Error('Enter a new PIN containing 4–6 digits.');
    await attendanceApi.resetPin(effectiveWorkplaceId, id, newPin);
    setNewPin(''); setShowNewPin(false); setEmployeePinModalVisible(false); await loadWorkplaceData(); showSuccess(`PIN updated for ${name}.`);
  });
  const handleDeactivateEmployee = (id: string, name: string) => runMutation(async () => {
    await attendanceApi.updateEmployee(effectiveWorkplaceId, id, { status: 'INACTIVE' });
    if (currentScreen.name === 'employee-detail') popScreen();
    await loadWorkplaceData(); showSuccess(`${name} has been deactivated.`);
  });
  const copyInvite = async () => {
    if (!createdInvite) return;
    try {
      if (Platform.OS === 'web') { await navigator.clipboard.writeText(createdInvite.token); showSuccess('Invitation code copied.'); }
      else await Share.share({ message: `Your invitation code: ${createdInvite.token}` });
    } catch { showError('Unable to share. Select and copy the invitation code.'); }
  };
  const copyInviteLink = async () => {
    if (!createdInvite) return;
    const link = createdInvite.joinLink || `https://www.bizora.shivamshankhdhar.online/join/${createdInvite.token}`;
    try {
      if (Platform.OS === 'web') { await navigator.clipboard.writeText(link); showSuccess('Invitation link copied.'); }
      else await Share.share({ message: `Join our workplace on Bizora: ${link}` });
    } catch { showError('Unable to share invite link.'); }
  };

  const handleApproveJoinRequest = async (requestId: string, candidateName: string) => {
    setProcessingJoinReqId(requestId);
    try {
      await attendanceApi.approveJoinRequest(effectiveWorkplaceId, requestId);
      showSuccess(`${candidateName} has been approved and added to your team!`);
      await queryClient.invalidateQueries({ queryKey: scope });
      await joinRequestsQuery.refetch();
    } catch (err: any) {
      showError(err.message || 'Failed to approve join request.');
    } finally {
      setProcessingJoinReqId(null);
    }
  };

  const handleConfirmRejectJoinRequest = async () => {
    if (!rejectJoinReqTarget) return;
    setProcessingJoinReqId(rejectJoinReqTarget.id);
    try {
      await attendanceApi.rejectJoinRequest(effectiveWorkplaceId, rejectJoinReqTarget.id, { reason: rejectJoinReqReason.trim() });
      showSuccess(`Join request from ${rejectJoinReqTarget.name} has been rejected.`);
      setRejectJoinReqTarget(null);
      await queryClient.invalidateQueries({ queryKey: scope });
      await joinRequestsQuery.refetch();
    } catch (err: any) {
      showError(err.message || 'Failed to reject join request.');
    } finally {
      setProcessingJoinReqId(null);
    }
  };


  const handleShareDailySummary = async () => {
    const total = liveCounts?.totalEmployees ?? 0;
    const present = liveCounts?.presentCount ?? 0;
    const pending = liveCounts?.pendingCount ?? 0;
    const notMarked = liveCounts?.notMarkedCount ?? 0;
    const summaryText =
      `📊 ${workplaceName || 'Workplace'} Attendance Summary\n` +
      `📅 ${todayDateFormatted}\n\n` +
      `👥 Total Employees: ${total}\n` +
      `✅ Present: ${present}\n` +
      `⏳ Pending Approval: ${pending}\n` +
      `⭕ Not Marked: ${notMarked}\n\n` +
      `QR Session: ${isSessionOpen ? `Open (since ${sessionOpenedAt})` : 'Closed'}`;

    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(summaryText);
        showSuccess('Daily attendance summary copied to clipboard.');
      } else {
        await Share.share({ message: summaryText });
      }
    } catch {
      showError('Unable to share summary.');
    }
  };

  // If initial roster query has failed and there is no cached data, show clean retry screen
  if (activeTab === 'today' && rosterQuery.isError && !rosterQuery.data) {
    return (
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, backgroundColor: Palette.canvas, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <WorkplaceSwitcherModal showDetailsLinks={false} visible={switching} onClose={() => setSwitching(false)} />
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Palette.dangerTint, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Feather name="alert-triangle" size={28} color={Palette.danger} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: Palette.textPrimary, marginBottom: 8, textAlign: 'center' }}>
            Unable to Load Workplace Data
          </Text>
          <Text style={{ fontSize: 14, color: Palette.textSecondary, textAlign: 'center', marginBottom: 24, maxWidth: 300, lineHeight: 20 }}>
            {rosterQuery.error instanceof Error ? rosterQuery.error.message : 'Please check your connection and try again.'}
          </Text>
          <View style={{ width: '100%', maxWidth: 280, gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => { void loadWorkplaceData(); }}
              style={{ backgroundColor: Palette.brandPrimary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Retry</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSwitching(true)}
              style={{ backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.cardBorder, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: Palette.textPrimary, fontSize: 15, fontWeight: '600' }}>Switch Workplace</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }


  if (currentScreen.name === 'tabs') {
    if (activeTab === 'today' && !rosterQuery.data && rosterQuery.isLoading) {
      return (
        <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
          <SwipeTabs values={EMPLOYER_TAB_KEYS} selected={activeTab} onSelect={selectEmployerTab} style={swipePageStyle}>
          <EmployerTodaySkeleton
            activeTab="today"
            workplaceName={workplaceName}
            initials={initials}
            avatarUrl={user?.avatarUrl}
            todayDateFormatted={todayDateFormatted}
            onSelectTab={selectEmployerTab}
          />
          </SwipeTabs>
        </SafeAreaView>
      );
    }
    if (activeTab === 'employees' && (!employeesQuery.data || employeesQuery.isLoading)) {
      return (
        <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
          <SwipeTabs values={EMPLOYER_TAB_KEYS} selected={activeTab} onSelect={selectEmployerTab} style={swipePageStyle}>
          <EmployerEmployeesSkeleton onSelectTab={selectEmployerTab} initials={initials} avatarUrl={user?.avatarUrl} hideHeader={true} />
          </SwipeTabs>
        </SafeAreaView>
      );
    }

  }

  const renderAttendanceQrCard = () => (
    <>
      {isSessionOpen ? (
        /* Active: QR thumbnail centred, tap to open kiosk */
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tap to open full-screen QR kiosk"
          onPress={() => setShowAttendanceQrModal(true)}
          style={styles.qrBadgePressable}
        >
          {sessionQrPayload ? (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={[styles.sessionStatusDot, { backgroundColor: '#16A34A' }]} />
                <Text style={[styles.sessionStatusText, { color: '#166534' }]}>Session active</Text>
              </View>
              <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: palette.border }}>
                <QRCode value={sessionQrPayload} size={130} color="#000000" backgroundColor="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 12, color: palette.textSecondary, fontWeight: '500' }}>
                Tap to open full-screen kiosk
              </Text>
            </View>
          ) : (
            <View style={styles.qrLoadingBox}>
              <ActivityIndicator size="small" color={palette.brandPrimary} />
            </View>
          )}
        </Pressable>
      ) : (
        /* Closed: prompt to start session */
        <View style={styles.qrInactiveBody}>
          <View style={styles.qrInactiveHero}>
            <View style={[styles.qrInactiveHeroCircle, { backgroundColor: palette.brandTint }]}>
              <MaterialCommunityIcons name="qrcode-scan" size={26} color={palette.brandPrimary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.qrInactiveHeading}>Start Today's Attendance</Text>
              <Text style={styles.qrInactiveSub}>
                Generate live dynamic QR codes for team check-in and check-out.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isOpeningSession}
            onPress={handleOpenSession}
            style={({ pressed }) => [styles.qrStartSessionBtn, { backgroundColor: palette.brandPrimary }, isOpeningSession && styles.emptyPrimarySolidBtnDisabled, pressed && styles.btnPressed]}
          >
            {isOpeningSession ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.qrStartSessionBtnText}>Opening session...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Feather name="play-circle" size={16} color="#FFFFFF" />
                <Text style={styles.qrStartSessionBtnText}>Open Attendance Session</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.qrFeatureChipsRow}>
            <View style={styles.qrFeatureChip}>
              <Feather name="shield" size={11} color={palette.brandPrimary} />
              <Text style={styles.qrFeatureChipText}>Anti-Spoof QR</Text>
            </View>
            <View style={styles.qrFeatureChip}>
              <Feather name="map-pin" size={11} color={palette.brandPrimary} />
              <Text style={styles.qrFeatureChipText}>Geofenced</Text>
            </View>
            <View style={styles.qrFeatureChip}>
              <Feather name="wifi" size={11} color={palette.brandPrimary} />
              <Text style={styles.qrFeatureChipText}>Wi-Fi Sync</Text>
            </View>
          </View>
        </View>
      )}

      {/* End Session — only shown when active */}
      {isSessionOpen && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close today attendance session"
          onPress={() => setShowCloseSessionConfirm(true)}
          style={({ pressed }) => [styles.qrCloseSessionBtn, pressed && styles.btnPressed]}
        >
          <Feather name="power" size={13} color={Palette.danger} />
          <Text style={styles.qrCloseSessionBtnText}>End Session</Text>
        </Pressable>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <SyncStatusBanner
        visible={hasBackgroundSyncError}
        lastSyncedTimestamp={lastSyncTimestamp}
        onRetry={handleRetrySync}
        isRetrying={isSyncRetrying}
      />
      <Animated.View style={[styles.screenWrapper, { opacity: screenFadeAnim }]}>
        <WorkplaceSwitcherModal visible={switching} onClose={() => setSwitching(false)} />
        <NotificationsModal visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} />
      {/* SCREEN 1: MAIN DASHBOARD (Today | Attendance | Employees) */}
      {currentScreen.name === 'tabs' && (
        <SwipeTabs values={EMPLOYER_TAB_KEYS} selected={activeTab} onSelect={selectEmployerTab} style={swipePageStyle}>
          {/* 1. TOP HEADER MATCHING MOCKUP - Only on Home screen (Today tab) */}
          {/* 1. TOP HEADER (Fixed / Non-scrolling) */}
          {activeTab === 'today' && (
            <View style={styles.headerWrapper}>
              <HeaderBackgroundArt />
              {/* Home Header Options with Name, Live Green Dot, Theme Toggle, Notification Bell, and Avatar */}
              <HomeHeaderOptions
                avatarUrl={user?.avatarUrl}
                initials={initials}
                userName={user?.name}
                userEmail={user?.email}
                onOpenNotifications={() => setNotificationsVisible(true)}
                onProfilePress={openSettings}
                onSearchPress={() => pushScreen({ name: 'employee-search' })}
              />
            </View>
          )}

      {/* Main Tab Content */}
      <View style={styles.contentArea}>
        {/* TAB 1: TODAY (Matching Image Exactly) */}
        {activeTab === 'today' && (
          (sessionQuery.isLoading || rosterQuery.isLoading) && !rosterQuery.data ? (
            <EmployerTodaySkeleton
              activeTab="today"
              workplaceName={workplaceName}
              initials={initials}
              avatarUrl={user?.avatarUrl}
              todayDateFormatted={todayDateFormatted}
              onSelectTab={selectEmployerTab}
              hideHeader={true}
              hideBottomBar={true}
            />
          ) : (
          <ScrollView
            contentOffset={{ x: 0, y: 0 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handlePullRefresh}
                tintColor={palette.brandPrimary}
                colors={[palette.brandPrimary]}
              />
            }
          >
            {/* 1. WORKPLACE IDENTITY & LIVE SESSION CARD */}
            <View style={[styles.homeCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>

              {/* Gradient-style header band */}
              <View style={[styles.homeCardBand, { backgroundColor: palette.brandTint, borderBottomColor: isDark ? palette.border : '#D8E8B8' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={[styles.homeCardBandIcon, { backgroundColor: palette.brandPrimary }]}>
                    <Feather name="briefcase" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.homeCardBandLabel, { color: palette.textSecondary }]}>Active Workplace</Text>
                </View>
                {/* Live indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={[styles.homeLiveDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A', letterSpacing: 0.4 }}>LIVE</Text>
                </View>
              </View>


              {/* Card body — full-width single column */}
              <View style={{ padding: 14 }}>

                {/* ROW 1: Workplace name + switch chevron */}
                <Pressable
                  onPress={() => setSwitching(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Switch workplace"
                >
                  <Text style={[styles.homeWpTitle, { color: palette.textPrimary, flex: 1 }]} numberOfLines={2}>
                    {workplaceName || 'Workplace'}
                  </Text>
                  <View style={[styles.homeWpSwitcherBadge, { backgroundColor: palette.brandTint, borderColor: isDark ? palette.border : '#C8DDA0' }]}>
                    <Feather name="chevron-down" size={11} color={palette.brandPrimary} />
                  </View>
                </Pressable>

                {/* ROW 2: Code pill + Share button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>

                  {/* Code pill — tap to copy */}
                  <Pressable
                    onPress={handleCopyWorkplaceCode}
                    style={({ pressed }) => [
                      styles.homeCodePill,
                      { backgroundColor: isDark ? palette.surfaceMuted : '#F5F9EE', borderColor: isDark ? palette.border : '#C8DDA0' },
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Copy workplace code ${effectiveWorkplaceCode}`}
                  >
                    <Feather name="hash" size={11} color={palette.brandPrimary} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: palette.brandPrimary, letterSpacing: 0.5 }}>
                      {effectiveWorkplaceCode}
                    </Text>
                    <View style={[styles.homeCopyBadge, { backgroundColor: isCodeCopied ? '#DCFCE7' : (isDark ? palette.border : '#E8EFD8') }]}>
                      <Feather
                        name={isCodeCopied ? 'check' : 'copy'}
                        size={10}
                        color={isCodeCopied ? '#16A34A' : palette.brandPrimary}
                      />
                    </View>
                  </Pressable>

                  {/* Share button — opens full QR modal */}
                  <Pressable
                    ref={qrButtonRef}
                    onPress={() => setJoinQrModalVisible(true)}
                    style={({ pressed }) => [
                      styles.homeShareBtn,
                      { backgroundColor: pressed ? palette.brandPressed : palette.brandPrimary, opacity: pressed ? 0.9 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Share workplace QR code"
                  >
                    <Feather name="share-2" size={13} color="#FFFFFF" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 }}>Share & Invite</Text>
                  </Pressable>

                </View>

                {/* Dual-role switcher */}
                {memberships.filter((m) => m.status === 'ACTIVE' && m.role === 'EMPLOYEE').length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const target = memberships.find((m) => m.status === 'ACTIVE' && m.role === 'EMPLOYEE');
                      if (target) selectWorkplace(target);
                    }}
                    style={({ pressed }) => [{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F0FDF4',
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                      borderRadius: 8,
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      marginTop: 12,
                      gap: 5,
                      alignSelf: 'flex-start',
                    }, pressed && { opacity: 0.75 }]}
                  >
                    <Feather name="repeat" size={11} color="#16A34A" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>Employee View</Text>
                    <Feather name="arrow-right" size={10} color="#16A34A" />
                  </Pressable>
                )}

              </View>
            </View>


            {/* CONTEXTUAL ATTENDANCE CTA */}
            {(() => {
              const hour = new Date(now).getHours(); // 0-23 from workplace clock
              const isMorning = hour < 12;
              const label = isMorning ? 'Mark Attendance' : 'Mark Checkout';
              const icon = isMorning ? 'log-in' : 'log-out';
              const accentBg = isMorning
                ? (isDark ? palette.brandPrimary : palette.brandPrimary)
                : '#D97706';
              const accentSubtitle = isMorning
                ? 'Tap to check in for today'
                : 'Tap to record your checkout';
              return (
                <Pressable
                  onPress={() => {
                    setAttendanceQrTab(isMorning ? 'checkin' : 'checkout');
                    setShowAttendanceQrModal(true);
                  }}
                  style={({ pressed }) => [
                    styles.homeAttendanceCta,
                    { backgroundColor: accentBg, opacity: pressed ? 0.88 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                >
                  {/* Left icon bubble */}
                  <View style={styles.homeAttendanceCtaIcon}>
                    <Feather name={icon} size={20} color="#FFFFFF" />
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.homeAttendanceCtaTitle, { color: '#FFFFFF' }]}>{label}</Text>
                    <Text style={[styles.homeAttendanceCtaSub, { color: 'rgba(255,255,255,0.85)' }]}>{accentSubtitle}</Text>
                  </View>

                  {/* Right arrow */}
                  <View style={styles.homeAttendanceCtaArrow}>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  </View>
                </Pressable>
              );
            })()}

            {/* 2. LIVE METRICS KPI STRIP */}
            <View style={styles.homeKpiRow}>
              {/* Present */}
              <Pressable
                onPress={() => { setHomePulseFilter('PRESENT'); setHomeSectionTab('pulse'); }}
                style={[styles.homeKpiBox, { backgroundColor: isDark ? '#052E1640' : '#F0FDF4', borderColor: isDark ? '#047857' : '#BBF7D0' }]}
              >
                <View style={[styles.homeKpiIconWrap, { backgroundColor: isDark ? '#064E3B60' : '#DCFCE7' }]}>
                  <Feather name="user-check" size={15} color="#16A34A" />
                </View>
                <Text style={[styles.homeKpiVal, { color: isDark ? '#4ADE80' : '#166534' }]}>{presentCount}</Text>
                <Text style={[styles.homeKpiTxt, { color: isDark ? '#86EFAC' : '#15803D' }]}>Present</Text>
                <View style={[styles.homeKpiAccent, { backgroundColor: '#22C55E' }]} />
              </Pressable>

              {/* Pending */}
              <Pressable
                onPress={() => setHomeSectionTab('approvals')}
                style={[styles.homeKpiBox, { backgroundColor: isDark ? '#431A0540' : '#FFFBEB', borderColor: isDark ? '#B45309' : '#FDE68A' }]}
              >
                <View style={[styles.homeKpiIconWrap, { backgroundColor: isDark ? '#78350F50' : '#FEF3C7' }]}>
                  <Feather name="clock" size={15} color="#D97706" />
                </View>
                <Text style={[styles.homeKpiVal, { color: isDark ? '#FCD34D' : '#B45309' }]}>{pendingCount}</Text>
                <Text style={[styles.homeKpiTxt, { color: isDark ? '#FDE68A' : '#D97706' }]}>Pending</Text>
                <View style={[styles.homeKpiAccent, { backgroundColor: '#F59E0B' }]} />
              </Pressable>

              {/* Not Marked */}
              <Pressable
                onPress={() => { setHomePulseFilter('NOT_MARKED'); setHomeSectionTab('pulse'); }}
                style={[styles.homeKpiBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: palette.border }]}
              >
                <View style={[styles.homeKpiIconWrap, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  <Feather name="user-x" size={15} color={palette.textSecondary} />
                </View>
                <Text style={[styles.homeKpiVal, { color: palette.textPrimary }]}>{Math.max(0, totalEmployeesCount - presentCount)}</Text>
                <Text style={[styles.homeKpiTxt, { color: palette.textSecondary }]}>Absent</Text>
                <View style={[styles.homeKpiAccent, { backgroundColor: palette.border }]} />
              </Pressable>

              {/* Team */}
              <Pressable
                onPress={() => setActiveTab('employees')}
                style={[styles.homeKpiBox, { backgroundColor: palette.brandTint, borderColor: isDark ? palette.border : '#C8DDA0' }]}
              >
                <View style={[styles.homeKpiIconWrap, { backgroundColor: isDark ? '#243315' : '#D8EAAE' }]}>
                  <Feather name="users" size={15} color={palette.brandPrimary} />
                </View>
                <Text style={[styles.homeKpiVal, { color: palette.brandPrimary }]}>{totalEmployeesCount}</Text>
                <Text style={[styles.homeKpiTxt, { color: palette.brandPrimary }]}>Team</Text>
                <View style={[styles.homeKpiAccent, { backgroundColor: palette.brandPrimary }]} />
              </Pressable>
            </View>

            {/* 3. HOME SCREEN NAVIGATION TABS */}
            <View style={[styles.homeSegmentWrap, { backgroundColor: isDark ? '#1A1F2E' : '#EEF2E8', borderColor: isDark ? palette.border : '#D0DDB4' }]}>
              {/* Tab: Actions Hub */}
              <Pressable
                onPress={() => setHomeSectionTab('hub')}
                style={[styles.homeSegmentBtn, homeSectionTab === 'hub' && [styles.homeSegmentBtnActive, { backgroundColor: palette.surface, shadowColor: palette.brandPrimary }]]}
              >
                {homeSectionTab === 'hub' && <View style={[styles.homeSegmentActiveDot, { backgroundColor: palette.brandPrimary }]} />}
                <MaterialCommunityIcons name="lightning-bolt" size={15} color={homeSectionTab === 'hub' ? palette.brandPrimary : palette.textSecondary} />
                <Text style={[styles.homeSegmentText, { color: homeSectionTab === 'hub' ? palette.brandPrimary : palette.textSecondary }, homeSectionTab === 'hub' && styles.homeSegmentTextActive]}>
                  Actions
                </Text>
              </Pressable>

              {/* Tab: Team Pulse */}
              <Pressable
                onPress={() => setHomeSectionTab('pulse')}
                style={[styles.homeSegmentBtn, homeSectionTab === 'pulse' && [styles.homeSegmentBtnActive, { backgroundColor: palette.surface, shadowColor: palette.brandPrimary }]]}
              >
                {homeSectionTab === 'pulse' && <View style={[styles.homeSegmentActiveDot, { backgroundColor: palette.brandPrimary }]} />}
                <Feather name="activity" size={14} color={homeSectionTab === 'pulse' ? palette.brandPrimary : palette.textSecondary} />
                <Text style={[styles.homeSegmentText, { color: homeSectionTab === 'pulse' ? palette.brandPrimary : palette.textSecondary }, homeSectionTab === 'pulse' && styles.homeSegmentTextActive]}>
                  Pulse
                </Text>
              </Pressable>

              {/* Tab: Approvals */}
              <Pressable
                onPress={() => setHomeSectionTab('approvals')}
                style={[styles.homeSegmentBtn, homeSectionTab === 'approvals' && [styles.homeSegmentBtnActive, { backgroundColor: palette.surface, shadowColor: palette.brandPrimary }]]}
              >
                {homeSectionTab === 'approvals' && <View style={[styles.homeSegmentActiveDot, { backgroundColor: palette.brandPrimary }]} />}
                <Feather name="check-circle" size={14} color={homeSectionTab === 'approvals' ? palette.brandPrimary : palette.textSecondary} />
                <Text style={[styles.homeSegmentText, { color: homeSectionTab === 'approvals' ? palette.brandPrimary : palette.textSecondary }, homeSectionTab === 'approvals' && styles.homeSegmentTextActive]}>
                  Approvals
                </Text>
                {pendingCount > 0 && (
                  <View style={styles.homeTabBadge}>
                    <Text style={styles.homeTabBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* 4. TAB CONTENT: ACTIONS HUB */}
            {homeSectionTab === 'hub' && (
              <View style={{ gap: 14 }}>
                {/* Attendance Group */}
                <View>
                  <Text style={[styles.homeActionGroupTitle, { color: palette.textSecondary }]}>
                    Attendance & Tracking
                  </Text>

                  {/* 1. QR Kiosk */}
                  <Pressable
                    onPress={() => setShowAttendanceQrModal(true)}
                    style={({ pressed }) => [
                      styles.homeActionRow,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <View style={[styles.homeActionIconBubble, { backgroundColor: '#DCFCE7' }]}>
                      <MaterialCommunityIcons name="qrcode-scan" size={20} color="#166534" />
                    </View>
                    <View style={styles.homeActionMainCol}>
                      <Text style={[styles.homeActionMainTitle, { color: palette.textPrimary }]}>Today's Attendance</Text>
                      <Text style={[styles.homeActionMainSub, { color: palette.textSecondary }]}>
                        Front-desk check-in QR code & session manager
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={palette.textSecondary} />
                  </Pressable>

                  {/* 2. Manual Attendance */}
                  <Pressable
                    onPress={() => {
                      setManualTargetEmp(effectiveEmployees[0] || null);
                      setManualReason('');
                      setManualDate(today);
                      setShowManualAttendanceModal(true);
                    }}
                    style={({ pressed }) => [
                      styles.homeActionRow,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <View style={[styles.homeActionIconBubble, { backgroundColor: palette.brandTint }]}>
                      <Feather name="user-check" size={20} color={palette.brandPrimary} />
                    </View>
                    <View style={styles.homeActionMainCol}>
                      <Text style={[styles.homeActionMainTitle, { color: palette.textPrimary }]}>Manual Attendance</Text>
                      <Text style={[styles.homeActionMainSub, { color: palette.textSecondary }]}>
                        Record or correct attendance for any employee
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={palette.textSecondary} />
                  </Pressable>

                  {/* 3. Daily Attendance Roster */}
                  <Pressable
                    onPress={() => {
                      selectAttendanceView('Daily');
                      setActiveTab('attendance');
                    }}
                    style={({ pressed }) => [
                      styles.homeActionRow,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <View style={[styles.homeActionIconBubble, { backgroundColor: '#E0E7FF' }]}>
                      <Feather name="calendar" size={20} color="#4338CA" />
                    </View>
                    <View style={styles.homeActionMainCol}>
                      <Text style={[styles.homeActionMainTitle, { color: palette.textPrimary }]}>Daily Attendance Roster</Text>
                      <Text style={[styles.homeActionMainSub, { color: palette.textSecondary }]}>
                        View full logs, employee statuses and calendar
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={palette.textSecondary} />
                  </Pressable>
                </View>

                {/* Team & Management Group */}
                <View>
                  <Text style={[styles.homeActionGroupTitle, { color: palette.textSecondary }]}>
                    Team & Administration
                  </Text>

                  {/* 4. Team Directory */}
                  <Pressable
                    onPress={() => setActiveTab('employees')}
                    style={({ pressed }) => [
                      styles.homeActionRow,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <View style={[styles.homeActionIconBubble, { backgroundColor: '#EFF6FF' }]}>
                      <Feather name="users" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.homeActionMainCol}>
                      <Text style={[styles.homeActionMainTitle, { color: palette.textPrimary }]}>Team Directory</Text>
                      <Text style={[styles.homeActionMainSub, { color: palette.textSecondary }]}>
                        Manage {totalEmployeesCount} members, profiles & PINs
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={palette.textSecondary} />
                  </Pressable>

                  {/* 5. Add Member */}
                  <Pressable
                    onPress={openAddEmployee}
                    style={({ pressed }) => [
                      styles.homeActionRow,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <View style={[styles.homeActionIconBubble, { backgroundColor: '#FEF3C7' }]}>
                      <Feather name="user-plus" size={20} color="#D97706" />
                    </View>
                    <View style={styles.homeActionMainCol}>
                      <Text style={[styles.homeActionMainTitle, { color: palette.textPrimary }]}>Add Team Member</Text>
                      <Text style={[styles.homeActionMainSub, { color: palette.textSecondary }]}>
                        Send email invitation or share join link
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={palette.textSecondary} />
                  </Pressable>

                  {/* 6. Reports */}
                  <Pressable
                    onPress={() => {
                      selectAttendanceView('Reports');
                      setActiveTab('attendance');
                    }}
                    style={({ pressed }) => [
                      styles.homeActionRow,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <View style={[styles.homeActionIconBubble, { backgroundColor: '#EDE9FE' }]}>
                      <Feather name="bar-chart-2" size={20} color="#6D28D9" />
                    </View>
                    <View style={styles.homeActionMainCol}>
                      <Text style={[styles.homeActionMainTitle, { color: palette.textPrimary }]}>Attendance Reports</Text>
                      <Text style={[styles.homeActionMainSub, { color: palette.textSecondary }]}>
                        Monthly trends, summaries & CSV exports
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={palette.textSecondary} />
                  </Pressable>

                  {/* 7. Workplace Setup */}
                  <Pressable
                    onPress={() => setActiveTab('workplace')}
                    style={({ pressed }) => [
                      styles.homeActionRow,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <View style={[styles.homeActionIconBubble, { backgroundColor: '#F1F5F9' }]}>
                      <Feather name="settings" size={20} color="#475569" />
                    </View>
                    <View style={styles.homeActionMainCol}>
                      <Text style={[styles.homeActionMainTitle, { color: palette.textPrimary }]}>Workplace Setup</Text>
                      <Text style={[styles.homeActionMainSub, { color: palette.textSecondary }]}>
                        Wi-Fi requirements, auto-close hour & settings
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={palette.textSecondary} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* 5. TAB CONTENT: TEAM PULSE */}
            {homeSectionTab === 'pulse' && (
              <View>
                {/* Filter Pills */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {(['ALL', 'PRESENT', 'NOT_MARKED'] as const).map((filterKey) => {
                    const isSelected = homePulseFilter === filterKey;
                    const label = filterKey === 'ALL'
                      ? `All (${effectiveRoster.length})`
                      : filterKey === 'PRESENT'
                      ? `Present (${attendanceStatusCounts.PRESENT})`
                      : `Not In (${Math.max(0, effectiveRoster.length - attendanceStatusCounts.PRESENT)})`;
                    return (
                      <Pressable
                        key={filterKey}
                        onPress={() => setHomePulseFilter(filterKey)}
                        style={[
                          styles.requestsFilterPill,
                          isSelected && {
                            backgroundColor: palette.brandPrimary,
                            borderColor: palette.brandPrimary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.requestsFilterPillText,
                            isSelected && { color: '#FFFFFF', fontWeight: '700' },
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Team Roster List */}
                {filteredPulseRoster.length === 0 ? (
                  <View style={[styles.pulseEmptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Feather name="users" size={32} color={palette.textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={[styles.pulseEmptyTitle, { color: palette.textPrimary }]}>No employees found</Text>
                    <Text style={[styles.pulseEmptySub, { color: palette.textSecondary }]}>
                      No employees match the selected filter today.
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.pulseCardList, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    {filteredPulseRoster.map((emp, idx, arr) => (
                      <Pressable
                        key={emp.memberId || idx}
                        onPress={() => openRosterEmployee(emp.memberId)}
                        style={({ pressed }) => [
                          styles.pulseRow,
                          { borderBottomColor: palette.border },
                          idx === arr.length - 1 && { borderBottomWidth: 0 },
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <View style={{ marginRight: 12 }}>
                          <Avatar name={emp.name} avatarUrl={emp.avatarUrl} size="md" />
                        </View>
                        <View style={styles.pulseInfoCol}>
                          <Text style={[styles.pulseName, { color: palette.textPrimary }]}>{emp.name}</Text>
                          <Text style={[styles.pulseCode, { color: palette.textSecondary }]}>{emp.code}</Text>
                          <Text style={[styles.pulseAttendanceTimes, { color: palette.textSecondary }]} numberOfLines={1}>
                            In {emp.checkInDisplay} · Out {emp.checkOutDisplay}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <StatusChip status={emp.status} size="sm" />
                          {emp.status !== 'PRESENT' && (
                            <Pressable
                              onPress={() => {
                                const matched = effectiveEmployees.find((e) => e.id === emp.memberId);
                                setManualTargetEmp(matched || null);
                                setManualReason('');
                                setManualDate(today);
                                setShowManualAttendanceModal(true);
                              }}
                              style={styles.pulseQuickMarkBtn}
                            >
                              <Text style={styles.pulseQuickMarkText}>+ Mark</Text>
                            </Pressable>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Footer link to full Daily tab */}
                <Pressable
                  onPress={() => {
                    selectAttendanceView('Daily');
                    setActiveTab('attendance');
                  }}
                  style={styles.homeViewAllLink}
                >
                  <Text style={[styles.homeViewAllLinkText, { color: palette.brandPrimary }]}>
                    View calendar & full roster in Attendance tab
                  </Text>
                  <Feather name="arrow-right" size={14} color={palette.brandPrimary} />
                </Pressable>
              </View>
            )}

            {/* 6. TAB CONTENT: APPROVALS */}
            {homeSectionTab === 'approvals' && (
              <View>
                {pendingRequests.length === 0 ? (
                  <View style={[styles.homeCard, { backgroundColor: palette.surface, borderColor: palette.border, alignItems: 'center', paddingVertical: 28 }]}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Feather name="check-circle" size={28} color="#16A34A" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: palette.textPrimary, marginBottom: 4 }}>
                      You're all caught up! ✨
                    </Text>
                    <Text style={{ fontSize: 13, color: palette.textSecondary, textAlign: 'center', maxWidth: 260, lineHeight: 18, marginBottom: 16 }}>
                      No pending check-in or check-out requests waiting for your review.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void handlePullRefresh()}
                      disabled={isPullRefreshing}
                      style={({ pressed }) => [
                        styles.emptyPendingRefreshBtn,
                        { backgroundColor: palette.brandPrimary },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      {isPullRefreshing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Feather name="refresh-cw" size={13} color="#FFFFFF" />
                          <Text style={styles.emptyPendingRefreshText}>Refresh</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {pendingRequests.map((req) => (
                      <AttendanceRequestCard
                        key={req.id}
                        request={{
                          id: req.id,
                          name: req.name,
                          email: req.email,
                          code: req.code,
                          avatarUrl: req.avatarUrl,
                          time: req.time,
                          date: req.date,
                          status: req.status,
                          requestType: req.requestType,
                          qrVerified: req.qrVerified,
                          wifiVerified: req.wifiVerified,
                          notes: req.notes,
                        }}
                        onPress={() => openRequestDetail(req)}
                        onApprove={() => handleInlineQueueApprove(req)}
                        onReject={() => setRejectTargetId(req.id)}
                        isApproving={approvingCardId === req.id}
                        showActions={true}
                      />
                    ))}
                  </View>
                )}

                {/* Footer link to full Requests tab */}
                <Pressable
                  onPress={openRequestsQueue}
                  style={styles.homeViewAllLink}
                >
                  <Text style={[styles.homeViewAllLinkText, { color: palette.brandPrimary }]}>
                    View all approvals & history in Attendance tab
                  </Text>
                  <Feather name="arrow-right" size={14} color={palette.brandPrimary} />
                </Pressable>
              </View>
            )}
          </ScrollView>
          )
        )}

        {/* TAB 2: ATTENDANCE -> VIEW 1: MARK */}
        {activeTab === 'attendance' && attendanceView === 'Mark' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handlePullRefresh}
                tintColor={palette.brandPrimary}
                colors={[palette.brandPrimary]}
              />
            }
          >
            {/* Top Screen Header: ATTENDANCE */}
            <View style={styles.employeesTopBar}>
              <View style={styles.employeesHeading}>
                <Text style={styles.empTitleHeading}>Attendance</Text>
                <Text style={styles.empSubtitle}>Mark attendance, live QR & manual entry.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="How attendance marking works"
                onPress={() => setShowMarkInstructionsModal(true)}
                style={({ pressed }) => [
                  styles.markHelpHeaderBtn,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="help-circle" size={15} color={palette.brandPrimary} />
                <Text style={[styles.markHelpHeaderBtnText, { color: palette.textPrimary }]}>Help</Text>
              </Pressable>
            </View>

            {/* Subtabs Switcher */}
            <View style={{ marginBottom: 16 }}>
              <ExplorerTabs
                values={['Mark', 'Requests', 'Daily', 'Reports']}
                selected={attendanceView}
                onSelect={selectAttendanceView}
                variant="segmented"
                badges={{ Requests: pendingRequests.length }}
              />
            </View>

            {/* Vertical Options List */}
            <View style={[styles.markOptionsContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              {/* Option 1: Manual Attendance */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manual Attendance"
                onPress={() => {
                  setManualTargetEmp(effectiveEmployees[0] || null);
                  setManualReason('');
                  setManualDate(today);
                  setShowManualAttendanceModal(true);
                }}
                style={({ pressed }) => [
                  styles.markOptionRow,
                  { borderBottomColor: palette.border, borderBottomWidth: 1 },
                  pressed && styles.btnPressed,
                ]}
              >
                <View style={[styles.markOptionIconBox, { backgroundColor: palette.brandTint }]}>
                  <Feather name="user-check" size={20} color={palette.brandPrimary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.markOptionTitle, { color: palette.textPrimary }]}>Manual Attendance</Text>
                  <Text style={[styles.markOptionSubtitle, { color: palette.textSecondary }]}>
                    Record, override, or adjust attendance for any team member
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={palette.textSecondary} />
              </Pressable>

              {/* Option 2: Open Attendance Session */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Attendance Session"
                onPress={() => setShowAttendanceQrModal(true)}
                style={({ pressed }) => [
                  styles.markOptionRow,
                  pressed && styles.btnPressed,
                ]}
              >
                <View style={[styles.markOptionIconBox, { backgroundColor: isSessionOpen ? '#DCFCE7' : palette.brandTint }]}>
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={20}
                    color={isSessionOpen ? '#16A34A' : palette.brandPrimary}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.markOptionTitle, { color: palette.textPrimary }]}>
                      {isSessionOpen ? 'Attendance Session' : 'Open Attendance Session'}
                    </Text>
                    <View style={{
                      backgroundColor: isSessionOpen ? '#DCFCE7' : palette.surfaceMuted,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: isSessionOpen ? '#166534' : palette.textSecondary,
                      }}>
                        {isSessionOpen ? 'Active' : 'Closed'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.markOptionSubtitle, { color: palette.textSecondary }]}>
                    {isSessionOpen
                      ? 'Live QR codes active · Tap to view QR or end session'
                      : "Start today's session to enable QR scanning"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={palette.textSecondary} />
              </Pressable>
            </View>
          </ScrollView>
        )}

        {/* TAB: ATTENDANCE -> REQUESTS */}
        {activeTab === 'attendance' && attendanceView === 'Requests' && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handlePullRefresh}
                tintColor={palette.brandPrimary}
                colors={[palette.brandPrimary]}
              />
            }
          >
            {/* Header */}
            <View style={styles.employeesTopBar}>
              <View style={styles.employeesHeading}>
                <Text style={styles.empTitleHeading}>Attendance</Text>
                <Text style={styles.empSubtitle}>Review and approve check-in & check-out requests.</Text>
              </View>
            </View>

            {/* Subtabs Switcher */}
            <View style={{ marginBottom: 14 }}>
              <ExplorerTabs
                values={['Mark', 'Requests', 'Daily', 'Reports']}
                selected={attendanceView}
                onSelect={selectAttendanceView}
                variant="segmented"
                badges={{ Requests: pendingRequests.length }}
              />
            </View>

            {/* Status Filter Chips: Pending | Approved | Rejected */}
            <View style={styles.requestsFilterPillsRow}>
              {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((t) => {
                const count =
                  t === 'PENDING'
                    ? pendingRequests.length
                    : t === 'APPROVED'
                    ? approvedRequests.length
                    : rejectedRequests.length;
                const isSelected = requestTab === t;
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setRequestTab(t)}
                    style={[
                      styles.requestsFilterPill,
                      isSelected && {
                        backgroundColor: palette.brandPrimary,
                        borderColor: palette.brandPrimary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.requestsFilterPillText,
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {t === 'PENDING' ? 'Pending' : t === 'APPROVED' ? 'Approved' : 'Rejected'} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Notice Callout */}
            {requestTab === 'PENDING' && pendingRequests.length > 0 && (
              <View style={styles.queueNoticeBox}>
                <Feather name="clock" size={15} color={palette.brandPrimary} />
                <Text style={styles.queueNoticeInlineText}>
                  QR scan requests remain pending until you make a decision.
                </Text>
              </View>
            )}

            {/* Requests List */}
            {effectiveRequests.filter((r) => r.status === requestTab).length === 0 ? (
              <View style={[styles.emptyPendingCard, { flexDirection: 'column', alignItems: 'center', paddingVertical: 24, gap: 12 }]}>
                {requestTab === 'PENDING' ? (
                  <DualPhoneReviewedIllustration size={110} />
                ) : (
                  <EmptyRequestsIllustration size={100} />
                )}
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.emptyPendingTitle, { textAlign: 'center' }]}>
                    {requestTab === 'PENDING'
                      ? "You're all caught up"
                      : requestTab === 'APPROVED'
                      ? 'No approved requests today'
                      : 'No rejected requests today'}
                  </Text>
                  <Text style={[styles.emptyPendingSub, { textAlign: 'center', maxWidth: 280 }]}>
                    {requestTab === 'PENDING'
                      ? 'No pending check-in or check-out requests waiting for your review.'
                      : requestTab === 'APPROVED'
                      ? 'Approved attendance requests for today will appear here.'
                      : 'Rejected attendance requests for today will appear here.'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh requests"
                  onPress={() => void handlePullRefresh()}
                  disabled={isPullRefreshing}
                  style={({ pressed }) => [styles.emptyPendingRefreshBtn, { alignSelf: 'center', marginTop: 4 }, pressed && { opacity: 0.7 }]}
                >
                  {isPullRefreshing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={13} color="#FFFFFF" />
                      <Text style={styles.emptyPendingRefreshText}>Refresh</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {effectiveRequests
                  .filter((r) => r.status === requestTab)
                  .map((reqItem) => (
                    <AttendanceRequestCard
                      key={reqItem.id}
                      request={{
                        id: reqItem.id,
                        name: reqItem.name,
                        email: reqItem.email,
                        code: reqItem.code,
                        avatarUrl: reqItem.avatarUrl,
                        time: reqItem.time,
                        date: reqItem.date,
                        status: reqItem.status,
                        requestType: reqItem.requestType,
                        qrVerified: reqItem.qrVerified,
                        wifiVerified: reqItem.wifiVerified,
                        notes: reqItem.notes,
                      }}
                      onPress={() => openRequestDetail(reqItem)}
                      onApprove={() => handleInlineQueueApprove(reqItem)}
                      onReject={() => setRejectTargetId(reqItem.id)}
                      isApproving={approvingCardId === reqItem.id}
                      showActions={requestTab === 'PENDING'}
                    />
                  ))}
              </View>
            )}
          </ScrollView>
        )}


        {/* TAB 2: ATTENDANCE -> VIEW 2: DAILY */}
        {activeTab === 'attendance' && attendanceView === 'Daily' && (
          <ScrollView key={attendanceSection}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handlePullRefresh}
                tintColor={palette.brandPrimary}
                colors={[palette.brandPrimary]}
              />
            }
          >
            {/* Top Screen Header: ATTENDANCE */}
            <View style={styles.employeesTopBar}>
              <View style={styles.employeesHeading}>
                <Text style={styles.empTitleHeading}>Attendance</Text>
                <Text style={styles.empSubtitle}>Daily check-ins, live QR & team roster.</Text>
              </View>
            </View>

            {/* Subtabs Switcher */}
            <View style={{ marginBottom: 14 }}>
              <ExplorerTabs
                values={['Mark', 'Requests', 'Daily', 'Reports']}
                selected={attendanceView}
                onSelect={selectAttendanceView}
                variant="segmented"
                badges={{ Requests: pendingRequests.length }}
              />
            </View>

            {/* Visual Daily Summary & Calendar Asset Banner */}
            <View style={[styles.dailyHeroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Feather name="calendar" size={13} color={palette.brandPrimary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: palette.textPrimary }}>
                    {formatFriendlyDate(attendanceDate, 'EEEE, MMM d, yyyy')}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: palette.textSecondary, marginBottom: 10 }}>
                  Live team roster and time breakdown for today.
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>
                      {attendanceStatusCounts.PRESENT} Present
                    </Text>
                  </View>
                  <View style={{ backgroundColor: palette.surfaceMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: palette.textSecondary }}>
                      {attendanceStatusCounts.NOT_MARKED} Remaining
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ width: 85, alignItems: 'center', justifyContent: 'center' }}>
                <CalendarClockIllustration size={80} />
              </View>
            </View>

            {selectedRosterQuery.isError && !selectedRosterQuery.data && (
              <View style={styles.formContainerCard}>
                <Text>Unable to load attendance. Please try again.</Text>
                <Pressable onPress={() => selectedRosterQuery.refetch()}>
                  <Text style={styles.empSubtitle}>Retry</Text>
                </Pressable>
              </View>
            )}

            {attendanceFilter !== 'ALL' && (
              <View style={styles.dailyAttendanceToolsRow}>
                <Pressable accessibilityRole="button" accessibilityLabel="Clear attendance filter" onPress={() => setAttendanceFilter('ALL')} style={styles.activeAttendanceFilter}>
                  <Text style={styles.activeAttendanceFilterText}>{attendanceFilter.replace('_', ' ')}</Text>
                  <Feather name="x" size={13} color={Palette.brandPrimary} />
                </Pressable>
              </View>
            )}

            {/* Status Filter Pills for Daily Roster */}
            <View style={{ marginBottom: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                <FilterPills
                  values={['ALL', 'PRESENT', 'PENDING', 'NOT_MARKED', 'ABSENT', 'HALF_DAY', 'LEAVE']}
                  selected={attendanceFilter}
                  onSelect={value => setAttendanceFilter(value)}
                />
              </ScrollView>
            </View>
            {attendanceSection === 'Roster' && (selectedRosterQuery.isLoading || selectedRosterQuery.isFetching) && <AttendanceDataSkeleton variant="daily" refreshing={!!selectedRosterQuery.data} rows={effectiveRoster.length || 6} />}
            {attendanceSection === 'Roster' && !selectedRosterQuery.isLoading && !selectedRosterQuery.isFetching && (!!selectedRosterQuery.data || !selectedRosterQuery.isError) && <>
            {attendanceDate === today && pendingCount > 0 && <Pressable accessibilityRole="button" onPress={openRequestsQueue} style={styles.pendingReviewLink}><Feather name="clock" size={14} color={Palette.pending} /><Text style={styles.pendingReviewLinkText}>Review {pendingCount} pending request{pendingCount === 1 ? '' : 's'}</Text><Feather name="chevron-right" size={14} color={Palette.pending} /></Pressable>}
            <View style={styles.attendanceSummary}>
                <Text style={styles.attendanceSummaryText}>
                <Text style={{ color: Palette.success, fontWeight: '700' }}>{attendanceStatusCounts.PRESENT} present</Text>
                <Text style={styles.attendanceSummaryDivider}>  ·  </Text>
                <Text style={{ color: Palette.pending, fontWeight: '700' }}>{attendanceStatusCounts.PENDING} pending</Text>
                <Text style={styles.attendanceSummaryDivider}>  ·  </Text>
                <Text style={{ color: Palette.textSecondary, fontWeight: '700' }}>{attendanceStatusCounts.NOT_MARKED} not marked</Text>
              </Text>
            </View>
            {attendanceFilter !== 'ALL' && <Pressable accessibilityRole="button" accessibilityLabel="Clear attendance filter" onPress={() => setAttendanceFilter('ALL')} style={styles.activeAttendanceFilter}><Text style={styles.activeAttendanceFilterText}>{attendanceFilter.replace('_', ' ')}</Text><Feather name="x" size={13} color={Palette.brandPrimary} /></Pressable>}
            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Feather name="search" size={16} color={Palette.textSecondary} />
              <TextInput
                value={attendanceSearch}
                onChangeText={setAttendanceSearch}
                placeholder="Search employees by name or ID..."
                placeholderTextColor={Palette.textSecondary}
                style={styles.searchInput}
              />
            </View>

            {/* Attendance Roster List or Empty State */}
            {effectiveRoster.length === 0 ? (
              <View style={styles.emptyStateFullBlock}>
                <PeopleGroupPlusIllustration size={110} />
                <Text style={styles.emptyStateTitleText}>No employees yet</Text>
                <Text style={styles.emptyStateSubText}>
                  Add employees to your workplace to start tracking daily attendance.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setNewEmpEmail('');
                    setNewEmpName('');
                    setNewEmpCode('');
                    setCreatedInvite(null);
                    openAddEmployee();
                  }}
                  style={styles.emptyPrimarySolidBtn}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.emptyPrimarySolidBtnText, { color: '#FFFFFF' }]}>Add employee</Text>
                </Pressable>
              </View>
            ) : filteredAttendanceRoster.length === 0 ? (
              <View style={styles.emptyStateFullBlock}>
                    <SearchEmptyDocIllustration size={110} />
                    <Text style={styles.emptyStateTitleText}>No matching employees</Text>
                    <Text style={styles.emptyStateSubText}>
                      {attendanceSearch.trim()
                        ? `No employees match "${attendanceSearch.trim()}".`
                        : 'No employees currently match the selected filter.'}
                    </Text>
                    {(attendanceFilter !== 'ALL' || !!attendanceSearch.trim()) && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setAttendanceSearch('');
                          setAttendanceFilter('ALL');
                        }}
                        style={styles.emptyClearBtnOutline}
                      >
                        <Text style={styles.emptyClearBtnText}>Clear filters</Text>
                      </Pressable>
                    )}
              </View>
            ) : (
                <View style={styles.rosterCardList}>
                  {filteredAttendanceRoster.map((emp, idx, arr) => (
                    <Pressable
                      key={emp.memberId || idx}
                      onPress={() =>
                        openRosterEmployee(emp.memberId)
                      }
                      style={({ pressed }) => [
                        styles.rosterItemRow,
                        idx === arr.length - 1 && { borderBottomWidth: 0 },
                        pressed && styles.btnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${emp.name} details`}
                    >
                      <View style={{ marginRight: 12 }}>
                        <Avatar name={emp.name} avatarUrl={emp.avatarUrl} size="md" />
                      </View>
                      <View style={styles.rosterNameCol}>
                        <Text style={styles.rosterEmpName}>{emp.name}</Text>
                        <Text style={styles.rosterEmpCode}>{emp.code}</Text>
                      </View>
                      <Text style={styles.rosterTimeNote}>{emp.time}</Text>
                      <StatusChip status={emp.status as any} size="sm" />
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          openManualAttendance(effectiveEmployees.find((e) => e.id === emp.memberId));
                        }}
                        style={styles.threeDotsBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Manual attendance for ${emp.name}`}
                      >
                        <Feather name="more-vertical" size={18} color={Palette.textSecondary} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}

            </>}
          </ScrollView>
        )}

        {/* TAB 3: EMPLOYEES & INVITATIONS (Image 3 Screen 1 & Image 4 Screen 2) */}
        {activeTab === 'employees' && (
          employeesQuery.isLoading && !employeesQuery.data ? (
            <EmployerEmployeesSkeleton onSelectTab={selectEmployerTab} initials={initials} avatarUrl={user?.avatarUrl} hideHeader={true} hideBottomBar={true} />
          ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handlePullRefresh}
                tintColor={palette.brandPrimary}
                colors={[palette.brandPrimary]}
              />
            }
          >
            <View style={styles.employeesTopBar}>
              <View style={styles.employeesHeading}>
                <Text style={styles.empTitleHeading}>Employees</Text>
                <Text style={styles.empSubtitle}>Manage your team and their access.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add employee"
                onPress={() => {
                  setNewEmpEmail('');
                  setNewEmpName('');
                  setNewEmpCode('');
                  setCreatedInvite(null);
                  openAddEmployee();
                }}
                style={[styles.attendanceOpenPill, { borderColor: palette.brandPrimary }]}
              >
                <Feather name="user-plus" size={14} color={palette.brandPrimary} />
                <Text style={[styles.attendanceOpenPillText, { color: palette.brandPrimary }]}>Add</Text>
              </Pressable>
            </View>

            {/* Segmented Subtabs: All | Active | Invited | Requests */}
            <View style={{ marginBottom: 16 }}>
              <ExplorerTabs
                values={['All', 'Active', 'Invited', 'Requests']}
                selected={
                  empSubTab === 'team'
                    ? 'All'
                    : empSubTab === 'active'
                    ? 'Active'
                    : empSubTab === 'invitations'
                    ? 'Invited'
                    : 'Requests'
                }
                onSelect={(val) => {
                  if (val === 'All') setEmpSubTab('team');
                  else if (val === 'Active') setEmpSubTab('active');
                  else if (val === 'Invited') setEmpSubTab('invitations');
                  else if (val === 'Requests') setEmpSubTab('join-requests');
                }}
                variant="segmented"
                badges={{ Requests: pendingJoinRequests.length }}
              />
            </View>

            {/* Quick Actions List (matching app design system) */}
            {(empSubTab === 'team' || empSubTab === 'active') && (
              <View style={[styles.markOptionsContainer, { marginBottom: 16 }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add employee"
                  onPress={() => {
                    setNewEmpEmail('');
                    setNewEmpName('');
                    setNewEmpCode('');
                    setCreatedInvite(null);
                    openAddEmployee();
                  }}
                  style={({ pressed }) => [
                    styles.markOptionRow,
                    { borderBottomWidth: 1, borderBottomColor: Palette.border },
                    pressed && { backgroundColor: Palette.brandTint },
                  ]}
                >
                  <View style={[styles.markOptionIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Feather name="user-plus" size={18} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.markOptionTitle, { color: Palette.textPrimary }]}>Add Employee</Text>
                    <Text style={[styles.markOptionSubtitle, { color: Palette.textSecondary }]}>Invite via email or employee code</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Workplace Join QR & link"
                  onPress={() => setJoinQrModalVisible(true)}
                  style={({ pressed }) => [
                    styles.markOptionRow,
                    pressed && { backgroundColor: Palette.brandTint },
                  ]}
                >
                  <View style={[styles.markOptionIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Feather name="grid" size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.markOptionTitle, { color: Palette.textPrimary }]}>Workplace Join QR & Link</Text>
                    <Text style={[styles.markOptionSubtitle, { color: Palette.textSecondary }]}>Display join QR code or share invite link</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
                </Pressable>
              </View>
            )}

            {/* Pending join requests alert banner if not on join-requests subTab */}
            {pendingJoinRequests.length > 0 && empSubTab !== 'join-requests' && (
              <Pressable
                onPress={() => setEmpSubTab('join-requests')}
                style={styles.joinRequestsAlertBanner}
              >
                <View style={styles.joinRequestsAlertIcon}>
                  <Feather name="user-plus" size={16} color="#B9770E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.joinRequestsAlertTitle}>
                    {pendingJoinRequests.length} candidate {pendingJoinRequests.length === 1 ? 'request' : 'requests'} waiting
                  </Text>
                  <Text style={styles.joinRequestsAlertSubtitle}>
                    Scanned your Join QR code and waiting for approval.
                  </Text>
                </View>
                <View style={styles.joinRequestsReviewBtn}>
                  <Text style={styles.joinRequestsReviewBtnText}>Review</Text>
                  <Feather name="arrow-right" size={14} color={Palette.brandPrimary} />
                </View>
              </Pressable>
            )}

            {/* Search bar & Directory Title (for All / Active tabs) */}
            {(empSubTab === 'team' || empSubTab === 'active') && (
              <>
                <View style={{ marginBottom: 10, marginTop: 4 }}>
                  <Text style={styles.quickShortcutsSectionTitle}>
                    {empSubTab === 'active' ? 'ACTIVE EMPLOYEES' : 'TEAM DIRECTORY'} ({filteredDirectoryEmployees.length})
                  </Text>
                </View>
                <View style={[styles.searchBar, { marginBottom: 14 }]}>
                  <Feather name="search" size={16} color={Palette.textSecondary} />
                  <TextInput
                    value={empSearch}
                    onChangeText={setEmpSearch}
                    placeholder="Search by name, email or employee code..."
                    placeholderTextColor={Palette.textSecondary}
                    style={styles.searchInput}
                  />
                  {empSearch.length > 0 && (
                    <Pressable onPress={() => setEmpSearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
                      <Feather name="x" size={15} color={Palette.textSecondary} />
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {empSubTab === 'team' || empSubTab === 'active' ? (
              directoryEmployees.length === 0 ? (
                <View style={[styles.emptyStateFullBlock, styles.employeeEmptyCard]}>
                  <PeopleGroupPlusIllustration size={84} />
                  <Text style={styles.emptyStateTitleText}>{empSubTab === 'active' ? 'No active employees yet' : 'No employees yet'}</Text>
                  <Text style={styles.emptyStateSubText}>
                    Add an employee email to invite them to this workplace.
                  </Text>
                  <View style={styles.employeeEmptyActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setNewEmpEmail('');
                        setNewEmpName('');
                        setNewEmpCode('');
                        setCreatedInvite(null);
                        openAddEmployee();
                      }}
                      style={styles.employeeEmptyPrimaryBtn}
                    >
                      <Feather name="user-plus" size={15} color="#FFFFFF" />
                      <Text style={[styles.employeeEmptyPrimaryText, { color: '#FFFFFF' }]}>Add employee</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setJoinQrModalVisible(true)}
                      style={styles.employeeEmptySecondaryBtn}
                    >
                      <Feather name="share-2" size={15} color={Palette.brandPrimary} />
                      <Text style={styles.employeeEmptySecondaryText}>Share link</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* Directory list */
                filteredDirectoryEmployees.length === 0 ? (
                  <View style={styles.employeeSearchEmpty}>
                    <Feather name="search" size={23} color={Palette.brandPrimary} />
                    <Text style={styles.emptyStateTitleText}>No matching employees</Text>
                    <Text style={styles.emptyStateSubText}>Try another name, email, or employee code.</Text>
                    <Pressable accessibilityRole="button" onPress={() => setEmpSearch('')} style={styles.employeeEmptySecondaryBtn}>
                      <Text style={styles.employeeEmptySecondaryText}>Clear search</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={styles.employeeDirectoryList}>
                    {visibleDirectoryEmployees.map((emp) => (
                      <Pressable
                        key={emp.id}
                        onPress={() => openEmployeeDetail(emp)}
                        style={({ pressed }) => [styles.employeeDirectoryCard, pressed && styles.employeeDirectoryCardPressed]}
                      >
                        <View
                          style={[
                            styles.employeeAvatarRing,
                            {
                              borderColor:
                                (emp.membershipStatus || 'ACTIVE') === 'ACTIVE'
                                  ? '#10B981'
                                  : (emp.membershipStatus === 'INVITED' || (emp.membershipStatus as string) === 'PENDING')
                                  ? '#F59E0B'
                                  : '#94A3B8',
                            },
                          ]}
                        >
                          <Avatar name={emp.name} avatarUrl={emp.avatarUrl} size="md" />
                        </View>
                        <View style={styles.employeeDirectoryDetails}>
                          <View style={styles.employeeDirectoryTopRow}>
                            <Text style={styles.rosterEmpName} numberOfLines={1}>{emp.name}</Text>
                            {emp.membershipStatus && emp.membershipStatus !== 'ACTIVE' ? (
                              <StatusChip status={emp.membershipStatus} size="sm" />
                            ) : null}
                          </View>
                          <View style={styles.employeeDirectoryMetaRow}>
                            <View style={styles.employeeCodeBadge}>
                              <Feather name="hash" size={11} color={Palette.brandPrimary} />
                              <Text style={styles.employeeCodeBadgeText} numberOfLines={1}>{emp.code || 'No ID'}</Text>
                            </View>
                            {emp.joinedAt ? <Text style={styles.employeeJoinedDate}>Joined {formatFriendlyDate(emp.joinedAt, 'd MMM yyyy')}</Text> : null}
                          </View>
                        </View>
                        <View style={styles.employeeDirectoryArrow}><Feather name="chevron-right" size={16} color={Palette.brandPrimary} /></View>
                      </Pressable>
                    ))}
                    </View>
                    {visibleDirectoryEmployees.length < filteredDirectoryEmployees.length && (
                      <Pressable accessibilityRole="button" onPress={() => setEmployeeRenderLimit((limit) => limit + 40)} style={styles.loadMoreListButton}>
                        <Text style={styles.loadMoreListText}>Load more employees ({filteredDirectoryEmployees.length - visibleDirectoryEmployees.length} remaining)</Text>
                      </Pressable>
                    )}
                  </>
                )
              )
            ) : empSubTab === 'invitations' ? (
              invitedEmployees.length === 0 ? (
                <View style={[styles.emptyStateFullBlock, styles.employeeEmptyCard]}>
                  <EnvelopePersonPlusIllustration size={84} />
                  <Text style={styles.emptyStateTitleText}>No invitations yet</Text>
                  <Text style={styles.emptyStateSubText}>
                    Add an employee email to invite them to this workplace.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setNewEmpEmail('');
                      setNewEmpName('');
                      setNewEmpCode('');
                      setCreatedInvite(null);
                      openAddEmployee();
                    }}
                    style={styles.employeeEmptyPrimaryBtn}
                  >
                    <Feather name="user-plus" size={15} color="#FFFFFF" />
                    <Text style={[styles.employeeEmptyPrimaryText, { color: '#FFFFFF' }]}>Add employee</Text>
                  </Pressable>
                </View>
              ) : (
                /* Invitations list */
                <View style={styles.invitationListBlock}>
                  {visibleInvitedEmployees.map((inv, idx) => (
                    <View key={inv.id || idx} style={styles.invitationCard}>
                      <View style={styles.invitationTopRow}>
                        <View style={[styles.employeeAvatarRing, { borderColor: '#F59E0B', marginRight: 12 }]}>
                          <Avatar name={inv.name} avatarUrl={inv.avatarUrl} size="md" />
                        </View>
                        <View style={styles.invitationTitlesCol}>
                          <Text style={styles.invitationEmailText} numberOfLines={1}>{maskEmail(inv.email) || inv.name}</Text>
                          <Text style={styles.invitationSub} numberOfLines={1}>{inv.name} • Invited</Text>
                        </View>
                        <StatusChip status="INVITED" size="sm" />
                      </View>

                      {/* 3 action buttons: Copy link | Resend link | Revoke */}
                      <View style={styles.invitationButtonsRow}>
                        <DangerButton
                          label="Revoke"
                          onPress={() => handleDeactivateEmployee(inv.id, inv.name)}
                          size="sm"
                          icon={<Feather name="trash-2" size={13} color={Palette.danger} />}
                          style={styles.invBtnFlex}
                        />
                      </View>
                    </View>
                  ))}
                  {visibleInvitedEmployees.length < invitedEmployees.length && (
                    <Pressable accessibilityRole="button" onPress={() => setEmployeeRenderLimit((limit) => limit + 40)} style={styles.loadMoreListButton}>
                      <Text style={styles.loadMoreListText}>Load more invitations ({invitedEmployees.length - visibleInvitedEmployees.length} remaining)</Text>
                    </Pressable>
                  )}
                </View>
              )
            ) : (
              /* JOIN REQUESTS SUBTAB */
              workplaceJoinRequests.length === 0 ? (
                <View style={[styles.emptyStateFullBlock, styles.employeeEmptyCard]}>
                  <EmptyTeamIllustration size={84} />
                  <Text style={styles.emptyStateTitleText}>No join requests yet</Text>
                  <Text style={styles.emptyStateSubText}>
                    Candidates can scan your Workplace Join QR code to request access.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setJoinQrModalVisible(true)}
                    style={styles.employeeEmptyPrimaryBtn}
                  >
                    <MaterialCommunityIcons name="qrcode" size={16} color="#FFFFFF" />
                    <Text style={styles.employeeEmptyPrimaryText}>Show join QR</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.joinRequestsListBlock}>
                  {visibleJoinRequests.map((req) => {
                    const isProcessing = processingJoinReqId === req.id;
                    const reqInitials = getFirstAndLastInitials(req.name, 'EM');
                    return (
                      <View key={req.id} style={styles.joinRequestCard}>
                        <View style={styles.joinRequestCardHeader}>
                          <View style={[styles.employeeAvatarRing, { borderColor: '#F59E0B', marginRight: 12 }]}>
                            <Avatar name={req.name} avatarUrl={req.avatarUrl} size="md" />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.joinRequestName} numberOfLines={1}>{req.name}</Text>
                            {req.email ? <Text style={styles.joinRequestEmail} numberOfLines={1}>{maskEmail(req.email)}</Text> : null}
                            <Text style={styles.joinRequestDate}>
                              Requested {formatFriendlyDate(req.requestedAt, 'MMM d, h:mm a')}
                            </Text>
                          </View>
                          <StatusChip status={req.status} size="sm" />
                        </View>

                        {req.note ? (
                          <View style={styles.joinRequestNoteBox}>
                            <Text style={styles.joinRequestNoteLabel}>Note from applicant:</Text>
                            <Text style={styles.joinRequestNoteText}>&quot;{req.note}&quot;</Text>
                          </View>
                        ) : null}

                        {req.status === 'PENDING' && (
                          <View style={styles.joinRequestActionsRow}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Approve ${req.name}`}
                              disabled={isProcessing}
                              onPress={() => handleApproveJoinRequest(req.id, req.name)}
                              style={[styles.joinRequestApproveBtn, isProcessing && { opacity: 0.6 }]}
                            >
                              {isProcessing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <Feather name="check" size={15} color="#FFFFFF" />
                                  <Text style={styles.joinRequestApproveText}>Approve & Add</Text>
                                </>
                              )}
                            </Pressable>

                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Decline ${req.name}`}
                              disabled={isProcessing}
                              onPress={() => setRejectJoinReqTarget({ id: req.id, name: req.name })}
                              style={styles.joinRequestDeclineBtn}
                            >
                              <Feather name="x" size={15} color={Palette.danger} />
                              <Text style={styles.joinRequestDeclineText}>Decline</Text>
                            </Pressable>
                          </View>
                        )}

                        {req.status === 'REJECTED' && req.rejectionReason ? (
                          <Text style={styles.joinRequestRejectedNotice}>
                            Declined: {req.rejectionReason}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                  {visibleJoinRequests.length < workplaceJoinRequests.length && (
                    <Pressable accessibilityRole="button" onPress={() => setEmployeeRenderLimit((limit) => limit + 40)} style={styles.loadMoreListButton}>
                      <Text style={styles.loadMoreListText}>Load more requests ({workplaceJoinRequests.length - visibleJoinRequests.length} remaining)</Text>
                    </Pressable>
                  )}
                </View>
              )
            )}
          </ScrollView>
          )
        )}

        {/* Attendance reports and records */}
        {activeTab === 'attendance' && attendanceView === 'Reports' && (
          <ScrollView key={reportSection}
            contentContainerStyle={styles.reportScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handlePullRefresh}
                tintColor={palette.brandPrimary}
                colors={[palette.brandPrimary]}
              />
            }
          >
            {/* Top Screen Header: ATTENDANCE */}
            <View style={styles.employeesTopBar}>
              <View style={styles.employeesHeading}>
                <Text style={styles.empTitleHeading}>Attendance</Text>
                <Text style={styles.empSubtitle}>Track daily check-ins, requests and reports.</Text>
              </View>
            </View>

            {/* Subtabs Switcher */}
            <View style={{ marginBottom: 14 }}>
              <ExplorerTabs
                values={['Mark', 'Requests', 'Daily', 'Reports']}
                selected={attendanceView}
                onSelect={selectAttendanceView}
                variant="segmented"
                badges={{ Requests: pendingRequests.length }}
              />
            </View>

            {/* Reports Hero Banner Asset */}
            <View style={[styles.dailyHeroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Feather name="bar-chart-2" size={14} color="#6D28D9" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: palette.textPrimary }}>
                    Attendance Analytics & Logs
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: palette.textSecondary, marginBottom: 10 }}>
                  Exportable monthly timesheets, compliance records, and check-in audit trails.
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#6D28D9' }}>
                      {liveReportsRecords.length} Total Logs
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ width: 85, alignItems: 'center', justifyContent: 'center' }}>
                <DocCheckmarkIllustration size={75} />
              </View>
            </View>

            {/* Reports Control Bar: Date Filter & Export Options INSIDE Reports */}
            <View style={styles.reportsControlCard}>
              <View style={styles.reportsControlHeaderRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Change report period: ${reportDates.startDate === reportDates.endDate ? formatFriendlyDate(reportDates.startDate, 'd MMM yyyy') : `${formatFriendlyDate(reportDates.startDate, 'd MMM yyyy')} – ${formatFriendlyDate(reportDates.endDate, 'd MMM yyyy')}`}`}
                  onPress={() => setReportSection(reportSection === 'Filters' ? 'Summary' : 'Filters')}
                  style={({ pressed }) => [styles.reportsPeriodButton, pressed && styles.btnPressed]}
                >
                  <Feather name="calendar" size={15} color={palette.brandPrimary} />
                  <Text style={styles.reportsPeriodText} numberOfLines={1}>
                    {reportPeriodDisplay}
                  </Text>
                  <View style={styles.reportsPeriodBadge}>
                    <Text style={styles.reportsPeriodBadgeText}>
                      {reportSection === 'Filters' ? 'Hide' : 'Filter'}
                    </Text>
                  </View>
                  <Feather name={reportSection === 'Filters' ? 'chevron-up' : 'chevron-down'} size={15} color={palette.textSecondary} />
                </Pressable>

                {/* Export Button inside Reports */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Export current report"
                  disabled={!liveReportsRecords.length || reportsQuery.isFetching}
                  onPress={() => {
                    adMobService.preloadRewardedAd();
                    router.push({
                      pathname: '/export-report',
                      params: {
                        workplaceId: effectiveWorkplaceId,
                        workplaceName: workplaceName || 'Workplace',
                        month: reportMonth,
                        startDate: reportDates.startDate,
                        endDate: reportDates.endDate,
                        status: reportStatus === 'ALL' ? '' : reportStatus,
                        employeeMemberId: reportEmployee,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.explorerExportButton,
                    (!liveReportsRecords.length || reportsQuery.isFetching) && { opacity: 0.4 },
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Feather name="download" size={14} color="#FFFFFF" />
                  <Text style={[styles.explorerExportText, { color: '#FFFFFF' }]}>Export</Text>
                </Pressable>
              </View>

              <Text style={styles.reportsControlSub} numberOfLines={1}>
                {reportEmployee ? effectiveEmployees.find(employee => employee.id === reportEmployee)?.name || 'Selected employee' : 'All employees'} · {reportStatus === 'ALL' ? 'All statuses' : reportStatus.replace('_', ' ').toLowerCase()}
              </Text>
            </View>
            {reportsQuery.isError && !reportsQuery.data && <View style={styles.formContainerCard}><Text>Unable to load reports.</Text><Pressable onPress={() => reportsQuery.refetch()}><Text style={styles.empSubtitle}>Retry</Text></Pressable></View>}
            {reportSection !== 'Filters' && (reportsQuery.isLoading || reportsQuery.isFetching) && <AttendanceDataSkeleton variant="summary" refreshing={!!reportsQuery.data} rows={Math.min(6, filteredReportRecords.length || 6)} />}
            {reportSection === 'Filters' && <>
            {/* Month navigation is available outside a custom range. */}
            {!reportRange && <DateSwitcher
              unit="month"
              currentDate={formatMonthYear(reportMonth)}
              isToday={reportMonth >= today.slice(0, 7)}
              badgeText={reportMonth === today.slice(0, 7) ? 'Current' : null}
              onPrevDay={() => { setReportRange(null); changeReportMonth(-1); }}
              onNextDay={() => { setReportRange(null); changeReportMonth(1); }}
            />}

            <RangeFilters key={`${reportDates.startDate}-${reportDates.endDate}`} today={today} start={reportDates.startDate} end={reportDates.endDate} onApply={(startDate, endDate) => { setReportLimit(6); setReportRange({ startDate, endDate }); }} />
            <Pressable accessibilityRole="button" onPress={() => { setReportRange(null); setReportMonth(today.slice(0, 7)); setReportStatus('ALL'); setReportEmployee(''); setReportSearch(''); setReportLimit(6); }} style={styles.manualAttendanceBtn}><Text style={styles.manualAttendanceBtnText}>Reset filters · Current month</Text></Pressable>
            <FilterPills values={attendanceStatuses} selected={reportStatus} onSelect={value => { setReportLimit(6); setReportStatus(value); }} />
            <View style={styles.formContainerCard}>
              <Text style={styles.empHistorySectionTitle}>Employee filter</Text>
              <TextInput accessibilityLabel="Search employees to filter report" placeholder="Find an employee, then tap to filter" value={reportSearch} onChangeText={setReportSearch} style={styles.searchInput} />
              {employeesQuery.isFetching ? <AttendanceDataSkeleton variant="employees" refreshing={!!employeesQuery.data} /> : <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable onPress={() => setReportEmployee('')} style={styles.filterChipItem}><Text>{reportEmployee ? 'Clear employee filter' : 'All employees ✓'}</Text></Pressable>
                {effectiveEmployees.filter(employee => `${employee.name} ${employee.code}`.toLowerCase().includes(reportSearch.toLowerCase())).map(employee => <Pressable key={employee.id} onPress={() => { setReportLimit(6); setReportEmployee(employee.id); setReportSearch(''); }} style={[styles.filterChipItem, reportEmployee === employee.id && styles.filterChipItemActive]}><Text>{employee.name}{reportEmployee === employee.id ? ' ✓' : ''}</Text></Pressable>)}
              </ScrollView>              </>}
              {employeesQuery.isError && !employeesQuery.data && <Pressable onPress={() => employeesQuery.refetch()}><Text>Unable to load employees · Retry</Text></Pressable>}

            </View>
              <Pressable accessibilityRole="button" onPress={() => setReportSection('Summary')} style={styles.manualAttendanceBtn}><Text style={styles.manualAttendanceBtnText}>Apply filters →</Text></Pressable>
            </>}
            {reportSection !== 'Filters' && !reportsQuery.isLoading && !reportsQuery.isFetching && (!!reportsQuery.data || !reportsQuery.isError) && <>
              <ReportInsights data={reportsQuery.data} compact />
            {/* Status totals */}
            <View style={styles.reportsMetricRow}>
              {/* Present */}
              <View style={[styles.reportMetricCard, { backgroundColor: Palette.presentBg }]}>
                <Feather name="user-check" size={18} color={Palette.success} />
                <Text style={[styles.reportMetricNum, { color: Palette.success }]}>
                  {liveReportsMetrics?.present ?? 0}
                </Text>
                <Text style={styles.reportMetricLabel}>Present</Text>
              </View>

              {/* Pending */}
              <View style={[styles.reportMetricCard, { backgroundColor: Palette.pendingTint }]}>
                <Feather name="clock" size={18} color={Palette.pending} />
                <Text style={[styles.reportMetricNum, { color: Palette.pending }]}>
                  {liveReportsMetrics?.absent ?? 0}
                </Text>
                <Text style={styles.reportMetricLabel}>Absent</Text>
              </View>

              {/* Not marked / Leave */}
              <View style={[styles.reportMetricCard, { backgroundColor: Palette.dangerTint }]}>
                <Feather name="alert-circle" size={18} color={Palette.danger} />
                <Text style={[styles.reportMetricNum, { color: Palette.danger }]}>
                  {liveReportsMetrics?.leave ?? 0}
                </Text>
                <Text style={styles.reportMetricLabel}>Leave</Text>
              </View>
            </View>

            <Text style={[styles.empHistorySectionTitle, { marginTop: 24 }]}>Attendance records</Text>
            <Text style={styles.empSubtitle}>Tap a record for check-in details and corrections.</Text>
            <FilterPills values={['Newest first', 'Oldest first', 'Employee A–Z']} selected={reportSort} onSelect={value => { setReportSort(value); setReportLimit(6); }} />
            {/* Reports table or Empty State (Image 3 Screen 6) */}
            {(!!reportsQuery.data || !reportsQuery.isError) && filteredReportRecords.length === 0 ? (
              <View style={styles.emptyStateFullBlock}>
                <BarChartSearchIllustration size={110} />
                <Text style={styles.emptyStateTitleText}>No records for this period</Text>
                <Text style={styles.emptyStateSubText}>
                  There are no attendance records within the selected date range.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setReportRange(null); setReportStatus('ALL'); setReportEmployee(''); setReportSearch(''); changeReportMonth(-1);
                  }}
                  style={styles.emptyPrimarySolidBtn}
                >
                  <Text style={styles.emptyPrimarySolidBtnText}>Change date range</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.reportsTableCard}>
                <View style={styles.reportsTableHeader}>
                  <Text style={[styles.reportsTableHeadCol, styles.reportEmployeeCell]}>Employee</Text>
                  <Text style={[styles.reportsTableHeadCol, styles.reportStatusCell]}>Status</Text>
                  <Text style={[styles.reportsTableHeadCol, styles.reportDateCell]}>Date</Text>
                </View>

                {filteredReportRecords.slice((reportPage - 1) * 6, reportPage * 6).map(record => (
                  <View key={record.id}>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedRecord === record.id }} accessibilityLabel={`View ${record.employee.name || 'employee'} record for ${record.attendanceDate}`} onPress={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)} style={styles.reportsTableRow}>
                      <View style={styles.reportEmployeeCell}><Text style={styles.reportsCellName}>{record.employee.name || 'Former employee'}</Text><Text style={styles.reportsCellDate}>{record.employee.code || '—'} · {record.source === 'MANUAL' ? 'Manual' : record.source === 'QR_SCAN' ? 'QR check-in' : record.source || 'Recorded'}</Text></View>
                      <View style={styles.reportStatusCell}><StatusChip status={record.status as any} size="sm" /></View>
                      <Text style={styles.reportDateCell}>{record.attendanceDate}</Text>
                    </Pressable>
                    {expandedRecord === record.id && <View style={{ padding: 16, gap: 8, backgroundColor: Palette.surfaceMuted }}>
                      <Text style={styles.empSubtitle}>Check-in: {formatTime(record.checkInTime, timezone) || '—'}</Text>
                      <Text style={styles.empSubtitle}>Approved: {formatTime(record.approvedAt, timezone) || '—'}</Text>
                      <Text style={styles.empSubtitle}>Source: {record.source || 'Unknown'}</Text>
                      {record.correctionReason && <Text style={styles.empSubtitle}>Reason: {record.correctionReason}</Text>}
                      {effectiveEmployees.some(employee => employee.id === record.employee.memberId && employee.membershipStatus === 'ACTIVE') && <Pressable accessibilityRole="button" onPress={() => { openManualAttendance(effectiveEmployees.find(employee => employee.id === record.employee.memberId)); setManualDate(record.attendanceDate); setManualStatus(record.status as 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'); }}><Text style={styles.manualAttendanceBtnText}>Correct this record →</Text></Pressable>}
                    </View>}
                  </View>
                ))}
              </View>
            )}
            {filteredReportRecords.length > 0 && <View style={styles.explorerPagination}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous records page" disabled={reportPage === 1} onPress={() => { setReportLimit((reportPage - 1) * 6); setExpandedRecord(null); }} style={[styles.filterChipItem, reportPage === 1 && { opacity: 0.4 }]}><Text>Previous</Text></Pressable>
              <Text style={styles.empSubtitle}>{reportPage} / {reportPageCount}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Next records page" disabled={reportPage === reportPageCount} onPress={() => { setReportLimit((reportPage + 1) * 6); setExpandedRecord(null); }} style={[styles.filterChipItem, reportPage === reportPageCount && { opacity: 0.4 }]}><Text>Next</Text></Pressable>
            </View>}
            <Text style={styles.empSubtitle}>{filteredReportRecords.length} matching records · 6 per page</Text>
            </>}
          </ScrollView>
        )}
        {activeTab === 'workplace' && <WorkplaceTab key={`${effectiveWorkplaceId}:${workplaceSection}`} initialSection={workplaceSection} />}
      </View>

      {/* Main Bottom Bar with Google Mobile Ads Banner */}
      <AdBanner position="bottom" />
      <BottomTabs
        tabs={EMPLOYER_TABS}
        activeTab={activeTab}
        onSelectTab={selectEmployerTab}
      />
        </SwipeTabs>
      )}

      {/* SCREEN 4: MANUAL ATTENDANCE (Image 5 Screen 6) */}
      {currentScreen.name === 'manual-attendance' && (
        <View style={{ flex: 1 }}>
          <View style={styles.darkBannerHeader}>
            <Pressable
              onPress={popScreen}
              style={styles.bannerBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to dashboard"
            >
              <Feather name="arrow-left" size={22} color={Palette.textPrimary} />
            </Pressable>
            <Text style={styles.bannerScreenTitle}>Manual Attendance</Text>
            <View style={{ width: 34 }} />
          </View>

          <View style={styles.contentArea}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <RangeFilters key={manualDate} today={today} start={manualDate} end={manualDate} single onApply={date => setManualDate(date)} />
              <View style={styles.formContainerCard}>
                {/* Employee selector */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.formLabelRequired}>Employee *</Text>
                  <View style={styles.dropdownInput}>
                    <Text style={styles.dropdownText}>
                      {manualTargetEmp ? `${manualTargetEmp.name} (${manualTargetEmp.code})` : 'Select an employee'}
                    </Text>
                    <Feather name="chevron-down" size={18} color={Palette.textSecondary} />
                  </View>
                </View>

                <View style={{ gap: 8 }}>
                  {effectiveEmployees.filter((e) => e.membershipStatus === 'ACTIVE').map((employee) => (
                    <Pressable
                      key={employee.id}
                      onPress={() => setManualTargetEmp(employee)}
                      style={[
                        styles.manualEmpPickerRow,
                        manualTargetEmp?.id === employee.id && styles.manualEmpPickerRowActive,
                      ]}
                    >
                      <Avatar name={employee.name} avatarUrl={employee.avatarUrl} size="sm" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.manualEmpPickerName, manualTargetEmp?.id === employee.id && { color: Palette.brandPrimary, fontWeight: '700' }]}>
                          {employee.name}
                        </Text>
                        <Text style={styles.manualEmpPickerCode}>{employee.code}</Text>
                      </View>
                      {manualTargetEmp?.id === employee.id && (
                        <Feather name="check" size={16} color={Palette.brandPrimary} />
                      )}
                    </Pressable>
                  ))}
                </View>
                {/* Date */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.formLabelRequired}>Date *</Text>
                  <View style={styles.dropdownInput}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="calendar" size={16} color={Palette.textSecondary} />
                      <Text style={styles.dropdownText}>{formatFriendlyDate(manualDate, 'EEE, MMM d, yyyy')}</Text>
                    </View>
                  </View>
                </View>

                {/* Status 4 pills */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.formLabelRequired}>Status *</Text>
                  <View style={styles.manualStatusPillsRow}>
                    {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const).map((st) => (
                      <Pressable
                        key={st}
                        onPress={() => setManualStatus(st as any)}
                        style={[
                          styles.manualPill,
                          manualStatus === st && (st === 'PRESENT' ? styles.manualPillPresentActive : styles.manualPillActive),
                        ]}
                      >
                        <Text
                          style={[
                            styles.manualPillText,
                            manualStatus === st && styles.manualPillTextActive,
                          ]}
                        >
                          {st === 'HALF_DAY' ? 'Half day' : st.charAt(0) + st.slice(1).toLowerCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Reason */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.formLabelRequired}>Reason *</Text>
                  <TextInput
                    value={manualReason}
                    onChangeText={setManualReason}
                    placeholder="Enter reason (required)..."
                    placeholderTextColor={Palette.textSecondary}
                    multiline
                    numberOfLines={4}
                    style={styles.reasonTextarea}
                  />
                  <Text style={styles.charCountText}>0/200</Text>
                </View>

                {/* Save record button */}
                <PrimaryButton
                  label="Save record"
                  loading={isMutating} onPress={handleSaveManualAttendance}
                  style={styles.saveRecordBtn}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      )}



      {/* SCREEN 7: INDIVIDUAL ATTENDANCE REQUEST SCREEN (Image 3: 6 Exact States) */}
      {currentScreen.name === 'request-detail' && selectedRequestDetail && (
        <View style={{ flex: 1, backgroundColor: Palette.canvas }}>
          {/* Top Bar: Back arrow and Attendance request title */}
          <View style={[styles.detailHeaderBar, { backgroundColor: Palette.surface, borderBottomColor: Palette.border }]}>
            <Pressable
              onPress={popScreen}
              style={styles.detailBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to requests"
            >
              <Feather name="arrow-left" size={24} color="#17202A" />
            </Pressable>
            <Text style={styles.detailHeaderTitle}>
              {selectedRequestDetail.requestType === 'CHECK_OUT' ? 'Check-out request' : 'Check-in request'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.detailScrollContent}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Employee Profile Block */}
            <View style={styles.detailProfileRow}>
              <View style={{ marginRight: 14 }}>
                <Avatar name={selectedRequestDetail.name} avatarUrl={selectedRequestDetail.avatarUrl} size="xl" />
              </View>
              <View style={styles.detailProfileInfoCol}>
                <Text style={styles.detailEmployeeNameLarge}>{selectedRequestDetail.name}</Text>
                <Text style={styles.detailEmployeeSubText}>
                  {selectedRequestDetail.code || 'EMP-1043'}
                </Text>
                <Text style={styles.detailEmployeeRoleText}>
                  {selectedRequestDetail.role || 'Engineering'}
                </Text>
              </View>
            </View>

            {/* Details Table: Date, Requested check-in/out, Requested on */}
            <View style={styles.detailTableCard}>
              <View style={styles.detailTableRow}>
                <Feather name="calendar" size={17} color="#686461" />
                <View style={styles.detailTableTextCol}>
                  <Text style={styles.detailTableLabel}>Date</Text>
                  <Text style={styles.detailTableValue}>
                    {selectedRequestDetail.date || 'Mon, 28 Sep 2026'}
                  </Text>
                </View>
              </View>

              <View style={styles.tableRowDivider} />

              <View style={styles.detailTableRow}>
                <Feather name="clock" size={17} color="#686461" />
                <View style={styles.detailTableTextCol}>
                  <Text style={styles.detailTableLabel}>
                    {selectedRequestDetail.requestType === 'CHECK_OUT' ? 'Requested check-out' : 'Requested check-in'}
                  </Text>
                  <Text style={styles.detailTableValue}>
                    {selectedRequestDetail.time || '9:04 AM'}
                  </Text>
                </View>
              </View>

              <View style={styles.tableRowDivider} />

              <View style={styles.detailTableRow}>
                <Feather name="file-text" size={17} color="#686461" />
                <View style={styles.detailTableTextCol}>
                  <Text style={styles.detailTableLabel}>Requested on</Text>
                  <Text style={styles.detailTableValue}>
                    {selectedRequestDetail.date || 'Mon, 28 Sep 2026'}, {selectedRequestDetail.time || '9:04 AM'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Verification Section */}
            <View style={styles.verificationsContainer}>
              {/* QR verification */}
              <View style={styles.verifBox}>
                <Feather name="check-circle" size={18} color="#16A34A" style={{ marginTop: 2 }} />
                <View style={styles.verifTextCol}>
                  <Text style={styles.verifTitle}>QR verification</Text>
                  <Text style={styles.verifSubText}>Verified at office</Text>
                </View>
                <View style={styles.badgeVerifiedGreen}>
                  <Text style={styles.badgeVerifiedGreenText}>Verified</Text>
                </View>
              </View>

              {/* Network verification */}
              <View style={styles.verifBox}>
                <Feather name="alert-circle" size={18} color="#D97706" style={{ marginTop: 2 }} />
                <View style={styles.verifTextCol}>
                  <Text style={styles.verifTitle}>Network verification</Text>
                  <Text style={styles.verifSubText}>
                    {selectedRequestDetail.wifiVerified ? 'Verified office Wi-Fi' : "Couldn't verify network"}
                  </Text>
                </View>
                <View
                  style={
                    selectedRequestDetail.wifiVerified
                      ? styles.badgeVerifiedGreen
                      : styles.badgeNotVerifiedOrange
                  }
                >
                  <Text
                    style={
                      selectedRequestDetail.wifiVerified
                        ? styles.badgeVerifiedGreenText
                        : styles.badgeNotVerifiedOrangeText
                    }
                  >
                    {selectedRequestDetail.wifiVerified ? 'Verified' : 'Not verified'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Status Section */}
            <View style={styles.detailStatusSection}>
              <View style={styles.detailStatusHeaderRow}>
                <Text style={styles.detailStatusLabel}>Status</Text>
                <View
                  style={[
                    styles.detailStatusPill,
                    detailDecisionState === 'approved' || selectedRequestDetail.status === 'APPROVED'
                      ? styles.detailStatusPillApproved
                      : selectedRequestDetail.status === 'REJECTED'
                      ? styles.detailStatusPillRejected
                      : styles.detailStatusPillPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.detailStatusPillText,
                      detailDecisionState === 'approved' || selectedRequestDetail.status === 'APPROVED'
                        ? styles.detailStatusPillTextApproved
                        : selectedRequestDetail.status === 'REJECTED'
                        ? styles.detailStatusPillTextRejected
                        : styles.detailStatusPillTextPending,
                    ]}
                  >
                    ● {detailDecisionState === 'approved' || selectedRequestDetail.status === 'APPROVED'
                        ? 'Approved'
                        : selectedRequestDetail.status === 'REJECTED'
                        ? 'Rejected'
                        : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.detailStatusSubText}>
                {detailDecisionState === 'approving' || detailDecisionState === 'rejecting'
                  ? 'Waiting for confirmation...'
                  : detailDecisionState === 'approved'
                  ? 'The employee has been notified.'
                  : 'Waiting for your decision.'}
              </Text>
            </View>

            {/* STATE 2 & 5: WAITING CONFIRMATION PROGRESS BANNER */}
            {(detailDecisionState === 'approving' || detailDecisionState === 'rejecting') && (
              <View style={styles.confirmationWaitingBanner}>
                <ActivityIndicator size="small" color={Palette.brandPrimary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.waitingBannerTitle}>Waiting for confirmation from server.</Text>
                  <Text style={styles.waitingBannerSub}>This may take a few seconds.</Text>
                </View>
              </View>
            )}

            {/* STATE 3: ATTENDANCE APPROVED BANNER & TIME SUMMARY */}
            {detailDecisionState === 'approved' && (
              <View style={{ width: '100%', marginBottom: 20 }}>
                <View style={styles.attendanceApprovedBanner}>
                  <Feather name="check-circle" size={20} color="#16A34A" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.approvedBannerTitle}>Attendance approved</Text>
                    <Text style={styles.approvedBannerSub}>The employee has been notified.</Text>
                  </View>
                </View>

                {/* Time comparison box: Requested check-in | Approved at */}
                <View style={styles.timeComparisonCard}>
                  <View style={styles.timeComparisonCol}>
                    <Text style={styles.timeComparisonLabel}>Requested check-in</Text>
                    <Text style={styles.timeComparisonVal}>
                      {selectedRequestDetail.time || '9:04 AM'}
                    </Text>
                  </View>
                  <View style={styles.timeComparisonDivider} />
                  <View style={styles.timeComparisonCol}>
                    <Text style={styles.timeComparisonLabel}>Approved at</Text>
                    <Text style={[styles.timeComparisonVal, { color: '#166534', fontWeight: '700' }]}>
                      {detailApprovedAt || '9:08 AM'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* STATE 6: ERROR BANNER */}
            {detailDecisionState === 'error' && (
              <View style={styles.decisionErrorBanner}>
                <Feather name="alert-circle" size={20} color="#DC2626" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.decisionErrorTitle}>Couldn&apos;t complete the decision</Text>
                  <Text style={styles.decisionErrorSub}>
                    {detailErrorMsg || 'Something went wrong. Please try again.'}
                  </Text>
                </View>
              </View>
            )}

            {/* STATE 4, 5, 6: REASON FOR REJECTION TEXTAREA */}
            {(detailDecisionState === 'reject-form' || detailDecisionState === 'rejecting' || detailDecisionState === 'error') && (
              <View style={styles.rejectionFormBlock}>
                <Text style={styles.rejectionFieldLabel}>
                  Reason for rejection <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={styles.rejectionTextAreaBox}>
                  <TextInput
                    style={styles.rejectionTextInput}
                    placeholder="Location appears to be outside office premises based on network details."
                    placeholderTextColor="#A89F9A"
                    value={detailRejectionText}
                    onChangeText={setDetailRejectionText}
                    editable={detailDecisionState !== 'rejecting'}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <Text style={styles.charCounterText}>{detailRejectionText.length}/500</Text>
                </View>
              </View>
            )}

            {/* ACTION BUTTONS ACCORDING TO STATE */}
            {/* State 1: Idle Pending */}
            {detailDecisionState === 'idle' && selectedRequestDetail.status === 'PENDING' && (
              <View style={styles.detailActionButtonsBlock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Approve"
                  onPress={() => handleDetailApprove(selectedRequestDetail.id)}
                  style={({ pressed }) => [styles.detailSolidBurgundyBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.detailSolidBtnText}>Approve</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reject"
                  onPress={() => setDetailDecisionState('reject-form')}
                  style={({ pressed }) => [styles.detailOutlineBurgundyBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.detailOutlineBtnText}>Reject</Text>
                </Pressable>
              </View>
            )}

            {/* State 2: Approving */}
            {detailDecisionState === 'approving' && (
              <View style={styles.detailActionButtonsBlock}>
                <View style={[styles.detailSolidBurgundyBtn, { opacity: 0.6, flexDirection: 'row', gap: 8 }]}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.detailSolidBtnText}>Approving...</Text>
                </View>

                <View style={[styles.detailOutlineBurgundyBtn, { opacity: 0.5 }]}>
                  <Text style={[styles.detailOutlineBtnText, { color: '#A89F9A' }]}>Reject</Text>
                </View>
              </View>
            )}

            {/* State 3: Approved */}
            {detailDecisionState === 'approved' && (
              <View style={styles.detailActionButtonsBlock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                  onPress={popScreen}
                  style={({ pressed }) => [styles.detailSolidBurgundyBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.detailSolidBtnText}>Done</Text>
                </Pressable>
              </View>
            )}

            {/* State 4: Reject Form */}
            {detailDecisionState === 'reject-form' && (
              <View style={styles.detailActionButtonsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDetailDecisionState('idle')}
                  style={({ pressed }) => [styles.detailHalfOutlineBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.detailOutlineBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={!detailRejectionText.trim()}
                  onPress={() => handleDetailConfirmReject(selectedRequestDetail.id)}
                  style={({ pressed }) => [
                    styles.detailHalfSolidBtn,
                    pressed && styles.btnPressed,
                    !detailRejectionText.trim() && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.detailSolidBtnText}>Confirm rejection</Text>
                </Pressable>
              </View>
            )}

            {/* State 5: Rejecting */}
            {detailDecisionState === 'rejecting' && (
              <View style={styles.detailActionButtonsRow}>
                <View style={[styles.detailHalfOutlineBtn, { opacity: 0.5 }]}>
                  <Text style={[styles.detailOutlineBtnText, { color: '#A89F9A' }]}>Cancel</Text>
                </View>

                <View style={[styles.detailHalfSolidBtn, { opacity: 0.7, flexDirection: 'row', gap: 6 }]}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.detailSolidBtnText}>Rejecting...</Text>
                </View>
              </View>
            )}

            {/* State 6: Error */}
            {detailDecisionState === 'error' && (
              <View style={styles.detailActionButtonsBlock}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleDetailApprove(selectedRequestDetail.id)}
                  style={({ pressed }) => [styles.detailSolidBurgundyBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.detailSolidBtnText}>Try again</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={popScreen}
                  style={({ pressed }) => [styles.detailOutlineBurgundyBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.detailOutlineBtnText}>Back to requests</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* SCREEN 8: EMPLOYEE DETAILS & ATTENDANCES SCREEN (Image 3 Top-Right) */}
      {currentScreen.name === 'employee-detail' && detailEmp && (
        <View style={{ flex: 1 }}>
          <View style={styles.darkBannerHeader}>
            <Pressable
              onPress={popScreen}
              style={styles.bannerBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to employees"
            >
              <Feather name="arrow-left" size={22} color={Palette.textPrimary} />
            </Pressable>
            <Text style={styles.bannerScreenTitle}>Employee details</Text>
            <View style={{ width: 34 }} />
          </View>

          <View style={styles.contentArea}>
            <View style={styles.employeeDetailTabs} accessibilityRole="tablist">
              {([
                { key: 'details', label: 'Profile', icon: 'user' as const },
                { key: 'attendances', label: 'Attendances', icon: 'calendar' as const },
                { key: 'reports', label: 'Reports', icon: 'bar-chart-2' as const },
              ] as const).map((tab) => (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: employeeDetailTab === tab.key }}
                  onPress={() => setEmployeeDetailTab(tab.key)}
                  style={[styles.employeeDetailTab, employeeDetailTab === tab.key && styles.employeeDetailTabActive]}
                >
                  <Feather name={tab.icon} size={15} color={employeeDetailTab === tab.key ? Palette.brandPrimary : Palette.textSecondary} />
                  <Text style={[styles.employeeDetailTabText, employeeDetailTab === tab.key && styles.employeeDetailTabTextActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {employeeDetailTab === 'details' && <>
              {/* Card 1: Profile Summary Card */}
              <View style={styles.empProfileCard}>
                <View style={styles.empProfileTopRow}>
                  <View style={{ marginRight: 14 }}>
                    <Avatar name={detailEmp.name} avatarUrl={detailEmp.avatarUrl} size="xl" />
                  </View>
                  <View style={styles.empProfileInfoCol}>
                    <Text style={styles.empProfileNameLarge}>{detailEmp.name}</Text>
                    <Text style={styles.empProfileCodeText}>{detailEmp.code}</Text>
                    <Text style={styles.empProfileEmailText}>
                      {maskEmail(detailEmp.email) || 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.empActivePill}>
                    <Text style={styles.empActivePillText}>{detailEmp.membershipStatus}</Text>
                  </View>
                </View>
              </View>

              {/* Card 2: Details Table */}
              <View style={styles.empTableCard}>
                <View style={styles.empTableRow}>
                  <View style={styles.empTableLabelGroup}>
                    <Feather name="user" size={16} color={Palette.textSecondary} />
                    <Text style={styles.empTableLabel}>Employee ID</Text>
                  </View>
                  <Text style={styles.empTableValue}>{detailEmp.code}</Text>
                </View>

                <View style={styles.empTableRow}>
                  <View style={styles.empTableLabelGroup}>
                    <Feather name="mail" size={16} color={Palette.textSecondary} />
                    <Text style={styles.empTableLabel}>Email address</Text>
                  </View>
                  <Text style={[styles.empTableValue, { fontSize: 13, fontWeight: '400' }]}>
                    {maskEmail(detailEmp.email) || 'Not provided'}
                  </Text>
                </View>

                <View style={styles.empTableRow}>
                  <View style={styles.empTableLabelGroup}>
                    <Feather name="shield" size={16} color={Palette.textSecondary} />
                    <Text style={styles.empTableLabel}>Status</Text>
                  </View>
                  <View style={styles.empActivePill}>
                    <Text style={styles.empActivePillText}>{detailEmp.membershipStatus}</Text>
                  </View>
                </View>

                <View style={[styles.empTableRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.empTableLabelGroup}>
                    <Feather name="calendar" size={16} color={Palette.textSecondary} />
                    <Text style={styles.empTableLabel}>Joined</Text>
                  </View>
                  <Text style={styles.empTableValue}>{detailEmp.joinedAt ? formatFriendlyDate(detailEmp.joinedAt, 'MMM d, yyyy') : 'Not joined'}</Text>
                </View>
              </View>

              <View style={styles.empAttendanceTimesCard}>
                <View style={styles.empAttendanceTimesHeader}>
                  <View style={styles.empAttendanceTimesTitleGroup}>
                    <Feather name="clock" size={16} color={Palette.brandPrimary} />
                    <Text style={styles.empAttendanceTimesTitle}>Attendance</Text>
                  </View>
                  <Text style={styles.empAttendanceTimesDate}>{formatFriendlyDate(detailAttendanceDate, 'EEE, d MMM')}</Text>
                </View>
                <View style={styles.empAttendanceTimesRow}>
                  <View style={styles.empAttendanceTimeCell}>
                    <Text style={styles.empAttendanceTimeLabel}>CHECK IN</Text>
                    <Text style={styles.empAttendanceTimeValue}>{detailAttendance?.checkInTime ? formatTime(detailAttendance.checkInTime, timezone) : '—'}</Text>
                  </View>
                  <View style={styles.empAttendanceTimeDivider} />
                  <View style={styles.empAttendanceTimeCell}>
                    <Text style={styles.empAttendanceTimeLabel}>CHECK OUT</Text>
                    <Text style={styles.empAttendanceTimeValue}>{detailAttendance?.checkOutTime ? formatTime(detailAttendance.checkOutTime, timezone) : '—'}</Text>
                  </View>
                  <View style={styles.empAttendanceTimeDivider} />
                  <View style={styles.empAttendanceTimeCell}>
                    <Text style={styles.empAttendanceTimeLabel}>HOURS WORKED</Text>
                    <Text style={styles.empAttendanceTimeValue}>{detailWorkedDuration || '—'}</Text>
                  </View>
                </View>
                {detailAttendance?.status === 'PENDING' && 'requestedAt' in detailAttendance && detailAttendance.requestedAt ? (
                  <Text style={styles.empAttendanceRequestTime}>Request sent at {formatTime(detailAttendance.requestedAt, timezone)}</Text>
                ) : null}
              </View>

              {/* Action Buttons Row: Reset PIN & Deactivate */}
              <View style={styles.empActionButtonsRow}>
                <Pressable
                  onPress={() => { setNewPin(''); setShowNewPin(false); setEmployeePinModalVisible(true); }}
                  disabled={isMutating}
                  style={({ pressed }) => [styles.empActionBtnReset, pressed && styles.btnPressed, isMutating && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Reset PIN"
                >
                  {isMutating ? (
                    <ActivityIndicator size="small" color={Palette.brandPrimary} />
                  ) : (
                    <>
                      <Feather name="key" size={15} color={Palette.brandPrimary} />
                      <Text style={styles.empActionBtnResetText}>Change MPIN</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => handleDeactivateEmployee(detailEmp.id, detailEmp.name)}
                  disabled={isMutating}
                  style={({ pressed }) => [styles.empActionBtnDeactivate, pressed && styles.btnPressed, isMutating && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Deactivate employee"
                >
                  {isMutating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="user-minus" size={15} color="#FFFFFF" />
                      <Text style={[styles.empActionBtnResetText, { color: '#FFFFFF', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'center' }]}>Deactivate employee</Text>
                    </>
                  )}
                </Pressable>
              </View>
              </>}

              {/* Attendance History Section */}
              {employeeDetailTab === 'reports' && <>
              <View style={styles.employeeReportCard}>
                <View style={styles.employeeReportHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.empHistorySectionTitle}>Attendance reports</Text>
                    <Text style={styles.employeeReportSub}>{formatFriendlyDate(employeeReportRange.startDate, 'd MMM yyyy')} – {formatFriendlyDate(employeeReportRange.endDate, 'd MMM yyyy')}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Filter employee report"
                    onPress={() => {
                      setEmployeeReportDraftRange(employeeReportRange);
                      setEmployeeReportDraftStatus(employeeReportStatus);
                      setEmployeeReportFiltersVisible(true);
                    }}
                    style={styles.employeeReportIconButton}
                  >
                    <Feather name="sliders" size={16} color={Palette.brandPrimary} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={employeeReportsQuery.isFetching || !employeeReportsQuery.data?.records.length}
                  onPress={() => router.push({
                    pathname: '/export-report',
                    params: {
                      workplaceId: effectiveWorkplaceId,
                      workplaceName: workplaceName || 'Workplace',
                      startDate: employeeReportRange.startDate,
                      endDate: employeeReportRange.endDate,
                      status: employeeReportStatus === 'ALL' ? '' : employeeReportStatus,
                      employeeMemberId: detailEmp.id,
                    },
                  })}
                  style={[styles.employeeReportExportButton, (!employeeReportsQuery.data?.records.length || employeeReportsQuery.isFetching) && { opacity: 0.5 }]}
                >
                  <Feather name="download" size={16} color="#FFFFFF" />
                  <Text style={[styles.employeeReportExportText, { color: '#FFFFFF' }]}>Export employee report</Text>
                </Pressable>
                {employeeReportsQuery.isLoading ? (
                  <View style={styles.employeeReportState}><ActivityIndicator size="small" color={Palette.brandPrimary} /><Text style={styles.employeeReportSub}>Loading report…</Text></View>
                ) : employeeReportsQuery.isError ? (
                  <Pressable onPress={() => employeeReportsQuery.refetch()} style={styles.employeeReportState}><Text style={styles.employeeReportSub}>Could not load report. Tap to retry.</Text></Pressable>
                ) : !employeeReportsQuery.data?.records.length ? (
                  <Text style={styles.employeeReportEmpty}>No attendance records match these filters.</Text>
                ) : (
                  <>
                    <Text style={styles.employeeReportSub}>{employeeReportsQuery.data.records.length} matching attendance records</Text>
                    {employeeReportsQuery.data.records.slice(0, 8).map((record) => (
                      <View key={record.id} style={styles.employeeReportRecord}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.employeeReportDate}>{formatFriendlyDate(record.attendanceDate, 'EEE, d MMM yyyy')}</Text>
                          <Text style={styles.employeeReportTimes}>
                            In {record.checkInTime ? formatTime(record.checkInTime, timezone) : '—'} · Out {record.checkOutTime ? formatTime(record.checkOutTime, timezone) : '—'} · {record.checkInTime && record.checkOutTime ? formatWorkDuration(record.checkInTime, record.checkOutTime) || '—' : '—'}
                          </Text>
                        </View>
                        <Text style={styles.employeeReportStatus}>{record.status.replace('_', ' ')}</Text>
                      </View>
                    ))}
                    {employeeReportsQuery.data.records.length > 8 && <Text style={styles.employeeReportSub}>Export to view all {employeeReportsQuery.data.records.length} records.</Text>}
                  </>
                )}
              </View>
              </>}

              {employeeDetailTab === 'attendances' && <>
              {/* Circular Attendance Percentage & Days Present / Total Card */}
              <View style={[styles.empAttendanceMetricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                {/* Header row */}
                <View style={styles.empAttendanceMetricHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.empAttendanceIconBadge, { backgroundColor: currentMonthAttendanceStats.statusBg }]}>
                      <Feather name="pie-chart" size={13} color={currentMonthAttendanceStats.statusColor} />
                    </View>
                    <Text style={[styles.empAttendanceMetricTitle, { color: palette.textPrimary }]}>
                      Attendance Performance
                    </Text>
                  </View>
                  <View style={[styles.empAttendanceMonthPill, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
                    <Feather name="calendar" size={11} color={palette.brandPrimary} />
                    <Text style={[styles.empAttendanceMonthText, { color: palette.textPrimary }]}>
                      {currentMonthAttendanceStats.monthLabel}
                    </Text>
                  </View>
                </View>

                {/* Main Row: Circle Percentage on one side, Days present / total days on the other */}
                <View style={styles.empAttendanceMetricBodyRow}>
                  {/* Left Side: Circular SVG Gauge with % path filled */}
                  <View style={styles.empAttendanceCircleWrap}>
                    <Svg width={104} height={104}>
                      {/* Background track circle */}
                      <Circle
                        cx={52}
                        cy={52}
                        r={42}
                        stroke={isDark ? '#334155' : '#E2E8F0'}
                        strokeWidth={8}
                        fill="transparent"
                      />
                      {/* Filled Progress Arc */}
                      <Circle
                        cx={52}
                        cy={52}
                        r={42}
                        stroke={currentMonthAttendanceStats.statusColor}
                        strokeWidth={8}
                        strokeDasharray={`${(2 * Math.PI * 42).toFixed(2)} ${(2 * Math.PI * 42).toFixed(2)}`}
                        strokeDashoffset={(2 * Math.PI * 42 * (1 - currentMonthAttendanceStats.percentage / 100)).toFixed(2)}
                        strokeLinecap="round"
                        fill="transparent"
                        transform="rotate(-90 52 52)"
                      />
                    </Svg>
                    {/* Centered % Text */}
                    <View style={styles.empAttendanceCircleInner}>
                      <Text style={[styles.empAttendanceCirclePercent, { color: palette.textPrimary }]}>
                        {currentMonthAttendanceStats.percentage}%
                      </Text>
                      <Text style={[styles.empAttendanceCircleSub, { color: palette.textSecondary }]}>
                        PRESENT
                      </Text>
                    </View>
                  </View>

                  {/* Right Side: Days Present / Total Days in same row */}
                  <View style={styles.empAttendanceStatsCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.empAttendanceStatsLabel, { color: palette.textSecondary }]}>
                        DAYS RATIO
                      </Text>
                      <View style={[styles.empAttendanceStatusBadge, { backgroundColor: currentMonthAttendanceStats.statusBg, borderColor: currentMonthAttendanceStats.statusBorder }]}>
                        <View style={[styles.empAttendanceStatusDot, { backgroundColor: currentMonthAttendanceStats.statusColor }]} />
                        <Text style={[styles.empAttendanceStatusBadgeText, { color: currentMonthAttendanceStats.statusColor }]}>
                          {currentMonthAttendanceStats.standingLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.empAttendanceDaysRow}>
                      <Text style={[styles.empAttendanceDaysPresent, { color: currentMonthAttendanceStats.statusColor }]}>
                        {currentMonthAttendanceStats.presentDays}
                      </Text>
                      <Text style={[styles.empAttendanceDaysDivider, { color: palette.textSecondary }]}>
                        /
                      </Text>
                      <Text style={[styles.empAttendanceDaysTotal, { color: palette.textPrimary }]}>
                        {currentMonthAttendanceStats.totalDays}
                      </Text>
                      <Text style={[styles.empAttendanceDaysSuffix, { color: palette.textSecondary }]}>
                        days present
                      </Text>
                    </View>

                    {/* Mini horizontal progress bar */}
                    <View style={[styles.empAttendanceProgressBarTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      <View
                        style={[
                          styles.empAttendanceProgressBarFill,
                          {
                            width: `${Math.min(100, Math.max(0, currentMonthAttendanceStats.percentage))}%`,
                            backgroundColor: currentMonthAttendanceStats.statusColor,
                          },
                        ]}
                      />
                    </View>

                    {/* Detail Chips */}
                    <View style={styles.empAttendanceChipsRow}>
                      <View style={[styles.empAttendanceMiniChip, { backgroundColor: isDark ? '#064E3B30' : '#ECFDF5', borderColor: isDark ? '#047857' : '#A7F3D0' }]}>
                        <Text style={[styles.empAttendanceMiniChipText, { color: '#059669' }]}>
                          {currentMonthAttendanceStats.presentDays} Present
                        </Text>
                      </View>
                      {currentMonthAttendanceStats.totalDays - currentMonthAttendanceStats.presentDays > 0 && (
                        <View style={[styles.empAttendanceMiniChip, { backgroundColor: isDark ? '#7F1D1D25' : '#FEF2F2', borderColor: isDark ? '#991B1B' : '#FECACA' }]}>
                          <Text style={[styles.empAttendanceMiniChipText, { color: '#DC2626' }]}>
                            {currentMonthAttendanceStats.totalDays - currentMonthAttendanceStats.presentDays} Absent
                          </Text>
                        </View>
                      )}
                      {currentMonthAttendanceStats.halfDayCount > 0 && (
                        <View style={[styles.empAttendanceMiniChip, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
                          <Text style={[styles.empAttendanceMiniChipText, { color: palette.textSecondary }]}>
                            {currentMonthAttendanceStats.halfDayCount} Half-day
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.empHistoryHeaderRow}>
                <Text style={styles.empHistorySectionTitle}>Full attendance history</Text>
                {filteredEmployeeHistoryRecords.length > 0 && (
                  <View style={styles.empHistoryCountBadge}>
                    <Text style={styles.empHistoryCountBadgeText}>{filteredEmployeeHistoryRecords.length} records</Text>
                  </View>
                )}
              </View>

              {historyQuery.isLoading ? (
                <View style={styles.empHistoryLoadingWrap}>
                  <ActivityIndicator size="small" color="#0F766E" />
                  <Text style={styles.empHistoryLoadingText}>Loading attendance history...</Text>
                </View>
              ) : filteredEmployeeHistoryRecords.length === 0 ? (
                <View style={styles.empHistoryEmptyCard}>
                  <Feather name="calendar" size={28} color="#9CA3AF" style={{ marginBottom: 6 }} />
                  <Text style={styles.empHistoryEmptyTitle}>No attendance records yet</Text>
                  <Text style={styles.empHistoryEmptySub}>
                    Attendance records for {detailEmp.name} will appear here once recorded.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.empHistoryCardsContainer}>
                  {visibleHistoryRecords.map((item, rIdx) => {
                    const isToday = item.attendanceDate === today;
                    const isPresent = item.status === 'PRESENT';
                    const hasCheckOut = !!item.checkOutTime;
                    const isOngoing = isPresent && !hasCheckOut;

                    const checkInDisplay = item.checkInTime
                      ? formatTime(item.checkInTime, timezone)
                      : item.status === 'PENDING'
                      ? 'Pending'
                      : '—';

                    const checkOutDisplay = item.checkOutTime
                      ? formatTime(item.checkOutTime, timezone)
                      : isOngoing
                      ? 'In Progress'
                      : '—';

                    const totalTimeDisplay = item.checkInTime && item.checkOutTime
                      ? (formatWorkDuration(item.checkInTime, item.checkOutTime) || '—')
                      : '—';

                    // Status Badge config
                    let badgeBg = '#F3F4F6';
                    let badgeBorder = '#E5E7EB';
                    let badgeDot = '#9CA3AF';
                    let badgeText = '#4B5563';
                    let statusLabel = 'Not marked';

                    if (isPresent) {
                      if (hasCheckOut) {
                        badgeBg = '#EFF6FF';
                        badgeBorder = '#BFDBFE';
                        badgeDot = '#2563EB';
                        badgeText = '#1D4ED8';
                        statusLabel = 'Checked Out';
                      } else {
                        badgeBg = '#ECFDF5';
                        badgeBorder = '#A7F3D0';
                        badgeDot = '#10B981';
                        badgeText = '#065F46';
                        statusLabel = 'Checked In';
                      }
                    } else if (item.status === 'PENDING') {
                      badgeBg = '#FFFBEB';
                      badgeBorder = '#FDE68A';
                      badgeDot = '#F59E0B';
                      badgeText = '#92400E';
                      statusLabel = 'Pending';
                    } else if (item.status === 'ABSENT') {
                      badgeBg = '#FEF2F2';
                      badgeBorder = '#FECACA';
                      badgeDot = '#EF4444';
                      badgeText = '#991B1B';
                      statusLabel = 'Absent';
                    } else if (item.status === 'HALF_DAY') {
                      badgeBg = '#FAF5FF';
                      badgeBorder = '#E9D5FF';
                      badgeDot = '#A855F7';
                      badgeText = '#6B21A8';
                      statusLabel = 'Half Day';
                    } else if (item.status === 'LEAVE') {
                      badgeBg = '#F0FDF4';
                      badgeBorder = '#BBF7D0';
                      badgeDot = '#22C55E';
                      badgeText = '#166534';
                      statusLabel = 'On Leave';
                    }

                    return (
                      <Pressable
                        key={item.id || rIdx}
                        onPress={() => {
                          showSuccess(
                            `${detailEmp.name} • ${formatFriendlyDate(item.attendanceDate, 'EEE, d MMM')}: ` +
                            (isPresent
                              ? `In: ${checkInDisplay} | Out: ${checkOutDisplay} | Total: ${totalTimeDisplay}`
                              : item.status === 'PENDING'
                              ? 'Waiting for approval'
                              : 'Not marked')
                          );
                        }}
                        style={({ pressed }) => [
                          styles.attHistoryCard,
                          pressed && styles.attHistoryCardPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Attendance record for ${item.attendanceDate}`}
                      >
                        {/* Top row: Date + Status Badge */}
                        <View style={styles.attHistoryCardTopRow}>
                          <View style={styles.attHistoryDateGroup}>
                            <View style={styles.attHistoryCalIconWrap}>
                              <Feather name="calendar" size={13} color="#0F766E" />
                            </View>
                            <Text style={styles.attHistoryDateTitle}>
                              {formatFriendlyDate(item.attendanceDate, 'EEE, d MMM yyyy')}
                            </Text>
                            {isToday && (
                              <View style={styles.attHistoryTodayTag}>
                                <Text style={styles.attHistoryTodayTagText}>Today</Text>
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
                        <View style={styles.attHistoryMetricsContainer}>
                          {/* CHECK IN */}
                          <View style={styles.attHistoryMetricCol}>
                            <View style={styles.attHistoryMetricHeaderRow}>
                              <Feather name="log-in" size={11} color="#16A34A" />
                              <Text style={styles.attHistoryMetricLabel}>CHECK IN</Text>
                            </View>
                            <Text style={styles.attHistoryMetricValue} numberOfLines={1}>
                              {checkInDisplay}
                            </Text>
                          </View>

                          {/* Divider */}
                          <View style={styles.attHistoryMetricDivider} />

                          {/* CHECK OUT */}
                          <View style={styles.attHistoryMetricCol}>
                            <View style={styles.attHistoryMetricHeaderRow}>
                              <Feather name="log-out" size={11} color="#8B5CF6" />
                              <Text style={styles.attHistoryMetricLabel}>CHECK OUT</Text>
                            </View>
                            <Text
                              style={[
                                styles.attHistoryMetricValue,
                                isOngoing && styles.attHistoryOngoingValue,
                              ]}
                              numberOfLines={1}
                            >
                              {checkOutDisplay}
                            </Text>
                          </View>

                          {/* Divider */}
                          <View style={styles.attHistoryMetricDivider} />

                          {/* TOTAL TIME */}
                          <View style={styles.attHistoryMetricCol}>
                            <View style={styles.attHistoryMetricHeaderRow}>
                              <Feather name="clock" size={11} color="#0284C7" />
                              <Text style={styles.attHistoryMetricLabel}>TOTAL TIME</Text>
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

                        {/* Optional Footer: verification or correction details */}
                        {(item.verification?.wifiVerified || item.verification?.qrVerified || item.correctionReason) && (
                          <View style={styles.attHistoryFooterRow}>
                            {item.verification?.wifiVerified && (
                              <View style={styles.attHistoryTagPill}>
                                <Feather name="wifi" size={11} color="#059669" />
                                <Text style={styles.attHistoryTagText}>Wi-Fi verified</Text>
                              </View>
                            )}
                            {item.verification?.qrVerified && (
                              <View style={styles.attHistoryTagPill}>
                                <Feather name="maximize" size={11} color="#2563EB" />
                                <Text style={styles.attHistoryTagText}>QR verified</Text>
                              </View>
                            )}
                            {item.correctionReason && (
                              <Text style={styles.attHistoryCorrectionText} numberOfLines={1}>
                                Note: {item.correctionReason}
                              </Text>
                            )}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                  </View>
                  {visibleHistoryRecords.length < filteredEmployeeHistoryRecords.length && (
                    <Pressable accessibilityRole="button" onPress={() => setHistoryRenderLimit((limit) => limit + 40)} style={styles.loadMoreListButton}>
                      <Text style={styles.loadMoreListText}>Load older records ({filteredEmployeeHistoryRecords.length - visibleHistoryRecords.length} remaining)</Text>
                    </Pressable>
                  )}
                </>
              )}
              </>}
            </ScrollView>
          </View>
        </View>
      )}

      {/* SCREEN 9: DEDICATED EMPLOYEE SEARCH SCREEN */}
      {currentScreen.name === 'employee-search' && (
        <View style={styles.searchScreenContainer}>
          {/* Header */}
          <View style={styles.cleanScreenHeader}>
            <Pressable
              onPress={popScreen}
              style={styles.cleanBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to dashboard"
            >
              <Feather name="arrow-left" size={20} color={Palette.textPrimary} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cleanHeaderTitle}>Search Employees</Text>
              <Text style={styles.cleanHeaderSubtitle}>{workplaceName || 'Workplace'} Directory</Text>
            </View>
          </View>

          {/* Search Input Bar */}
          <View style={styles.searchBarContainer}>
            <View style={[styles.searchBarInputWrapper, isSearchFocused && styles.searchBarInputWrapperFocused]}>
              <Feather name="search" size={18} color={isSearchFocused ? Palette.brandPrimary : Palette.textSecondary} style={styles.searchBarIcon} />
              <TextInput
                value={dedicatedEmpSearch}
                onChangeText={setDedicatedEmpSearch}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by name or email…"
                placeholderTextColor={Palette.textSecondary}
                style={styles.searchBarInput}
                autoFocus
                returnKeyType="search"
                clearButtonMode="never"
              />
              {dedicatedEmpSearch.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search input"
                  onPress={() => setDedicatedEmpSearch('')}
                  style={styles.searchBarClearBtn}
                >
                  <Feather name="x-circle" size={17} color={Palette.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Quick Filter Chips */}
          <View style={styles.searchFilterChipsRow}>
            {(['ALL', 'ACTIVE', 'PRESENT', 'NOT_MARKED'] as const).map((filter) => {
              const label = filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : filter === 'PRESENT' ? 'Present' : 'Not Marked';
              const isActive = dedicatedEmpFilter === filter;
              return (
                <Pressable
                  key={filter}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setDedicatedEmpFilter(filter)}
                  style={[styles.searchFilterChip, isActive && styles.searchFilterChipActive]}
                >
                  <Text style={[styles.searchFilterChipText, isActive && styles.searchFilterChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Results Summary Row */}
          <View style={styles.searchSummaryRow}>
            <Text style={styles.searchSummaryText}>
              {filteredDedicatedEmployees.length} {filteredDedicatedEmployees.length === 1 ? 'Employee' : 'Employees'} Found
            </Text>
          </View>

          {/* Results List */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredDedicatedEmployees.length === 0 ? (
              <View style={styles.searchEmptyContainer}>
                <View style={styles.searchEmptyIconWrap}>
                  <Feather name="search" size={28} color={Palette.brandPrimary} />
                </View>
                <Text style={styles.searchEmptyTitle}>No employees found</Text>
                <Text style={styles.searchEmptySubtitle}>
                  {dedicatedEmpSearch.trim()
                    ? `No employees match "${dedicatedEmpSearch.trim()}" in ${workplaceName || 'this workplace'}.`
                    : 'No employees match the selected criteria.'}
                </Text>
                {(dedicatedEmpSearch.trim().length > 0 || dedicatedEmpFilter !== 'ALL') && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setDedicatedEmpSearch('');
                      setDedicatedEmpFilter('ALL');
                    }}
                    style={styles.searchEmptyClearBtn}
                  >
                    <Text style={styles.searchEmptyClearText}>Reset Filters</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              filteredDedicatedEmployees.map((emp) => (
                <Pressable
                  key={emp.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${emp.name}'s profile and details`}
                  onPress={() => openEmployeeDetail(emp)}
                  style={({ pressed }) => [
                    styles.empDedicatedCard,
                    pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  {/* Top: Avatar + Name + Badges */}
                  <View style={styles.empDedicatedCardHeader}>
                    <Avatar name={emp.name} avatarUrl={emp.avatarUrl} size="lg" />
                    <View style={styles.empDedicatedHeaderInfo}>
                      <View style={styles.empDedicatedNameRow}>
                        <Text style={styles.empDedicatedName} numberOfLines={1}>{emp.name}</Text>
                        <StatusChip status={emp.status} size="sm" />
                      </View>
                      <View style={styles.empDedicatedBadgesRow}>
                        {emp.code ? (
                          <View style={styles.empDedicatedCodeBadge}>
                            <Feather name="hash" size={10} color={Palette.brandPrimary} />
                            <Text style={styles.empDedicatedCodeText}>{emp.code}</Text>
                          </View>
                        ) : null}
                        <View style={[
                          styles.empDedicatedMemberBadge,
                          emp.membershipStatus === 'INVITED' && styles.empDedicatedMemberBadgeInvited
                        ]}>
                          <Text style={[
                            styles.empDedicatedMemberText,
                            emp.membershipStatus === 'INVITED' && styles.empDedicatedMemberTextInvited
                          ]}>
                            {emp.membershipStatus === 'INVITED' ? 'Invite Sent' : 'Active Member'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Middle: Email with icon */}
                  <View style={styles.empDedicatedMetaDivider} />
                  <View style={styles.empDedicatedEmailRow}>
                    <View style={styles.empDedicatedEmailIconWrap}>
                      <Feather name="mail" size={13} color={Palette.textSecondary} />
                    </View>
                    <Text style={styles.empDedicatedEmailText} numberOfLines={1}>
                      {emp.email || 'No email registered'}
                    </Text>
                  </View>

                  {/* Bottom Action Button: Direct CTA to user profile / details */}
                  <View style={styles.empDedicatedActionBtn}>
                    <View style={styles.empDedicatedActionBtnContent}>
                      <Feather name="user" size={14} color={Palette.brandPrimary} />
                      <Text style={styles.empDedicatedActionBtnText}>View Profile & Details</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={Palette.brandPrimary} />
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}

      <Modal
        visible={employeePinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmployeePinModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.employeePinModalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close change MPIN sheet"
            onPress={() => setEmployeePinModalVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.employeePinModal, { paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={styles.employeePinDragHandle} />
            <View style={styles.employeePinModalHeader}>
              <View style={styles.employeePinIcon}><Feather name="key" size={19} color={Palette.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.employeeReportModalTitle}>Change employee MPIN</Text>
                <Text style={styles.employeePinSubtitle}>{detailEmp?.name}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setEmployeePinModalVisible(false)} style={styles.employeeReportIconButton}>
                <Feather name="x" size={18} color={Palette.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.employeePinHelper}>Enter a new 4–6 digit MPIN. Existing MPINs are securely hashed and can’t be viewed.</Text>
            <View style={styles.employeePinField}>
              <Text style={styles.employeePinFieldLabel}>New MPIN</Text>
              <View style={styles.employeePinInputRow}>
                <TextInput
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="number-pad"
                  secureTextEntry={!showNewPin}
                  maxLength={6}
                  style={styles.employeePinInput}
                  accessibilityLabel="New employee MPIN"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showNewPin ? 'Hide new MPIN' : 'Show new MPIN'}
                  onPress={() => setShowNewPin(value => !value)}
                  style={styles.employeePinVisibilityButton}
                >
                  <Feather name={showNewPin ? 'eye-off' : 'eye'} size={18} color={Palette.textSecondary} />
                </Pressable>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={isMutating || !/^\d{4,6}$/.test(newPin)}
              onPress={() => { if (detailEmp) void handleResetEmployeePin(detailEmp.id, detailEmp.name); }}
              style={({ pressed }) => [styles.employeePinSaveButton, pressed && styles.btnPressed, (isMutating || !/^\d{4,6}$/.test(newPin)) && { opacity: 0.55 }]}
            >
              {isMutating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="check" size={17} color="#FFFFFF" />}
              <Text style={styles.employeePinSaveText}>{isMutating ? 'Saving MPIN…' : 'Save new MPIN'}</Text>
            </Pressable>
            <AdBanner position="bottom" safeBottom />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={employeeReportFiltersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmployeeReportFiltersVisible(false)}
      >
        <View style={styles.employeeReportModalOverlay}>
          <View style={styles.employeeReportModal}>
            <View style={styles.employeeReportModalHeader}>
              <Text style={styles.employeeReportModalTitle}>Filter attendance</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setEmployeeReportFiltersVisible(false)} style={styles.employeeReportIconButton}>
                <Feather name="x" size={18} color={Palette.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <RangeFilters
                key={`${employeeReportFiltersVisible}-${employeeReportRange.startDate}-${employeeReportRange.endDate}`}
                today={today}
                start={employeeReportDraftRange.startDate}
                end={employeeReportDraftRange.endDate}
                deferApply
                onApply={() => {}}
                onDraftChange={(startDate, endDate) => setEmployeeReportDraftRange({ startDate, endDate })}
              />
              <Text style={styles.employeeReportFilterLabel}>Attendance status</Text>
              <FilterPills values={attendanceStatuses} selected={employeeReportDraftStatus} onSelect={setEmployeeReportDraftStatus} />
            </ScrollView>
            <View style={styles.employeeReportModalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!validCalendarDate(employeeReportDraftRange.startDate) || !validCalendarDate(employeeReportDraftRange.endDate) || employeeReportDraftRange.startDate > employeeReportDraftRange.endDate || employeeReportDraftRange.endDate > today) {
                    showError('Choose a valid date range ending on or before today.');
                    return;
                  }
                  setEmployeeReportRange(employeeReportDraftRange);
                  setEmployeeReportStatus(employeeReportDraftStatus);
                  setHistoryRenderLimit(40);
                  setEmployeeReportFiltersVisible(false);
                }}
                style={styles.employeeReportApplyButton}
              >
                <Text style={styles.employeeReportApplyText}>Apply filters</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const range = { startDate: `${today.slice(0, 7)}-01`, endDate: today };
                  setEmployeeReportRange(range);
                  setEmployeeReportDraftRange(range);
                  setEmployeeReportStatus('ALL');
                  setEmployeeReportDraftStatus('ALL');
                  setHistoryRenderLimit(40);
                  setEmployeeReportFiltersVisible(false);
                }}
                style={styles.employeeReportResetButton}
              >
                <Text style={styles.employeeReportResetText}>Reset</Text>
              </Pressable>
            </View>
            <AdBanner position="bottom" safeBottom />
          </View>
        </View>
      </Modal>

      {/* Sticky bottom ad banner on sub-screens */}
      {currentScreen.name !== 'tabs' && <AdBanner position="bottom" safeBottom />}

      {/* CONFIRM CLOSE SESSION DIALOG */}
      <ConfirmDialog
        loading={isMutating}
        visible={showCloseSessionConfirm}
        title="Close attendance?"
        message="Closing attendance prevents any further QR requests. Employees who have not requested attendance will remain 'Not marked'."
        confirmLabel="Close attendance"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={handleConfirmCloseSession}
        onCancel={() => setShowCloseSessionConfirm(false)}
      />

      {/* REJECT REQUEST WITH REASON DIALOG */}
      <ConfirmDialog
        loading={isMutating}
        visible={!!rejectTargetId}
        title="Reject attendance request"
        message="Provide a reason for rejection. The employee will see this reason in their app."
        confirmLabel="Reject"
        cancelLabel="Cancel"
        isDestructive
        inputPlaceholder="Reason for rejection..."
        inputValue={rejectionReason}
        onChangeInput={setRejectionReason}
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectTargetId(null)}
      />

      {/* REJECT JOIN REQUEST CONFIRM DIALOG */}
      <ConfirmDialog
        loading={!!processingJoinReqId}
        visible={!!rejectJoinReqTarget}
        title="Decline join request"
        message={`Decline the workplace join request from ${rejectJoinReqTarget?.name || 'this candidate'}?`}
        confirmLabel="Decline Request"
        cancelLabel="Cancel"
        isDestructive
        inputPlaceholder="Reason (e.g. Not an employee, wrong workplace)..."
        inputValue={rejectJoinReqReason}
        onChangeInput={setRejectJoinReqReason}
        onConfirm={handleConfirmRejectJoinRequest}
        onCancel={() => setRejectJoinReqTarget(null)}
      />

      {/* QUICK ACCESS QR POPOVER MODAL WITH ARROW TO UPSIDE */}
      <Modal
        visible={showQuickQrPopover}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickQrPopover(false)}
      >
        <Pressable
          style={styles.popoverBackdrop}
          onPress={() => setShowQuickQrPopover(false)}
        >
          <View
            style={[
              styles.popoverContainer,
              {
                top: tooltipTop,
                right: tooltipRight,
                width: tooltipWidth,
              },
            ]}
          >
            {/* Popover Arrow Border (matching card border) */}
            <View
              style={[
                styles.popoverArrowBorder,
                {
                  right: arrowOffsetFromCardRight - 1,
                  borderBottomColor: palette.border,
                },
              ]}
            />
            {/* Upward pointing arrow directly below the header QR button */}
            <View
              style={[
                styles.popoverArrowUp,
                {
                  right: arrowOffsetFromCardRight,
                  borderBottomColor: palette.surface,
                },
              ]}
            />

            {/* Popover Card */}
            <Pressable
              style={[
                styles.popoverCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={styles.popoverHeader}>
                <View style={styles.popoverTitleRow}>
                  <View style={[styles.popoverIconBadge, { backgroundColor: palette.brandTint }]}>
                    <MaterialCommunityIcons name="qrcode" size={15} color={palette.brandPrimary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.popoverTitle, { color: palette.textPrimary }]}>Quick Access QR</Text>
                    <Text style={[styles.popoverSubtitle, { color: palette.textSecondary }]} numberOfLines={1}>
                      Code: {effectiveWorkplaceCode}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setShowQuickQrPopover(false)}
                  style={[styles.popoverCloseBtn, { backgroundColor: palette.surfaceMuted }]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close quick QR popover"
                >
                  <Feather name="x" size={14} color={palette.textSecondary} />
                </Pressable>
              </View>

              {/* QR Code Container */}
              <View style={styles.popoverQrBox}>
                {quickJoinQrQuery.isLoading && !quickJoinQrQuery.data ? (
                  <View style={[styles.popoverLoadingBox, { backgroundColor: palette.surfaceMuted }]}>
                    <ActivityIndicator size="large" color={palette.brandPrimary} />
                    <Text style={[styles.popoverLoadingText, { color: palette.textSecondary }]}>Generating QR code...</Text>
                  </View>
                ) : (
                  <View style={[styles.qrWhiteBadge, { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 14 }]}>
                    <QRCode
                      value={
                        quickJoinQrQuery.data?.qrPayload ||
                        quickJoinQrQuery.data?.joinLink ||
                        `https://www.bizora.shivamshankhdhar.online/join?code=${effectiveWorkplaceCode}`
                      }
                      size={146}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                )}
              </View>

              <Text style={[styles.popoverInstruction, { color: palette.textSecondary }]}>
                Scan this QR code or enter code{' '}
                <Text style={{ fontWeight: '700', color: palette.brandPrimary }}>
                  {effectiveWorkplaceCode}
                </Text>{' '}
                to join.
              </Text>

              {/* Quick Actions */}
              <View style={styles.popoverActionsRow}>
                <Pressable
                  onPress={handleCopyJoinLink}
                  style={({ pressed }) => [
                    styles.popoverActionBtn,
                    {
                      backgroundColor: palette.brandTint,
                      borderColor: palette.brandPrimary + '40',
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                >
                  <Feather
                    name={isLinkCopied ? 'check' : 'link'}
                    size={13}
                    color={isLinkCopied ? palette.success : palette.brandPrimary}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.popoverActionBtnText, { color: isLinkCopied ? palette.success : palette.brandPrimary }]}>
                    {isLinkCopied ? 'Link Copied!' : 'Copy Link'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowQuickQrPopover(false);
                    setJoinQrModalVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.popoverActionBtnSecondary,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                >
                  <Feather name="maximize-2" size={13} color={palette.textPrimary} style={{ marginRight: 5 }} />
                  <Text style={[styles.popoverActionBtnSecondaryText, { color: palette.textPrimary }]}>Full Screen</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ATTENDANCE QR MODAL (Check-In / Check-Out tabs) */}
      <Modal
        visible={showAttendanceQrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttendanceQrModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setShowAttendanceQrModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              {
                backgroundColor: palette.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingBottom: 32,
                paddingTop: 8,
                borderWidth: 1,
                borderColor: palette.border,
              },
            ]}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.popoverIconBadge, { backgroundColor: palette.brandTint }]}>
                  <MaterialCommunityIcons name="qrcode-scan" size={16} color={palette.brandPrimary} />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: palette.textPrimary }}>Today's Attendance QR</Text>
                  <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 1 }}>
                    {isSessionOpen ? 'Session open · Employees can scan' : 'Session closed'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowAttendanceQrModal(false)}
                style={[styles.popoverCloseBtn, { backgroundColor: palette.surfaceMuted }]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close attendance QR modal"
              >
                <Feather name="x" size={14} color={palette.textSecondary} />
              </Pressable>
            </View>

            {!isSessionOpen ? (
              <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 }}>
                <View style={[styles.qrInactiveHeroCircle, { backgroundColor: palette.brandTint, marginBottom: 12 }]}>
                  <MaterialCommunityIcons name="qrcode-scan" size={28} color={palette.brandPrimary} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: palette.textPrimary, marginBottom: 6, textAlign: 'center' }}>
                  Start Today's Attendance
                </Text>
                <Text style={{ fontSize: 13, color: palette.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 18 }}>
                  Generate live dynamic QR codes for team check-in and check-out.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open attendance session"
                  disabled={isOpeningSession}
                  onPress={handleOpenSession}
                  style={({ pressed }) => [
                    styles.qrStartSessionBtn,
                    { backgroundColor: palette.brandPrimary, width: '100%', marginBottom: 16 },
                    isOpeningSession && styles.emptyPrimarySolidBtnDisabled,
                    pressed && styles.btnPressed,
                  ]}
                >
                  {isOpeningSession ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.qrStartSessionBtnText}>Opening session...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Feather name="play-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.qrStartSessionBtnText}>Open Attendance Session</Text>
                    </View>
                  )}
                </Pressable>

                <View style={[styles.qrFeatureChipsRow, { justifyContent: 'center', width: '100%' }]}>
                  <View style={styles.qrFeatureChip}>
                    <Feather name="shield" size={11} color={palette.brandPrimary} />
                    <Text style={styles.qrFeatureChipText}>Anti-Spoof QR</Text>
                  </View>
                  <View style={styles.qrFeatureChip}>
                    <Feather name="map-pin" size={11} color={palette.brandPrimary} />
                    <Text style={styles.qrFeatureChipText}>Geofenced</Text>
                  </View>
                  <View style={styles.qrFeatureChip}>
                    <Feather name="wifi" size={11} color={palette.brandPrimary} />
                    <Text style={styles.qrFeatureChipText}>Wi-Fi Sync</Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                {/* Check-In / Check-Out tab toggle */}
                <View style={{ flexDirection: 'row', marginHorizontal: 20, backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 3, marginBottom: 16 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Check-In QR"
                    onPress={() => setAttendanceQrTab('checkin')}
                    style={[{
                      flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
                    }, attendanceQrTab === 'checkin' && { backgroundColor: palette.brandPrimary }]}
                  >
                    <Text style={[{ fontSize: 13, fontWeight: '700' }, { color: attendanceQrTab === 'checkin' ? '#FFFFFF' : palette.textSecondary }]}>
                      Check-In
                    </Text>
                    {attendanceQrTab === 'checkin' && (
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>Active</Text>
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Check-Out QR"
                    onPress={() => setAttendanceQrTab('checkout')}
                    style={[{
                      flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
                    }, attendanceQrTab === 'checkout' && { backgroundColor: '#D97706' }]}
                  >
                    <Text style={[{ fontSize: 13, fontWeight: '700' }, { color: attendanceQrTab === 'checkout' ? '#FFFFFF' : palette.textSecondary }]}>
                      Check-Out
                    </Text>
                    {attendanceQrTab === 'checkout' && (
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>Active</Text>
                    )}
                  </Pressable>
                </View>

                {/* QR Code */}
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  {(attendanceQrTab === 'checkin' ? sessionQrPayload : sessionCheckoutQrPayload) ? (
                    <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                      <QRCode
                        value={attendanceQrTab === 'checkin' ? sessionQrPayload : sessionCheckoutQrPayload}
                        size={200}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                      />
                    </View>
                  ) : (
                    <View style={{ width: 228, height: 228, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.surfaceMuted, borderRadius: 16 }}>
                      <ActivityIndicator size="large" color={palette.brandPrimary} />
                    </View>
                  )}
                </View>

                {/* Info label */}
                <Text style={{ textAlign: 'center', fontSize: 12, color: palette.textSecondary, marginHorizontal: 24, marginBottom: 16 }}>
                  {attendanceQrTab === 'checkout'
                    ? 'Employees scan this to check out · Recorded instantly, no approval needed'
                    : 'Employees scan this to check in · Recorded instantly, no approval needed'}
                </Text>

                {/* End Session button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="End attendance session"
                  onPress={() => setShowCloseSessionConfirm(true)}
                  style={({ pressed }) => [
                    styles.qrCloseSessionBtn,
                    { marginHorizontal: 20, marginTop: 2 },
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Feather name="power" size={13} color={Palette.danger} />
                  <Text style={styles.qrCloseSessionBtnText}>End Session</Text>
                </Pressable>
              </>
            )}
            <AdBanner position="bottom" safeBottom />
          </Pressable>
        </Pressable>
      </Modal>

      {/* MANUAL ATTENDANCE BOTTOM SHEET MODAL */}
      <Modal
        visible={showManualAttendanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualAttendanceModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setShowManualAttendanceModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxHeight: '90%' }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: palette.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingBottom: Math.max(insets.bottom, 24),
                paddingTop: 8,
                borderWidth: 1,
                borderColor: palette.border,
                maxHeight: '100%',
              }}
            >
              {/* Drag handle */}
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.popoverIconBadge, { backgroundColor: palette.brandTint }]}>
                    <Feather name="user-check" size={16} color={palette.brandPrimary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: palette.textPrimary }}>Manual Attendance</Text>
                    <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 1 }}>
                      Record or adjust attendance entry
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setShowManualAttendanceModal(false)}
                  style={[styles.popoverCloseBtn, { backgroundColor: palette.surfaceMuted }]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close manual attendance modal"
                >
                  <Feather name="x" size={14} color={palette.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
              >
                {/* Employee selector */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.formLabelRequired}>Select Employee *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  >
                    {effectiveEmployees.filter((e) => e.membershipStatus === 'ACTIVE').map((employee) => {
                      const isSelected = manualTargetEmp?.id === employee.id;
                      return (
                        <Pressable
                          key={employee.id}
                          onPress={() => setManualTargetEmp(employee)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: isSelected ? palette.brandPrimary : palette.border,
                            backgroundColor: isSelected ? palette.brandTint : palette.surface,
                            gap: 8,
                          }}
                        >
                          <Avatar name={employee.name} avatarUrl={employee.avatarUrl} size="sm" />
                          <View>
                            <Text style={[{ fontSize: 13, fontWeight: '600', color: palette.textPrimary }, isSelected && { color: palette.brandPrimary, fontWeight: '700' }]}>
                              {employee.name}
                            </Text>
                            <Text style={{ fontSize: 11, color: palette.textSecondary }}>{employee.code}</Text>
                          </View>
                          {isSelected && <Feather name="check" size={14} color={palette.brandPrimary} />}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Date */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.formLabelRequired}>Date *</Text>
                  <View style={[styles.dropdownInput, { backgroundColor: palette.surfaceMuted }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="calendar" size={16} color={palette.brandPrimary} />
                      <Text style={[styles.dropdownText, { color: palette.textPrimary }]}>{formatFriendlyDate(manualDate, 'EEE, MMM d, yyyy')}</Text>
                    </View>
                  </View>
                </View>

                {/* Status 4 pills */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.formLabelRequired}>Status *</Text>
                  <View style={styles.manualStatusPillsRow}>
                    {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const).map((st) => (
                      <Pressable
                        key={st}
                        onPress={() => setManualStatus(st as any)}
                        style={[
                          styles.manualPill,
                          manualStatus === st && (st === 'PRESENT' ? styles.manualPillPresentActive : styles.manualPillActive),
                        ]}
                      >
                        <Text
                          style={[
                            styles.manualPillText,
                            manualStatus === st && styles.manualPillTextActive,
                          ]}
                        >
                          {st === 'HALF_DAY' ? 'Half day' : st.charAt(0) + st.slice(1).toLowerCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Reason */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.formLabelRequired}>Reason *</Text>
                  <TextInput
                    value={manualReason}
                    onChangeText={setManualReason}
                    placeholder="Enter reason (e.g. forgot to scan, onsite meeting)..."
                    placeholderTextColor={palette.textSecondary}
                    multiline
                    numberOfLines={3}
                    style={[styles.reasonTextarea, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surface }]}
                  />
                  <Text style={styles.charCountText}>{manualReason.length}/200</Text>
                </View>

                {/* Save button */}
                <PrimaryButton
                  label="Save record"
                  loading={isMutating}
                  onPress={handleSaveManualAttendance}
                  style={[styles.saveRecordBtn, { marginTop: 6 }]}
                />
              </ScrollView>
              <AdBanner position="bottom" safeBottom />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* WORKPLACE JOIN QR CODE MODAL */}
      <WorkplaceJoinQrModal
        visible={joinQrModalVisible}
        workplaceId={effectiveWorkplaceId}
        workplaceName={workplaceName}
        onClose={() => setJoinQrModalVisible(false)}
      />

      {/* HOW ATTENDANCE MARKING WORKS MODAL */}
      <Modal
        visible={showMarkInstructionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMarkInstructionsModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setShowMarkInstructionsModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: palette.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: Math.max(insets.bottom, 24),
              paddingTop: 10,
              borderWidth: 1,
              borderColor: palette.border,
              maxHeight: '85%',
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <View style={[styles.popoverIconBadge, { backgroundColor: palette.brandTint }]}>
                  <Feather name="book-open" size={16} color={palette.brandPrimary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: palette.textPrimary }} numberOfLines={1}>
                    How Attendance Works
                  </Text>
                  <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 1 }}>
                    Operational guide & daily workflow
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowMarkInstructionsModal(false)}
                style={[styles.popoverCloseBtn, { backgroundColor: palette.surfaceMuted }]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close help modal"
              >
                <Feather name="x" size={16} color={palette.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Step 1 */}
              <View style={styles.markStepRow}>
                <View style={[styles.markStepNumberBox, { backgroundColor: palette.brandPrimary }]}>
                  <Text style={styles.markStepNumberText}>1</Text>
                </View>
                <View style={styles.markStepTextCol}>
                  <Text style={[styles.markStepTitle, { color: palette.textPrimary }]}>
                    Open Morning Session
                  </Text>
                  <Text style={[styles.markStepDesc, { color: palette.textSecondary }]}>
                    Start the daily attendance session each morning. A secure, rotating anti-spoof QR code is created specifically for your workplace.
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.markStepRow}>
                <View style={[styles.markStepNumberBox, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.markStepNumberText}>2</Text>
                </View>
                <View style={styles.markStepTextCol}>
                  <Text style={[styles.markStepTitle, { color: palette.textPrimary }]}>
                    Employees Scan at Kiosk
                  </Text>
                  <Text style={[styles.markStepDesc, { color: palette.textSecondary }]}>
                    Display the QR code on a front-desk tablet, laptop, or mobile screen. Employees scan with their mobile app to instantly record Check-In or Check-Out.
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={styles.markStepRow}>
                <View style={[styles.markStepNumberBox, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.markStepNumberText}>3</Text>
                </View>
                <View style={styles.markStepTextCol}>
                  <Text style={[styles.markStepTitle, { color: palette.textPrimary }]}>
                    Manual Overrides & Corrections
                  </Text>
                  <Text style={[styles.markStepDesc, { color: palette.textSecondary }]}>
                    If someone forgot their phone, worked remotely, or needs an adjustment, tap Manual Attendance to select the employee, set status, and provide a reason.
                  </Text>
                </View>
              </View>

              {/* Step 4 */}
              <View style={[styles.markStepRow, { borderBottomWidth: 0, marginBottom: 12 }]}>
                <View style={[styles.markStepNumberBox, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.markStepNumberText}>4</Text>
                </View>
                <View style={styles.markStepTextCol}>
                  <Text style={[styles.markStepTitle, { color: palette.textPrimary }]}>
                    Automated Session Closing
                  </Text>
                  <Text style={[styles.markStepDesc, { color: palette.textSecondary }]}>
                    Sessions automatically close at your workplace auto-close hour (e.g. 23:00) to lock daily records for reports, or you can end the session manually anytime.
                  </Text>
                </View>
              </View>

              {/* Security & Verification Chips */}
              <View style={[styles.markSecurityWrap, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
                <View style={styles.markSecurityChip}>
                  <Feather name="shield" size={13} color={palette.brandPrimary} />
                  <Text style={[styles.markSecurityChipText, { color: palette.textPrimary }]}>Anti-Spoof QR</Text>
                </View>
                <View style={styles.markSecurityChip}>
                  <Feather name="map-pin" size={13} color={palette.brandPrimary} />
                  <Text style={[styles.markSecurityChipText, { color: palette.textPrimary }]}>Geofence Verification</Text>
                </View>
                <View style={styles.markSecurityChip}>
                  <Feather name="wifi" size={13} color={palette.brandPrimary} />
                  <Text style={[styles.markSecurityChipText, { color: palette.textPrimary }]}>Wi-Fi Sync</Text>
                </View>
              </View>

              {/* Pro Tip */}
              <View style={[styles.markTipBox, { backgroundColor: isDark ? '#78350F25' : '#FEF3C7', borderColor: isDark ? '#92400E' : '#FDE68A', marginBottom: 16 }]}>
                <Feather name="zap" size={14} color="#D97706" style={{ marginTop: 2 }} />
                <Text style={[styles.markTipText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                  <Text style={{ fontWeight: '700' }}>Pro Tip: </Text>
                  Leave the QR Kiosk screen running on an iPad or reception desk monitor in Guided Access mode for a dedicated, zero-touch attendance terminal.
                </Text>
              </View>

              {/* Dismiss Button */}
              <Pressable
                onPress={() => setShowMarkInstructionsModal(false)}
                style={({ pressed }) => [
                  {
                    backgroundColor: palette.brandPrimary,
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Got it"
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Got it</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ADD MEMBER BOTTOM SHEET MODAL */}
      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.addMemberModalOverlay}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close add member modal"
            onPress={() => setShowAddMemberModal(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.addMemberModalContent,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >
            {/* Top drag handle */}
            <View style={styles.addMemberDragHandleWrapper}>
              <View style={styles.addMemberDragHandle} />
            </View>

            {/* STEP 1: CHOOSE METHOD ('choose') */}
            {addMemberStep === 'choose' && (
              <View style={styles.addMemberModalInner}>
                <View style={styles.addMemberHeaderRow}>
                  <View style={styles.addMemberHeaderLeft}>
                    <View style={styles.addMemberIconCircle}>
                      <Feather name="user-plus" size={18} color={palette.brandPrimary} />
                    </View>
                    <View>
                      <Text style={styles.addMemberTitle}>Add Team Member</Text>
                      <Text style={styles.addMemberSubtitle}>
                        Choose how to invite this employee
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={() => setShowAddMemberModal(false)}
                    style={styles.addMemberCloseBtn}
                  >
                    <Feather name="x" size={18} color={palette.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.addMemberOptionsList}>
                  {/* Option 1: Invite via Link */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Invite via Link"
                    onPress={() => {
                      setAddMemberStep('link');
                      if (!generatedLink) {
                        void attendanceApi
                          .createInviteLink(effectiveWorkplaceId)
                          .then((res) => {
                            if (res?.joinLink) setGeneratedLink(res.joinLink);
                          })
                          .catch(() => {});
                      }
                    }}
                    style={({ pressed }) => [
                      styles.addMemberOptionCard,
                      pressed && styles.addMemberOptionCardPressed,
                    ]}
                  >
                    <View style={[styles.addMemberOptionIconBox, { backgroundColor: '#F0FDF4' }]}>
                      <Feather name="link-2" size={22} color={palette.brandPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addMemberOptionTitle}>Invite via Link</Text>
                      <Text style={styles.addMemberOptionDesc}>
                        Share a join link or workplace code via WhatsApp, Messages, or any app.
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={palette.textSecondary} />
                  </Pressable>

                  {/* Option 2: Invite via Gmail / Email */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Invite via Gmail or Email"
                    onPress={() => setAddMemberStep('email')}
                    style={({ pressed }) => [
                      styles.addMemberOptionCard,
                      pressed && styles.addMemberOptionCardPressed,
                    ]}
                  >
                    <View style={[styles.addMemberOptionIconBox, { backgroundColor: '#FEF3C7' }]}>
                      <Feather name="mail" size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addMemberOptionTitle}>Invite via Gmail / Email</Text>
                      <Text style={styles.addMemberOptionDesc}>
                        Enter their email directly to create an official employee record on your roster.
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={palette.textSecondary} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* STEP 2: INVITE VIA LINK ('link') */}
            {addMemberStep === 'link' && (
              <View style={styles.addMemberModalInner}>
                <View style={styles.addMemberHeaderRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go back to options"
                    onPress={() => setAddMemberStep('choose')}
                    style={styles.addMemberBackBtn}
                  >
                    <Feather name="arrow-left" size={20} color={palette.textPrimary} />
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.addMemberTitle}>Invite via Link</Text>
                    <Text style={styles.addMemberSubtitle}>
                      Share code or link with employees
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={() => setShowAddMemberModal(false)}
                    style={styles.addMemberCloseBtn}
                  >
                    <Feather name="x" size={18} color={palette.textSecondary} />
                  </Pressable>
                </View>

                {/* Workplace Code Box */}
                <View style={styles.inviteLinkCardSection}>
                  <Text style={styles.inviteSectionHeading}>WORKPLACE CODE</Text>
                  <View style={styles.inviteCodeBadgeRow}>
                    <Text selectable style={styles.inviteCodeBadgeText}>
                      # {effectiveWorkplaceCode}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Copy workplace code"
                      onPress={handleCopyModalWorkplaceCode}
                      style={styles.inviteCopySmallBtn}
                    >
                      <Feather
                        name={inviteCodeCopied ? 'check' : 'copy'}
                        size={14}
                        color={inviteCodeCopied ? '#16A34A' : palette.brandPrimary}
                      />
                      <Text
                        style={[
                          styles.inviteCopySmallBtnText,
                          inviteCodeCopied && { color: '#16A34A' },
                        ]}
                      >
                        {inviteCodeCopied ? 'Copied!' : 'Copy Code'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Shareable Link Box */}
                  <Text style={[styles.inviteSectionHeading, { marginTop: 14 }]}>
                    INVITE LINK
                  </Text>
                  <View style={styles.inviteLinkBoxRow}>
                    <Text
                      numberOfLines={1}
                      style={styles.inviteLinkText}
                    >
                      {generatedLink ||
                        `https://www.bizora.shivamshankhdhar.online/join?code=${effectiveWorkplaceCode}`}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Copy invite link"
                      onPress={handleCopyModalLink}
                      style={styles.inviteCopySmallBtn}
                    >
                      <Feather
                        name={inviteLinkCopied ? 'check' : 'copy'}
                        size={14}
                        color={inviteLinkCopied ? '#16A34A' : palette.brandPrimary}
                      />
                      <Text
                        style={[
                          styles.inviteCopySmallBtnText,
                          inviteLinkCopied && { color: '#16A34A' },
                        ]}
                      >
                        {inviteLinkCopied ? 'Copied!' : 'Copy Link'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Big Share via Button */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Share invite link"
                    onPress={handleShareWorkplaceInvite}
                    style={({ pressed }) => [
                      styles.shareModalMainBtn,
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Feather name="share-2" size={17} color="#FFFFFF" />
                    <Text style={styles.shareModalMainBtnText}>Share via Apps...</Text>
                  </Pressable>

                  {/* Tip banner */}
                  <View style={styles.inviteSecurityNote}>
                    <Feather name="shield" size={14} color={palette.brandPrimary} />
                    <Text style={styles.inviteSecurityNoteText}>
                      When employees join with this link, they will appear in your Check-In tab for approval before getting access.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 3: INVITE VIA GMAIL / EMAIL ('email') */}
            {addMemberStep === 'email' && (
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 520 }}
              >
                <View style={styles.addMemberModalInner}>
                  <View style={styles.addMemberHeaderRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Go back to options"
                      onPress={() => setAddMemberStep('choose')}
                      style={styles.addMemberBackBtn}
                    >
                      <Feather name="arrow-left" size={20} color={palette.textPrimary} />
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.addMemberTitle}>Add via Gmail / Email</Text>
                      <Text style={styles.addMemberSubtitle}>
                        Direct employee registration
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      onPress={() => setShowAddMemberModal(false)}
                      style={styles.addMemberCloseBtn}
                    >
                      <Feather name="x" size={18} color={palette.textSecondary} />
                    </Pressable>
                  </View>

                  {createdInvite ? (
                    <View style={styles.inviteSuccessCard}>
                      <View style={styles.inviteSuccessIconRow}>
                        <View style={styles.inviteSuccessBadge}>
                          <Feather name="check" size={20} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inviteSuccessTitle}>Employee Added!</Text>
                          <Text style={styles.inviteSuccessSub}>{createdInvite.email}</Text>
                        </View>
                      </View>

                      <View style={styles.inviteCodeBadgeRow}>
                        <Text style={{ fontSize: 11, color: palette.textSecondary, fontWeight: '600' }}>INVITE CODE:</Text>
                        <Text selectable style={styles.inviteCodeBadgeText}>{createdInvite.token}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={copyInvite}
                          style={styles.inviteSuccessSecondaryBtn}
                        >
                          <Feather name="share-2" size={14} color={palette.brandPrimary} />
                          <Text style={styles.inviteSuccessSecondaryBtnText}>Share Code</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={copyInviteLink}
                          style={styles.inviteSuccessSecondaryBtn}
                        >
                          <Feather name="link-2" size={14} color={palette.brandPrimary} />
                          <Text style={styles.inviteSuccessSecondaryBtnText}>Share Link</Text>
                        </Pressable>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setShowAddMemberModal(false);
                          setCreatedInvite(null);
                        }}
                        style={[styles.shareModalMainBtn, { marginTop: 14 }]}
                      >
                        <Text style={styles.shareModalMainBtnText}>Done</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.addEmployeeFormCard}>
                      <Text style={styles.formSectionSubtitle}>
                        Add employee using their exact email address. An invitation will be bound to their account.
                      </Text>

                      <View style={styles.modalFormField}>
                        <Text style={styles.modalFieldLabel}>Employee Email (required)</Text>
                        <TextInput
                          value={newEmpEmail}
                          onChangeText={setNewEmpEmail}
                          placeholder="e.g. employee@gmail.com"
                          placeholderTextColor={palette.textSecondary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={styles.modalTextInput}
                        />
                      </View>

                      <View style={styles.modalFormField}>
                        <Text style={styles.modalFieldLabel}>Employee Name (optional)</Text>
                        <TextInput
                          value={newEmpName}
                          onChangeText={setNewEmpName}
                          placeholder="e.g. Rahul Sharma"
                          placeholderTextColor={palette.textSecondary}
                          style={styles.modalTextInput}
                        />
                      </View>

                      <View style={styles.modalFormField}>
                        <Text style={styles.modalFieldLabel}>Employee Code / ID (optional)</Text>
                        <TextInput
                          value={newEmpCode}
                          onChangeText={setNewEmpCode}
                          placeholder="e.g. EMP001"
                          placeholderTextColor={palette.textSecondary}
                          autoCapitalize="characters"
                          style={styles.modalTextInput}
                        />
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Save and add employee"
                        onPress={handleSaveAddEmployee}
                        disabled={isMutating}
                        style={({ pressed }) => [
                          styles.shareModalMainBtn,
                          { marginTop: 16 },
                          pressed && { opacity: 0.88 },
                          isMutating && { opacity: 0.6 },
                        ]}
                      >
                        {isMutating ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Feather name="check" size={17} color="#FFFFFF" />
                            <Text style={styles.shareModalMainBtnText}>Save & Send Invite</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
            <AdBanner position="bottom" safeBottom />
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  homeCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#3B4D1A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  homeCardBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  homeCardBandIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeCardBandLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  homeLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  homeWpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  homeWpNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  homeWpTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  homeWpSwitcherBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  homeCopyBadge: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  homeAttendanceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  homeAttendanceCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeAttendanceCtaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  homeAttendanceCtaSub: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.1,
  },
  homeAttendanceCtaArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeQrWrapper: {
    padding: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  homeQrLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  homeQrBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeSessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  homeKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  homeKpiBox: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 0,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  homeKpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  homeKpiVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  homeKpiTxt: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  homeKpiAccent: {
    height: 3,
    width: '100%',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginTop: 4,
  },
  homeSegmentWrap: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
  },
  homeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
    position: 'relative',
  },
  homeSegmentBtnActive: {
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  homeSegmentActiveDot: {
    position: 'absolute',
    top: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  homeSegmentText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  homeSegmentTextActive: {
    fontWeight: '800',
  },
  homeTabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 1,
  },
  homeTabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  homeActionGroupTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  homeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  homeActionIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeActionMainCol: {
    flex: 1,
    minWidth: 0,
  },
  homeActionMainTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  homeActionMainSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  pulseQuickMarkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  pulseQuickMarkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  homeViewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 6,
  },
  homeViewAllLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  markHelpHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
  },
  markHelpHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  markOptionsContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 20,
  },
  markOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  markOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  markOptionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  markHeroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  markHeroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markHeroTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  markHeroSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  markHeroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  markHeroActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  markHeroArtWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markInstructionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  markInstructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  markInstructionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markInstructionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  markInstructionHeaderSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  markStepsList: {
    gap: 12,
    marginBottom: 14,
  },
  markStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  markStepNumberBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  markStepNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  markStepTextCol: {
    flex: 1,
    minWidth: 0,
  },
  markStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  markStepDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  markSecurityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  markSecurityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  markSecurityChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  markTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  markTipText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#92400E',
  },
  dailyHeroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  explorerToolsButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, marginBottom: 8 },
  attendanceToolsToggle: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 12, marginBottom: 10, borderRadius: 10, backgroundColor: Palette.brandTint },
  attendanceToolsToggleText: { color: Palette.brandPrimary, fontSize: 13, fontWeight: '700' },
  attendanceToolActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  attendanceToolAction: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface },
  attendanceToolActionPrimary: { gap: 7, borderColor: Palette.brandPrimary, backgroundColor: Palette.brandPrimary },
  attendanceToolActionPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  attendanceSummary: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, marginBottom: 12 },
  attendanceSummaryText: { fontSize: 13, color: Palette.textPrimary },
  attendanceSummaryDivider: { color: Palette.textSecondary },
  pendingReviewLink: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 4 },
  pendingReviewLinkText: { color: Palette.pending, fontSize: 13, fontWeight: '700' },
  activeAttendanceFilter: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: Palette.brandTint, marginBottom: 10 },
  activeAttendanceFilterText: { color: Palette.brandPrimary, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  explorerPagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  explorerExportText: { color: Palette.textInverse, fontSize: 12, fontWeight: '600' },
  explorerExportButton: { backgroundColor: Palette.brandPrimary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  contentArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
    overflow: 'hidden',
  },
  employeeDetailTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 4,
    borderRadius: 14,
    backgroundColor: Palette.surfaceMuted,
    gap: 4,
  },
  employeeDetailTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  employeeDetailTabActive: {
    backgroundColor: Palette.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  employeeDetailTabText: { color: Palette.textSecondary, fontSize: 12, fontWeight: '600' },
  employeeDetailTabTextActive: { color: Palette.brandPrimary },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  reportScrollContent: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerWrapper: {
    backgroundColor: Palette.canvas,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  workplaceCardWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  workplaceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workplaceCardTextCol: {
    flex: 1,
    marginRight: 12,
  },
  bigWorkplaceQrBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  workplaceCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  workplaceCodeBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minHeight: 34,
  },
  workplaceCodeQrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  workplaceQrBadgeLarge: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
  },
  workplaceCodeTextLarge: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.8,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  headerGreetingCol: {
    flex: 1,
    marginRight: 16,
    maxWidth: '78%',
  },
  greetingPre: {
    fontSize: 14,
    fontWeight: '500',
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  headerWpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    maxWidth: '100%',
  },
  headerWorkplaceTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  headerChevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.surfaceMuted,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  headerAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '52%',
  },
  headerAdminText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.brandPrimary,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  headerRightMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginLeft: 'auto',
  },
  headerCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceMuted,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  headerQrBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: Palette.brandPrimary + '35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerQrBtnActive: {
    backgroundColor: Palette.brandPrimary,
  },
  popoverBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  popoverContainer: {
    position: 'absolute',
    zIndex: 999,
  },
  popoverArrowBorder: {
    position: 'absolute',
    top: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Palette.border,
    zIndex: 19,
  },
  popoverArrowUp: {
    position: 'absolute',
    top: -7.5,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Palette.surface,
    zIndex: 20,
  },
  popoverCard: {
    width: '100%',
    backgroundColor: Palette.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  popoverTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  popoverIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  popoverSubtitle: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  popoverCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverQrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  popoverLoadingBox: {
    width: 166,
    height: 166,
    borderRadius: 14,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverLoadingText: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 6,
  },
  popoverInstruction: {
    fontSize: 11,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  popoverActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popoverActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandTint,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.brandPrimary + '40',
  },
  popoverActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  popoverActionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceMuted,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  popoverActionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  headerAvatarButton: {
    marginTop: 2,
    padding: 2,
  },
  headerAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.brandTint,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.brandPrimary,
  },
  pendingApprovalsSection: {
    marginBottom: 20,
  },
  pendingApprovalsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pendingApprovalsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  pendingApprovalsSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  viewAllRequestsBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllRequestsText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.brandPrimary,
  },
  emptyPendingCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  emptyPendingSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  emptyPendingRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  emptyPendingRefreshText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyRefreshOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.brandPrimary,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 24,
    minWidth: 120,
  },
  emptyRefreshOutlineBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingCardsList: {
    gap: 10,
  },
  horizontalRequestsWrapper: {
    marginHorizontal: -20,
    marginBottom: 8,
  },
  horizontalRequestsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  horizontalRequestCard: {
    marginBottom: 0,
  },
  allRequestsContainer: {
    marginTop: 6,
    marginBottom: 24,
  },
  allRequestsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  allRequestsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
    letterSpacing: -0.3,
  },
  allRequestsSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  pendingBadgePill: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgePillText: {
    color: '#E11D48',
    fontSize: 11,
    fontWeight: '700',
  },
  requestsFilterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  requestsFilterPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requestsFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  queueNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  queueNoticeInlineText: {
    flex: 1,
    fontSize: 12,
    color: Palette.textSecondary,
    lineHeight: 16,
  },
  addMemberModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addMemberModalContent: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  addMemberDragHandleWrapper: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  addMemberDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
  },
  addMemberModalInner: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  addMemberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  addMemberHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  addMemberIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
    letterSpacing: -0.3,
  },
  addMemberSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  addMemberCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  addMemberBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  addMemberOptionsList: {
    gap: 12,
  },
  addMemberOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Palette.canvas,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
    padding: 16,
  },
  addMemberOptionCardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  addMemberOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  addMemberOptionDesc: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  inviteLinkCardSection: {
    gap: 8,
  },
  inviteSectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSecondary,
    letterSpacing: 0.6,
  },
  inviteCodeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inviteCodeBadgeText: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inviteLinkBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  inviteLinkText: {
    flex: 1,
    fontSize: 12.5,
    color: Palette.brandPrimary,
    fontWeight: '500',
  },
  inviteCopySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Palette.brandTint,
  },
  inviteCopySmallBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  shareModalMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.brandPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  shareModalMainBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inviteSecurityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 10,
  },
  inviteSecurityNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: Palette.textSecondary,
    lineHeight: 16,
  },
  addEmployeeFormCard: {
    gap: 12,
  },
  formSectionSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    lineHeight: 17,
    marginBottom: 4,
  },
  modalFormField: {
    gap: 5,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  modalTextInput: {
    backgroundColor: Palette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.textPrimary,
  },
  inviteSuccessCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 16,
    gap: 12,
  },
  inviteSuccessIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteSuccessBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteSuccessTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },
  inviteSuccessSub: {
    fontSize: 12,
    color: '#15803D',
  },
  inviteSuccessSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 10,
  },
  inviteSuccessSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  quickShortcutsSection: {
    marginBottom: 16,
  },
  quickShortcutsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  quickShortcutsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    letterSpacing: -0.2,
  },
  quickShortcutsSectionHint: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  quickShortcutsGrid: {
    gap: 9,
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  homeQuickAccessGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  homeQuickActionCard: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  homeQuickActionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeQuickActionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  homeQuickActionSub: {
    fontSize: 10.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  dailyAttendanceToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  reportsControlCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  reportsControlHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reportsPeriodButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  reportsPeriodText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  reportsPeriodBadge: {
    backgroundColor: Palette.brandTint,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  reportsPeriodBadgeText: {
    color: Palette.brandPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  reportsControlSub: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  qrStationCard: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  qrStationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  qrStationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  qrStationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrStationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
    letterSpacing: -0.2,
  },
  qrStationSub: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  qrKioskHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  qrKioskHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sessionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qrActiveBody: {
    gap: 14,
  },
  qrSegmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 13,
    padding: 3,
    gap: 4,
  },
  qrSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  qrSegmentBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  qrKioskFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  qrBadgePressable: {
    alignItems: 'center',
  },
  qrCodeWithCorners: {
    position: 'relative',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  reticleCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderWidth: 2.5,
  },
  reticleTopLeft: {
    top: -6,
    left: -6,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  reticleTopRight: {
    top: -6,
    right: -6,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  reticleBottomLeft: {
    bottom: -6,
    left: -6,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  reticleBottomRight: {
    bottom: -6,
    right: -6,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  qrLoadingBox: {
    height: 140,
    width: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  qrModeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qrEnlargeHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.brandPrimary,
    marginTop: 5,
  },
  qrActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  qrPrimaryLaunchBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  qrPrimaryLaunchBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  qrCloseSessionBtn: {
    minHeight: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  qrCloseSessionBtnText: {
    color: Palette.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  qrInactiveBody: {
    paddingVertical: 4,
    gap: 14,
  },
  qrInactiveHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FBFBF9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  qrInactiveHeroCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInactiveHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  qrInactiveSub: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  qrStartSessionBtn: {
    minHeight: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrStartSessionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  qrFeatureChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qrFeatureChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  pendingApprovalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pendingReqInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  pendingReqName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  pendingReqTime: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  pendingReqActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mockupApproveBtn: {
    minHeight: 44,
    backgroundColor: Palette.brandPrimary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupApproveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  mockupRejectBtn: {
    minHeight: 44,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: '#DDE2CC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.canvas,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  bannerScreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  bannerScreenSub: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.textSecondary,
    marginTop: 2,
  },
  bannerBackBtn: {
    padding: 6,
  },
  bannerAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  bannerAvatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.brandPrimary,
  },
  actionProgressCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    width: '100%',
  },
  actionProgressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
    marginBottom: 2,
  },
  actionProgressSub: {
    fontSize: 12,
    color: '#686461',
    lineHeight: 16,
  },
  emptyPrimarySolidBtnDisabled: {
    opacity: 0.8,
  },
  qrGeneratingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  qrGeneratingText: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: '#686461',
  },

  /* Team pulse Section */
  teamPulseSection: {
    marginBottom: 24,
  },
  teamPulseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  teamPulseTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17202A',
  },
  teamPulseSub: {
    fontSize: 13,
    color: '#667085',
    marginTop: 2,
    fontWeight: '500',
  },
  viewAllPulseBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllPulseLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  pulseCardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE5E2',
    paddingHorizontal: 16,
  },
  pulseEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAE5E2',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17202A',
    marginTop: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  pulseEmptySub: {
    fontSize: 13,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 260,
  },
  pulseEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandTint,
    borderColor: Palette.brandPrimary,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pulseEmptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE8',
  },
  pulseInfoCol: {
    flex: 1,
  },
  pulseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17202A',
  },
  pulseCode: {
    fontSize: 12,
    color: '#667085',
    marginTop: 1,
  },
  pulseAttendanceTimes: {
    fontSize: 11,
    color: '#667085',
    marginTop: 5,
    lineHeight: 15,
  },
  pulseTime: {
    fontSize: 12,
    color: '#667085',
    fontWeight: '500',
    marginLeft: 12,
    minWidth: 50,
    textAlign: 'right',
  },
  btnPressed: {
    opacity: 0.85,
  },
  rosterCardList: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  employeeDirectoryList: {
    gap: 10,
    marginBottom: 20,
  },
  employeeAvatarRing: {
    padding: 2,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  employeeDirectoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  employeeDirectoryCardPressed: {
    backgroundColor: Palette.brandTint,
    borderColor: Palette.brandLight,
  },
  employeeDirectoryDetails: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  employeeDirectoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  employeeDirectoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  employeeCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '55%',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Palette.brandTint,
  },
  employeeCodeBadgeText: {
    color: Palette.brandPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  employeeJoinedDate: {
    color: Palette.textSecondary,
    fontSize: 10.5,
    fontWeight: '500',
  },
  employeeEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  employeeDirectoryArrow: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreListButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Palette.brandTint,
  },
  loadMoreListText: {
    color: Palette.brandPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  rosterItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  rosterNameCol: {
    flex: 1,
    minWidth: 0,
  },
  rosterEmpName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  rosterEmpCode: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  rosterEmailText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  rosterTimeNote: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  threeDotsBtn: {
    padding: 6,
    marginLeft: 4,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChipItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: DesignTokens.radius.full,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
  },
  filterChipItemActive: {
    backgroundColor: Palette.brandPrimary,
    borderColor: Palette.brandPrimary,
  },
  filterChipItemText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterChipItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.textPrimary,
  },
  manualAttendanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    marginBottom: 16,
  },
  manualAttendanceBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.brandPrimary,
  },
  employeesHeading: { flex: 1, minWidth: 0, paddingRight: 10 },
  employeeFiltersScroller: { marginBottom: 14, marginHorizontal: -20 },
  employeeFiltersContent: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, alignItems: 'center' },
  employeeEmptyActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 2 },
  employeeEmptyPrimaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Palette.brandPrimary, borderRadius: 10, minHeight: 44, paddingHorizontal: 15 },
  employeeEmptyPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  employeeEmptySecondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Palette.brandTint, borderColor: Palette.border, borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 15 },
  employeeEmptySecondaryText: { color: Palette.brandPrimary, fontSize: 13, fontWeight: '700' },
  employeeEmptyCard: { paddingVertical: 24, paddingHorizontal: 14, marginTop: 2 },
  employeeSearchEmpty: { alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: 16, padding: 24, marginTop: 6 },
  employeesTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  empTitleHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  empSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  shareInviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 16,
  },
  shareInviteCardPressed: { backgroundColor: Palette.brandTint },
  shareInviteCopy: { flex: 1, minWidth: 0 },
  shareInviteIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareInviteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
    letterSpacing: -0.1,
  },
  shareInviteSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  addEmployeeSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.brandPrimary,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addEmployeeSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  joinRequestsAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: '#F9E79F',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  joinRequestsAlertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCF3CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinRequestsAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7D6608',
  },
  joinRequestsAlertSubtitle: {
    fontSize: 11,
    color: '#9A7D0A',
    marginTop: 1,
  },
  joinRequestsReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0B27A',
  },
  joinRequestsReviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  joinRequestsListBlock: {
    gap: 12,
  },
  joinRequestCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  joinRequestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinRequestName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  joinRequestEmail: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  joinRequestDate: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  joinRequestNoteBox: {
    backgroundColor: '#F5F6E8',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: Palette.brandPrimary,
  },
  joinRequestNoteLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  joinRequestNoteText: {
    fontSize: 13,
    color: Palette.textPrimary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  joinRequestActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE8',
  },
  joinRequestApproveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.brandPrimary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinRequestApproveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  joinRequestDeclineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinRequestDeclineText: {
    color: Palette.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  joinRequestRejectedNotice: {
    fontSize: 12,
    color: Palette.danger,
    marginTop: 8,
    fontStyle: 'italic',
  },
  invitationListBlock: {
    gap: 10,
  },
  invitationCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  invitationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invitationTitlesCol: {
    flex: 1,
    minWidth: 0,
  },
  invitationEmailText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  invitationSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  invitationButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  invBtnFlex: {
    flex: 1,
  },
  reportsMetricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  reportMetricCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  reportMetricNum: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginTop: 2,
  },
  reportMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 3,
  },
  reportsTableCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  reportsTableHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  reportsTableHeadCol: {
    minWidth: 0,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  reportsTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  reportsCellName: {
    minWidth: 0,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  reportsCellDate: {
    minWidth: 0,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: 12,
    color: Palette.textSecondary,
  },
  reportEmployeeCell: { flex: 1.5, minWidth: 0, flexShrink: 1, paddingRight: 4 },
  reportStatusCell: { flex: 1, minWidth: 0, flexShrink: 1, paddingHorizontal: 3 },
  reportDateCell: { flex: 1, minWidth: 0, flexShrink: 1, flexWrap: 'wrap', fontSize: 12, color: Palette.textSecondary, paddingLeft: 4 },
  qrWhiteCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginVertical: 12,
  },
  attendanceOpenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF7EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DesignTokens.radius.full,
    marginBottom: 8,
  },
  greenDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Palette.success,
  },
  attendanceOpenPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.success,
  },
  qrCardInstructionText: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  qrCodeBorderBox: {
    padding: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrWhiteBadge: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  qrOpenedTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  qrOpenedDateText: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
    marginBottom: 20,
  },
  closeAttendanceOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderColor: Palette.danger,
    borderWidth: 1.5,
    borderRadius: 12,
    height: 48,
    width: '100%',
    marginBottom: 14,
  },
  closeAttendanceBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.danger,
  },
  pinkNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.brandTint,
    borderRadius: 10,
    padding: 12,
    width: '100%',
  },
  pinkNoticeText: {
    fontSize: 12,
    color: Palette.brandPressed,
    flex: 1,
  },
  formContainerCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  formLabelRequired: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 6,
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.canvas,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  dropdownText: {
    fontSize: 14,
    color: Palette.textPrimary,
  },
  manualStatusPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Palette.surfaceMuted,
  },
  manualPillActive: {
    backgroundColor: Palette.brandPrimary,
  },
  manualPillPresentActive: {
    backgroundColor: Palette.success,
  },
  manualPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  manualPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reasonTextarea: {
    backgroundColor: Palette.canvas,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Palette.textPrimary,
    textAlignVertical: 'top',
    height: 80,
  },
  charCountText: {
    fontSize: 11,
    color: Palette.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  saveRecordBtn: {
    marginTop: 6,
  },
  addEmployeeCard: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
  },
  addEmpIntroText: {
    fontSize: 13,
    color: Palette.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  saveEmpBtn: {
    marginTop: 6,
    marginBottom: 14,
  },
  copyInviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.canvas,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  copyInviteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  copyInviteSub: {
    fontSize: 11,
    color: Palette.brandPrimary,
    marginTop: 2,
  },

  /* Employee Details Screen (Image 3 Top-Right) */
  empProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE6',
    padding: 18,
    marginBottom: 14,
  },
  empProfileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empProfileInfoCol: {
    marginLeft: 14,
    flex: 1,
  },
  empProfileNameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17202A',
  },
  empProfileCodeText: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  empProfileEmailText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  empActivePill: {
    backgroundColor: '#E6F7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  empActivePillText: {
    color: Palette.success,
    fontSize: 12,
    fontWeight: '600',
  },
  empTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 14,
  },
  empTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  empTableLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  empTableLabel: {
    fontSize: 14,
    color: Palette.textSecondary,
  },
  empTableValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#17202A',
  },
  empAttendanceTimesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE6',
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  empAttendanceTimesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  empAttendanceTimesTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empAttendanceTimesTitle: { color: Palette.textPrimary, fontSize: 15, fontWeight: '700' },
  empAttendanceTimesDate: { color: Palette.textSecondary, fontSize: 12, fontWeight: '600' },
  empAttendanceTimesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  empAttendanceTimeCell: { flex: 1, gap: 5 },
  empAttendanceTimeLabel: { color: Palette.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  empAttendanceTimeValue: { color: Palette.textPrimary, fontSize: 13, fontWeight: '700' },
  empAttendanceTimeDivider: { width: 1, height: 30, backgroundColor: '#EFEAE6' },
  empAttendanceRequestTime: { color: Palette.pending, fontSize: 12, fontWeight: '600' },
  employeeReportCard: {
    backgroundColor: Palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 18,
    gap: 12,
  },
  employeeReportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  employeeReportSub: { color: Palette.textSecondary, fontSize: 12, lineHeight: 17 },
  employeeReportIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeReportExportButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Palette.brandPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  employeeReportExportText: { color: Palette.textInverse, fontSize: 13, fontWeight: '700' },
  employeeReportState: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  employeeReportEmpty: { color: Palette.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  employeeReportRecord: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Palette.border },
  employeeReportDate: { color: Palette.textPrimary, fontSize: 13, fontWeight: '700' },
  employeeReportTimes: { color: Palette.textSecondary, fontSize: 11, marginTop: 4 },
  employeeReportStatus: { color: Palette.brandPrimary, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  employeeReportModalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  employeeReportModal: { maxHeight: '92%', backgroundColor: Palette.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30 },
  employeeReportModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  employeeReportModalTitle: { color: Palette.textPrimary, fontSize: 18, fontWeight: '700' },
  employeeReportFilterLabel: { color: Palette.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  employeeReportModalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  employeeReportApplyButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: Palette.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  employeeReportApplyText: { color: Palette.textInverse, fontSize: 13, fontWeight: '700' },
  employeeReportResetButton: { minHeight: 44, minWidth: 78, borderRadius: 12, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  employeeReportResetText: { color: Palette.textPrimary, fontSize: 13, fontWeight: '600' },
  empAttendanceMetricCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  empAttendanceMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  empAttendanceIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empAttendanceMetricTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  empAttendanceMonthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  empAttendanceMonthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  empAttendanceMetricBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empAttendanceCircleWrap: {
    width: 104,
    height: 104,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empAttendanceCircleInner: {
    position: 'absolute',
    width: 104,
    height: 104,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empAttendanceCirclePercent: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  empAttendanceCircleSub: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: -2,
  },
  empAttendanceStatsCol: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  empAttendanceStatsLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  empAttendanceDaysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 3,
    marginBottom: 6,
  },
  empAttendanceDaysPresent: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  empAttendanceDaysDivider: {
    fontSize: 18,
    fontWeight: '600',
  },
  empAttendanceDaysTotal: {
    fontSize: 20,
    fontWeight: '700',
  },
  empAttendanceDaysSuffix: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 3,
  },
  empAttendanceProgressBarTrack: {
    height: 5,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  empAttendanceProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  empAttendanceChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  empAttendanceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  empAttendanceStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  empAttendanceStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  empAttendanceMiniChip: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  empAttendanceMiniChipText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  employeeMonthAttendanceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.brandTint, borderWidth: 1, borderColor: Palette.border, borderRadius: 18, padding: 14, marginBottom: 14 },
  employeeMonthAttendanceIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' },
  employeeMonthAttendanceCopy: { flex: 1, minWidth: 0, gap: 3 },
  employeeMonthAttendanceTitle: { color: Palette.textPrimary, fontSize: 14, fontWeight: '700' },
  employeeMonthAttendanceSubtitle: { color: Palette.textSecondary, fontSize: 11, flexWrap: 'wrap' },
  employeeMonthAttendanceCount: { color: Palette.brandPrimary, fontSize: 25, fontWeight: '800' },
  employeePinModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  employeePinModal: { width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: Palette.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: Palette.border, padding: 20, paddingTop: 12, gap: 14 },
  employeePinDragHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: Palette.border, alignSelf: 'center', marginBottom: 2 },
  employeePinModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  employeePinIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.brandTint, alignItems: 'center', justifyContent: 'center' },
  employeePinSubtitle: { color: Palette.textSecondary, fontSize: 13, marginTop: 2 },
  employeePinHelper: { color: Palette.textSecondary, fontSize: 13, lineHeight: 19 },
  employeePinField: { gap: 6 },
  employeePinFieldLabel: { color: Palette.textPrimary, fontSize: 13, fontWeight: '600' },
  employeePinInputRow: { position: 'relative', justifyContent: 'center' },
  employeePinInput: { minHeight: 50, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, backgroundColor: Palette.surface, color: Palette.textPrimary, fontSize: 16, letterSpacing: 3, paddingHorizontal: 14, paddingRight: 56 },
  employeePinVisibilityButton: { position: 'absolute', right: 2, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  employeePinSaveButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: Palette.brandPrimary },
  employeePinSaveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  empActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  empActionBtnReset: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  empActionBtnResetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#17202A',
  },
  empActionBtnDeactivate: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.danger,
    backgroundColor: Palette.danger,
    gap: 6,
  },
  empHistorySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17202A',
    marginTop: 6,
    marginBottom: 12,
  },
  empHistoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  empHistoryCountBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  empHistoryCountBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  empHistoryLoadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  empHistoryLoadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  empHistoryEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE6',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empHistoryEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  empHistoryEmptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  empHistoryCardsContainer: {
    gap: 12,
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
    backgroundColor: '#F0FDFA',
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
  attHistoryFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  attHistoryTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  attHistoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  attHistoryCorrectionText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 1,
  },
  empHistoryCardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE6',
    overflow: 'hidden',
  },
  empHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  empHistoryDate: {
    fontSize: 14,
    color: '#17202A',
    fontWeight: '500',
  },
  empHistoryRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateFullBlock: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: 12,
  },
  emptyStateTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyStateSubText: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  emptyPrimarySolidBtn: {
    backgroundColor: Palette.brandPrimary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  emptyPrimarySolidBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyClearBtnOutline: {
    borderWidth: 1.5,
    borderColor: Palette.brandPrimary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  emptyClearBtnText: {
    color: Palette.brandPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sessionClosedPill: {
    backgroundColor: Palette.brandTint,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 8,
  },
  sessionClosedPillText: {
    color: Palette.brandPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  closedSessionHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#17202A',
    textAlign: 'center',
    marginBottom: 6,
  },
  closedSessionSubhead: {
    fontSize: 13,
    color: '#686461',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  closedSessionInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F6F5',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    gap: 8,
  },
  closedSessionInfoText: {
    fontSize: 12,
    color: '#686461',
    lineHeight: 17,
    flex: 1,
  },

  /* Image 4: Request Queue Styles */
  cleanScreenHeader: {
    backgroundColor: Palette.canvas,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  cleanBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.4,
  },
  cleanHeaderSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  queueSuccessToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 10,
  },
  queueSuccessToastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#166534',
    lineHeight: 18,
  },
  queuePinkNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Palette.brandTint,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D4DEC2',
  },
  queueGreenNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  queueRedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  queueNoticeText: {
    fontSize: 13,
    color: Palette.textPrimary,
    lineHeight: 18,
  },
  queueNoticeTextGreen: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  queueNoticeTextRed: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  queueRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E5E3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  queueCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueCardNameCol: {
    flex: 1,
  },
  queueCardEmpName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17202A',
  },
  queueCardDateSub: {
    fontSize: 12,
    color: '#686461',
    marginTop: 2,
  },
  queueStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  queuePillPending: {
    backgroundColor: '#FEF3C7',
  },
  queuePillApproved: {
    backgroundColor: '#DCFCE7',
  },
  queuePillRejected: {
    backgroundColor: '#FEE2E2',
  },
  queueStatusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  queuePillTextPending: {
    color: '#D97706',
  },
  queuePillTextApproved: {
    color: '#16A34A',
  },
  queuePillTextRejected: {
    color: '#DC2626',
  },
  queuePendingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  queueMetaTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8F7F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  queueMetaTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#686461',
  },
  queueBadgeQr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F7F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  queueBadgeNetwork: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  queueBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#686461',
  },
  inlineApprovingBox: {
    backgroundColor: Palette.brandTint,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D4DEC2',
  },
  inlineApprovingText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  inlineApprovingSub: {
    fontSize: 12,
    color: '#686461',
    lineHeight: 16,
  },
  queueApprovedTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1EFEF',
  },
  queueTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  queueTimeLabel: {
    fontSize: 12,
    color: '#686461',
  },
  queueTimeVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#17202A',
  },
  queueRejectionReasonBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  queueRejectionReasonText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  queueActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1EFEF',
  },
  queueApproveBtn: {
    flex: 1,
    backgroundColor: Palette.brandPrimary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueApproveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  queueRejectBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.brandPrimary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueRejectBtnText: {
    color: Palette.brandPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  /* Image 3: Request Detail 6-State Styles */
  detailHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 0,
    backgroundColor: Palette.canvas,
  },
  detailBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17202A',
  },
  detailScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  detailProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailProfileInfoCol: {
    flex: 1,
  },
  detailEmployeeNameLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17202A',
    letterSpacing: -0.3,
  },
  detailEmployeeSubText: {
    fontSize: 13,
    color: '#686461',
    marginTop: 2,
  },
  detailEmployeeRoleText: {
    fontSize: 13,
    color: '#686461',
    marginTop: 1,
  },
  detailTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E5E3',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  detailTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  detailTableTextCol: {
    flex: 1,
  },
  detailTableLabel: {
    fontSize: 12,
    color: '#686461',
    marginBottom: 2,
  },
  detailTableValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#17202A',
  },
  tableRowDivider: {
    height: 1,
    backgroundColor: '#F1EFEF',
    width: '100%',
  },
  verificationsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  verifBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E5E3',
    padding: 14,
    gap: 12,
  },
  verifTextCol: {
    flex: 1,
  },
  verifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17202A',
  },
  verifSubText: {
    fontSize: 12,
    color: '#686461',
    marginTop: 2,
  },
  badgeVerifiedGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeVerifiedGreenText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeNotVerifiedOrange: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeNotVerifiedOrangeText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
  },
  detailStatusSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E5E3',
    padding: 16,
    marginBottom: 20,
  },
  detailStatusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailStatusLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17202A',
  },
  detailStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailStatusPillApproved: {
    backgroundColor: '#DCFCE7',
  },
  detailStatusPillRejected: {
    backgroundColor: '#FEE2E2',
  },
  detailStatusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  detailStatusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailStatusPillTextApproved: {
    color: '#16A34A',
  },
  detailStatusPillTextRejected: {
    color: '#DC2626',
  },
  detailStatusPillTextPending: {
    color: '#D97706',
  },
  detailStatusSubText: {
    fontSize: 12,
    color: '#686461',
  },
  confirmationWaitingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Palette.brandTint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4DEC2',
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  waitingBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  waitingBannerSub: {
    fontSize: 12,
    color: '#686461',
    marginTop: 2,
  },
  attendanceApprovedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  approvedBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  approvedBannerSub: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
  },
  timeComparisonCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F7F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E5E3',
    padding: 14,
  },
  timeComparisonCol: {
    flex: 1,
    alignItems: 'center',
  },
  timeComparisonLabel: {
    fontSize: 11,
    color: '#686461',
    marginBottom: 4,
  },
  timeComparisonVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#17202A',
  },
  timeComparisonDivider: {
    width: 1,
    backgroundColor: '#E8E5E3',
    marginHorizontal: 12,
  },
  decisionErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  decisionErrorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  decisionErrorSub: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
  rejectionFormBlock: {
    marginBottom: 20,
  },
  rejectionFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17202A',
    marginBottom: 8,
  },
  rejectionTextAreaBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
  },
  rejectionTextInput: {
    fontSize: 13,
    color: '#17202A',
    minHeight: 80,
    padding: 0,
  },
  charCounterText: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: '#686461',
    marginTop: 6,
  },
  detailActionButtonsBlock: {
    gap: 12,
    marginTop: 8,
  },
  detailActionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  detailSolidBurgundyBtn: {
    backgroundColor: Palette.brandPrimary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSolidBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  detailOutlineBurgundyBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.brandPrimary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailOutlineBtnText: {
    color: Palette.brandPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  detailHalfOutlineBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.brandPrimary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHalfSolidBtn: {
    flex: 1,
    backgroundColor: Palette.brandPrimary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualEmpPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  manualEmpPickerRowActive: {
    borderColor: Palette.brandPrimary,
    backgroundColor: '#F5F8EE',
  },
  manualEmpPickerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  manualEmpPickerCode: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  /* Dedicated Search Screen Styles */
  searchScreenContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchBarInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 14,
    height: 48,
  },
  searchBarInputWrapperFocused: {
    borderColor: Palette.brandPrimary,
    borderWidth: 1.5,
  },
  searchBarIcon: {
    marginRight: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 15,
    color: Palette.textPrimary,
    paddingVertical: 0,
  },
  searchBarClearBtn: {
    padding: 6,
    marginLeft: 4,
  },
  searchFilterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  searchFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  searchFilterChipActive: {
    backgroundColor: Palette.brandPrimary,
    borderColor: Palette.brandPrimary,
  },
  searchFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  searchFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginBottom: 4,
  },
  searchSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empDedicatedCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  empDedicatedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  empDedicatedHeaderInfo: {
    flex: 1,
  },
  empDedicatedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  empDedicatedName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
    flex: 1,
  },
  empDedicatedBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  empDedicatedCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.brandTint,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  empDedicatedCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  empDedicatedMemberBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
  },
  empDedicatedMemberBadgeInvited: {
    backgroundColor: '#FFFBEB',
  },
  empDedicatedMemberText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  empDedicatedMemberTextInvited: {
    color: '#D97706',
  },
  empDedicatedMetaDivider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: 12,
  },
  empDedicatedEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empDedicatedEmailIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empDedicatedEmailText: {
    fontSize: 13,
    color: Palette.textSecondary,
    flex: 1,
  },
  empDedicatedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.brandTint,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  empDedicatedActionBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empDedicatedActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  searchEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  searchEmptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  searchEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  searchEmptySubtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  searchEmptyClearBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Palette.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  searchEmptyClearText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
});
