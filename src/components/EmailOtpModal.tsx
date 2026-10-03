import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { AdBanner } from './AdBanner';

interface EmailOtpModalProps {
  visible: boolean;
  purpose: 'RESET_MPIN' | 'CHANGE_MPIN';
  maskedEmail: string;
  onVerifySuccess: (resetToken: string) => void;
  onRequestOtp: () => Promise<{ maskedEmail: string }>;
  onVerifyOtp: (otp: string) => Promise<{ resetToken: string }>;
  onClose: () => void;
}

export const EmailOtpModal: React.FC<EmailOtpModalProps> = ({
  visible,
  purpose,
  maskedEmail,
  onVerifySuccess,
  onRequestOtp,
  onVerifyOtp,
  onClose,
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setOtp('');
      setErrorMessage(null);
      setCooldown(30);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [visible]);

  // Resend cooldown timer
  useEffect(() => {
    if (!visible || cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, cooldown]);

  const handleOtpChange = async (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
    setErrorMessage(null);

    // Auto-verify when 6 digits are entered
    if (cleaned.length === 6) {
      setIsVerifying(true);
      try {
        const res = await onVerifyOtp(cleaned);
        onVerifySuccess(res.resetToken);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Incorrect verification code. Please check your email.');
        setOtp('');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    setOtp('');
    try {
      await onRequestOtp();
      setCooldown(30);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            {/* Top Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={20} color={Palette.textSecondary} />
            </TouchableOpacity>

            {/* Header Badge */}
            <View style={styles.badgeContainer}>
              <View style={styles.badgeCircle}>
                <MaterialCommunityIcons name="email-lock-outline" size={32} color={Palette.brandPrimary} />
              </View>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>SECURITY VERIFICATION</Text>
              </View>
            </View>

            {/* Title & Description */}
            <Text style={styles.title}>
              {purpose === 'RESET_MPIN' ? 'Reset MPIN Verification' : 'Authorize MPIN Change'}
            </Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit verification code to
            </Text>
            <Text style={styles.emailHighlight}>{maskedEmail || 'your registered email'}</Text>

            {/* Error Message: Clean red text, NO background */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : (
              <View style={styles.placeholderSpace} />
            )}

            {/* Hidden Input for Native Keyboard & OTP Autofill */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              style={styles.hiddenInput}
              autoFocus
            />

            {/* 6-Digit OTP Boxes */}
            <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
              {Array.from({ length: 6 }).map((_, index) => {
                const char = otp[index] || '';
                const isFocused = index === otp.length && otp.length < 6;
                const isFilled = Boolean(char);

                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      isFocused && styles.otpBoxFocused,
                      isFilled && styles.otpBoxFilled,
                      Boolean(errorMessage) && isFilled && styles.otpBoxError,
                    ]}
                  >
                    {isFilled ? (
                      <Text style={styles.otpChar}>{char}</Text>
                    ) : isFocused ? (
                      <View style={styles.activeCursorPip} />
                    ) : (
                      <View style={styles.emptyDot} />
                    )}
                  </View>
                );
              })}
            </Pressable>

            {/* Verification Loading Indicator */}
            {isVerifying ? (
              <View style={styles.verifyingContainer}>
                <ActivityIndicator size="small" color={Palette.brandPrimary} />
                <Text style={styles.verifyingText}>Verifying code...</Text>
              </View>
            ) : (
              <View style={{ height: 26 }} />
            )}

            {/* Resend Code Section */}
            <View style={styles.resendSection}>
              {cooldown > 0 ? (
                <Text style={styles.cooldownText}>
                  Resend code in <Text style={styles.boldTimer}>{cooldown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending}
                  activeOpacity={0.7}
                  style={styles.resendButton}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color={Palette.brandPrimary} />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={13} color={Palette.brandPrimary} style={{ marginRight: 6 }} />
                      <Text style={styles.resendButtonText}>Resend verification code</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <AdBanner position="bottom" safeBottom />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 34, 16, 0.6)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    width: '100%',
  },
  sheetCard: {
    backgroundColor: Palette.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    borderTopWidth: 1,
    borderColor: '#E2E6D2',
  },
  dragHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#CAD5B8',
    marginBottom: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBEFE0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF1DE',
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pillBadge: {
    backgroundColor: Palette.brandTint,
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2C4',
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.brandPrimary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  emailHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.brandPrimary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  errorBox: {
    paddingVertical: 2,
    paddingHorizontal: 16,
    minHeight: 22,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.danger,
    textAlign: 'center',
    lineHeight: 17,
  },
  placeholderSpace: {
    height: 22,
    marginBottom: 6,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: 1,
    height: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  otpBoxFocused: {
    borderColor: Palette.brandPrimary,
    borderWidth: 2,
    backgroundColor: '#F9FBF2',
    transform: [{ scale: 1.05 }],
    shadowColor: Palette.brandPrimary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  otpBoxFilled: {
    borderColor: Palette.brandPrimary,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  otpBoxError: {
    borderColor: Palette.danger,
    borderWidth: 2,
    backgroundColor: Palette.dangerTint,
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  activeCursorPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.brandPrimary,
  },
  emptyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#CAD5B8',
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 26,
  },
  verifyingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.brandPrimary,
  },
  resendSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 14,
    minHeight: 28,
  },
  cooldownText: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  boldTimer: {
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
});
