import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette } from '../constants/colors';
import { DesignTokens } from '../constants/theme';
import { useAlertStore, AlertType } from '../stores/alertStore';
import { AdBanner } from './AdBanner';

export function CustomAlertModal() {
  const insets = useSafeAreaInsets();
  const {
    isOpen,
    title,
    message,
    type,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    hideAlert,
  } = useAlertStore();

  if (!isOpen) return null;

  const handleConfirm = () => {
    hideAlert();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    hideAlert();
    if (onCancel) onCancel();
  };

  const getTheme = (alertType: AlertType) => {
    switch (alertType) {
      case 'error':
        return {
          icon: '✕',
          badgeBg: Palette.dangerTint,
          badgeBorder: '#F8BFC4',
          badgeColor: Palette.danger,
          defaultTitle: 'Notice',
          primaryBtnBg: Palette.danger,
        };
      case 'success':
        return {
          icon: '✓',
          badgeBg: Palette.successTint,
          badgeBorder: '#B9E5C8',
          badgeColor: Palette.success,
          defaultTitle: 'Success',
          primaryBtnBg: Palette.success,
        };
      case 'warning':
        return {
          icon: '!',
          badgeBg: Palette.pendingTint,
          badgeBorder: '#FCE0A6',
          badgeColor: Palette.pending,
          defaultTitle: 'Please Confirm',
          primaryBtnBg: Palette.pending,
        };
      case 'info':
      default:
        return {
          icon: 'ℹ',
          badgeBg: Palette.brandTint,
          badgeBorder: '#F5CBD0',
          badgeColor: Palette.brandPrimary,
          defaultTitle: 'Notice',
          primaryBtnBg: Palette.brandPrimary,
        };
    }
  };

  const theme = getTheme(type);
  const displayTitle = title || theme.defaultTitle;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
              {/* Top Drag Indicator */}
              <View style={styles.dragHandle} />

              {/* Status Badge */}
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: theme.badgeBg,
                    borderColor: theme.badgeBorder,
                  },
                ]}
              >
                <Text style={[styles.iconText, { color: theme.badgeColor }]}>
                  {theme.icon}
                </Text>
              </View>

              {/* Title & Message */}
              <Text style={styles.title}>{displayTitle}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Action Buttons */}
              <View style={[styles.btnRow, cancelText && styles.btnRowTwo]}>
                {cancelText && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleCancel}
                    style={({ pressed }) => [
                      styles.cancelBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                  </Pressable>
                )}

                <Pressable
                  accessibilityRole="button"
                  onPress={handleConfirm}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    { backgroundColor: theme.primaryBtnBg },
                    cancelText && styles.confirmBtnHalf,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.confirmBtnText}>{confirmText}</Text>
                </Pressable>
              </View>

              <AdBanner position="bottom" safeBottom />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 32, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#17202A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  btnRow: {
    width: '100%',
  },
  btnRowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: DesignTokens.radius.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  confirmBtn: {
    width: '100%',
    borderRadius: DesignTokens.radius.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnHalf: {
    flex: 1,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
  },
});
