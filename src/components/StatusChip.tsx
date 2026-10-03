import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../constants/colors';

export type AttendanceChipStatus =
  | 'PRESENT'
  | 'PENDING'
  | 'NOT_MARKED'
  | 'REJECTED'
  | 'CLOSED'
  | 'OPEN'
  | 'HALF_DAY'
  | 'LEAVE'
  | 'ACTIVE'
  | 'INVITED'
  | 'CLAIMED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'VERIFIED'
  | 'NOT_VERIFIED'
  | 'UNAVAILABLE';

interface StatusChipProps {
  status: AttendanceChipStatus | string;
  size?: 'sm' | 'md';
  customLabel?: string;
  showIcon?: boolean;
}

export function StatusChip({ status, size = 'md', customLabel, showIcon = true }: StatusChipProps) {
  let label: string = 'Not marked';
  let bg: string = Palette.neutralTint;
  let text: string = Palette.neutralStatus;
  let border: string = Palette.border;
  let iconNode: React.ReactNode = null;

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 10 : 12;

  switch (status) {
    case 'CANCELLED':
      label = 'Cancelled';
      break;
    case 'ABSENT':
      label = 'Absent';
      bg = Palette.neutralTint;
      text = Palette.neutralStatus;
      border = '#DCE4CD';
      if (showIcon) {
        iconNode = <Feather name="user-x" size={iconSize} color={text} style={styles.chipIcon} />;
      }
      break;
    case 'INACTIVE':
      label = 'Inactive';
      bg = Palette.neutralTint;
      text = Palette.neutralStatus;
      border = Palette.border;
      break;
    case 'APPROVED':
    case 'PRESENT':
      label = status === 'APPROVED' ? 'Approved' : 'Present';
      bg = Palette.successTint; // #ECF2DE
      text = Palette.success;     // #40501E
      border = '#D2DEC0';
      if (showIcon) {
        iconNode = <MaterialCommunityIcons name="check-circle" size={iconSize + 1} color={text} style={styles.chipIcon} />;
      }
      break;
    case 'PENDING':
      label = 'Pending';
      bg = Palette.pendingTint; // #FBF4D7
      text = Palette.pending;     // #8C6314
      border = '#F2E5B8';
      if (showIcon) {
        iconNode = <Feather name="clock" size={iconSize} color={text} style={styles.chipIcon} />;
      }
      break;
    case 'REJECTED':
      label = 'Rejected';
      bg = Palette.dangerTint;
      text = Palette.danger;
      border = '#F5C6C0';
      if (showIcon) {
        iconNode = <Feather name="x-circle" size={iconSize} color={text} style={styles.chipIcon} />;
      }
      break;
    case 'OPEN':
      label = 'Open';
      bg = Palette.successTint;
      text = Palette.success;
      border = '#D2DEC0';
      if (showIcon) {
        iconNode = <Feather name="check" size={iconSize} color={text} style={styles.chipIcon} />;
      }
      break;
    case 'CLOSED':
      label = 'Closed';
      bg = Palette.neutralTint;
      text = Palette.neutralStatus;
      border = Palette.border;
      break;
    case 'ACTIVE':
      label = 'Active';
      bg = Palette.successTint;
      text = Palette.success;
      border = '#D2DEC0';
      if (showIcon) {
        iconNode = <MaterialCommunityIcons name="check-circle" size={iconSize + 1} color={text} style={styles.chipIcon} />;
      }
      break;
    case 'INVITED':
      label = 'Invite pending';
      bg = Palette.pendingTint;
      text = Palette.pending;
      border = '#F2E5B8';
      if (showIcon) {
        iconNode = <Feather name="clock" size={iconSize} color={text} style={styles.chipIcon} />;
      }
      break;
    case 'CLAIMED':
      label = 'Claimed';
      bg = Palette.successTint;
      text = Palette.success;
      border = '#D2DEC0';
      break;
    case 'EXPIRED':
      label = 'Expired';
      bg = Palette.dangerTint;
      text = Palette.danger;
      border = '#F5C6C0';
      break;
    case 'REVOKED':
      label = 'Revoked';
      bg = Palette.neutralTint;
      text = Palette.neutralStatus;
      border = Palette.border;
      break;
    case 'VERIFIED':
      label = 'Verified';
      bg = Palette.successTint;
      text = Palette.success;
      border = '#D2DEC0';
      break;
    case 'NOT_VERIFIED':
      label = 'Not verified';
      bg = Palette.infoTint;
      text = Palette.info;
      border = '#C6DBF5';
      break;
    case 'UNAVAILABLE':
      label = 'Unavailable';
      bg = Palette.neutralTint;
      text = Palette.neutralStatus;
      border = Palette.border;
      break;
    case 'HALF_DAY':
      label = 'Half day';
      bg = '#F2EAFD';
      text = '#7839EE';
      border = '#DDD6FE';
      break;
    case 'LEAVE':
      label = 'On leave';
      bg = '#E5F3FF';
      text = '#026AA2';
      border = '#B9E6FE';
      break;
    case 'NOT_MARKED':
    default:
      label = 'Not marked';
      bg = Palette.neutralTint;
      text = Palette.neutralStatus;
      border = Palette.border;
      break;
  }

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg, borderColor: border },
        isSmall && styles.chipSmall,
      ]}
    >
      {iconNode}
      <Text style={[styles.text, { color: text }, isSmall && styles.textSmall]}>
        {customLabel || label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999, // Pill radius per spec
    borderWidth: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipIcon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  textSmall: {
    fontSize: 11,
  },
});
