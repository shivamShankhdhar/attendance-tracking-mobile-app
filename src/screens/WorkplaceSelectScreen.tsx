import { formatFriendlyDate } from '../utils/attendance';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { useAuthStore, WorkplaceMembership } from '../stores/authStore';
import { Avatar } from '../components/Avatar';
import { AdBanner } from '../components/AdBanner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { adMobService } from '../services/adMobService';

export function WorkplaceSelectScreen() {
  const user = useAuthStore((s) => s.user);
  const memberships = useAuthStore((s) => s.memberships);
  const activeWorkplace = useAuthStore((s) => s.activeWorkplace);
  const confirmWorkplaceSelection = useAuthStore((s) => s.confirmWorkplaceSelection);
  const clearActiveWorkplace = useAuthStore((s) => s.clearActiveWorkplace);
  const setOnboardingInitialStep = useAuthStore((s) => s.setOnboardingInitialStep);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const logout = useAuthStore((s) => s.logout);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Filter active memberships & sort newest first (by createdAt descending)
  const sortedWorkplaces = useMemo(() => {
    const active = memberships.filter((m) => m.status === 'ACTIVE');
    return [...active].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [memberships]);

  // Pre-select the newest workplace by default (first in list)
  const [selectedId, setSelectedId] = useState<string>(() => {
    return activeWorkplace?.workplaceId || sortedWorkplaces[0]?.workplaceId || '';
  });

  // Keep selectedId valid if sortedWorkplaces updates
  const currentSelected = useMemo(() => {
    return sortedWorkplaces.find((w) => w.workplaceId === selectedId) || sortedWorkplaces[0];
  }, [sortedWorkplaces, selectedId]);

  const handleSelect = (wp: WorkplaceMembership) => {
    setSelectedId(wp.workplaceId);
  };

  const handleEnterWorkplace = () => {
    if (currentSelected) {
      confirmWorkplaceSelection(currentSelected);
      void adMobService.showInterstitial('enter_workplace');
    }
  };

  const handleCreateNew = () => {
    clearActiveWorkplace();
    setOnboardingInitialStep('create-workplace');
    confirmWorkplaceSelection(); // proceeds to OnboardingScreen
  };

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      await refreshProfile();
    } catch {
      setRefreshError('Unable to update workplaces. Pull down to try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCreationDate = (dateVal?: string | Date) => dateVal ? formatFriendlyDate(dateVal, 'd MMM yyyy') : null;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.userInfoRow}>
          <Avatar name={user?.name || 'User'} avatarUrl={user?.avatarUrl} size="md" />
          <View style={styles.userTextCol}>
            <Text style={styles.welcomeSubtitle}>Welcome back,</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || 'User'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setShowSignOutConfirm(true)}
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Feather name="log-out" size={14} color={Palette.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.brandPrimary}
            colors={[Palette.brandPrimary]}
          />
        }
      >
        {/* Title & Guidance */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Choose your workplace</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{sortedWorkplaces.length} Available</Text>
            </View>
          </View>
          <Text style={styles.pageSubtitle}>
            Choose where you want to work. You can switch workplaces anytime.
          </Text>
        </View>

        {refreshError && <Text accessibilityRole="alert" style={{ color: Palette.danger, marginBottom: 12 }}>{refreshError}</Text>}
        {sortedWorkplaces.length === 0 && <Text style={styles.pageSubtitle}>No active workplaces yet. Create one to get started.</Text>}
        {/* Workplace Cards List */}
        <View style={styles.listSection}>
          {sortedWorkplaces.map((wp, index) => {
            const isSelected = wp.workplaceId === currentSelected?.workplaceId;
            const isNewest = index === 0;
            const code = wp.workplaceCode || wp.workplaceId.slice(-6).toUpperCase();
            const createdDateStr = formatCreationDate(wp.createdAt);

            return (
              <Pressable
                key={wp.id || wp.workplaceId}
                onPress={() => handleSelect(wp)}
                style={({ pressed }) => [
                  styles.card,
                  isSelected ? styles.cardSelected : styles.cardDefault,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${wp.workplaceName}, code ${code}${isNewest ? ', Newest workplace' : ''}`}
              >
                {/* Top Row: Title + Badges */}
                <View style={styles.cardHeader}>
                  <View style={styles.iconAndTitleGroup}>
                    <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                      <MaterialCommunityIcons
                        name={wp.role === 'EMPLOYER' ? 'domain' : 'badge-account-outline'}
                        size={22}
                        color={Palette.brandPrimary}
                      />
                    </View>

                    <View style={styles.titleCol}>
                      <View style={styles.titleWithBadgeRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {wp.workplaceName}
                        </Text>
                        {isNewest && (
                          <View style={styles.newestBadge}>
                            <MaterialCommunityIcons name="star-four-points" size={10} color={Palette.brandPrimary} style={{ marginRight: 3 }} />
                            <Text style={styles.newestBadgeText}>Latest</Text>
                          </View>
                        )}
                      </View>

                      {/* Code and Role badges */}
                      <View style={styles.metaBadgeRow}>
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>
                            {wp.role === 'EMPLOYER' ? 'Workplace Admin' : 'Employee'}
                          </Text>
                        </View>

                        <View style={styles.codeBadge}>
                          <Feather name="hash" size={10} color={Palette.textSecondary} style={{ marginRight: 2 }} />
                          <Text style={styles.codeBadgePrefix}>Code: </Text>
                          <Text style={styles.codeBadgeText}>{code}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Radio Selection Indicator */}
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <Feather name="check" size={14} color="#FFFFFF" />}
                  </View>
                </View>

                {/* Additional Info Row: Address or Creation */}
                {(wp.address || createdDateStr) && (
                  <View style={styles.cardFooter}>
                    {wp.address ? (
                      <View style={styles.addressRow}>
                        <Feather name="map-pin" size={12} color={Palette.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {wp.address}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.addressRow}>
                        <Feather name="clock" size={12} color={Palette.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.addressText}>
                          Created {createdDateStr}
                        </Text>
                      </View>
                    )}

                    {createdDateStr && wp.address ? (
                      <Text style={styles.dateText}>{createdDateStr}</Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Secondary Action: Create Another Workplace */}
        <Pressable
          onPress={handleCreateNew}
          style={({ pressed }) => [styles.createNewBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Register a new workplace"
        >
          <View style={styles.createNewIconBox}>
            <Feather name="plus" size={16} color={Palette.brandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.createNewTitle}>Register a New Workplace</Text>
            <Text style={styles.createNewSubtitle}>Set up another branch, office, or storefront</Text>
          </View>
          <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
        </Pressable>
      </ScrollView>

      {/* Sticky Bottom Catchy CTA Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.enterBtnContainer}>
          <Pressable
            onPress={handleEnterWorkplace}
            disabled={!currentSelected}
            style={({ pressed }) => [
              styles.enterBtn,
              !currentSelected && { opacity: 0.45 },
              pressed && styles.enterBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Enter ${currentSelected?.workplaceName || 'workplace'}`}
          >
            <Text style={styles.enterBtnText}>
              Enter {currentSelected?.workplaceName ? `"${currentSelected.workplaceName}"` : 'Workplace'}
            </Text>
            <View style={styles.enterArrowCircle}>
              <Feather name="arrow-right" size={18} color={Palette.brandPrimary} />
            </View>
          </Pressable>
        </View>
        <AdBanner position="bottom" style={{ marginTop: 8 }} />
      </View>

      <ConfirmDialog
        visible={showSignOutConfirm}
        title="Sign out"
        message="Are you sure you want to sign out? You will need to sign in again to access your workplaces."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => {
          setShowSignOutConfirm(false);
          void logout();
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: 16,
    color: Palette.textPrimary,
    fontWeight: '700',
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Palette.surfaceMuted,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  signOutText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  titleSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.4,
  },
  countBadge: {
    backgroundColor: Palette.brandTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4E2BA',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  pageSubtitle: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  listSection: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#1B2210',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDefault: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
  },
  cardSelected: {
    backgroundColor: '#F7FAEE',
    borderColor: Palette.brandPrimary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: Palette.brandPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconAndTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D7E5BD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: '#E4EECB',
    borderColor: Palette.brandPrimary,
  },
  titleCol: {
    flex: 1,
    marginLeft: 12,
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  newestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5EDD3',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C5D8A3',
  },
  newestBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.brandPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  roleBadge: {
    backgroundColor: Palette.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  codeBadgePrefix: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5BE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  radioCircleSelected: {
    borderColor: Palette.brandPrimary,
    backgroundColor: Palette.brandPrimary,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginLeft: 8,
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    borderStyle: 'dashed',
    marginTop: 6,
  },
  createNewIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  createNewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  createNewSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    backgroundColor: Palette.surface,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    ...Platform.select({
      ios: {
        shadowColor: '#1B2210',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  enterBtnContainer: {
    paddingHorizontal: 20,
  },
  enterBtn: {
    backgroundColor: Palette.brandPrimary,
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: Palette.brandPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  enterBtnPressed: {
    backgroundColor: Palette.brandPressed,
    transform: [{ scale: 0.99 }],
  },
  enterBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textInverse,
    marginRight: 10,
    letterSpacing: -0.2,
  },
  enterArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
