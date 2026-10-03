import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Palette } from '../constants/colors';
import { PrimaryButton, SecondaryButton } from './Buttons';

interface EmptyStateProps {
  illustration?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {illustration && <View style={styles.illustrationWrapper}>{illustration}</View>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {(actionLabel || secondaryLabel) && (
        <View style={styles.actionsRow}>
          {actionLabel && onAction && (
            <PrimaryButton
              label={actionLabel}
              onPress={onAction}
              size="sm"
              style={styles.actionBtn}
            />
          )}
          {secondaryLabel && onSecondaryAction && (
            <SecondaryButton
              label={secondaryLabel}
              onPress={onSecondaryAction}
              size="sm"
              style={styles.actionBtn}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  illustrationWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  actionBtn: {
    minWidth: 120,
  },
});
