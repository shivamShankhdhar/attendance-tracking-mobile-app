import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';
import { Avatar } from './Avatar';
import { StatusChip } from './StatusChip';
import { PrimaryButton, DangerButton } from './Buttons';

export interface RequestItemData {
  id: string;
  employeeName: string;
  employeeCode?: string;
  avatarUrl?: string;
  requestedAt: string; // e.g. "09:15 AM"
  qrVerified: boolean;
  networkStatus: 'VERIFIED' | 'NOT_VERIFIED' | 'UNAVAILABLE';
  networkSsid?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface RequestCardProps {
  request: RequestItemData;
  onApprove?: () => void;
  onReject?: () => void;
  onPressDetail?: () => void;
  isActionLoading?: boolean;
}

export function RequestCard({
  request,
  onApprove,
  onReject,
  onPressDetail,
  isActionLoading = false,
}: RequestCardProps) {
  return (
    <Pressable
      onPress={onPressDetail}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.employeeInfo}>
          <Avatar name={request.employeeName} avatarUrl={request.avatarUrl} size="md" />
          <View style={styles.nameBlock}>
            <Text style={styles.nameText}>{request.employeeName}</Text>
            <Text style={styles.codeText}>
              {request.employeeCode || 'Employee'} • Requested {request.requestedAt}
            </Text>
          </View>
        </View>

        {request.status !== 'PENDING' && (
          <StatusChip
            status={request.status === 'APPROVED' ? 'PRESENT' : 'REJECTED'}
            size="sm"
          />
        )}
      </View>

      {/* Advisory Verification Badges */}
      <View style={styles.badgesRow}>
        <View style={styles.badgeItem}>
          <Feather
            name={request.qrVerified ? 'check-circle' : 'alert-circle'}
            size={14}
            color={request.qrVerified ? Palette.success : Palette.danger}
          />
          <Text
            style={[
              styles.badgeText,
              { color: request.qrVerified ? Palette.success : Palette.danger },
            ]}
          >
            {request.qrVerified ? 'QR verified' : 'Invalid QR'}
          </Text>
        </View>

        <View style={styles.badgeItem}>
          <Feather
            name="wifi"
            size={14}
            color={
              request.networkStatus === 'VERIFIED'
                ? Palette.success
                : request.networkStatus === 'NOT_VERIFIED'
                ? Palette.info
                : Palette.neutralStatus
            }
          />
          <Text
            style={[
              styles.badgeText,
              {
                color:
                  request.networkStatus === 'VERIFIED'
                    ? Palette.success
                    : request.networkStatus === 'NOT_VERIFIED'
                    ? Palette.info
                    : Palette.neutralStatus,
              },
            ]}
          >
            {request.networkStatus === 'VERIFIED'
              ? 'Wi-Fi verified'
              : request.networkStatus === 'NOT_VERIFIED'
              ? 'Network not verified'
              : 'Wi-Fi unavailable'}
          </Text>
        </View>
      </View>

      {/* Action buttons when PENDING */}
      {request.status === 'PENDING' && (onApprove || onReject) && (
        <View style={styles.actionRow}>
          {onReject && (
            <DangerButton
              label="Reject"
              onPress={onReject}
              size="sm"
              loading={isActionLoading}
              style={styles.actionBtn}
            />
          )}
          {onApprove && (
            <PrimaryButton
              label="Approve"
              onPress={onApprove}
              size="sm"
              loading={isActionLoading}
              style={styles.actionBtn}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.95,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  nameBlock: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  codeText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
  },
});
