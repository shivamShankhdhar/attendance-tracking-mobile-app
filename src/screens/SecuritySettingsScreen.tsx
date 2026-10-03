import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { HeaderBackgroundArt } from '../components/illustrations/HeaderBackgroundArt';
import { useLockStore } from '../stores/lockStore';
import { biometricService } from '../services/biometricService';
import { MpinKeypad } from '../components/MpinKeypad';
import { MpinDots } from '../components/MpinDots';
import { AdBanner } from '../components/AdBanner';
import { adMobService } from '../services/adMobService';
import { APP_NAME, PRIVACY_POLICY_URL } from '../constants/app';
import { SuccessBottomSheet } from '../components/SuccessBottomSheet';
import { EmailOtpModal } from '../components/EmailOtpModal';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../hooks/use-theme';

interface SecuritySettingsScreenProps {
  onBack: () => void;
  initialOpenChangeModal?: boolean;
}

export const SecuritySettingsScreen: React.FC<SecuritySettingsScreenProps> = ({
  onBack,
  initialOpenChangeModal = false,
}) => {
  const { isDark } = useTheme();
  const {
    hasMpin,
    appLockEnabled,
    setAppLockEnabled,
    biometricEnabled,
    faceIdEnabled,
    fingerprintEnabled,
    hasFaceId,
    hasFingerprint,
    isBiometricSupported,
    biometricLabel,
    lockApp,
    unlockApp,
    setBiometricEnabled,
    setFaceIdEnabled,
    setFingerprintEnabled,
    changeMpin,
    setupMpin,
    resetMpin,
    requestMpinOtp,
    verifyMpinOtp,
    verifyMpin,
  } = useLockStore();

  const user = useAuthStore((s) => s.user);
  const [isTogglingBio, setIsTogglingBio] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(initialOpenChangeModal);
  const [modalMode, setModalMode] = useState<'CHANGE' | 'RESET'>('CHANGE');
  const [changeStep, setChangeStep] = useState<'CURRENT' | 'NEW' | 'CONFIRM'>('CURRENT');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  // Disabling App Lock Custom Bottom Sheet Modal
  const [showDisableConfirmModal, setShowDisableConfirmModal] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Enabling App Lock when hasMpin: Verify MPIN Custom Bottom Sheet Modal
  const [showEnableVerifyModal, setShowEnableVerifyModal] = useState(false);
  const [enableVerifyPin, setEnableVerifyPin] = useState('');
  const [enableVerifyError, setEnableVerifyError] = useState<string | null>(null);
  const [isVerifyingToEnable, setIsVerifyingToEnable] = useState(false);

  // Enabling App Lock when !hasMpin: Choose Lock Type Custom Bottom Sheet Modal
  const [showChooseLockTypeModal, setShowChooseLockTypeModal] = useState(false);
  const [pendingLockType, setPendingLockType] = useState<'MPIN' | 'FACE_ID' | 'FINGERPRINT'>('MPIN');

  // Email OTP state for Change/Reset MPIN
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'RESET_MPIN' | 'CHANGE_MPIN'>('CHANGE_MPIN');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  const [isEnablingLock, setIsEnablingLock] = useState(false);

  // Preload video ad for App Lock setup as soon as settings opens
  useEffect(() => {
    adMobService.preloadVideoAd();
  }, []);

  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const isAppLockActive = Boolean(hasMpin && appLockEnabled);
  const displayBioLabel = biometricLabel && biometricLabel !== 'None' ? biometricLabel : 'Biometric';

  const handleAppLockMasterToggle = async (val: boolean) => {
    if (!val) {
      // User is disabling App Lock -> prompt confirmation via custom bottom sheet modal
      setShowDisableConfirmModal(true);
    } else {
      // User is enabling App Lock -> show video ad first, then open setup modal!
      setIsEnablingLock(true);
      try {
        await adMobService.showVideoAd('enable_app_lock').catch(() => {});
      } finally {
        setIsEnablingLock(false);
      }

      if (hasMpin) {
        // MPIN already exists -> user must input their MPIN to authorize enabling
        setEnableVerifyPin('');
        setEnableVerifyError(null);
        setShowEnableVerifyModal(true);
      } else {
        // No MPIN exists yet -> user chooses lock type from bottom sheet modal, then sets up
        setShowChooseLockTypeModal(true);
      }
    }
  };

  const handleOpenSetupModalWithVideoAd = async () => {
    setIsEnablingLock(true);
    try {
      await adMobService.showVideoAd('enable_app_lock').catch(() => {});
    } finally {
      setIsEnablingLock(false);
    }
    setShowChooseLockTypeModal(true);
  };

  const handleConfirmDisableAppLock = async () => {
    setIsDisabling(true);
    try {
      await setAppLockEnabled(false);
      setShowDisableConfirmModal(false);
      setSuccessModal({
        visible: true,
        title: 'App Lock Disabled',
        message: 'App lock has been turned off. You can re-enable it at any time from this screen.',
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to disable App Lock. Please try again.');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleEnableVerifyDigit = async (digit: string) => {
    if (isVerifyingToEnable) return;
    setEnableVerifyError(null);
    if (enableVerifyPin.length >= 4) return;

    const nextPin = enableVerifyPin + digit;
    setEnableVerifyPin(nextPin);

    if (nextPin.length === 4) {
      setIsVerifyingToEnable(true);
      try {
        const ok = await verifyMpin(nextPin);
        if (ok) {
          await setAppLockEnabled(true);
          setShowEnableVerifyModal(false);
          setEnableVerifyPin('');
          setEnableVerifyError(null);
          setSuccessModal({
            visible: true,
            title: 'App Lock Enabled',
            message: 'Your 4-digit MPIN and biometrics are now actively protecting your account.',
          });
        } else {
          setEnableVerifyError('Incorrect MPIN. Please try again.');
          setEnableVerifyPin('');
        }
      } catch (err: any) {
        setEnableVerifyError(err?.message || 'Incorrect MPIN. Please try again.');
        setEnableVerifyPin('');
      } finally {
        setIsVerifyingToEnable(false);
      }
    }
  };

  const handleEnableVerifyBackspace = () => {
    if (isVerifyingToEnable) return;
    setEnableVerifyError(null);
    setEnableVerifyPin((prev) => prev.slice(0, -1));
  };

  const handleSelectLockType = (type: 'MPIN' | 'FACE_ID' | 'FINGERPRINT') => {
    setPendingLockType(type);
    setShowChooseLockTypeModal(false);

    // Proceed to set up MPIN
    setModalMode('CHANGE');
    setChangeStep('NEW');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setChangeError(null);
    setResetToken(null);
    setShowChangeModal(true);
  };

  const handleFaceIdToggle = async (val: boolean) => {
    if (!isAppLockActive) return;
    if (val && (!isBiometricSupported || !hasFaceId)) {
      Alert.alert('Face Recognition Not Available', 'Please register Face ID in device settings.');
      return;
    }
    if (val) {
      const ok = await biometricService.authenticate('Confirm Face ID for app lock');
      if (!ok) return;
    }
    try {
      await setFaceIdEnabled(val);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update Face ID preference');
    }
  };

  const handleFingerprintToggle = async (val: boolean) => {
    if (!isAppLockActive) return;
    if (val && (!isBiometricSupported || !hasFingerprint)) {
      Alert.alert('Fingerprint Not Available', 'Please register Fingerprint in device settings.');
      return;
    }
    if (val) {
      const ok = await biometricService.authenticate('Confirm Fingerprint for app lock');
      if (!ok) return;
    }
    try {
      await setFingerprintEnabled(val);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update Fingerprint preference');
    }
  };

  // Start Change MPIN
  const openChangeMpinModal = async () => {
    if (!hasMpin) {
      setShowChooseLockTypeModal(true);
      return;
    }

    if (isRequestingOtp) return;
    setIsRequestingOtp(true);
    setOtpPurpose('CHANGE_MPIN');
    try {
      const res = await requestMpinOtp('CHANGE_MPIN');
      if (res?.maskedEmail) setMaskedEmail(res.maskedEmail);
      setShowEmailOtpModal(true);
    } catch (err: any) {
      Alert.alert('Verification Error', err?.message || 'Failed to send verification code to your email.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Start Reset MPIN
  const openResetMpinModal = async () => {
    if (isRequestingOtp) return;
    setIsRequestingOtp(true);
    setOtpPurpose('RESET_MPIN');
    try {
      const res = await requestMpinOtp('RESET_MPIN');
      if (res?.maskedEmail) setMaskedEmail(res.maskedEmail);
      setShowEmailOtpModal(true);
    } catch (err: any) {
      Alert.alert('Verification Error', err?.message || 'Failed to send verification code to your email.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const switchToResetMode = async () => {
    setShowChangeModal(false);
    await openResetMpinModal();
  };

  const handleEmailOtpSuccess = (token: string) => {
    setResetToken(token);
    setShowEmailOtpModal(false);
    if (otpPurpose === 'CHANGE_MPIN') {
      setModalMode('CHANGE');
      setChangeStep('NEW');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setChangeError(null);
      setShowChangeModal(true);
    } else {
      setModalMode('RESET');
      setChangeStep('NEW');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setChangeError(null);
      setShowChangeModal(true);
    }
  };

  // Change / Reset MPIN digit handler
  const handleChangeDigit = async (digit: string) => {
    if (isChanging) return;
    setChangeError(null);

    if (modalMode === 'RESET') {
      if (changeStep === 'NEW') {
        if (newPin.length >= 4) return;
        const next = newPin + digit;
        setNewPin(next);
        if (next.length === 4) {
          setTimeout(() => setChangeStep('CONFIRM'), 200);
        }
      } else {
        if (confirmPin.length >= 4) return;
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next !== newPin) {
            setChangeError('New MPINs do not match. Please try again.');
            setConfirmPin('');
            setTimeout(() => {
              setChangeStep('NEW');
              setNewPin('');
              setChangeError(null);
            }, 1200);
            return;
          }

          setIsChanging(true);
          try {
            await resetMpin(next, biometricEnabled, resetToken || undefined);
            unlockApp();
            setResetToken(null);
            setShowChangeModal(false);
            setSuccessModal({
              visible: true,
              title: 'MPIN Reset Successfully',
              message: 'Your 4-digit MPIN has been reset and your account is now secured.',
            });
          } catch (err: any) {
            setChangeError(err?.message || 'Failed to reset MPIN.');
            setConfirmPin('');
            setNewPin('');
            setChangeStep('NEW');
          } finally {
            setIsChanging(false);
          }
        }
      }
      return;
    }

    if (changeStep === 'CURRENT') {
      if (currentPin.length >= 4) return;
      const next = currentPin + digit;
      setCurrentPin(next);
      if (next.length === 4) {
        setTimeout(() => setChangeStep('NEW'), 200);
      }
    } else if (changeStep === 'NEW') {
      if (newPin.length >= 4) return;
      const next = newPin + digit;
      setNewPin(next);
      if (next.length === 4) {
        setTimeout(() => setChangeStep('CONFIRM'), 200);
      }
    } else {
      if (confirmPin.length >= 4) return;
      const next = confirmPin + digit;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next !== newPin) {
          setChangeError('New MPINs do not match. Please try again.');
          setConfirmPin('');
          setTimeout(() => {
            setChangeStep('NEW');
            setNewPin('');
            setChangeError(null);
          }, 1200);
          return;
        }

        setIsChanging(true);
        try {
          if (hasMpin) {
            await changeMpin(currentPin || undefined, next, resetToken || undefined);
            setResetToken(null);
            setShowChangeModal(false);
            setSuccessModal({
              visible: true,
              title: 'MPIN Updated Successfully',
              message: 'Your 4-digit security MPIN has been updated successfully.',
            });
          } else {
            const enableBio = pendingLockType !== 'MPIN';
            await setupMpin(next, enableBio, pendingLockType);
            if (pendingLockType === 'FACE_ID') {
              await setFaceIdEnabled(true);
              await setFingerprintEnabled(false);
            } else if (pendingLockType === 'FINGERPRINT') {
              await setFingerprintEnabled(true);
              await setFaceIdEnabled(false);
            } else {
              await setFaceIdEnabled(false);
              await setFingerprintEnabled(false);
            }
            await setAppLockEnabled(true);
            setResetToken(null);
            setShowChangeModal(false);
            setSuccessModal({
              visible: true,
              title: 'App Lock Set Up Successfully',
              message:
                pendingLockType === 'FACE_ID'
                  ? 'Your account is now secured with Face ID.'
                  : pendingLockType === 'FINGERPRINT'
                  ? 'Your account is now secured with Fingerprint.'
                  : 'Your account is now secured with your 4-Digit MPIN.',
            });
          }
        } catch (err: any) {
          setChangeError(err?.message || 'Failed to update MPIN. Check your current MPIN.');
          setConfirmPin('');
          if (hasMpin && !resetToken) {
            setChangeStep('CURRENT');
            setCurrentPin('');
            setNewPin('');
          } else {
            setChangeStep('NEW');
            setNewPin('');
          }
        } finally {
          setIsChanging(false);
        }
      }
    }
  };

  const handleChangeBackspace = () => {
    if (isChanging) return;
    setChangeError(null);
    if (modalMode === 'RESET') {
      if (changeStep === 'NEW') {
        setNewPin((prev) => prev.slice(0, -1));
      } else {
        if (confirmPin.length === 0) {
          setChangeStep('NEW');
        } else {
          setConfirmPin((prev) => prev.slice(0, -1));
        }
      }
      return;
    }

    if (changeStep === 'CURRENT') {
      setCurrentPin((prev) => prev.slice(0, -1));
    } else if (changeStep === 'NEW') {
      if (newPin.length === 0 && hasMpin) {
        setChangeStep('CURRENT');
      } else {
        setNewPin((prev) => prev.slice(0, -1));
      }
    } else {
      if (confirmPin.length === 0) {
        setChangeStep('NEW');
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    }
  };

  const activePinLength =
    modalMode === 'RESET'
      ? changeStep === 'NEW'
        ? newPin.length
        : confirmPin.length
      : changeStep === 'CURRENT'
      ? currentPin.length
      : changeStep === 'NEW'
      ? newPin.length
      : confirmPin.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <HeaderBackgroundArt />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security & App Lock</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section: Master App Lock Status & Switch */}
        <View style={styles.statusSection}>
          <View style={styles.statusIconCircle}>
            <MaterialCommunityIcons
              name={isAppLockActive ? 'shield-check' : 'shield-alert-outline'}
              size={36}
              color={isAppLockActive ? Palette.brandPrimary : Palette.textSecondary}
            />
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>
              {isAppLockActive ? 'App Lock is Active' : 'App Lock is Off'}
            </Text>
            <Text style={styles.statusDesc}>
              {isAppLockActive
                ? `Secured with 4-digit MPIN and biometrics. ${APP_NAME} automatically locks whenever you switch apps or lock your phone.`
                : 'Turn on App Lock to protect your attendance records and workplace details with MPIN, Face ID, and Fingerprint.'}
            </Text>
          </View>

          <View style={styles.masterToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterToggleTitle}>Enable App Lock</Text>
              <Text style={styles.masterToggleSub}>
                {isAppLockActive ? 'App is protected' : 'Passcode & biometrics disabled'}
              </Text>
            </View>
            {isEnablingLock ? (
              <ActivityIndicator size="small" color={Palette.brandPrimary} style={{ marginRight: 10 }} />
            ) : null}
            <Switch
              value={isAppLockActive}
              onValueChange={handleAppLockMasterToggle}
              disabled={isEnablingLock}
              thumbColor={isAppLockActive ? Palette.brandPrimary : '#64748B'}
              trackColor={{ false: isDark ? '#1E293B' : '#F1F5F9', true: isDark ? '#1E3A2F' : '#ECFDF5' }}
              ios_backgroundColor={isDark ? '#1E293B' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* Section: 3 Authentication Options */}
        <Text style={styles.sectionHeaderTitle}>AUTHENTICATION METHODS (3 OPTIONS)</Text>

        {!isAppLockActive && (
          <View style={styles.disabledNoticeBox}>
            <Feather name="lock" size={15} color={Palette.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.disabledNoticeText}>
              Turn on App Lock above to configure MPIN, Face ID, and Fingerprint.
            </Text>
          </View>
        )}

        <View style={[styles.settingsList, !isAppLockActive && styles.disabledSection]}>
          {/* OPTION 1: 4-DIGIT MPIN */}
          <View style={styles.optionHeaderRow}>
            <View style={styles.flatRowLeft}>
              <View style={[styles.flatIconWrap, { backgroundColor: Palette.brandTint }]}>
                <Feather name="shield" size={18} color={Palette.brandPrimary} />
              </View>
              <View style={styles.flatTextWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.flatRowTitle}>1. 4-Digit MPIN</Text>
                  <View style={[styles.miniBadge, hasMpin ? styles.miniBadgeActive : styles.miniBadgeInactive]}>
                    <Text style={[styles.miniBadgeText, hasMpin ? styles.miniBadgeTextActive : styles.miniBadgeTextInactive]}>
                      {hasMpin ? 'CONFIGURED' : 'NOT SET'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.flatRowSub}>
                  {hasMpin
                    ? 'Primary passcode fallback for app lock'
                    : 'Set up a 4-digit PIN for passcode unlock'}
                </Text>
              </View>
            </View>
          </View>

          {hasMpin ? (
            <View style={styles.mpinActionsRow}>
              <TouchableOpacity
                style={styles.mpinActionBtn}
                onPress={openChangeMpinModal}
                disabled={!isAppLockActive || isRequestingOtp}
                activeOpacity={0.7}
              >
                {isRequestingOtp && otpPurpose === 'CHANGE_MPIN' ? (
                  <ActivityIndicator size="small" color={Palette.brandPrimary} />
                ) : (
                  <>
                    <Feather name="edit-3" size={14} color={isAppLockActive ? Palette.brandPrimary : Palette.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.mpinActionBtnText, !isAppLockActive && { color: Palette.textSecondary }]}>Change MPIN</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mpinActionBtn, styles.mpinActionBtnSecondary]}
                onPress={openResetMpinModal}
                disabled={!isAppLockActive || isRequestingOtp}
                activeOpacity={0.7}
              >
                {isRequestingOtp && otpPurpose === 'RESET_MPIN' ? (
                  <ActivityIndicator size="small" color={Palette.brandPrimary} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="lock-reset" size={16} color={Palette.textSecondary} style={{ marginRight: 5 }} />
                    <Text style={styles.mpinActionBtnSecondaryText}>Reset</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.setupMpinInlineBtn, isEnablingLock && { opacity: 0.7 }]}
              onPress={handleOpenSetupModalWithVideoAd}
              activeOpacity={0.7}
              disabled={isEnablingLock}
            >
              {isEnablingLock ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : null}
              <Text style={styles.setupMpinInlineText}>
                {isEnablingLock ? 'Loading Video Ad...' : 'Set Up App Lock (Choose Method)'}
              </Text>
              <Feather name="chevron-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* DIVIDER */}
          <View style={styles.rowDivider} />

          {/* OPTION 2: FACE ID */}
          <View style={[styles.flatRow, (!isAppLockActive || !hasFaceId || !isBiometricSupported) && styles.disabledRow]}>
            <View style={styles.flatRowLeft}>
              <View style={[styles.flatIconWrap, { backgroundColor: Palette.brandTint }]}>
                <MaterialCommunityIcons name="face-recognition" size={20} color={Palette.brandPrimary} />
              </View>
              <View style={styles.flatTextWrap}>
                <Text style={styles.flatRowTitle}>2. Face ID</Text>
                <Text style={styles.flatRowSub}>
                  {!hasFaceId || !isBiometricSupported
                    ? 'Not available or not enrolled on device'
                    : 'Unlock automatically with Face ID'}
                </Text>
              </View>
            </View>
            <Switch
              value={isAppLockActive && faceIdEnabled}
              onValueChange={handleFaceIdToggle}
              thumbColor={isAppLockActive && faceIdEnabled ? Palette.brandPrimary : '#64748B'}
              trackColor={{ false: isDark ? '#1E293B' : '#F1F5F9', true: isDark ? '#1E3A2F' : '#ECFDF5' }}
              ios_backgroundColor={isDark ? '#1E293B' : '#F1F5F9'}
              disabled={!isAppLockActive || !hasFaceId || !isBiometricSupported}
            />
          </View>

          {/* DIVIDER */}
          <View style={styles.rowDivider} />

          {/* OPTION 3: FINGERPRINT */}
          <View style={[styles.flatRow, { borderBottomWidth: 0 }, (!isAppLockActive || !hasFingerprint || !isBiometricSupported) && styles.disabledRow]}>
            <View style={styles.flatRowLeft}>
              <View style={[styles.flatIconWrap, { backgroundColor: '#FAF7EE', borderColor: '#E8E1CE', borderWidth: 1 }]}>
                <MaterialCommunityIcons name="fingerprint" size={20} color={Palette.brandPrimary} />
              </View>
              <View style={styles.flatTextWrap}>
                <Text style={styles.flatRowTitle}>3. Fingerprint</Text>
                <Text style={styles.flatRowSub}>
                  {!hasFingerprint || !isBiometricSupported
                    ? 'Sensor not available or not enrolled'
                    : 'Touch device sensor for fingerprint unlock'}
                </Text>
              </View>
            </View>
            <Switch
              value={isAppLockActive && fingerprintEnabled}
              onValueChange={handleFingerprintToggle}
              thumbColor={isAppLockActive && fingerprintEnabled ? Palette.brandPrimary : '#64748B'}
              trackColor={{ false: isDark ? '#1E293B' : '#F1F5F9', true: isDark ? '#1E3A2F' : '#ECFDF5' }}
              ios_backgroundColor={isDark ? '#1E293B' : '#F1F5F9'}
              disabled={!isAppLockActive || !hasFingerprint || !isBiometricSupported}
            />
          </View>
        </View>

        {/* Section: Testing & Actions */}
        {hasMpin && (
          <>
            <Text style={styles.sectionHeaderTitle}>TEST APP LOCK</Text>
            <View style={[styles.settingsList, !isAppLockActive && styles.disabledSection]}>
              <TouchableOpacity
                style={[styles.clickableRow, { borderBottomWidth: 0 }]}
                onPress={lockApp}
                disabled={!isAppLockActive}
                activeOpacity={0.7}
              >
                <View style={styles.flatRowLeft}>
                  <View style={[styles.flatIconWrap, { backgroundColor: Palette.brandTint }]}>
                    <Feather name="lock" size={18} color={Palette.brandPrimary} />
                  </View>
                  <View style={styles.flatTextWrap}>
                    <Text style={styles.flatRowTitle}>Lock App Now</Text>
                    <Text style={styles.flatRowSub}>
                      {isAppLockActive
                        ? 'Test lock screen and configured unlock methods'
                        : 'Enable App Lock above to test'}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}


        <TouchableOpacity
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          style={styles.securityPolicyLink}
          activeOpacity={0.7}
        >
          <Feather name="lock" size={13} color={Palette.brandPrimary} />
          <Text style={styles.securityPolicyLinkText}>
            Privacy Policy &amp; AdMob Disclosure
          </Text>
          <Feather name="external-link" size={12} color={Palette.brandPrimary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Docked AdMob Banner at bottom */}
      <AdBanner position="bottom" safeBottom />

      {/* Change / Set MPIN Modal */}
      <Modal
        visible={showChangeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChangeModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right', 'bottom']}>
          <HeaderBackgroundArt />

          {/* Top Modal Header pinned to top with Close Button on the RIGHT */}
          <View style={styles.modalHeader}>
            <View style={styles.backButtonPlaceholder} />
            <Text style={styles.modalTitleText}>
              {modalMode === 'RESET'
                ? changeStep === 'NEW'
                  ? 'Enter New MPIN'
                  : 'Confirm New MPIN'
                : changeStep === 'CURRENT'
                ? 'Enter Current MPIN'
                : changeStep === 'NEW'
                ? 'Enter New MPIN'
                : 'Confirm New MPIN'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowChangeModal(false)}
              style={styles.modalCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              activeOpacity={0.7}
            >
              <Feather name="x" size={18} color={Palette.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContentWrap}>
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitleText}>
                {modalMode === 'RESET'
                  ? changeStep === 'NEW'
                    ? 'Choose a new 4-digit MPIN for your account'
                    : 'Re-enter your new MPIN to confirm'
                  : changeStep === 'CURRENT'
                  ? 'Provide your existing 4-digit MPIN to authorize change'
                  : changeStep === 'NEW'
                  ? 'Choose a new 4-digit MPIN'
                  : 'Re-enter your new MPIN to confirm'}
              </Text>

              {isChanging ? (
                <ActivityIndicator size="small" color={Palette.brandPrimary} style={{ marginBottom: 8 }} />
              ) : changeError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.changeErrorText}>{changeError}</Text>
                </View>
              ) : (
                <View style={{ height: 22, marginBottom: 6 }} />
              )}

              <MpinDots
                total={4}
                filledCount={activePinLength}
                isError={Boolean(changeError)}
              />

              {modalMode === 'CHANGE' && changeStep === 'CURRENT' && (
                <TouchableOpacity
                  onPress={switchToResetMode}
                  style={styles.forgotCurrentBtn}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="lock-reset" size={15} color={Palette.brandPrimary} />
                  <Text style={styles.forgotCurrentText}>Forgot current MPIN? Reset here</Text>
                </TouchableOpacity>
              )}
            </View>

            <MpinKeypad
              onDigit={handleChangeDigit}
              onBackspace={handleChangeBackspace}
              showBiometric={false}
              disabled={isChanging}
            />
          </View>

          {/* Docked AdMob Banner at bottom of MPIN setup modal */}
          <AdBanner position="bottom" safeBottom />
        </SafeAreaView>
      </Modal>

      {/* Email OTP Verification Modal */}
      <EmailOtpModal
        visible={showEmailOtpModal}
        purpose={otpPurpose}
        maskedEmail={maskedEmail || user?.email || ''}
        onVerifySuccess={handleEmailOtpSuccess}
        onRequestOtp={async () => {
          const res = await requestMpinOtp(otpPurpose);
          if (res?.maskedEmail) setMaskedEmail(res.maskedEmail);
          return res;
        }}
        onVerifyOtp={(otpCode) => verifyMpinOtp(otpCode, otpPurpose)}
        onClose={() => {
          setShowEmailOtpModal(false);
          setResetToken(null);
        }}
      />

      {/* 1. Custom Bottom Sheet Modal: Confirm Disable App Lock */}
      <Modal
        visible={showDisableConfirmModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowDisableConfirmModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable
            style={styles.bottomSheetDismissArea}
            onPress={() => setShowDisableConfirmModal(false)}
          />
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetDragHandle} />

            <View style={styles.disableIconCircle}>
              <MaterialCommunityIcons name="shield-off-outline" size={36} color="#DC2626" />
            </View>

            <View style={styles.disableBadgePill}>
              <Feather name="alert-triangle" size={11} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={styles.disableBadgeText}>DISABLE APP LOCK</Text>
            </View>

            <Text style={styles.disableModalTitle}>Disable App Lock?</Text>
            <Text style={styles.disableModalDesc}>
              Bizora will no longer lock when you switch apps or lock your phone. Your attendance records and sensitive workplace details will be accessible without an MPIN or biometrics.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Disable App Lock"
              disabled={isDisabling}
              onPress={handleConfirmDisableAppLock}
              style={({ pressed }) => [
                styles.destructiveBtn,
                pressed && { opacity: 0.85 },
                isDisabling && { opacity: 0.6 },
              ]}
            >
              {isDisabling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.destructiveBtnText}>Disable App Lock</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep App Lock Enabled"
              disabled={isDisabling}
              onPress={() => setShowDisableConfirmModal(false)}
              style={({ pressed }) => [
                styles.cancelSheetBtn,
                pressed && { backgroundColor: '#E2E8F0' },
              ]}
            >
              <Text style={styles.cancelSheetBtnText}>Keep App Lock Enabled</Text>
            </Pressable>

            <AdBanner position="bottom" safeBottom />
          </View>
        </View>
      </Modal>

      {/* 2. Custom Bottom Sheet Modal: Verify MPIN to Enable App Lock */}
      <Modal
        visible={showEnableVerifyModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          setShowEnableVerifyModal(false);
          setEnableVerifyPin('');
          setEnableVerifyError(null);
        }}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable
            style={styles.bottomSheetDismissArea}
            onPress={() => {
              setShowEnableVerifyModal(false);
              setEnableVerifyPin('');
              setEnableVerifyError(null);
            }}
          />
          <View style={styles.verifySheetCard}>
            <View style={styles.sheetDragHandle} />

            <View style={styles.verifyHeaderRow}>
              <View style={styles.backButtonPlaceholder} />
              <Text style={styles.verifyModalTitle}>Verify MPIN to Enable</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEnableVerifyModal(false);
                  setEnableVerifyPin('');
                  setEnableVerifyError(null);
                }}
                style={styles.modalCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={18} color={Palette.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.verifyModalSubtitle}>
              Enter your 4-digit security MPIN to turn on App Lock.
            </Text>

            {isVerifyingToEnable ? (
              <ActivityIndicator size="small" color={Palette.brandPrimary} style={{ marginBottom: 8 }} />
            ) : enableVerifyError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.changeErrorText}>{enableVerifyError}</Text>
              </View>
            ) : (
              <View style={{ height: 22, marginBottom: 6 }} />
            )}

            <MpinDots
              total={4}
              filledCount={enableVerifyPin.length}
              isError={Boolean(enableVerifyError)}
            />

            <TouchableOpacity
              onPress={() => {
                setShowEnableVerifyModal(false);
                setEnableVerifyPin('');
                setEnableVerifyError(null);
                openResetMpinModal();
              }}
              style={styles.forgotCurrentBtn}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="lock-reset" size={15} color={Palette.brandPrimary} />
              <Text style={styles.forgotCurrentText}>Forgot MPIN? Reset here</Text>
            </TouchableOpacity>

            <View style={{ width: '100%', marginTop: 12 }}>
              <MpinKeypad
                onDigit={handleEnableVerifyDigit}
                onBackspace={handleEnableVerifyBackspace}
                showBiometric={false}
                disabled={isVerifyingToEnable}
              />
            </View>

            {/* Banner ad at bottom of MPIN verify modal */}
            <AdBanner position="bottom" />
          </View>
        </View>
      </Modal>

      {/* 3. Custom Bottom Sheet Modal: Choose App Lock Type */}
      <Modal
        visible={showChooseLockTypeModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowChooseLockTypeModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable
            style={styles.bottomSheetDismissArea}
            onPress={() => setShowChooseLockTypeModal(false)}
          />
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetDragHandle} />

            <View style={styles.chooseTypeIconCircle}>
              <MaterialCommunityIcons name="shield-key-outline" size={34} color={Palette.brandPrimary} />
            </View>

            <View style={styles.chooseTypeBadgePill}>
              <Feather name="lock" size={11} color={Palette.brandPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.chooseTypeBadgeText}>CHOOSE LOCK METHOD</Text>
            </View>

            <Text style={styles.chooseTypeTitle}>Select App Lock Type</Text>
            <Text style={styles.chooseTypeSubtitle}>
              Choose how you want to authenticate when opening {APP_NAME}.
            </Text>

            <View style={styles.lockOptionsContainer}>
              {/* Option 1: 4-Digit MPIN */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose 4-Digit MPIN"
                onPress={() => handleSelectLockType('MPIN')}
                style={({ pressed }) => [
                  styles.lockOptionCard,
                  pressed && styles.lockOptionCardPressed,
                ]}
              >
                <View style={styles.lockOptionIconWrap}>
                  <MaterialCommunityIcons name="numeric-4-box-outline" size={24} color={Palette.brandPrimary} />
                </View>
                <View style={styles.lockOptionContent}>
                  <View style={styles.lockOptionTitleRow}>
                    <Text style={styles.lockOptionTitle}>4-Digit MPIN</Text>
                    <View style={styles.lockOptionBadge}>
                      <Text style={styles.lockOptionBadgeText}>STANDARD</Text>
                    </View>
                  </View>
                  <Text style={styles.lockOptionSubtitle}>
                    Fast, secure 4-digit numeric passcode to unlock
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
              </Pressable>

              {/* Option 2: Face ID (if supported) */}
              {(hasFaceId || isBiometricSupported) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose Face ID"
                  onPress={() => handleSelectLockType('FACE_ID')}
                  style={({ pressed }) => [
                    styles.lockOptionCard,
                    pressed && styles.lockOptionCardPressed,
                  ]}
                >
                  <View style={styles.lockOptionIconWrap}>
                    <MaterialCommunityIcons name="face-recognition" size={24} color={Palette.brandPrimary} />
                  </View>
                  <View style={styles.lockOptionContent}>
                    <View style={styles.lockOptionTitleRow}>
                      <Text style={styles.lockOptionTitle}>Face ID</Text>
                      <View style={[styles.lockOptionBadge, { backgroundColor: '#EAF7EE' }]}>
                        <Text style={[styles.lockOptionBadgeText, { color: Palette.success }]}>FACE UNLOCK</Text>
                      </View>
                    </View>
                    <Text style={styles.lockOptionSubtitle}>
                      Unlock instantly using facial recognition
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
                </Pressable>
              )}

              {/* Option 3: Fingerprint (if supported) */}
              {(hasFingerprint || isBiometricSupported) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose Fingerprint"
                  onPress={() => handleSelectLockType('FINGERPRINT')}
                  style={({ pressed }) => [
                    styles.lockOptionCard,
                    pressed && styles.lockOptionCardPressed,
                  ]}
                >
                  <View style={[styles.lockOptionIconWrap, { backgroundColor: '#FAF7EE', borderColor: '#E8E1CE' }]}>
                    <MaterialCommunityIcons name="fingerprint" size={24} color={Palette.brandPrimary} />
                  </View>
                  <View style={styles.lockOptionContent}>
                    <View style={styles.lockOptionTitleRow}>
                      <Text style={styles.lockOptionTitle}>Fingerprint</Text>
                      <View style={[styles.lockOptionBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.lockOptionBadgeText, { color: '#B45309' }]}>TOUCH SENSOR</Text>
                      </View>
                    </View>
                    <Text style={styles.lockOptionSubtitle}>
                      Unlock instantly with your touch sensor
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Palette.textSecondary} />
                </Pressable>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setShowChooseLockTypeModal(false)}
              style={({ pressed }) => [
                styles.cancelSheetBtn,
                pressed && { backgroundColor: '#E2E8F0' },
              ]}
            >
              <Text style={styles.cancelSheetBtnText}>Cancel</Text>
            </Pressable>

            <AdBanner position="bottom" safeBottom />
          </View>
        </View>
      </Modal>

      {/* Custom Bottom Sheet for Success Feedback */}
      <SuccessBottomSheet
        visible={successModal.visible}
        title={successModal.title}
        message={successModal.message}
        buttonLabel="Done"
        onClose={() => setSuccessModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonPlaceholder: {
    width: 38,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  statusSection: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    shadowColor: '#1B2210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  statusIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Palette.brandTint,
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusTextContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  statusDesc: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D8E2C4',
  },
  badgeInactive: {
    backgroundColor: Palette.dangerTint,
    borderWidth: 1,
    borderColor: '#F8BFC4',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeTextActive: {
    color: Palette.brandPrimary,
  },
  badgeTextInactive: {
    color: Palette.danger,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.textSecondary,
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: -4,
    paddingHorizontal: 4,
  },
  settingsList: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  disabledRow: {
    opacity: 0.42,
  },
  flatRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  flatIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D8E2C4',
  },
  flatTextWrap: {
    flex: 1,
  },
  flatRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  flatRowSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  noticeBox: {
    backgroundColor: Palette.brandTint,
    paddingVertical: 10,
    paddingHorizontal: 14,
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8E2C4',
  },
  noticeText: {
    fontSize: 12,
    color: Palette.brandPrimary,
    fontWeight: '600',
  },
  masterToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 14,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  masterToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  masterToggleSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  disabledNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: -4,
  },
  disabledNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: Palette.textSecondary,
    lineHeight: 17,
  },
  disabledSection: {
    opacity: 0.42,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  miniBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  miniBadgeActive: {
    backgroundColor: Palette.brandTint,
  },
  miniBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  miniBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  miniBadgeTextActive: {
    color: Palette.brandPrimary,
  },
  miniBadgeTextInactive: {
    color: Palette.textSecondary,
  },
  mpinActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  mpinActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D4E2BA',
  },
  mpinActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },
  mpinActionBtnSecondary: {
    flex: 0.55,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  mpinActionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  setupMpinInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.brandPrimary,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  setupMpinInlineText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  testLockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandPrimary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  testLockText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textInverse,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Palette.brandTint,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2C4',
    gap: 10,
  },
  infoText: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  securityPolicyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.border,
    alignSelf: 'center',
    marginTop: 4,
  },
  securityPolicyLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.brandPrimary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  modalContentWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 0,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  modalBody: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  modalSubtitleText: {
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalErrorBox: {
    paddingVertical: 2,
    paddingHorizontal: 16,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  changeErrorText: {
    fontSize: 13,
    color: Palette.danger,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  mpinActionsCol: {
    marginTop: 14,
    gap: 10,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resetActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7EE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E1CE',
  },
  resetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  resetActionSub: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  forgotCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    backgroundColor: Palette.brandTint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E2C4',
  },
  forgotCurrentText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.brandPrimary,
  },

  /* Custom Bottom Sheet Modals */
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bottomSheetDismissArea: {
    flex: 1,
    width: '100%',
  },
  bottomSheetCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 24,
  },
  sheetDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  disableIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  disableBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  disableBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  disableModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17202A',
    textAlign: 'center',
    marginBottom: 8,
  },
  disableModalDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 22,
  },
  destructiveBtn: {
    width: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  destructiveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cancelSheetBtn: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSheetBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#475569',
  },

  /* Verify MPIN Bottom Sheet Card */
  verifySheetCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 24,
  },
  verifyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  verifyModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  verifyModalSubtitle: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  /* Choose Lock Type Modal */
  chooseTypeIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Palette.brandTint,
    borderWidth: 1.5,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  chooseTypeBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D8E2C4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  chooseTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Palette.brandPrimary,
    letterSpacing: 0.8,
  },
  chooseTypeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17202A',
    textAlign: 'center',
    marginBottom: 6,
  },
  chooseTypeSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 18,
  },
  lockOptionsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  lockOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  lockOptionCardPressed: {
    backgroundColor: '#F8FAFC',
    borderColor: Palette.brandPrimary,
  },
  lockOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.brandTint,
    borderWidth: 1,
    borderColor: '#D8E2C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lockOptionContent: {
    flex: 1,
  },
  lockOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17202A',
  },
  lockOptionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Palette.brandTint,
  },
  lockOptionBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Palette.brandPrimary,
    letterSpacing: 0.5,
  },
  lockOptionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
});
