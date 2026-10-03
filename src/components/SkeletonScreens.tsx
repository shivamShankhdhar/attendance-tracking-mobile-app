import { BottomTabs } from './BottomTabs';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Palette } from '../constants/colors';
import { HeaderBackgroundArt } from './illustrations/HeaderBackgroundArt';
import { AdBanner } from './AdBanner';

export function SkeletonBox({
  width,
  height,
  borderRadius = 6,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const opacity = useSharedValue(0.65);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.95, { duration: 750, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }), -1, true, undefined, ReduceMotion.System);
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Palette.border,
        },
        style,
        pulseStyle,
      ]}
    />
  );
}

// =========================================================================
// SCREEN 1: Employee Dashboard - Today Tab Skeleton
// =========================================================================
export function EmployeeTodaySkeleton({
  onSelectTab,
  workplaceName,
  userName,
  initials,
  avatarUrl,
  hideHeader = false,
  hideBottomBar = false,
}: {
  onSelectTab?: (tab: 'today' | 'history') => void;
  workplaceName?: string;
  userName?: string;
  initials?: string;
  avatarUrl?: string;
  hideHeader?: boolean;
  hideBottomBar?: boolean;
} = {}) {
  return (
    <View style={styles.fullScreen}>
      {/* Top Header matching Mockup */}
      {!hideHeader && (
        <View style={styles.headerWrapper}>
        <HeaderBackgroundArt />
        <View style={styles.headerContentRow}>
          <View style={styles.headerGreetingCol}>
            <Text style={styles.greetingPre}>Good morning,</Text>
            {workplaceName ? (
              <View style={styles.headerWpTitleRow}>
                <Text style={styles.headerWorkplaceTitle} numberOfLines={1}>{workplaceName}</Text>
                <View style={styles.headerChevronCircle}>
                  <Feather name="chevron-down" size={15} color={Palette.brandPrimary} />
                </View>
              </View>
            ) : (
              <SkeletonBox width={160} height={26} borderRadius={6} style={{ marginVertical: 4 }} />
            )}

            <View style={styles.headerBadgeRow}>
              <View style={styles.headerRoleBadge}>
                <MaterialCommunityIcons name="badge-account-horizontal-outline" size={12} color={Palette.brandPrimary} style={{ marginRight: 4 }} />
                <Text style={styles.headerRoleBadgeText}>Team Member</Text>
              </View>
              {userName && (
                <Text style={styles.headerUserTag} numberOfLines={1}>
                  Signed in as {userName}
                </Text>
              )}
            </View>
          </View>

          {/* User Profile Avatar */}
          <View style={styles.headerAvatarCircle}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.headerAvatarImg} />
            ) : initials ? (
              <Text style={styles.headerAvatarInitials}>{initials}</Text>
            ) : (
              <SkeletonBox width={46} height={46} borderRadius={23} />
            )}
          </View>
        </View>
      </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Awaiting check-in Card */}
        <View style={styles.awaitingCard}>
          <View style={styles.awaitingRow}>
            <View style={styles.awaitingIconBox}>
              <MaterialCommunityIcons name="calendar-check-outline" size={24} color={Palette.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <SkeletonBox width={130} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
              <Text style={styles.awaitingTitle}>Awaiting check-in</Text>
              <Text style={styles.awaitingSub}>Scan the workplace QR to mark your attendance.</Text>
            </View>
          </View>
        </View>

        {/* Scan workplace QR Card */}
        <View style={styles.scanQrCard}>
          <MaterialCommunityIcons name="qrcode-scan" size={28} color="#FFFFFF" style={{ marginRight: 14 }} />
          <Text style={styles.scanQrText}>Scan workplace QR</Text>
          <Feather name="chevron-right" size={20} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
        </View>

        {/* Recent Attendance Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeadingTitle}>Recent attendance</Text>
          <View style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>View all</Text>
            <Feather name="chevron-right" size={14} color={Palette.textSecondary} />
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.listRowCard}>
              <SkeletonBox width={34} height={34} borderRadius={17} style={{ marginRight: 12 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width={100} height={12} borderRadius={4} />
                <SkeletonBox width={65} height={10} borderRadius={4} />
              </View>
              <SkeletonBox width={60} height={22} borderRadius={11} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Employee Bottom Tabs */}
      {!hideBottomBar && (
        <>
          <AdBanner position="bottom" />
          <View style={styles.empBottomTabs}>
          <Pressable
            onPress={() => onSelectTab && onSelectTab('today')}
            style={styles.empTabBtn}
          >
            <MaterialCommunityIcons name="home" size={24} color={Palette.brandPrimary} />
            <Text style={[styles.empTabLabel, { color: Palette.brandPrimary, fontWeight: '700' }]}>Home</Text>
          </Pressable>
          <Pressable
            onPress={() => onSelectTab && onSelectTab('history')}
            style={styles.empTabBtn}
          >
            <Feather name="clock" size={20} color={Palette.textSecondary} />
            <Text style={[styles.empTabLabel, { color: Palette.textSecondary }]}>History</Text>
          </Pressable>
          <Pressable
            style={styles.empTabBtn}
          >
            <Feather name="user" size={20} color={Palette.textSecondary} />
            <Text style={[styles.empTabLabel, { color: Palette.textSecondary }]}>Profile</Text>
          </Pressable>
        </View>
        </>
      )}
    </View>
  );
}

// =========================================================================
// SCREEN 2: Employee Dashboard - History Tab Skeleton
// =========================================================================
export function EmployeeHistorySkeleton({
  onSelectTab,
  hideBottomBar = false,
}: {
  onSelectTab?: (tab: 'today' | 'history') => void;
  hideBottomBar?: boolean;
}) {
  return (
    <View style={styles.fullScreen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Attendance History</Text>

        {/* Month Selector Box */}
        <View style={styles.monthNavBox}>
          <Feather name="chevron-left" size={18} color={Palette.textSecondary} />
          <SkeletonBox width={90} height={14} borderRadius={4} />
          <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
        </View>

        {/* History List Rows */}
        <View style={{ gap: 10, marginTop: 14 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <View key={i} style={styles.listRowCard}>
              <SkeletonBox width={34} height={34} borderRadius={17} style={{ marginRight: 12 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width={120} height={12} borderRadius={4} />
                <SkeletonBox width={70} height={10} borderRadius={4} />
              </View>
              <SkeletonBox width={50} height={18} borderRadius={9} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Employee Bottom Tabs */}
      {!hideBottomBar && (
        <>
          <AdBanner position="bottom" />
          <View style={styles.empBottomTabs}>
          <Pressable
            onPress={() => onSelectTab && onSelectTab('today')}
            style={styles.empTabBtn}
          >
            <MaterialCommunityIcons name="home-outline" size={24} color={Palette.textSecondary} />
            <Text style={[styles.empTabLabel, { color: Palette.textSecondary }]}>Home</Text>
          </Pressable>
          <Pressable
            onPress={() => onSelectTab && onSelectTab('history')}
            style={styles.empTabBtn}
          >
            <Feather name="clock" size={20} color={Palette.brandPrimary} />
            <Text style={[styles.empTabLabel, { color: Palette.brandPrimary, fontWeight: '700' }]}>History</Text>
          </Pressable>
          <Pressable
            style={styles.empTabBtn}
          >
            <Feather name="user" size={20} color={Palette.textSecondary} />
            <Text style={[styles.empTabLabel, { color: Palette.textSecondary }]}>Profile</Text>
          </Pressable>
        </View>
        </>
      )}
    </View>
  );
}

// =========================================================================
// SCREEN 3: Employer Dashboard - Today Tab Skeleton
// =========================================================================
export function EmployerTodaySkeleton({
  activeTab = 'today',
  workplaceName,
  initials,
  avatarUrl,
  todayDateFormatted,
  onSelectTab,
  hideHeader = false,
  hideBottomBar = false,
}: {
  activeTab?: 'today' | 'attendance' | 'employees' | 'reports' | 'workplace';
  workplaceName?: string;
  initials?: string;
  avatarUrl?: string;
  todayDateFormatted?: string;
  onSelectTab?: (tab: 'today' | 'attendance' | 'employees' | 'reports' | 'workplace') => void;
  hideHeader?: boolean;
  hideBottomBar?: boolean;
}) {
  return (
    <View style={styles.fullScreen}>
      {/* 1. TOP HEADER MATCHING MOCKUP */}
      {!hideHeader && (
        <View style={styles.headerWrapper}>
        <HeaderBackgroundArt />
        <View style={styles.headerContentRow}>
          <View style={styles.headerGreetingCol}>
            <Text style={styles.greetingPre}>Good morning,</Text>
            {workplaceName ? (
              <View style={styles.headerWpTitleRow}>
                <Text style={styles.headerWorkplaceTitle} numberOfLines={1}>{workplaceName}</Text>
                <View style={styles.headerChevronCircle}>
                  <Feather name="chevron-down" size={15} color={Palette.brandPrimary} />
                </View>
              </View>
            ) : (
              <SkeletonBox width={160} height={26} borderRadius={6} style={{ marginVertical: 4 }} />
            )}

            <View style={styles.headerAdminBadge}>
              <MaterialCommunityIcons name="shield-check" size={12} color={Palette.brandPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.headerAdminText}>admin {initials || 'You'}</Text>
            </View>
          </View>

          <View style={styles.headerAvatarButton}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.headerAvatarImg} />
            ) : initials ? (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarInitials}>{initials}</Text>
              </View>
            ) : (
              <SkeletonBox width={44} height={44} borderRadius={22} />
            )}
          </View>
        </View>
      </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's attendance Header Row */}
        <View style={styles.todaySectionHeaderRow}>
          <Text style={styles.todaySectionHeaderTitle}>Today&apos;s attendance</Text>
          <Text style={styles.todaySectionHeaderDate}>{todayDateFormatted || 'Today'}</Text>
        </View>

        {/* 3 Metric Cards side-by-side: Present | Pending | Absent */}
        <View style={styles.threeMetricsRow}>
          <View style={[styles.threeMetricCard, { backgroundColor: Palette.successTint }]}>
            <Feather name="users" size={20} color="#4D5C26" style={styles.threeMetricIcon} />
            <SkeletonBox width={32} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
            <Text style={[styles.threeMetricLabel, { color: '#4D5C26' }]}>Present</Text>
          </View>

          <View style={[styles.threeMetricCard, { backgroundColor: Palette.pendingTint }]}>
            <Feather name="clock" size={20} color="#9C7018" style={styles.threeMetricIcon} />
            <SkeletonBox width={32} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
            <Text style={[styles.threeMetricLabel, { color: '#9C7018' }]}>Pending</Text>
          </View>

          <View style={[styles.threeMetricCard, { backgroundColor: Palette.neutralTint }]}>
            <Feather name="user" size={20} color="#5A6748" style={styles.threeMetricIcon} />
            <SkeletonBox width={32} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
            <Text style={[styles.threeMetricLabel, { color: '#5A6748' }]}>Absent</Text>
          </View>
        </View>

        {/* Pending Approvals Section */}
        {/* Pending Approvals Section */}
        <View style={styles.pendingApprovalsSection}>
          <View style={styles.pendingApprovalsHeaderRow}>
            <Text style={styles.pendingApprovalsTitle}>Pending approvals</Text>
          </View>

          <View style={styles.emptyPendingCard}>
            <SkeletonBox width={120} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
            <SkeletonBox width={210} height={11} borderRadius={4} />
          </View>
        </View>

        {/* 6. DAILY QR SESSION CARD */}
        <View style={styles.dailyQrCard}>
          <View style={styles.dailyQrIconBox}>
            <MaterialCommunityIcons name="qrcode" size={26} color={Palette.brandPrimary} />
          </View>

          <View style={styles.dailyQrTextCol}>
            <View style={styles.dailyQrTitleRow}>
              <Text style={styles.dailyQrTitle}>Daily QR session</Text>
              <SkeletonBox width={46} height={14} borderRadius={4} style={{ marginLeft: 6 }} />
            </View>
            <SkeletonBox width={130} height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>

          <View style={styles.showQrSmallBtnSkeleton}>
            <SkeletonBox width={64} height={28} borderRadius={8} />
          </View>
        </View>

        {/* 7. TEAM PULSE SECTION */}
        <View style={styles.teamPulseSection}>
          <View style={styles.teamPulseHeaderRow}>
            <View>
              <Text style={styles.teamPulseTitle}>Team pulse</Text>
              <Text style={styles.teamPulseSub}>Live status of your team today</Text>
            </View>
            <View style={styles.viewAllPulseBtn}>
              <Text style={styles.viewAllPulseLink}>View all</Text>
              <Feather name="chevron-right" size={14} color={Palette.brandPrimary} />
            </View>
          </View>

          <View style={styles.pulseCardList}>
            <View style={[styles.pulseRow, { borderBottomWidth: 0 }]}>
              <View style={styles.pulseAvatar}>
                <SkeletonBox width={40} height={40} borderRadius={20} />
              </View>
              <View style={styles.pulseInfoCol}>
                <SkeletonBox width={120} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <SkeletonBox width={70} height={11} borderRadius={4} />
              </View>
              <SkeletonBox width={58} height={22} borderRadius={11} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 8. EMPLOYER BOTTOM TABS */}
      {!hideBottomBar && <EmployerBottomBar activeTab={activeTab} onSelectTab={onSelectTab} />}
    </View>
  );
}

// =========================================================================
// SCREEN 4: Employer Dashboard - Pending Requests Queue Skeleton
// =========================================================================
export function EmployerRequestsSkeleton({
  onBack,
}: {
  onBack?: () => void;
}) {
  return (
    <View style={styles.fullScreen}>
      {/* Clean Requests Header matching Sage theme */}
      <View style={styles.cleanScreenHeader}>
        <Pressable
          onPress={onBack}
          style={styles.cleanBackBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
        >
          <Feather name="arrow-left" size={20} color={Palette.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cleanHeaderTitle}>Requests</Text>
          <Text style={styles.cleanHeaderSubtitle}>Review and manage attendance requests.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Pills Row */}
        <View style={[styles.rowAlign, { gap: 8, marginBottom: 18 }]}>
          <View style={styles.activePillRed}>
            <Text style={styles.activePillRedText}>Pending</Text>
          </View>
          <SkeletonBox width={80} height={28} borderRadius={14} />
          <SkeletonBox width={80} height={28} borderRadius={14} />
        </View>

        {/* Requests List Cards */}
        <View style={{ gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.requestCardSkeleton}>
              <View style={styles.rowAlign}>
                <SkeletonBox width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBox width={130} height={14} borderRadius={4} />
                  <SkeletonBox width={75} height={10} borderRadius={4} />
                </View>
              </View>
              <View style={[styles.rowAlign, { gap: 8, marginTop: 12 }]}>
                <SkeletonBox width={85} height={14} borderRadius={4} />
                <SkeletonBox width={95} height={14} borderRadius={4} />
              </View>
              <View style={[styles.rowAlign, { gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                <SkeletonBox width="48%" height={36} borderRadius={8} />
                <SkeletonBox width="48%" height={36} borderRadius={8} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// =========================================================================
// SCREEN 5: Employer Dashboard - Employees Tab Skeleton
// =========================================================================
export function EmployerEmployeesSkeleton({
  onSelectTab,
  initials,
  avatarUrl,
  hideHeader = false,
  hideBottomBar = false,
  title = 'Employees',
  subtitle = 'Manage your team and their access.',
}: {
  onSelectTab?: (tab: 'today' | 'attendance' | 'employees' | 'reports' | 'workplace') => void;
  initials?: string;
  avatarUrl?: string;
  hideHeader?: boolean;
  hideBottomBar?: boolean;
  title?: string;
  subtitle?: string;
} = {}) {
  return (
    <View style={styles.fullScreen}>
      {/* Top Banner */}
      {!hideHeader && (
        <View style={styles.darkBannerHeader}>
        <HeaderBackgroundArt />
        <View>
          <Text style={styles.bannerBrandTitle}>Workplace</Text>
          <Text style={styles.bannerRoleSub}>Employer</Text>
        </View>
        <View style={styles.bannerAvatarCircle}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.bannerAvatarImage} />
          ) : initials ? (
            <Text style={styles.bannerAvatarInitials}>{initials}</Text>
          ) : (
            <SkeletonBox width={26} height={26} borderRadius={13} />
          )}
        </View>
      </View>
    )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSubtitle}>{subtitle}</Text>

        {/* Search bar */}
        <View style={styles.searchBarSkeleton}>
          <Feather name="search" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholder}>Search by name, email or code...</Text>
        </View>

        {/* Filter Pills */}
        <View style={[styles.rowAlign, { gap: 8, marginTop: 14, marginBottom: 14 }]}>
          <View style={styles.activePillRed}>
            <Text style={styles.activePillRedText}>All</Text>
          </View>
          <SkeletonBox width={72} height={28} borderRadius={14} />
          <SkeletonBox width={72} height={28} borderRadius={14} />
        </View>

        {/* Employee List Rows */}
        <View style={{ gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.listRowCard}>
              <SkeletonBox width={38} height={38} borderRadius={19} style={{ marginRight: 12 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width={125} height={14} borderRadius={4} />
                <SkeletonBox width={80} height={10} borderRadius={4} />
              </View>
              <SkeletonBox width={55} height={20} borderRadius={10} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Employer Bottom Tabs */}
      {!hideBottomBar && <EmployerBottomBar activeTab="employees" onSelectTab={onSelectTab} />}
    </View>
  );
}

// =========================================================================
// SCREEN 6: Employer Dashboard - Reports Tab Skeleton
// =========================================================================
export function EmployerReportsSkeleton({
  onSelectTab,
  initials,
  avatarUrl,
  hideHeader = false,
  hideBottomBar = false,
}: {
  onSelectTab?: (tab: 'today' | 'attendance' | 'employees' | 'reports' | 'workplace') => void;
  initials?: string;
  avatarUrl?: string;
  hideHeader?: boolean;
  hideBottomBar?: boolean;
} = {}) {
  return (
    <View style={styles.fullScreen}>
      {/* Top Banner */}
      {!hideHeader && (
        <View style={styles.darkBannerHeader}>
        <HeaderBackgroundArt />
        <View>
          <Text style={styles.bannerBrandTitle}>Workplace</Text>
          <Text style={styles.bannerRoleSub}>Employer</Text>
        </View>
        <View style={styles.bannerAvatarCircle}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.bannerAvatarImage} />
          ) : initials ? (
            <Text style={styles.bannerAvatarInitials}>{initials}</Text>
          ) : (
            <SkeletonBox width={26} height={26} borderRadius={13} />
          )}
        </View>
      </View>
    )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Reports</Text>
        <Text style={styles.pageSubtitle}>View attendance summary and records.</Text>

        {/* Month Selector Bar */}
        <View style={[styles.cardContainerRow, { paddingVertical: 12, marginBottom: 18 }]}>
          <Feather name="calendar" size={18} color={Palette.brandPrimary} style={{ marginRight: 10 }} />
          <SkeletonBox width={130} height={14} borderRadius={4} />
          <View style={{ flex: 1 }} />
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </View>

        {/* Section 1: Key Metrics */}
        <Text style={styles.sectionHeading}>Summary Snapshot</Text>
        <View style={styles.grid2x2}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.metricCardSkeleton}>
              <SkeletonBox width={26} height={26} borderRadius={13} style={{ marginBottom: 10 }} />
              <SkeletonBox width={60} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
              <SkeletonBox width={40} height={10} borderRadius={4} />
            </View>
          ))}
        </View>

        {/* Section 2: Attendance Report */}
        <Text style={styles.sectionHeading}>Monthly Attendance Breakdown</Text>
        <View style={{ gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.listRowCard}>
              <SkeletonBox width={34} height={34} borderRadius={17} style={{ marginRight: 12 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width={120} height={13} borderRadius={4} />
                <SkeletonBox width={70} height={10} borderRadius={4} />
              </View>
              <SkeletonBox width={48} height={18} borderRadius={9} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Employer Bottom Tabs */}
      {!hideBottomBar && <EmployerBottomBar activeTab="attendance" onSelectTab={onSelectTab} />}
    </View>
  );
}

// Helper: Employer Bottom Bar for Skeletons
function EmployerBottomBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: 'today' | 'attendance' | 'employees' | 'reports' | 'workplace';
  onSelectTab?: (tab: 'today' | 'attendance' | 'employees' | 'reports' | 'workplace') => void;
}) {
  const tabs = [
    { key: 'today' as const, label: 'Today', icon: 'home' as const },
    { key: 'attendance' as const, label: 'Attendance', icon: 'calendar' as const },
    { key: 'employees' as const, label: 'Employees', icon: 'users' as const },
    { key: 'workplace' as const, label: 'Workplace', icon: 'briefcase' as const },
  ];
  return <><AdBanner position="bottom" /><BottomTabs tabs={tabs} activeTab={activeTab === 'reports' ? 'attendance' : activeTab} onSelectTab={tab => onSelectTab?.(tab)} /></>;

}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.brandPrimary,
    letterSpacing: -0.4,
  },
  subOfficeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: 16,
    fontWeight: '500',
  },
  pageTitleInline: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  /* Employer Dark Banner Header */
  darkBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.canvas,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerBrandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.6,
  },
  bannerRoleSub: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  bannerAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECEFE1',
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

  /* Workplace Header */
  wpHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  wpIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wpHeaderTexts: {
    flex: 1,
  },
  wpHeaderName: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  wpDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
  },
  wpDateText: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },

  /* Big Heading */
  todayHeadingBlock: {
    marginBottom: 16,
  },
  todayHeadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  todayHeadingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  todayHeadingSub: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },

  /* Metrics Snapshot */
  metricsSnapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 14,
  },
  gaugeContainer: {
    width: 144,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  gaugeGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#19875A',
  },
  gaugeStatusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#19875A',
  },
  metricsRightCol: {
    flex: 1,
    gap: 12,
  },
  metricCardMini: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconCirclePending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricIconCircleNotMarked: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricMiniTextCol: {
    flex: 1,
  },
  metricMiniLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },

  /* Requests Waiting Banner */
  requestsWaitingBanner: {
    backgroundColor: Palette.brandPrimary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  reqAvatarsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reqAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Palette.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  reqWaitingTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  reqWaitingSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  reqChevronCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Daily QR session Card */
  dailyQrCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dailyQrIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dailyQrTextCol: {
    flex: 1,
  },
  dailyQrTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyQrTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  showQrSmallBtnSkeleton: {
    marginLeft: 8,
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
    color: Palette.textPrimary,
  },
  teamPulseSub: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  viewAllPulseBtn: {
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
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE8',
  },
  pulseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pulseInfoCol: {
    flex: 1,
  },

  /* Sage Header for Request Queue */
  cleanScreenHeader: {
    backgroundColor: Palette.canvas,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 14 : 16,
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
  queueBurgundyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.canvas,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  queueBackBtn: {
    padding: 4,
    zIndex: 1,
  },
  queueHeaderCenter: {
    alignItems: 'center',
    zIndex: 1,
  },
  queueBrandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  queueHeaderSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },

  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  bigStatusCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBtnSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  listRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
  },
  cardContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCardSkeleton: {
    width: '48.5%',
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
  },
  monthNavBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBarSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECEFE1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  activePillRed: {
    backgroundColor: Palette.brandPrimary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  activePillRedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  requestCardSkeleton: {
    backgroundColor: Palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
  },
  empBottomTabs: {
    flexDirection: 'row',
    backgroundColor: Palette.canvas,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingTop: 6,
    paddingBottom: 8,
  },
  employerTabBar: {
    flexDirection: 'row',
    backgroundColor: Palette.canvas,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingTop: 6,
    paddingBottom: 8,
  },
  empTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  empTabLabel: {
    fontSize: 11,
  },

  /* Employee Mockup Card Styles */
  headerAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  awaitingCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 14,
  },
  awaitingRow: {
    flexDirection: 'row',
    gap: 14,
  },
  awaitingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awaitingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: 4,
  },
  awaitingSub: {
    fontSize: 13,
    color: Palette.textSecondary,
    lineHeight: 18,
  },
  scanQrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.brandPrimary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 24,
  },
  scanQrText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },

  /* Header Styles for Mockup */
  headerWrapper: {
    backgroundColor: Palette.canvas,
    paddingTop: 4,
    paddingBottom: 14,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
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
    backgroundColor: '#ECEFE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.brandTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE4CD',
  },
  headerRoleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  headerAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EDF3DF',
    borderWidth: 1,
    borderColor: '#D8E2C4',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    marginTop: 2,
    maxWidth: '100%',
  },
  headerAdminText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E5C28',
    letterSpacing: -0.2,
  },
  headerUserTag: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  headerAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECEFE1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerAvatarInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.brandPrimary,
  },

  /* Mockup Attendance & Pending Approvals Styles */
  attendanceSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  attendanceSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  attendanceSectionDate: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  mockupMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  mockupMetricCardPresent: {
    flex: 1,
    backgroundColor: Palette.successTint,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  mockupMetricCardPending: {
    flex: 1,
    backgroundColor: Palette.pendingTint,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  mockupMetricCardAbsent: {
    flex: 1,
    backgroundColor: Palette.neutralTint,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  mockupMetricNumPresent: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2C3914',
    marginBottom: 2,
  },
  mockupMetricNumPending: {
    fontSize: 26,
    fontWeight: '800',
    color: '#8A6214',
    marginBottom: 2,
  },
  mockupMetricNumAbsent: {
    fontSize: 26,
    fontWeight: '800',
    color: '#475338',
    marginBottom: 2,
  },
  mockupMetricLabelPresent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D4D1E',
  },
  mockupMetricLabelPending: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A6214',
  },
  mockupMetricLabelAbsent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475338',
  },
  pendingApprovalsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pendingApprovalsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  viewAllRequestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllRequestsText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  emptyPendingCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pendingCardsList: {
    gap: 10,
    marginBottom: 24,
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
  pendingReqAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECEFE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  pendingReqInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  pendingReqActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockupApproveBtn: {
    backgroundColor: Palette.brandPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mockupApproveBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  mockupRejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mockupRejectBtnText: {
    color: Palette.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  todaySectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  todaySectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  todaySectionHeaderDate: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  threeMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  threeMetricCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  threeMetricIcon: {
    marginBottom: 8,
  },
  threeMetricLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  pendingApprovalsSection: {
    marginBottom: 24,
  },
  headerAvatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECEFE1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECEFE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
