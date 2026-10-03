import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
} from 'react-native';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';

interface ButtonProps {
  onPress: () => void;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
  accessibilityLabel?: string;
}

export function PrimaryButton({
  onPress,
  label,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = 'md',
  accessibilityLabel,
}: ButtonProps) {
  const isSmall = size === 'sm';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBase,
        isSmall ? styles.sizeSm : styles.sizeMd,
        pressed && styles.primaryPressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Palette.textInverse} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text
            style={[
              styles.primaryText,
              isSmall && styles.textSm,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  onPress,
  label,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = 'md',
  variant = 'outline',
  accessibilityLabel,
}: ButtonProps & { variant?: 'outline' | 'tint' }) {
  const isSmall = size === 'sm';
  const isTint = variant === 'tint';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.secondaryBase,
        isTint && styles.secondaryTint,
        isSmall ? styles.sizeSm : styles.sizeMd,
        pressed && (isTint ? styles.tintPressed : styles.secondaryPressed),
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isTint ? Palette.brandPrimary : Palette.textPrimary} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text
            style={[
              styles.secondaryText,
              isTint && styles.tintText,
              isSmall && styles.textSm,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function DangerButton({
  onPress,
  label,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  size = 'md',
  accessibilityLabel,
}: ButtonProps) {
  const isSmall = size === 'sm';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.dangerBase,
        isSmall ? styles.sizeSm : styles.sizeMd,
        pressed && styles.dangerPressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Palette.danger} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text
            style={[
              styles.dangerText,
              isSmall && styles.textSm,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrapper: {
    marginRight: 4,
  },
  primaryBase: {
    backgroundColor: Palette.brandPrimary,
    borderRadius: DesignTokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DesignTokens.layout.minTouchTarget,
  },
  primaryPressed: {
    backgroundColor: Palette.brandPressed,
  },
  primaryText: {
    color: Palette.textInverse,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  secondaryBase: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DesignTokens.layout.minTouchTarget,
  },
  secondaryPressed: {
    backgroundColor: Palette.surfaceMuted,
  },
  secondaryText: {
    color: Palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryTint: {
    backgroundColor: Palette.brandTint,
    borderColor: 'transparent',
  },
  tintPressed: {
    backgroundColor: '#F7D8D5',
  },
  tintText: {
    color: Palette.brandPressed,
  },
  dangerBase: {
    backgroundColor: Palette.dangerTint,
    borderColor: '#F8BFC4',
    borderWidth: 1,
    borderRadius: DesignTokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DesignTokens.layout.minTouchTarget,
  },
  dangerPressed: {
    backgroundColor: '#F9D1D5',
  },
  dangerText: {
    color: Palette.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  sizeMd: {
    height: DesignTokens.layout.buttonHeight,
    paddingHorizontal: 20,
  },
  sizeSm: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  textSm: {
    fontSize: 13,
  },
  disabled: {
    opacity: 0.5,
  },
});
