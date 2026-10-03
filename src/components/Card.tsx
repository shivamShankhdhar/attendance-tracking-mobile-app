import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'hero' | 'muted' | 'tint';
  onPress?: () => void;
}

export function Card({
  children,
  style,
  variant = 'default',
  onPress,
}: CardProps) {
  const cardStyles = [
    styles.card,
    variant === 'hero' && styles.heroCard,
    variant === 'muted' && styles.mutedCard,
    variant === 'tint' && styles.tintCard,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyles, pressed && styles.cardPressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radius.lg,
    padding: DesignTokens.layout.cardPadding,
    // Very subtle elevation
    shadowColor: '#17202A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  heroCard: {
    padding: DesignTokens.layout.heroCardPadding,
    borderColor: '#DFD8D3',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  mutedCard: {
    backgroundColor: Palette.surfaceMuted,
    borderColor: Palette.border,
  },
  tintCard: {
    backgroundColor: Palette.brandTint,
    borderColor: '#F5CBD0',
  },
  cardPressed: {
    opacity: 0.92,
  },
});
