import { create } from 'zustand';
import { apiRequest, ApiError, getSessionVersion } from '../services/api';
import { biometricService } from '../services/biometricService';
import { mpinSecurityService } from '../services/mpinSecurityService';
import { readPreference, savePreference } from '../services/storage';
import type { UserProfile } from './authStore';

let isAuthenticatingBiometrics = false;

interface LockState {
  isLocked: boolean;
  hasMpin: boolean;
  appLockEnabled: boolean;
  biometricEnabled: boolean;
  faceIdEnabled: boolean;
  fingerprintEnabled: boolean;
  isBiometricSupported: boolean;
  hasFaceId: boolean;
  hasFingerprint: boolean;
  biometricLabel: 'Face ID' | 'Touch ID' | 'Fingerprint' | 'Face & Fingerprint' | 'Biometrics' | 'None';
  isSetupDismissed: boolean;
  shouldPromptSetupAfterSignIn: boolean;
  isLoading: boolean;
  failedAttempts: number;
  lockedUntil: string | null;
  showSecuritySettings: boolean;
  isResettingMpinAfterRelogin: boolean;

  initLockState: (user: UserProfile | null) => Promise<void>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
  lockApp: () => void;
  unlockApp: () => void;
  verifyMpin: (mpin: string) => Promise<boolean>;
  setupMpin: (mpin: string, enableBiometric?: boolean, preferredBiometric?: 'FACE_ID' | 'FINGERPRINT' | 'MPIN') => Promise<void>;
  resetMpin: (newMpin: string, enableBiometric?: boolean, resetToken?: string) => Promise<void>;
  changeMpin: (oldMpin: string | undefined, newMpin: string, resetToken?: string) => Promise<void>;
  requestMpinOtp: (purpose: 'RESET_MPIN' | 'CHANGE_MPIN') => Promise<{ maskedEmail: string; expiresInSeconds: number }>;
  verifyMpinOtp: (otp: string, purpose: 'RESET_MPIN' | 'CHANGE_MPIN') => Promise<{ resetToken: string }>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setFaceIdEnabled: (enabled: boolean) => Promise<void>;
  setFingerprintEnabled: (enabled: boolean) => Promise<void>;
  dismissSetup: () => void;
  setShouldPromptSetupAfterSignIn: (value: boolean) => void;
  tryBiometricUnlock: () => Promise<boolean>;
  openSecuritySettings: () => void;
  closeSecuritySettings: () => void;
  setIsResettingMpinAfterRelogin: (value: boolean) => void;
  resetLockState: () => void;
}

export function getMpinLockoutDurationMs(attempts: number): number {
  if (attempts < 5) return 0;
  switch (attempts) {
    case 5:
      return 30 * 1000; // 30 seconds
    case 6:
      return 2 * 60 * 1000; // 2 minutes
    case 7:
      return 5 * 60 * 1000; // 5 minutes
    case 8:
      return 10 * 60 * 1000; // 10 minutes
    case 9:
      return 20 * 60 * 1000; // 20 minutes
    default:
      return 24 * 60 * 60 * 1000; // 24 hours
  }
}

export const useLockStore = create<LockState>((set, get) => ({
  isLocked: false,
  hasMpin: false,
  appLockEnabled: false,
  biometricEnabled: false,
  faceIdEnabled: false,
  fingerprintEnabled: false,
  isBiometricSupported: false,
  hasFaceId: false,
  hasFingerprint: false,
  biometricLabel: 'None',
  isSetupDismissed: false,
  shouldPromptSetupAfterSignIn: false,
  isLoading: false,
  failedAttempts: 0,
  lockedUntil: null,
  showSecuritySettings: false,
  isResettingMpinAfterRelogin: false,

  setIsResettingMpinAfterRelogin: (value: boolean) => set({ isResettingMpinAfterRelogin: value }),
  setShouldPromptSetupAfterSignIn: (value: boolean) => set({ shouldPromptSetupAfterSignIn: value }),
  openSecuritySettings: () => set({ showSecuritySettings: true }),
  closeSecuritySettings: () => set({ showSecuritySettings: false }),

  initLockState: async (user: UserProfile | null) => {
    if (!user) {
      void mpinSecurityService.clearLocalMpin();
      void mpinSecurityService.clearPersistentMpin();
      set({
        isLocked: false,
        hasMpin: false,
        biometricEnabled: false,
        isSetupDismissed: false,
        shouldPromptSetupAfterSignIn: false,
        failedAttempts: 0,
        lockedUntil: null,
      });
      return;
    }

    const version = getSessionVersion();
    set({ isLoading: true });
    const { isResettingMpinAfterRelogin } = get();
    const userHasMpin = Boolean(user.hasMpin);
    const userBioEnabled = Boolean(user.biometricEnabled);

    // Read stored preferences
    let appLockEnabled = userHasMpin;
    let storedFaceId: boolean | null = null;
    let storedFingerprint: boolean | null = null;
    try {
      const [sLock, sFace, sFp] = await Promise.all([
        readPreference('bizora_app_lock_enabled'), readPreference('bizora_face_id_enabled'), readPreference('bizora_fingerprint_enabled'),
      ]);
      if (sLock !== null) appLockEnabled = sLock === 'true';
      if (sFace !== null) storedFaceId = sFace === 'true';
      if (sFp !== null) storedFingerprint = sFp === 'true';
    } catch {}

    if (version !== getSessionVersion()) return;

    // Establish the lock before protected screens become visible.
    if (userHasMpin && appLockEnabled && !isResettingMpinAfterRelogin) {
      set({
        hasMpin: true,
        appLockEnabled: true,
        biometricEnabled: userBioEnabled,
        isLocked: true,
      });
    }

    // Authentication restoration invalidates any verifier from a previous account.
    void mpinSecurityService.clearLocalMpin();

    try {
      const [caps, status] = await Promise.all([
        biometricService.checkCapabilities(),
        apiRequest<{ hasMpin: boolean; biometricEnabled: boolean; attemptsRemaining: number; lockedUntil: string | null }>('/auth/mpin/status').catch(() => null),
      ]);
      if (version !== getSessionVersion()) return;
      const isBiometricSupported = caps.hasHardware && caps.isEnrolled;
      const hasMpin = status ? Boolean(status.hasMpin) : userHasMpin;
      const biometricEnabled = status ? Boolean(status.biometricEnabled) : userBioEnabled;
      if (status) set({ failedAttempts: 5 - (status.attemptsRemaining ?? 5), lockedUntil: status.lockedUntil ?? null });

      if (version !== getSessionVersion()) return;

      const faceIdEnabled = storedFaceId !== null ? storedFaceId : (biometricEnabled && caps.hasFaceId);
      const fingerprintEnabled = storedFingerprint !== null ? storedFingerprint : (biometricEnabled && caps.hasFingerprint);

      set({
        hasMpin,
        appLockEnabled: hasMpin ? appLockEnabled : false,
        biometricEnabled,
        faceIdEnabled,
        fingerprintEnabled,
        isBiometricSupported,
        hasFaceId: caps.hasFaceId,
        hasFingerprint: caps.hasFingerprint,
        biometricLabel: caps.biometricLabel,
        isLocked: isResettingMpinAfterRelogin ? false : (hasMpin && appLockEnabled),
      });

      // Prompt biometric unlock if enabled and locked
      if (!isResettingMpinAfterRelogin && hasMpin && appLockEnabled && biometricEnabled && isBiometricSupported && (faceIdEnabled || fingerprintEnabled)) {
        setTimeout(() => {
          void get().tryBiometricUnlock();
        }, 80);
      }
    } catch (e) {
      console.warn('[LockStore] Init error:', e);
    } finally { if (version === getSessionVersion()) set({ isLoading: false }); }
  },

  setAppLockEnabled: async (enabled: boolean) => {
    try {
      await savePreference('bizora_app_lock_enabled', enabled ? 'true' : 'false');
    } catch {}
    set({
      appLockEnabled: enabled,
      isLocked: enabled ? get().hasMpin : false,
    });
  },

  lockApp: () => {
    const { hasMpin, appLockEnabled } = get();
    if (hasMpin && appLockEnabled) {
      set({ isLocked: true });
    }
  },

  unlockApp: () => {
    set({ isLocked: false, failedAttempts: 0 });
  },

  verifyMpin: async (mpin: string): Promise<boolean> => {
    // Still initialising — don't throw, just tell the caller to retry.
    if (get().isLoading) return false;
    const until = get().lockedUntil;
    if (until && Date.parse(until) > Date.now()) throw new Error('MPIN is temporarily locked. Please wait for the countdown.');
    const version = getSessionVersion();
    set({ isLoading: true });

    // 1. FAST LOCAL-FIRST PATH (<1ms):
    // If not locked out, check fast in-memory lease or hardware-backed persistent verifier
    const isLockedOut = (until && Date.parse(until) > Date.now()) || get().failedAttempts >= 5;
    if (!isLockedOut) {
      const inMemoryMatch = await mpinSecurityService.verifyLocalMpin(mpin).catch(() => null);
      const isLocalMatch = inMemoryMatch === true ? true : await mpinSecurityService.verifyPersistentMpin(mpin).catch(() => null);

      if (isLocalMatch === true) {
        // If there were failed attempts previously, validate with server to reset server counter
        if (get().failedAttempts > 0) {
          try {
            await apiRequest<{ verified: boolean }>('/auth/mpin/verify', { method: 'POST', body: { mpin } });
          } catch {}
        }
        await mpinSecurityService.saveLocalMpin(mpin).catch(() => {});
        set({ isLocked: false, failedAttempts: 0, lockedUntil: null, isLoading: false });
        return true;
      }
    }

    try {
      await mpinSecurityService.clearLocalMpin();
      const result = await apiRequest<{ verified: boolean }>('/auth/mpin/verify', { method: 'POST', body: { mpin } });
      if (version !== getSessionVersion() || !result.verified) return false;
      await mpinSecurityService.saveLocalMpin(mpin).catch(() => {});
      await mpinSecurityService.savePersistentMpin(mpin).catch(() => {});
      if (version !== getSessionVersion()) { void mpinSecurityService.clearLocalMpin(); return false; }
      set({ isLocked: false, failedAttempts: 0, lockedUntil: null });
      return true;
    } catch (error) {
      if (version !== getSessionVersion()) throw error;
      const isNetwork = (error instanceof ApiError && (error.code === 'NETWORK_ERROR' || error.statusCode === 0)) ||
        (error instanceof Error && (error.message.includes('network') || error.message.includes('reach the server')));
      if (isNetwork) {
        const persistentMatch = await mpinSecurityService.verifyPersistentMpin(mpin).catch(() => null);
        if (persistentMatch === true) {
          await mpinSecurityService.saveLocalMpin(mpin).catch(() => {});
          set({ isLocked: false, failedAttempts: 0, lockedUntil: null });
          return true;
        } else if (persistentMatch === false) {
          const nextAttempts = get().failedAttempts + 1;
          const lockoutMs = getMpinLockoutDurationMs(nextAttempts);
          const lockedUntil = lockoutMs > 0 ? new Date(Date.now() + lockoutMs).toISOString() : null;
          set({ failedAttempts: nextAttempts, lockedUntil });
          if (lockedUntil) {
            throw new ApiError('Too many failed attempts. MPIN temporarily locked.', 429, 'MPIN_LOCKED', {
              attemptsRemaining: 0,
              lockedUntil,
            });
          }
          throw new ApiError(`Incorrect MPIN. ${Math.max(0, 5 - nextAttempts)} attempts remaining.`, 400, 'INVALID_MPIN', {
            attemptsRemaining: Math.max(0, 5 - nextAttempts),
          });
        }
      }
      if (error instanceof ApiError && ['INVALID_MPIN', 'MPIN_LOCKED'].includes(error.code)) {
        const details = error.details as { attemptsRemaining?: number; lockedUntil?: string } | undefined;
        const serverLockedUntil = details?.lockedUntil ?? (error.code === 'MPIN_LOCKED' ? get().lockedUntil : null);
        const serverFailedAttempts = details?.attemptsRemaining !== undefined
          ? (details.attemptsRemaining === 0 ? Math.max(5, get().failedAttempts + 1) : 5 - details.attemptsRemaining)
          : (get().failedAttempts + 1);
        set({ failedAttempts: serverFailedAttempts, lockedUntil: serverLockedUntil });
      }
      throw error;
    } finally { if (version === getSessionVersion()) set({ isLoading: false }); }
  },

  setupMpin: async (mpin: string, enableBiometric?: boolean, preferredBiometric?: 'FACE_ID' | 'FINGERPRINT' | 'MPIN') => {
    const version = getSessionVersion();
    set({ isLoading: true });
    try {
      const res = await apiRequest<{ hasMpin: boolean; biometricEnabled: boolean }>('/auth/mpin/setup', {
        method: 'POST',
        body: { mpin, enableBiometric },
      });
      if (version !== getSessionVersion()) return;
      await mpinSecurityService.saveLocalMpin(mpin).catch(() => {});
      await mpinSecurityService.savePersistentMpin(mpin).catch(() => {});
      if (version !== getSessionVersion()) { void mpinSecurityService.clearLocalMpin(); return; }

      const { hasFaceId, hasFingerprint } = get();
      let faceIdEnabled = false;
      let fingerprintEnabled = false;

      if (enableBiometric && res.biometricEnabled) {
        if (preferredBiometric === 'FACE_ID') {
          faceIdEnabled = true;
          fingerprintEnabled = false;
        } else if (preferredBiometric === 'FINGERPRINT') {
          faceIdEnabled = false;
          fingerprintEnabled = true;
        } else {
          // If no specific preference, only enable the hardware that exists
          if (hasFingerprint && !hasFaceId) {
            fingerprintEnabled = true;
          } else {
            faceIdEnabled = true;
          }
        }
      }

      try {
        await Promise.all([
          savePreference('bizora_app_lock_enabled', 'true'),
          savePreference('bizora_face_id_enabled', faceIdEnabled ? 'true' : 'false'),
          savePreference('bizora_fingerprint_enabled', fingerprintEnabled ? 'true' : 'false'),
        ]);
      } catch {}

      set({
        hasMpin: true,
        appLockEnabled: true,
        biometricEnabled: Boolean(res.biometricEnabled),
        faceIdEnabled,
        fingerprintEnabled,
        isLocked: false,
        isSetupDismissed: true,
        shouldPromptSetupAfterSignIn: false,
        isLoading: false,
        failedAttempts: 0,
        lockedUntil: null,
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  resetMpin: async (newMpin: string, enableBiometric?: boolean, resetToken?: string) => {
    const version = getSessionVersion();
    set({ isLoading: true });
    try {
      const res = await apiRequest<{ hasMpin: boolean; biometricEnabled: boolean }>('/auth/mpin/reset', {
        method: 'POST', body: { mpin: newMpin, enableBiometric, resetToken },
      });
      if (version !== getSessionVersion()) return;
      await mpinSecurityService.saveLocalMpin(newMpin).catch(() => {});
      await mpinSecurityService.savePersistentMpin(newMpin).catch(() => {});
      if (version !== getSessionVersion()) { void mpinSecurityService.clearLocalMpin(); return; }
      const bioState = Boolean(res.biometricEnabled);

      set({
        hasMpin: true,
        biometricEnabled: bioState,
        isLocked: false,
        isSetupDismissed: true,
        shouldPromptSetupAfterSignIn: false,
        isResettingMpinAfterRelogin: false,
        isLoading: false,
        failedAttempts: 0,
        lockedUntil: null,
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  changeMpin: async (oldMpin: string | undefined, newMpin: string, resetToken?: string) => {
    const version = getSessionVersion();
    set({ isLoading: true });
    try {
      await apiRequest('/auth/mpin/change', {
        method: 'POST',
        body: { oldMpin, newMpin, resetToken },
      });
      if (version !== getSessionVersion()) return;
      await mpinSecurityService.saveLocalMpin(newMpin).catch(() => {});
      await mpinSecurityService.savePersistentMpin(newMpin).catch(() => {});
      if (version !== getSessionVersion()) { void mpinSecurityService.clearLocalMpin(); return; }
      set({ isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  requestMpinOtp: async (purpose: 'RESET_MPIN' | 'CHANGE_MPIN') => {
    return apiRequest<{ maskedEmail: string; expiresInSeconds: number }>('/auth/mpin/otp/request', {
      method: 'POST',
      body: { purpose },
    });
  },

  verifyMpinOtp: async (otp: string, purpose: 'RESET_MPIN' | 'CHANGE_MPIN') => {
    return apiRequest<{ resetToken: string }>('/auth/mpin/otp/verify', {
      method: 'POST',
      body: { otp, purpose },
    });
  },

  setBiometricEnabled: async (enabled: boolean) => {
    set({ isLoading: true });
    try {
      const res = await apiRequest<{ hasMpin: boolean; biometricEnabled: boolean }>('/auth/mpin/biometric', {
        method: 'POST',
        body: { enabled },
      });
      const bioOn = Boolean(res.biometricEnabled);
      set({
        biometricEnabled: bioOn,
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  setFaceIdEnabled: async (enabled: boolean) => {
    try {
      await savePreference('bizora_face_id_enabled', enabled ? 'true' : 'false');
    } catch {}
    const { fingerprintEnabled } = get();
    const anyEnabled = enabled || fingerprintEnabled;
    await get().setBiometricEnabled(anyEnabled);
    set({ faceIdEnabled: enabled });
  },

  setFingerprintEnabled: async (enabled: boolean) => {
    try {
      await savePreference('bizora_fingerprint_enabled', enabled ? 'true' : 'false');
    } catch {}
    const { faceIdEnabled } = get();
    const anyEnabled = enabled || faceIdEnabled;
    await get().setBiometricEnabled(anyEnabled);
    set({ fingerprintEnabled: enabled });
  },

  dismissSetup: () => {
    set({ isSetupDismissed: true, shouldPromptSetupAfterSignIn: false });
  },

  tryBiometricUnlock: async (): Promise<boolean> => {
    const { isBiometricSupported, biometricEnabled, isLocked, faceIdEnabled, fingerprintEnabled, appLockEnabled } = get();
    if (
      get().isLoading ||
      (get().lockedUntil && Date.parse(get().lockedUntil!) > Date.now()) ||
      !isLocked ||
      !appLockEnabled ||
      !biometricEnabled ||
      (!faceIdEnabled && !fingerprintEnabled) ||
      !isBiometricSupported ||
      isAuthenticatingBiometrics
    ) {
      return false;
    }

    const version = getSessionVersion();
    try {
      isAuthenticatingBiometrics = true;
      const prompt =
        faceIdEnabled && !fingerprintEnabled
          ? 'Unlock with Face ID'
          : fingerprintEnabled && !faceIdEnabled
          ? 'Unlock with Fingerprint'
          : 'Unlock Bizora';
      const success = await biometricService.authenticate(prompt);
      if (success && version === getSessionVersion()) {
        set({ isLocked: false, failedAttempts: 0 });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isAuthenticatingBiometrics = false;
    }
  },

  resetLockState: () => {
    void mpinSecurityService.clearLocalMpin();
    void mpinSecurityService.clearPersistentMpin();
    set({
      isLocked: false,
      hasMpin: false,
      biometricEnabled: false,
      isSetupDismissed: false,
      shouldPromptSetupAfterSignIn: false,
      failedAttempts: 0,
      showSecuritySettings: false,
      lockedUntil: null,
    });
  },
}));
