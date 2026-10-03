import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { StatusChip, AttendanceChipStatus } from './StatusChip';

interface VerificationRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  statusChip?: {
    status: AttendanceChipStatus | string;
    customLabel?: string;
  };
  value?: string;
}

export function VerificationRow({
  icon,
  title,
  subtitle,
  statusChip,
  value,
}: VerificationRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Feather name={icon} size={16} color={Palette.brandPrimary} />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.right}>
        {statusChip ? (
          <StatusChip
            status={statusChip.status}
            customLabel={statusChip.customLabel}
            size="sm"
          />
        ) : value ? (
          <Text style={styles.value}>{value}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
});
