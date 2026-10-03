import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { APP_NAME } from '../constants/app';

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  hasFaceId: boolean;
  hasFingerprint: boolean;
  supportedTypes: number[];
  biometricLabel: 'Face ID' | 'Touch ID' | 'Fingerprint' | 'Face & Fingerprint' | 'Biometrics' | 'None';
}

export const biometricService = {
  /**
   * Check if device has hardware and enrolled biometrics
   */
  async checkCapabilities(): Promise<BiometricCapability> {
    try {
      const hwCheck = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const hasHardware = hwCheck || Platform.OS !== 'web';
      if (!hasHardware) {
        return {
          hasHardware: false,
          isEnrolled: false,
          hasFaceId: false,
          hasFingerprint: false,
          supportedTypes: [],
          biometricLabel: 'None',
        };
      }

      const isEnrolledCheck = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      const isEnrolled = isEnrolledCheck || Platform.OS === 'ios';
      const supportedTypes: number[] = (await LocalAuthentication.supportedAuthenticationTypesAsync().catch(() => [])) || [];

      const hasFaceId =
        supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
        supportedTypes.includes(2) ||
        Platform.OS === 'ios';
      const hasFingerprint =
        supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ||
        supportedTypes.includes(1) ||
        Platform.OS === 'android';

      let biometricLabel: 'Face ID' | 'Touch ID' | 'Fingerprint' | 'Face & Fingerprint' | 'Biometrics' | 'None' = 'Face & Fingerprint';
      if (hasFaceId && hasFingerprint) {
        biometricLabel = 'Face & Fingerprint';
      } else if (hasFaceId) {
        biometricLabel = 'Face ID';
      } else if (hasFingerprint) {
        biometricLabel = 'Fingerprint';
      }

      return {
        hasHardware,
        isEnrolled,
        hasFaceId,
        hasFingerprint,
        supportedTypes,
        biometricLabel,
      };
    } catch (e) {
      console.warn('[BiometricService] Failed to check capabilities:', e);
      return {
        hasHardware: false,
        isEnrolled: false,
        hasFaceId: false,
        hasFingerprint: false,
        supportedTypes: [],
        biometricLabel: 'None',
      };
    }
  },

  /**
   * Prompt user with biometric auth
   */
  async authenticate(promptMessage: string = `Unlock ${APP_NAME}`): Promise<boolean> {
    try {
      const caps = await this.checkCapabilities();
      if (!caps.hasHardware || !caps.isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Use MPIN',
        fallbackLabel: 'Use MPIN',
        disableDeviceFallback: true,
      });

      return Boolean(result?.success);
    } catch (e) {
      console.warn('[BiometricService] Authentication failed:', e);
      return false;
    }
  },
};
