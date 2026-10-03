import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { HeaderBackgroundArt } from '../components/illustrations/HeaderBackgroundArt';
import { useLockStore } from '../stores/lockStore';
import { useAuthStore } from '../stores/authStore';
import { biometricService } from '../services/biometricService';
import { MpinKeypad } from '../components/MpinKeypad';
import { MpinDots } from '../components/MpinDots';
import { BizoraMark } from '../components/illustrations/BrandAssets';
import { AdBanner } from '../components/AdBanner';
import { APP_NAME } from '../constants/app';
import { SuccessBottomSheet } from '../components/SuccessBottomSheet';
import { EmailOtpModal } from '../components/EmailOtpModal';
import { useTheme } from '../hooks/use-theme';

interface AppLockScreenProps {
  onUnlockSuccess?: () => void;
  initialShowConfirm?: boolean;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  onUnlockSuccess,
  initialShowConfirm = false,
}) => {
  const { palette } = useTheme();
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const lockedUntil = useLockStore((s) => s.lockedUntil);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);
function formatCooldownRemaining(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

  const secondsRemaining = lockedUntil ? Math.max(0, Math.ceil((Date.parse(lockedUntil) - now) / 1000)) : 0;
  const cooldownMessage = secondsRemaining > 0
    ? `Too many incorrect MPIN attempts. Try again in ${formatCooldownRemaining(secondsRemaining)}.`
    : lockedUntil
    ? 'You can try your MPIN again.'
    : null;

  // In-screen reset flow states
  const [lockMode, setLockMode] = useState<'UNLOCK' | 'RESET_NEW' | 'RESET_CONFIRM'>('UNLOCK');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(initialShowConfirm);
  const [showResetSuccessModal, setShowResetSuccessModal] = useState(false);
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const user = useAuthStore((s) => s.user);
  const {
    biometricEnabled,
    faceIdEnabled,
    fingerprintEnabled,
    isBiometricSupported,
    hasFaceId,
    hasFingerprint,
    biometricLabel,
    verifyMpin,
    resetMpin,
    requestMpinOtp,
    verifyMpinOtp,
    unlockApp,
    tryBiometricUnlock,
    setIsResettingMpinAfterRelogin,
  } = useLockStore();

  const isLoading = useLockStore((s) => s.isLoading);

  // Try biometric unlock once on mount if enabled
  useEffect(() => {
    if (lockMode === 'UNLOCK' && biometricEnabled && isBiometricSupported) {
      const timer = setTimeout(async () => {
        const ok = await tryBiometricUnlock();
        if (ok) {
          onUnlockSuccess?.();
        }
      }, 80);
      return () => clearTimeout(timer);
    }
    if (__DEV__ && lockMode === 'UNLOCK') {
      // In dev, wait until initLockState finishes before auto-verifying
      // so we don't hit the isLoading guard and show a spurious error.
      const devTimer = setTimeout(async () => {
        // Re-read loading state at fire time — it may have settled by now
        if (useLockStore.getState().isLoading) return;
        const ok = await verifyMpin('1234');
        if (ok) {
          onUnlockSuccess?.();
        }
      }, 600);
      return () => clearTimeout(devTimer);
    }
  }, [lockMode, biometricEnabled, isBiometricSupported, tryBiometricUnlock, verifyMpin, onUnlockSuccess]);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (isVerifying || secondsRemaining > 0) return;
      setErrorMessage(null);

      // 1. UNLOCK MODE
      if (lockMode === 'UNLOCK') {
        if (pin.length >= 4) return;
        const nextPin = pin + digit;
        setPin(nextPin);

        if (nextPin.length === 4) {
          setIsVerifying(true);
          try {
            const success = await verifyMpin(nextPin);
            if (success) {
              onUnlockSuccess?.();
              setIsVerifying(false);
            } else {
              setErrorMessage('Incorrect MPIN. Please try again.');
              setTimeout(() => {
                setPin('');
                setIsVerifying(false);
              }, 260);
            }
          } catch (err: any) {
            setErrorMessage(err?.message || 'Unable to verify MPIN. Please try again.');
            setTimeout(() => {
              setPin('');
              setIsVerifying(false);
            }, 260);
          }
        }
        return;
      }

      // 2. RESET NEW MPIN MODE
      if (lockMode === 'RESET_NEW') {
        if (resetNewPin.length >= 4) return;
        const next = resetNewPin + digit;
        setResetNewPin(next);
        if (next.length === 4) {
          setTimeout(() => {
            setLockMode('RESET_CONFIRM');
          }, 200);
        }
        return;
      }

      // 3. RESET CONFIRM MPIN MODE
      if (lockMode === 'RESET_CONFIRM') {
        if (resetConfirmPin.length >= 4) return;
        const next = resetConfirmPin + digit;
        setResetConfirmPin(next);

        if (next.length === 4) {
          if (next !== resetNewPin) {
            setErrorMessage('MPIN does not match. Please try again.');
            setResetConfirmPin('');
            setTimeout(() => {
              setLockMode('RESET_NEW');
              setResetNewPin('');
              setErrorMessage(null);
            }, 1200);
            return;
          }

          setIsVerifying(true);
          try {
            await resetMpin(next, biometricEnabled, resetToken || undefined);
            setResetToken(null);
            unlockApp();
            setShowResetSuccessModal(true);
          } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to reset MPIN');
            setLockMode('RESET_NEW');
            setResetNewPin('');
            setResetConfirmPin('');
          } finally {
            setIsVerifying(false);
          }
        }
      }
    },
    [
      isVerifying,
      lockMode,
      pin,
      resetNewPin,
      resetConfirmPin,
      resetToken,
      verifyMpin,
      resetMpin,
      unlockApp,
      secondsRemaining,
      biometricEnabled,
      onUnlockSuccess,
    ]
  );

  const handleBackspace = useCallback(() => {
    if (isVerifying) return;
    setErrorMessage(null);

    if (lockMode === 'UNLOCK') {
      setPin((prev) => prev.slice(0, -1));
    } else if (lockMode === 'RESET_NEW') {
      setResetNewPin((prev) => prev.slice(0, -1));
    } else if (lockMode === 'RESET_CONFIRM') {
      if (resetConfirmPin.length === 0) {
        setLockMode('RESET_NEW');
      } else {
        setResetConfirmPin((prev) => prev.slice(0, -1));
      }
    }
  }, [isVerifying, lockMode, resetConfirmPin.length]);

  const handleBiometricPress = useCallback(async () => {
    if (lockMode !== 'UNLOCK') return;
    setErrorMessage(null);
    const ok = await tryBiometricUnlock();
    if (ok) {
      onUnlockSuccess?.();
    }
  }, [lockMode, tryBiometricUnlock, onUnlockSuccess]);

  const handleForgotMpin = async () => {
    if (isSendingOtp) return;
    setErrorMessage(null);
    setIsSendingOtp(true);
    try {
      const res = await requestMpinOtp('RESET_MPIN');
      if (res?.maskedEmail) {
        setMaskedEmail(res.maskedEmail);
      }
      setShowEmailOtpModal(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send verification code. Please check your network.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleEmailOtpSuccess = (token: string) => {
    setResetToken(token);
    setShowEmailOtpModal(false);
    setLockMode('RESET_NEW');
    setResetNewPin('');
    setResetConfirmPin('');
    setErrorMessage(null);
  };

  const handleProceedToReset = async () => {
    setShowResetConfirmModal(false);
    await handleForgotMpin();
  };

  const handleCancelReset = () => {
    setLockMode('UNLOCK');
    setResetNewPin('');
    setResetConfirmPin('');
    setResetToken(null);
    setPin('');
    setErrorMessage(null);
  };

  const handleResetSuccessClose = () => {
    setShowResetSuccessModal(false);
    setResetToken(null);
    setLockMode('UNLOCK');
    onUnlockSuccess?.();
  };

  const activeDotsCount =
    lockMode === 'UNLOCK'
      ? pin.length
      : lockMode === 'RESET_NEW'
      ? resetNewPin.length
      : resetConfirmPin.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.canvas }]} edges={['top', 'left', 'right']}>
      <HeaderBackgroundArt />

      <View style={styles.contentWrap}>
        <View style={styles.header}>
          {lockMode === 'UNLOCK' ? (
            <View style={styles.logoBadge}>
              <BizoraMark size={46} />
            </View>
          ) : (
            <View style={[styles.resetHeaderBadge, { backgroundColor: palette.brandTint, borderColor: palette.border }]}>
              <MaterialCommunityIcons
                name={lockMode === 'RESET_NEW' ? 'lock-reset' : 'shield-check-outline'}
                size={26}
                color={palette.brandPrimary}
              />
            </View>
          )}

          <Text style={[styles.title, { color: palette.textPrimary }]}>
            {lockMode === 'UNLOCK'
              ? APP_NAME
              : lockMode === 'RESET_NEW'
              ? 'Set New MPIN'
              : 'Confirm New MPIN'}
          </Text>

          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            {lockMode === 'UNLOCK'
              ? user?.name
                ? `Welcome back, ${user.name}`
                : 'App is Locked'
              : lockMode === 'RESET_NEW'
              ? 'Create a new 4-digit passcode'
              : 'Re-enter your new MPIN'}
          </Text>

          <Text style={[styles.instruction, { color: palette.textSecondary }]}>
            {lockMode === 'UNLOCK'
              ? biometricEnabled && isBiometricSupported
                ? faceIdEnabled && !fingerprintEnabled
                  ? 'Enter 4-digit MPIN or use Face ID'
                  : fingerprintEnabled && !faceIdEnabled
                  ? 'Enter 4-digit MPIN or use Fingerprint'
                  : `Enter 4-digit MPIN or use ${biometricLabel}`
                : 'Enter your 4-digit MPIN to unlock'
              : lockMode === 'RESET_NEW'
              ? `Enter a 4-digit MPIN to unlock ${APP_NAME}`
              : 'Enter the same 4-digit MPIN to confirm'}
          </Text>
        </View>

        <View style={styles.dotsSection}>
          {isVerifying ? (
            <ActivityIndicator size="small" color={palette.brandPrimary} style={styles.indicator} />
          ) : (cooldownMessage || errorMessage) ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{cooldownMessage || errorMessage}</Text>
            </View>
          ) : (
            <View style={styles.placeholderSpace} />
          )}

          <MpinDots total={4} filledCount={activeDotsCount} isError={Boolean(errorMessage)} />
        </View>

        <MpinKeypad
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          showBiometric={lockMode === 'UNLOCK' && biometricEnabled && isBiometricSupported}
          biometricLabel={biometricLabel}
          hasFaceId={hasFaceId}
          hasFingerprint={hasFingerprint}
          onBiometricPress={handleBiometricPress}
          disabled={isVerifying || isLoading || secondsRemaining > 0}
        />

        <View style={styles.footer}>
          {lockMode === 'UNLOCK' ? (
            <TouchableOpacity
              disabled={isSendingOtp}
              onPress={handleForgotMpin}
              style={styles.forgotButton}
              activeOpacity={0.7}
            >
              {isSendingOtp ? (
                <ActivityIndicator size="small" color={palette.brandPrimary} />
              ) : (
                <Text style={[styles.forgotText, { color: palette.brandPrimary }]}>Forgot MPIN?</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleCancelReset}
              style={styles.cancelResetButton}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={15} color={palette.textSecondary} />
              <Text style={[styles.cancelResetText, { color: palette.textSecondary }]}>Cancel & Return to Lock</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Confirmation Modal: Confirm First Before Resetting MPIN */}
      {showResetConfirmModal && (
        <View style={styles.modalBackdrop}>
          <Pressable
            style={[styles.confirmCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.confirmIconCircle, { backgroundColor: palette.brandTint, borderColor: palette.border }]}>
              <MaterialCommunityIcons name="lock-reset" size={28} color={palette.brandPrimary} />
            </View>

            <Text style={[styles.confirmTitle, { color: palette.textPrimary }]}>Reset 4-Digit MPIN?</Text>
            <Text style={[styles.confirmMessage, { color: palette.textSecondary }]}>
              Are you sure you want to reset your MPIN? A 6-digit verification code will be sent to your email to authorize the reset.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}
                onPress={() => setShowResetConfirmModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmCancelText, { color: palette.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmProceedBtn, { backgroundColor: palette.brandPrimary }]}
                onPress={handleProceedToReset}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmProceedText, { color: palette.textInverse }]}>
                  Send Code
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      )}

      {/* Email OTP Verification Modal for Reset MPIN */}
      <EmailOtpModal
        visible={showEmailOtpModal}
        purpose="RESET_MPIN"
        maskedEmail={maskedEmail}
        onVerifySuccess={handleEmailOtpSuccess}
        onRequestOtp={async () => {
          const res = await requestMpinOtp('RESET_MPIN');
          if (res?.maskedEmail) setMaskedEmail(res.maskedEmail);
          return res;
        }}
        onVerifyOtp={(otpCode) => verifyMpinOtp(otpCode, 'RESET_MPIN')}
        onClose={() => setShowEmailOtpModal(false)}
      />

      {/* Success Bottom Sheet on MPIN Reset */}
      <SuccessBottomSheet
        visible={showResetSuccessModal}
        title="MPIN Reset Successfully"
        message="Your new 4-digit passcode is active and your account is unlocked."
        buttonLabel="Continue"
        onClose={handleResetSuccessClose}
      />

      {/* Docked AdMob Banner at bottom */}
      <AdBanner position="bottom" safeBottom />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    backgroundColor: Palette.canvas,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  logoBadge: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetHeaderBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 2,
  },
  instruction: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  dotsSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
    minHeight: 88,
  },
  indicator: {
    marginTop: 4,
  },
  errorBox: {
    paddingVertical: 2,
    paddingHorizontal: 16,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.danger,
    textAlign: 'center',
    lineHeight: 18,
  },
  placeholderSpace: {
    height: 22,
    marginBottom: 6,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 6,
  },
  forgotButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  forgotText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  cancelResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Palette.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cancelResetText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: 'rgba(27, 34, 16, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: Palette.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.brandTint,
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  confirmProceedBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmProceedText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
