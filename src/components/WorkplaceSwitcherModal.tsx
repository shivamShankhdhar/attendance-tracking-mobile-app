import { useRouter } from 'expo-router';
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { useAuthStore, WorkplaceMembership } from '../stores/authStore';
import { Avatar } from './Avatar';
import { adMobService } from '../services/adMobService';
import { AdBanner } from './AdBanner';

interface WorkplaceSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  showSettingsLink?: boolean;
  showDetailsLinks?: boolean;
}

export function WorkplaceSwitcherModal({ visible, onClose, showSettingsLink = true, showDetailsLinks = true }: WorkplaceSwitcherModalProps) {
  const router = useRouter();
  const {
    memberships,
    activeWorkplace,
    selectWorkplace,
    clearActiveWorkplace,
    setOnboardingInitialStep,
    user,
  } = useAuthStore();

  const handleSelect = (m: WorkplaceMembership) => {
    const isDifferent = m.workplaceId !== activeWorkplace?.workplaceId;
    selectWorkplace(m);
    onClose();
    if (isDifferent) {
      void adMobService.showInterstitial('switch_workplace');
    }
  };

  const handleDetails = (membership: WorkplaceMembership) => {
    onClose();
    router.push({ pathname: '/workplace-details', params: { id: membership.workplaceId } });
  };

  const handleCreateNewWorkplace = () => {
    onClose();
    setOnboardingInitialStep('create-workplace');
    clearActiveWorkplace();
  };

  const activeMembership = memberships.find(
    (m) => m.status === 'ACTIVE' && m.workplaceId === activeWorkplace?.workplaceId
  );
  const otherMemberships = memberships.filter(
    (m) => m.status === 'ACTIVE' && m.workplaceId !== activeWorkplace?.workplaceId
  );

  const [mounted, setMounted] = React.useState(visible);
  const slideAnim = React.useRef(new Animated.Value(600)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 28,
          mass: 0.8,
          stiffness: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onClose();
      }
    });
  };

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={styles.backdropContainer}>
        {/* Fast static overlay that does not slide */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdropOverlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Modal card that slides from bottom to top */}
        <Animated.View style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Avatar name={user?.name || 'User'} avatarUrl={user?.avatarUrl} size="md" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>Switch Workplace</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Signed in as {user?.name || 'User'}
              </Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              style={styles.closeBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close switcher modal"
            >
              <Feather name="x" size={18} color={Palette.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {/* SECTION 1: ACTIVE WORKPLACE */}
            {activeMembership ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>CURRENT WORKPLACE</Text>
                  <View style={styles.activePillDot}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activePillText}>Active Now</Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: true }}
                  accessibilityLabel={`Current workplace: ${activeMembership.workplaceName}`}
                  onPress={() => handleSelect(activeMembership)}
                  style={[styles.workplaceItem, styles.workplaceItemActive]}
                >
                  {/* Icon Tile */}
                  <View
                    style={[
                      styles.iconTile,
                      activeMembership.role === 'EMPLOYER'
                        ? styles.iconTileEmployer
                        : styles.iconTileEmployee,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        activeMembership.role === 'EMPLOYER'
                          ? 'store'
                          : 'badge-account-horizontal-outline'
                      }
                      size={22}
                      color={activeMembership.role === 'EMPLOYER' ? Palette.brandPrimary : '#15803D'}
                    />
                  </View>

                  {/* Info */}
                  <View style={styles.itemLeft}>
                    <Text style={styles.wpNameActive} numberOfLines={1}>
                      {activeMembership.workplaceName}
                    </Text>
                    <View style={styles.metaRow}>
                      <View
                        style={[
                          styles.roleBadge,
                          activeMembership.role === 'EMPLOYER'
                            ? styles.roleBadgeEmployer
                            : styles.roleBadgeEmployee,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            activeMembership.role === 'EMPLOYER'
                              ? styles.roleTextEmployer
                              : styles.roleTextEmployee,
                          ]}
                        >
                          {activeMembership.role === 'EMPLOYER' ? 'Owner / Employer' : 'Team Member'}
                        </Text>
                      </View>
                      {activeMembership.employeeCode ? (
                        <Text style={styles.codeText}>ID: {activeMembership.employeeCode}</Text>
                      ) : activeMembership.workplaceCode ? (
                        <Text style={styles.codeText}>Code: {activeMembership.workplaceCode}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Active Radio Indicator */}
                  <View style={styles.activeRadioCircle}>
                    <View style={styles.activeRadioDot} />
                  </View>
                </Pressable>
{showDetailsLinks && (                <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${activeMembership.workplaceName}`} onPress={() => handleDetails(activeMembership)} style={styles.detailsAction}>
                  <Feather name="info" size={16} color={Palette.brandPrimary} /><Text style={styles.detailsActionText}>View workplace details</Text><Feather name="chevron-right" size={16} color={Palette.brandPrimary} />
                </Pressable>)}
              </View>
            ) : null}

            {/* GAP / DIVIDER BETWEEN ACTIVE AND AVAILABLE WORKPLACES */}
            <View style={styles.gapSpacer}>
              <View style={styles.gapDividerLine} />
            </View>

            {/* SECTION 2: ALL AVAILABLE WORKPLACES */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>
                AVAILABLE WORKPLACES ({otherMemberships.length})
              </Text>

              {otherMemberships.length === 0 ? (
                <View style={styles.emptyOtherBox}>
                  <Text style={styles.emptyOtherText}>No other workplaces linked to this account.</Text>
                </View>
              ) : (
                otherMemberships.map((m) => {
                  const isEmployer = m.role === 'EMPLOYER';
                  return (
                    <React.Fragment key={m.id || m.workplaceId}>
                    <Pressable
                      onPress={() => handleSelect(m)}
                      style={({ pressed }) => [
                        styles.workplaceItem,
                        pressed && styles.itemPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: false }}
                      accessibilityLabel={`Switch to ${m.workplaceName}`}
                    >
                      {/* Icon Tile */}
                      <View
                        style={[
                          styles.iconTile,
                          isEmployer ? styles.iconTileEmployer : styles.iconTileEmployee,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            isEmployer
                              ? 'store'
                              : 'badge-account-horizontal-outline'
                          }
                          size={22}
                          color={isEmployer ? Palette.brandPrimary : '#15803D'}
                        />
                      </View>

                      {/* Info */}
                      <View style={styles.itemLeft}>
                        <Text style={styles.wpName} numberOfLines={1}>
                          {m.workplaceName}
                        </Text>
                        <View style={styles.metaRow}>
                          <View
                            style={[
                              styles.roleBadge,
                              isEmployer
                                ? styles.roleBadgeEmployer
                                : styles.roleBadgeEmployee,
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleBadgeText,
                                isEmployer
                                  ? styles.roleTextEmployer
                                  : styles.roleTextEmployee,
                              ]}
                            >
                              {isEmployer ? 'Owner / Employer' : 'Team Member'}
                            </Text>
                          </View>
                          {m.employeeCode ? (
                            <Text style={styles.codeText}>ID: {m.employeeCode}</Text>
                          ) : m.workplaceCode ? (
                            <Text style={styles.codeText}>Code: {m.workplaceCode}</Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Inactive Radio Indicator */}
                      <View style={styles.inactiveRadioCircle} />
                    </Pressable>
{showDetailsLinks && (                    <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${m.workplaceName}`} onPress={() => handleDetails(m)} style={styles.detailsAction}>
                      <Feather name="info" size={16} color={Palette.brandPrimary} /><Text style={styles.detailsActionText}>View details</Text><Feather name="chevron-right" size={16} color={Palette.brandPrimary} />
                    </Pressable>)}
                    </React.Fragment>
                  );
                })
              )}
            </View>

            {/* GAP / DIVIDER */}
            <View style={styles.gapSpacer}>
              <View style={styles.gapDividerLine} />
            </View>

            {/* SECTION 3: MORE OPTIONS (INSIDE SCROLL) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>MORE OPTIONS</Text>

              {/* CREATE NEW WORKPLACE */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create new workplace"
                onPress={handleCreateNewWorkplace}
                style={({ pressed }) => [
                  styles.actionCardBtn,
                  pressed && styles.actionCardBtnPressed,
                ]}
              >
                <View style={[styles.actionIconTile, styles.actionIconTileBrand]}>
                  <Feather name="plus" size={20} color={Palette.brandPrimary} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Create new workplace</Text>
                  <Text style={styles.actionSub}>
                    Set up a new business, shop, or office
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={Palette.brandPrimary} />
              </Pressable>

              {/* MY JOIN REQUESTS */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="My join requests"
                onPress={() => {
                  onClose();
                  router.push('/my-join-requests');
                }}
                style={({ pressed }) => [
                  styles.actionCardBtn,
                  pressed && styles.actionCardBtnPressed,
                ]}
              >
                <View style={[styles.actionIconTile, styles.actionIconTileNeutral]}>
                  <Feather name="inbox" size={18} color={Palette.brandPrimary} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>My join requests</Text>
                  <Text style={styles.actionSub}>
                    Check status of pending workplace requests
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={Palette.brandPrimary} />
              </Pressable>

              {/* SETTINGS */}
              {showSettingsLink ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  onPress={() => {
                    onClose();
                    router.push('/settings');
                  }}
                  style={({ pressed }) => [
                    styles.actionCardBtn,
                    pressed && styles.actionCardBtnPressed,
                  ]}
                >
                  <View style={[styles.actionIconTile, styles.actionIconTileNeutral]}>
                    <Feather name="settings" size={18} color={Palette.brandPrimary} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Settings</Text>
                    <Text style={styles.actionSub}>
                      Preferences, security & app lock
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Palette.brandPrimary} />
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
          <AdBanner position="bottom" safeBottom />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailsAction: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, backgroundColor: Palette.brandTint, marginTop: 8, marginBottom: 10 },
  detailsActionText: { flex: 1, fontSize: 14, fontWeight: '700', color: Palette.brandPrimary },
  backdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dismissArea: {
    flex: 1,
    width: '100%',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxWidth: 520,
    maxHeight: '84%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 20,
    overflow: 'hidden',
  },
  dragHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#17202A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sectionBlock: {
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  activePillDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  gapSpacer: {
    marginVertical: 14,
  },
  gapDividerLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  workplaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 13,
    marginBottom: 10,
  },
  workplaceItemActive: {
    borderColor: Palette.brandPrimary,
    backgroundColor: Palette.brandTint,
  },
  itemPressed: {
    opacity: 0.85,
    backgroundColor: '#F8FAFC',
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconTileEmployer: {
    backgroundColor: Palette.brandTint,
  },
  iconTileEmployee: {
    backgroundColor: '#F0FDF4',
  },
  itemLeft: {
    flex: 1,
    marginRight: 10,
  },
  wpName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17202A',
  },
  wpNameActive: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.brandPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeEmployer: {
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#DCE4CD',
  },
  roleBadgeEmployee: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleTextEmployer: {
    color: Palette.brandPrimary,
  },
  roleTextEmployee: {
    color: '#166534',
  },
  codeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  activeRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Palette.brandPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Palette.brandPrimary,
  },
  inactiveRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  emptyOtherBox: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
  },
  emptyOtherText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  actionCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 13,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionCardBtnPressed: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    transform: [{ scale: 0.99 }],
  },
  actionIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconTileBrand: {
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D4E2BA',
  },
  actionIconTileNeutral: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#17202A',
  },
  actionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
