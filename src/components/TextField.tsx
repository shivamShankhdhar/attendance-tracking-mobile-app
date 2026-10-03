import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function TextField({
  label,
  helperText,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={Palette.textSecondary}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Palette.textPrimary,
    minHeight: DesignTokens.layout.buttonHeight,
  },
  inputFocused: {
    borderColor: Palette.brandPrimary,
    backgroundColor: Palette.surface,
  },
  inputError: {
    borderColor: Palette.danger,
    backgroundColor: Palette.dangerTint,
  },
  helperText: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    color: Palette.danger,
    marginTop: 5,
    fontWeight: '500',
  },
});
