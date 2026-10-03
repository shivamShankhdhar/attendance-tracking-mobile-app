import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/use-theme';
import { formatFriendlyDate } from '../utils/attendance';

export interface AttendanceRequestCardData {
  id: string;
  name: string;
  code?: string;
  email?: string;
  avatarUrl?: string;
  time: string;
  date?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestType: 'CHECK_IN' | 'CHECK_OUT';
  qrVerified?: boolean;
  wifiVerified?: boolean;
  notes?: string;
}

interface AttendanceRequestCardProps {
  request: AttendanceRequestCardData;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  showActions?: boolean;
  cardStyle?: any;
}

export function AttendanceRequestCard({
  request,
  onPress,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  showActions = false,
  cardStyle,
}: AttendanceRequestCardProps) {
  const { palette, isDark } = useTheme();
  const isCheckOut = request.requestType === 'CHECK_OUT';
  const typeLabel = isCheckOut ? 'Check-Out' : 'Check-In';

  const isPending = request.status === 'PENDING';
  const isApproved = request.status === 'APPROVED';
  const isRejected = request.status === 'REJECTED';

  const formattedDate = useMemo(() => {
    if (!request.date || request.date.toLowerCase() === 'today') {
      return formatFriendlyDate(new Date(), 'EEE, d MMM yyyy');
    }
    return formatFriendlyDate(request.date, 'EEE, d MMM yyyy');
  }, [request.date]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${typeLabel} request for ${request.name}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
        cardStyle,
        pressed && styles.cardPressed,
      ]}
    >
      {/* 1. Header: Heading Text + Status/Method Badges */}
      <View style={styles.headerRow}>
        <View style={styles.headingGroup}>
          <View
            style={[
              styles.typeIconBadge,
              {
                backgroundColor: isCheckOut
                  ? (isDark ? '#581C87' : '#F3E8FF')
                  : palette.brandTint,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isCheckOut ? 'logout' : 'login'}
              size={15}
              color={isCheckOut ? (isDark ? '#D8B4FE' : '#9333EA') : palette.brandPrimary}
            />
          </View>
          <Text style={[styles.cardHeadingText, { color: palette.textPrimary }]}>
            {typeLabel}
          </Text>
        </View>

        <View style={styles.headerRightGroup}>
          {isPending ? (
            <View style={[styles.statusBadge, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
              <Text style={[styles.statusBadgeText, { color: isDark ? '#FCD34D' : '#D97706' }]}>Pending</Text>
            </View>
          ) : isApproved ? (
            <View style={[styles.statusBadge, { backgroundColor: isDark ? '#14532D' : '#DCFCE7' }]}>
              <Text style={[styles.statusBadgeText, { color: isDark ? '#86EFAC' : '#16A34A' }]}>Approved</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <Text style={[styles.statusBadgeText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>Rejected</Text>
            </View>
          )}

          {request.qrVerified ? (
            <View style={[styles.methodBadge, { backgroundColor: palette.brandTint, borderColor: palette.brandPressed + '30' }]}>
              <MaterialCommunityIcons name="qrcode-scan" size={11} color={palette.brandPrimary} />
              <Text style={[styles.methodBadgeText, { color: palette.brandPrimary }]}>QR</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Subtle Divider */}
      <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

      {/* 2. Body: Left Avatar + Name + Email, Right Timings */}
      <View style={styles.bodyRow}>
        <View style={styles.employeeInfoLeft}>
          <Avatar name={request.name} avatarUrl={request.avatarUrl} size="md" />
          <View style={styles.employeeTextCol}>
            <Text style={[styles.employeeName, { color: palette.textPrimary }]} numberOfLines={1}>
              {request.name}
            </Text>
            <Text style={[styles.employeeEmail, { color: palette.textSecondary }]} numberOfLines={1}>
              {request.email || (request.code ? `ID: ${request.code}` : 'Employee')}
            </Text>
          </View>
        </View>

        <View style={styles.timingsRightCol}>
          <View style={[styles.timeBadge, { backgroundColor: isDark ? '#0F172A' : palette.brandTint }]}>
            <Feather name="clock" size={12} color={palette.brandPrimary} style={{ marginRight: 4 }} />
            <Text style={[styles.timeText, { color: palette.textPrimary }]}>
              {request.time || '—'}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: palette.textSecondary }]}>
            {formattedDate}
          </Text>
        </View>
      </View>

      {/* 3. Bottom: Reject & Approve Buttons (Olive & Red with text as same) */}
      {showActions && isPending && (
        <View style={[styles.actionsRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
          {/* Reject Button (Red) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reject ${request.name}`}
            disabled={isApproving || isRejecting}
            onPress={onReject}
            style={({ pressed }) => [
              styles.rejectBtn,
              { backgroundColor: '#DC2626' },
              pressed && styles.btnPressed,
              isRejecting && { opacity: 0.7 },
            ]}
          >
            {isRejecting ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            ) : (
              <Feather name="x" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.actionBtnText}>
              {isRejecting ? 'Rejecting…' : 'Reject'}
            </Text>
          </Pressable>

          {/* Approve Button (Olive) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Approve ${request.name}`}
            disabled={isApproving || isRejecting}
            onPress={onApprove}
            style={({ pressed }) => [
              styles.approveBtn,
              { backgroundColor: palette.brandPrimary },
              pressed && styles.btnPressed,
              isApproving && { opacity: 0.7 },
            ]}
          >
            {isApproving ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            ) : (
              <Feather name="check" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.actionBtnText}>
              {isApproving ? 'Approving…' : 'Approve'}
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  typeIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadingText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  employeeInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  employeeTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 12,
    fontWeight: '500',
  },
  timingsRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 38,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 38,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
