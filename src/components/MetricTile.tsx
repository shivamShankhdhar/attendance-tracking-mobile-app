import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';

interface MetricTileProps {
  label: string;
  value: number | string;
  color?: string;
  bgColor?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}

export function MetricTile({
  label,
  value,
  color = Palette.textPrimary,
  bgColor = Palette.surface,
  onPress,
  icon,
}: MetricTileProps) {
  const content = (
    <View style={[styles.tile, { backgroundColor: bgColor }]}>
      <View style={styles.topRow}>
        <Text style={[styles.valueText, { color }]}>{value}</Text>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>
      <Text style={styles.labelText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.flexOne}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.flexOne}>{content}</View>;
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  tile: {
    padding: 12,
    borderRadius: DesignTokens.radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    minHeight: 74,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  iconContainer: {
    opacity: 0.8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.textSecondary,
    marginTop: 4,
  },
});
