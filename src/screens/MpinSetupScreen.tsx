import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { HeaderBackgroundArt } from '../components/illustrations/HeaderBackgroundArt';
import { useLockStore } from '../stores/lockStore';
import { MpinKeypad } from '../components/MpinKeypad';
import { MpinDots } from '../components/MpinDots';
import { AdBanner } from '../components/AdBanner';
import { APP_NAME } from '../constants/app';

interface MpinSetupScreenProps {
  onSuccess?: () => void;
  onDismiss?: () => void;
  allowDismiss?: boolean;
  isResetMode?: boolean;
}

export const MpinSetupScreen: React.FC<MpinSetupScreenProps> = ({
  onSuccess,
  onDismiss,
  allowDismiss = true,
  isResetMode = false,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [step, setStep] = useState<'CREATE' | 'CONFIRM'>('CREATE');
  const [initialPin, setInitialPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smooth horizontal slide animation between step 1 (create) and step 2 (confirm)
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: step === 'CREATE' ? 0 : 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [step, slideAnim]);

  const slideInterpolation = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -screenWidth],
  });

  // Single unified modal for biometric setup matching device hardware
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [pendingPin, setPendingPin] = useState<string | null>(null);

  const {
    isBiometricSupported,
    biometricLabel,
    hasFaceId,
    hasFingerprint,
    setupMpin,
    resetMpin,
    setFaceIdEnabled,
    setFingerprintEnabled,
    dismissSetup,
  } = useLockStore();

  const bioDisplayName = biometricLabel && biometricLabel !== 'None' ? biometricLabel : 'Biometrics';

  const handleDigit = useCallback(
    async (digit: string) => {
      if (isSubmitting) return;
      setErrorMessage(null);

      if (step === 'CREATE') {
        if (initialPin.length >= 4) return;
        const nextPin = initialPin + digit;
        setInitialPin(nextPin);

        if (nextPin.length === 4) {
          setTimeout(() => {
            setStep('CONFIRM');
          }, 200);
        }
      } else {
        if (confirmPin.length >= 4) return;
        const nextConfirm = confirmPin + digit;
        setConfirmPin(nextConfirm);

        if (nextConfirm.length === 4) {
          if (nextConfirm === initialPin) {
            setPendingPin(nextConfirm);
            if (isBiometricSupported) {
              setShowBiometricModal(true);
            } else {
              setIsSubmitting(true);
              try {
                if (isResetMode) {
                  await resetMpin(nextConfirm, false);
                } else {
                  await setupMpin(nextConfirm, false);
                }
                onSuccess?.();
              } catch (err: any) {
                setErrorMessage(err?.message || 'Failed to save MPIN');
                setStep('CREATE');
                setInitialPin('');
                setConfirmPin('');
              } finally {
                setIsSubmitting(false);
              }
            }
          } else {
            // Mismatch
            setErrorMessage('MPIN does not match. Please try again.');
            setConfirmPin('');
            setTimeout(() => {
              setStep('CREATE');
              setInitialPin('');
              setErrorMessage(null);
            }, 1200);
          }
        }
      }
    },
    [
      isSubmitting,
      step,
      initialPin,
      confirmPin,
      isBiometricSupported,
      setupMpin,
      resetMpin,
      isResetMode,
      onSuccess,
    ]
  );

  const handleBackspace = useCallback(() => {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (step === 'CREATE') {
      setInitialPin((prev) => prev.slice(0, -1));
    } else {
      if (confirmPin.length === 0) {
        setStep('CREATE');
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    }
  }, [isSubmitting, step, confirmPin.length]);

  // Handler for Biometric Modal choice
  const handleBiometricChoice = async (enable: boolean, preferredType?: 'FACE_ID' | 'FINGERPRINT') => {
    const pinToSave = pendingPin || (confirmPin.length === 4 ? confirmPin : initialPin);
    if (!pinToSave) return;
    setShowBiometricModal(false);
    setIsSubmitting(true);
    try {
      if (isResetMode) {
        await resetMpin(pinToSave, enable);
      } else {
        await setupMpin(pinToSave, enable, preferredType);
      }
      if (enable) {
        if (preferredType === 'FACE_ID' || (hasFaceId && !preferredType)) {
          await setFaceIdEnabled(true);
          await setFingerprintEnabled(false);
        } else if (preferredType === 'FINGERPRINT' || (hasFingerprint && !preferredType)) {
          await setFingerprintEnabled(true);
          await setFaceIdEnabled(false);
        }
      }
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save MPIN');
      setStep('CREATE');
      setInitialPin('');
      setConfirmPin('');
    } finally {
      setIsSubmitting(false);
      setPendingPin(null);
    }
  };

  const handleDismiss = () => {
    dismissSetup();
    onDismiss?.();
  };

  const currentPin = step === 'CREATE' ? initialPin : confirmPin;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <HeaderBackgroundArt />

      {/* Top Bar with Step Pill */}
      <View style={styles.topBar}>
        <View style={styles.stepIndicatorPill}>
          <Feather
            name={step === 'CREATE' ? 'lock' : 'check-circle'}
            size={11}
            color={Palette.brandPrimary}
            style={{ marginRight: 5 }}
          />
          <Text style={styles.stepIndicatorText}>
            {step === 'CREATE'
              ? isResetMode
                ? 'STEP 1 OF 2 · RESET PASSCODE'
                : 'STEP 1 OF 2 · CREATE PASSCODE'
              : 'STEP 2 OF 2 · CONFIRM PASSCODE'}
          </Text>
        </View>
      </View>

      {/* Content with animated sliding transition between Step 1 and Step 2 */}
      <View style={styles.contentWrap}>
        <View style={styles.sliderClip}>
          <Animated.View
            style={[
              styles.sliderTrack,
              {
                width: screenWidth * 2,
                transform: [{ translateX: slideInterpolation }],
              },
            ]}
          >
            {/* SLIDE 1: CREATE PASSCODE */}
            <View style={[styles.slidePage, { width: screenWidth }]}>
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="shield-key-outline"
                    size={30}
                    color={Palette.brandPrimary}
                  />
                </View>

                <Text style={styles.title}>
                  {isResetMode ? 'Reset 4-Digit MPIN' : 'Create 4-Digit MPIN'}
                </Text>
                <Text style={styles.subtitle}>
                  {isResetMode
                    ? 'Choose a new 4-digit PIN to secure your account'
                    : 'Choose a 4-digit PIN for instant, secure app access'}
                </Text>
              </View>

              <View style={styles.dotsSection}>
                <View style={styles.placeholderSpace} />
                <MpinDots
                  total={4}
                  filledCount={initialPin.length}
                  isError={false}
                />
              </View>
            </View>

            {/* SLIDE 2: CONFIRM PASSCODE */}
            <View style={[styles.slidePage, { width: screenWidth }]}>
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={30}
                    color={Palette.brandPrimary}
                  />
                </View>

                <Text style={styles.title}>Confirm your MPIN</Text>
                <Text style={styles.subtitle}>
                  Re-enter the same 4-digit PIN to confirm
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setStep('CREATE');
                    setInitialPin('');
                    setConfirmPin('');
                    setErrorMessage(null);
                  }}
                  style={styles.reenterButton}
                  activeOpacity={0.7}
                >
                  <Feather name="rotate-ccw" size={12} color={Palette.brandPrimary} style={{ marginRight: 4 }} />
                  <Text style={styles.reenterText}>Want to start over?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dotsSection}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Palette.brandPrimary} style={styles.indicator} />
                ) : errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : (
                  <View style={styles.placeholderSpace} />
                )}

                <MpinDots
                  total={4}
                  filledCount={confirmPin.length}
                  isError={Boolean(errorMessage)}
                />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* 4x3 Keypad: Always show Fingerprint and Face ID in row 4 before 0 */}
        <MpinKeypad
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          showBiometric={true}
          hasFaceId={true}
          hasFingerprint={true}
          biometricLabel="Face / Touch"
          onBiometricPress={() => {
            setShowBiometricModal(true);
          }}
          disabled={isSubmitting}
        />

        {/* Medium-sized, visible "Set up later" button at the bottom */}
        {allowDismiss && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.setupLaterBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Set up MPIN later"
          >
            <Feather name="clock" size={15} color={Palette.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.setupLaterText}>Set up later</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Unified Biometric Registration Modal with Face ID & Fingerprint */}
      <Modal
        visible={showBiometricModal}
        transparent
        animationType="fade"
        onRequestClose={() => handleBiometricChoice(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>BIOMETRIC SECURITY</Text>
            </View>

            <View style={styles.modalIconBadge}>
              <View style={styles.dualModalIconRow}>
                {hasFaceId ? (
                  <MaterialCommunityIcons
                    name="face-recognition"
                    size={34}
                    color={Palette.brandPrimary}
                  />
                ) : (
                  <Ionicons
                    name="finger-print"
                    size={34}
                    color={Palette.brandPrimary}
                  />
                )}
              </View>
            </View>

            <Text style={styles.modalTitle}>
              {hasFaceId
                ? 'Enable Face ID?'
                : hasFingerprint
                ? 'Enable Fingerprint?'
                : 'Enable Biometric Unlock?'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {hasFaceId
                ? `Unlock ${APP_NAME} seamlessly with Face ID without entering your 4-digit MPIN every time.`
                : hasFingerprint
                ? `Unlock ${APP_NAME} seamlessly with your Fingerprint without entering your 4-digit MPIN every time.`
                : `Unlock ${APP_NAME} seamlessly using your device biometric authentication.`}
            </Text>

            <TouchableOpacity
              style={styles.enableButton}
              onPress={() => handleBiometricChoice(true, hasFaceId ? 'FACE_ID' : 'FINGERPRINT')}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContentRow}>
                {hasFaceId ? (
                  <MaterialCommunityIcons name="face-recognition" size={18} color={Palette.textInverse} style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons name="finger-print" size={18} color={Palette.textInverse} style={{ marginRight: 8 }} />
                )}
                <Text style={styles.enableButtonText}>
                  {hasFaceId
                    ? 'Enable Face ID'
                    : hasFingerprint
                    ? 'Enable Fingerprint'
                    : 'Enable Biometrics'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notNowButton}
              onPress={() => handleBiometricChoice(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.notNowButtonText}>Skip for Now</Text>
            </TouchableOpacity>

            <AdBanner position="bottom" />
          </View>
        </View>
      </Modal>

      {/* Docked AdMob Banner at bottom */}
      <AdBanner position="bottom" safeBottom />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 2,
  },
  sliderClip: {
    width: '100%',
    overflow: 'hidden',
    paddingTop: 2,
  },
  sliderTrack: {
    flexDirection: 'row',
  },
  slidePage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    zIndex: 20,
  },
  stepIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D8E2C4',
  },
  stepIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.brandPrimary,
    letterSpacing: 0.5,
  },
  setupLaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.border,
    marginTop: 12,
    marginBottom: 6,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  setupLaterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.brandTint,
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  reenterButton: {
    marginTop: 6,
    paddingVertical: 3,
  },
  reenterText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  dotsSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 34, 16, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Palette.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    marginBottom: 14,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.brandPrimary,
    letterSpacing: 0.6,
  },
  stepBadgeTouch: {
    backgroundColor: '#FAF7EE',
  },
  stepBadgeTextTouch: {
    color: '#8C7736',
  },
  modalIconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Palette.brandTint,
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dualModalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconBadgeTouch: {
    backgroundColor: '#FAF7EE',
    borderColor: '#E8E1CE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Palette.brandPrimary,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  enableButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Palette.textInverse,
  },
  notNowButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  notNowButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
});
