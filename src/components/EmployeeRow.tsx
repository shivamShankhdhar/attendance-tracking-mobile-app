import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { Avatar } from './Avatar';
import { StatusChip, AttendanceChipStatus } from './StatusChip';

interface EmployeeRowProps {
  name: string;
  code?: string;
  avatarUrl?: string;
  status: AttendanceChipStatus | string;
  timeNote?: string;
  onPress?: () => void;
  onActionPress?: () => void;
}

export function EmployeeRow({
  name,
  code,
  avatarUrl,
  status,
  timeNote,
  onPress,
  onActionPress,
}: EmployeeRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.left}>
        <Avatar name={name} avatarUrl={avatarUrl} size="md" />
        <View style={styles.textColumn}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.metaRow}>
            {code && <Text style={styles.code}>{code}</Text>}
            {timeNote && (
              <Text style={styles.timeNote}>
                {code ? ' • ' : ''}
                {timeNote}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <StatusChip status={status} size="sm" />
        {onActionPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Row options"
            onPress={onActionPress}
            style={styles.actionBtn}
          >
            <Feather name="more-vertical" size={18} color={Palette.textSecondary} />
          </Pressable>
        ) : onPress ? (
          <Feather name="chevron-right" size={18} color={Palette.border} style={styles.chevron} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowPressed: {
    backgroundColor: Palette.surfaceMuted,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  textColumn: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  code: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  timeNote: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    marginLeft: 2,
  },
  chevron: {
    marginLeft: 4,
  },
});
