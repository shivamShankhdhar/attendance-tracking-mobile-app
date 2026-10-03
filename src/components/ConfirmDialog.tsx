import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';
import { AdBanner } from './AdBanner';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  // Optional input field for reason or PIN
  inputPlaceholder?: string;
  inputValue?: string;
  onChangeInput?: (text: string) => void;
  inputSecure?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel,
  inputPlaceholder,
  inputValue,
  onChangeInput,
  inputSecure = false,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = React.useState(visible);
  const slideAnim = React.useRef(new Animated.Value(500)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 28,
          mass: 0.8,
          stiffness: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  const handleDismiss = () => {
    if (loading) return;
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onCancel();
      }
    });
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        {/* Fast static overlay that does not slide */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdropOverlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrapper,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <View style={styles.sheetCard}>
              {/* Top Drag Handle Slider Bar */}
              <View style={styles.dragHandle} />

              {/* Icon Header */}
              <View
                style={[
                  styles.iconCircle,
                  isDestructive ? styles.iconCircleDanger : styles.iconCirclePrimary,
                ]}
              >
              <Feather
                name={isDestructive ? 'alert-triangle' : 'check-circle'}
                size={24}
                color={isDestructive ? '#C23B38' : Palette.brandPrimary}
              />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {inputPlaceholder !== undefined && (
              <TextInput
                value={inputValue}
                onChangeText={onChangeInput}
                placeholder={inputPlaceholder}
                placeholderTextColor={Palette.textSecondary}
                secureTextEntry={inputSecure}
                style={styles.input}
                autoFocus
              />
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                onPress={onCancel}
                disabled={loading}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && styles.cancelBtnPressed,
                  loading && styles.btnDisabled,
                ]}
              >
                <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                onPress={onConfirm}
                disabled={loading}
                style={({ pressed }) => [
                  isDestructive ? styles.destructiveBtn : styles.primaryConfirmBtn,
                  pressed && (isDestructive ? styles.destructiveBtnPressed : styles.primaryConfirmBtnPressed),
                  loading && styles.btnDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    {isDestructive && (
                      <Feather name="x-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.confirmBtnText,
                        isDestructive ? styles.destructiveBtnText : styles.primaryConfirmBtnText,
                      ]}
                      numberOfLines={1}
                    >
                      {confirmLabel}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <AdBanner position="bottom" safeBottom />
          </View>
        </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  dismissArea: {
    flex: 1,
    width: '100%',
  },
  sheetWrapper: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
  },
  sheetCard: {
    width: '100%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 24,
    alignItems: 'center',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconCircleDanger: {
    backgroundColor: '#FDF2F2',
    borderWidth: 1.5,
    borderColor: '#F8BFC4',
  },
  iconCirclePrimary: {
    backgroundColor: Palette.brandTint,
    borderWidth: 1.5,
    borderColor: '#DCE4CD',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: Palette.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: DesignTokens.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Palette.textPrimary,
    marginBottom: 18,
    backgroundColor: Palette.canvas,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cancelBtnPressed: {
    backgroundColor: Palette.surfaceMuted,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  destructiveBtn: {
    flex: 1.4,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#C23B38',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#C23B38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  destructiveBtnPressed: {
    backgroundColor: '#A82D2A',
  },
  primaryConfirmBtn: {
    flex: 1.4,
    height: 50,
    borderRadius: 14,
    backgroundColor: Palette.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryConfirmBtnPressed: {
    backgroundColor: Palette.brandPressed,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  destructiveBtnText: {
    color: '#FFFFFF',
  },
  primaryConfirmBtnText: {
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
