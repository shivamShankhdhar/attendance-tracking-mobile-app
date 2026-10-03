import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, StyleProp, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { useTheme } from '../hooks/use-theme';

interface MpinKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  showBiometric?: boolean;
  biometricLabel?: string;
  hasFaceId?: boolean;
  hasFingerprint?: boolean;
  onBiometricPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  showTopBorder?: boolean;
}

export const MpinKeypad: React.FC<MpinKeypadProps> = ({
  onDigit,
  onBackspace,
  showBiometric = false,
  biometricLabel = 'Face ID',
  hasFaceId = false,
  hasFingerprint = false,
  onBiometricPress,
  disabled = false,
  style,
  showTopBorder = true,
}) => {
  const { palette } = useTheme();

  const handlePress = (digit: string) => {
    if (disabled) return;
    try {
      Vibration.vibrate(25);
    } catch {}
    onDigit(digit);
  };

  const handleBackspacePress = () => {
    if (disabled) return;
    try {
      Vibration.vibrate(25);
    } catch {}
    onBackspace();
  };

  const handleBiometric = () => {
    if (disabled) return;
    try {
      Vibration.vibrate(25);
    } catch {}
    onBiometricPress?.();
  };

  const renderKey = (digit: string) => {
    return (
      <TouchableOpacity
        key={digit}
        style={[
          styles.keyButton,
          { backgroundColor: palette.surface, borderColor: palette.border },
          disabled && styles.keyButtonDisabled,
        ]}
        onPress={() => handlePress(digit)}
        activeOpacity={0.65}
        disabled={disabled}
      >
        <Text style={[styles.digitText, { color: palette.textPrimary }]}>{digit}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {showTopBorder && <View style={[styles.topDivider, { backgroundColor: palette.border }]} />}
      <View style={styles.row}>
        {renderKey('1')}
        {renderKey('2')}
        {renderKey('3')}
      </View>
      <View style={styles.row}>
        {renderKey('4')}
        {renderKey('5')}
        {renderKey('6')}
      </View>
      <View style={styles.row}>
        {renderKey('7')}
        {renderKey('8')}
        {renderKey('9')}
      </View>
      <View style={styles.row}>
        {showBiometric ? (
          <TouchableOpacity
            style={[
              styles.keyButton,
              styles.biometricButton,
              { backgroundColor: palette.brandTint, borderColor: palette.border },
            ]}
            onPress={handleBiometric}
            activeOpacity={0.65}
            disabled={disabled}
          >
            {hasFaceId && hasFingerprint ? (
              <View style={styles.dualBiometricRow}>
                <MaterialCommunityIcons name="face-recognition" size={17} color={palette.brandPrimary} />
                <Ionicons name="finger-print" size={17} color={palette.brandPrimary} />
              </View>
            ) : hasFaceId ? (
              <MaterialCommunityIcons name="face-recognition" size={22} color={palette.brandPrimary} />
            ) : (
              <Ionicons
                name={
                  biometricLabel.includes('Finger') || biometricLabel.includes('Touch') || hasFingerprint
                    ? 'finger-print'
                    : 'scan-outline'
                }
                size={22}
                color={palette.brandPrimary}
              />
            )}
            <Text style={[styles.biometricKeyLabel, { color: palette.brandPrimary }]} numberOfLines={1}>
              {hasFaceId && hasFingerprint
                ? 'Face / Touch'
                : biometricLabel && biometricLabel !== 'None'
                ? biometricLabel
                : 'Biometric'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.keyButton, styles.emptyButton]} />
        )}

        {renderKey('0')}

        <TouchableOpacity
          style={[
            styles.keyButton,
            styles.backspaceButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={handleBackspacePress}
          activeOpacity={0.65}
          disabled={disabled}
        >
          <Ionicons name="backspace-outline" size={22} color={palette.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 290,
    alignSelf: 'center',
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  topDivider: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#D8E2C4',
    marginBottom: 14,
    borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  keyButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  keyButtonDisabled: {
    opacity: 0.5,
  },
  biometricButton: {
    backgroundColor: Palette.brandTint,
    borderColor: '#D8E2C4',
  },
  backspaceButton: {
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
  },
  emptyButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  digitText: {
    fontSize: 23,
    fontWeight: '600',
    color: Palette.textPrimary,
    includeFontPadding: false,
    textAlign: 'center',
  },
  biometricKeyLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: Palette.brandPrimary,
    marginTop: 1.5,
  },
  dualBiometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
