import { formatFriendlyDate } from '../utils/attendance';
import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { DetailPage, DetailSection, DetailRow } from '../components/DetailPage';
import { WorkplaceJoinQrModal } from '../components/WorkplaceJoinQrModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonBox } from '../components/SkeletonScreens';
import { useAuthStore } from '../stores/authStore';
import { attendanceApi } from '../services/attendanceApi';
import { Palette } from '../constants/colors';
import { showError, showSuccess } from '../stores/alertStore';

function WorkplaceDetailsSkeleton() {
  return (
    <View style={{ gap: 20 }}>
      {/* Hero Skeleton Card */}
      <View style={styles.hero}>
        <SkeletonBox width={62} height={62} borderRadius={18} style={{ marginBottom: 4 }} />
        <SkeletonBox width={200} height={24} borderRadius={6} style={{ marginBottom: 6 }} />
        <SkeletonBox width={160} height={14} borderRadius={4} />
        <SkeletonBox width={170} height={42} borderRadius={14} style={{ marginTop: 10 }} />
      </View>

      {/* Workplace information section */}
      <View style={styles.skeletonSection}>
        <SkeletonBox width={170} height={13} borderRadius={4} style={{ marginLeft: 4, marginBottom: 10 }} />
        <View style={styles.skeletonCard}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.skeletonRow, i > 1 && styles.skeletonRowBorder]}>
              <SkeletonBox width={20} height={20} borderRadius={6} style={{ marginRight: 14 }} />
              <View style={{ flex: 1, gap: 5 }}>
                <SkeletonBox width={90} height={12} borderRadius={4} />
                <SkeletonBox width={140} height={14} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Attendance setup section */}
      <View style={styles.skeletonSection}>
        <SkeletonBox width={140} height={13} borderRadius={4} style={{ marginLeft: 4, marginBottom: 10 }} />
        <View style={styles.skeletonCard}>
          {[1, 2].map((i) => (
            <View key={i} style={[styles.skeletonRow, i > 1 && styles.skeletonRowBorder]}>
              <SkeletonBox width={20} height={20} borderRadius={6} style={{ marginRight: 14 }} />
              <View style={{ flex: 1, gap: 5 }}>
                <SkeletonBox width={110} height={12} borderRadius={4} />
                <SkeletonBox width={70} height={14} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function WorkplaceDetailsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showJoinQr, setShowJoinQr] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [switching, setSwitching] = useState(false);

  const userId = useAuthStore((s) => s.user?.id);
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const activeWorkplace = useAuthStore((s) => s.activeWorkplace);
  const selectWorkplace = useAuthStore((s) => s.selectWorkplace);
  const membership = useAuthStore((s) =>
    s.memberships.find((m) => m.workplaceId === id && m.status === 'ACTIVE')
  );

  const details = useQuery({
    queryKey: ['workplace-details', userId, id],
    queryFn: () => attendanceApi.getWorkplaceDetails(id!),
    enabled: authenticated && Boolean(userId && id && membership),
    staleTime: 60_000,
  });

  if (!authenticated) return <Redirect href="/" />;
  if (!membership || !id) {
    return (
      <DetailPage title="Workplace details">
        <Text style={styles.note}>This workplace is not available to your account.</Text>
      </DetailPage>
    );
  }

  const workplace = details.data;
  const isActive = Boolean(
    activeWorkplace &&
      (activeWorkplace.workplaceId === id || activeWorkplace.id === id)
  );
  const code = workplace?.code || id.slice(-6).toUpperCase();
  const workplaceName = workplace?.name || membership.workplaceName;

  const shareCode = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        showSuccess('Workplace code copied.');
      } else {
        await Share.share({ message: `${membership.workplaceName} workplace code: ${code}` });
      }
    } catch {
      showError('Unable to share the workplace code.');
    }
  };

  const handleSwitchWorkplace = async () => {
    try {
      setSwitching(true);
      selectWorkplace(membership);
      showSuccess(`Switched to ${workplaceName}`);
      setShowSwitchConfirm(false);
      router.replace('/');
    } catch {
      showError('Failed to switch workplace.');
    } finally {
      setSwitching(false);
    }
  };

  if (details.isPending && !workplace) {
    return (
      <DetailPage title="Workplace details">
        <WorkplaceDetailsSkeleton />
      </DetailPage>
    );
  }

  return (
    <DetailPage title="Workplace details">
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Feather name="briefcase" size={29} color={Palette.brandPrimary} />
        </View>
        <Text style={styles.title}>{workplaceName}</Text>
        <Text style={styles.note}>
          {membership.role === 'EMPLOYER' ? 'Owner / Employer' : 'Team member'} · {workplace?.memberCount ?? membership.memberCount ?? '—'} active members
        </Text>

        {isActive ? (
          <View style={styles.activeBadge}>
            <Feather name="check-circle" size={14} color={Palette.brandPrimary} />
            <Text style={styles.activeBadgeText}>Currently active workplace</Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use this workplace"
            onPress={() => setShowSwitchConfirm(true)}
            style={({ pressed }) => [styles.useWorkplaceBtn, pressed && styles.useWorkplaceBtnPressed]}
          >
            <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.useWorkplaceBtnText}>Use this workplace</Text>
          </Pressable>
        )}
      </View>

      {details.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void details.refetch()}
          style={styles.retry}
        >
          <Text style={styles.retryText}>Could not load current details. Tap to retry.</Text>
        </Pressable>
      ) : null}

      <DetailSection title="Workplace information">
        <DetailRow icon="hash" label="Workplace code" value={code} onPress={() => void shareCode()} />
        <DetailRow icon="map-pin" label="Address" value={workplace?.address || membership.address || 'No address added'} />
        <DetailRow icon="clock" label="Timezone" value={workplace?.timezone || membership.timezone} />
        <DetailRow
          icon="users"
          label="Team size"
          value={
            workplace?.memberCount !== undefined
              ? `${workplace.memberCount} active members`
              : membership.memberCount !== undefined
              ? `${membership.memberCount} active members`
              : 'Loading'
          }
        />
        {workplace?.createdAt ? (
          <DetailRow icon="calendar" label="Created" value={formatFriendlyDate(workplace.createdAt, 'd MMM yyyy')} />
        ) : null}
        <DetailRow icon="users" label="Your role" value={membership.role === 'EMPLOYER' ? 'Employer / Admin' : 'Employee'} />
        {membership.employeeCode ? (
          <DetailRow icon="user" label="Employee ID" value={membership.employeeCode} />
        ) : null}
      </DetailSection>

      {workplace ? (
        <DetailSection title="Attendance setup">
          <DetailRow
            icon="wifi"
            label="Workplace Wi-Fi required"
            value={workplace.attendanceSettings?.requireWifi ? 'Yes' : 'No'}
          />
          <DetailRow
            icon="calendar"
            label="Daily auto close"
            value={
              workplace.attendanceSettings?.autoCloseHour === 23
                ? 'End of day'
                : `${String(workplace.attendanceSettings?.autoCloseHour ?? 23).padStart(2, '0')}:00 local time`
            }
          />
        </DetailSection>
      ) : null}

      {membership.role === 'EMPLOYER' ? (
        <DetailSection title="Invite your team">
          <DetailRow
            icon="inbox"
            label="Join requests"
            value="Review pending, approved and rejected requests"
            onPress={() => router.push({ pathname: '/join-requests', params: { workplaceId: id } })}
          />
          <DetailRow
            icon="share-2"
            label="Share workplace invite"
            value="Link and QR code"
            onPress={() => setShowJoinQr(true)}
          />
        </DetailSection>
      ) : null}

      <WorkplaceJoinQrModal
        visible={showJoinQr}
        workplaceId={id}
        workplaceName={workplaceName}
        onClose={() => setShowJoinQr(false)}
      />

      <ConfirmDialog
        visible={showSwitchConfirm}
        title="Use this workplace"
        message={`Are you sure you want to make "${workplaceName}" your active workplace?`}
        confirmLabel="Use this workplace"
        cancelLabel="Cancel"
        loading={switching}
        onConfirm={() => void handleSwitchWorkplace()}
        onCancel={() => setShowSwitchConfirm(false)}
      />
    </DetailPage>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: Palette.brandTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  useWorkplaceBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  useWorkplaceBtnPressed: {
    backgroundColor: Palette.brandPressed,
  },
  useWorkplaceBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activeBadge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  activeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.brandPrimary,
  },
  retry: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  retryText: {
    color: Palette.danger,
    textAlign: 'center',
  },
  skeletonSection: {
    gap: 10,
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  skeletonRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  skeletonRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
  },
});

