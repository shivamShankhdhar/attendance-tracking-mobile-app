const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => imports[name] || require(name),
    console,
    process: { env: {} },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    ...globals,
  });
  return exports;
}

test('Lock & MPIN flow: setup, lock on background, verify unlock, and security settings navigation', async () => {
  let backendHasMpin = false;
  let backendBioEnabled = false;

  class ApiError extends Error { constructor(message, statusCode, code, details) { super(message); this.statusCode = statusCode; this.code = code; this.details = details; } }
  const fakeApi = {
    getSessionVersion: () => 0, ApiError,
    apiRequest: async (endpoint, options = {}) => {
      if (endpoint === '/auth/mpin/status') {
        return { hasMpin: backendHasMpin, biometricEnabled: backendBioEnabled };
      }
      if (endpoint === '/auth/mpin/setup' || endpoint === '/auth/mpin/reset') {
        const { mpin, enableBiometric } = options.body || {};
        if (mpin === '1234' || mpin === '5678') {
          backendHasMpin = true;
          backendBioEnabled = typeof enableBiometric === 'boolean' ? enableBiometric : backendBioEnabled;
          return { hasMpin: true, biometricEnabled: backendBioEnabled };
        }
        throw new Error('Invalid PIN');
      }
      if (endpoint === '/auth/mpin/verify') {
        const { mpin } = options.body || {};
        if (mpin === '1234') {
          return { verified: true };
        }
        throw new ApiError('Incorrect MPIN', 400, 'INVALID_MPIN', { attemptsRemaining: 4 });
      }
      if (endpoint === '/auth/mpin/biometric') {
        const { enabled } = options.body || {};
        backendBioEnabled = enabled;
        return { hasMpin: true, biometricEnabled: enabled };
      }
      return {};
    },
  };

  const fakeBiometric = {
    biometricService: {
      checkCapabilities: async () => ({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [2],
        biometricLabel: 'Face ID',
      }),
      authenticate: async () => true,
    },
  };

  const zustandModule = {
    create: (fn) => {
      let state = {};
      const set = (updater) => {
        const next = typeof updater === 'function' ? updater(state) : updater;
        state = { ...state, ...next };
      };
      const get = () => state;
      state = fn(set, get);
      return Object.assign(() => state, {
        getState: get,
        setState: set,
      });
    },
  };

  const mpinSecurityModule = load('services/mpinSecurityService.ts', { 'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'sha256' }, randomUUID: require('node:crypto').randomUUID, digestStringAsync: async (_, value) => require('node:crypto').createHash('sha256').update(value).digest('hex') } });

  const lockModule = load('stores/lockStore.ts', {
    zustand: zustandModule,
    '../services/api': fakeApi,
    '../services/biometricService': fakeBiometric,
    '../services/mpinSecurityService': mpinSecurityModule,
    '../services/storage': { readPreference: async () => null, savePreference: async () => {} },
  });

  const store = lockModule.useLockStore;

  // 1. Initial State: Unauthenticated or new user without MPIN
  await store.getState().initLockState({
    id: 'user_1',
    name: 'Shivam',
    status: 'ACTIVE',
    hasMpin: false,
    biometricEnabled: false,
  });

  assert.equal(store.getState().hasMpin, false);
  assert.equal(store.getState().isLocked, false);
  assert.equal(store.getState().isSetupDismissed, false);

  // 2. User can dismiss setup prompt for later
  store.getState().dismissSetup();
  assert.equal(store.getState().isSetupDismissed, true);

  // 3. User sets up 4-digit MPIN
  await store.getState().setupMpin('1234', true);
  assert.equal(store.getState().hasMpin, true);
  assert.equal(store.getState().biometricEnabled, true);
  assert.equal(store.getState().isLocked, false);

  // 4. Background lock engages immediately when app goes to background / screen lock
  store.getState().lockApp();
  assert.equal(store.getState().isLocked, true, 'App must be locked on background transition');

  // 5. Wrong MPIN verification throws and increments failed attempts
  await assert.rejects(async () => {
    await store.getState().verifyMpin('9999');
  });
  assert.equal(store.getState().isLocked, true);
  assert.equal(store.getState().failedAttempts, 1);

  // 6. Correct MPIN verification unlocks the app
  const unlocked = await store.getState().verifyMpin('1234');
  assert.equal(unlocked, true);
  assert.equal(store.getState().isLocked, false, 'App must unlock upon correct MPIN');
  assert.equal(store.getState().failedAttempts, 0);

  // 7. Security settings navigation
  assert.equal(store.getState().showSecuritySettings, false);
  store.getState().openSecuritySettings();
  assert.equal(store.getState().showSecuritySettings, true);
  store.getState().closeSecuritySettings();
  assert.equal(store.getState().showSecuritySettings, false);

  // 8. Biometric unlock
  store.getState().lockApp();
  assert.equal(store.getState().isLocked, true);
  const bioUnlocked = await store.getState().tryBiometricUnlock();
  assert.equal(bioUnlocked, true);
  assert.equal(store.getState().isLocked, false);

  // 9. Reset MPIN directly (e.g. after login or via lock screen biometric reset)
  await store.getState().resetMpin('5678', true);
  assert.equal(store.getState().hasMpin, true);
  assert.equal(store.getState().isLocked, false);
  assert.equal(store.getState().failedAttempts, 0);

  // 10. Forgot MPIN flow: User flags reset via re-login
  store.getState().setIsResettingMpinAfterRelogin(true);
  assert.equal(store.getState().isResettingMpinAfterRelogin, true);

  // When user re-authenticates and initLockState is called:
  await store.getState().initLockState({
    id: 'user_1',
    name: 'Shivam',
    status: 'ACTIVE',
    hasMpin: true,
    biometricEnabled: true,
  });
  // Must NOT lock the app so user can proceed to reset screen!
  assert.equal(store.getState().isLocked, false, 'App must not be locked when resetting after re-login');
  assert.equal(store.getState().isResettingMpinAfterRelogin, true);
});

test('MPIN successes use a memory lease while failed attempts remain authoritative', async () => {
  let serverVerifyCalls = 0;

  class ApiError extends Error { constructor(message, statusCode, code, details) { super(message); this.statusCode = statusCode; this.code = code; this.details = details; } }
  const fakeApi = {
    getSessionVersion: () => 0, ApiError,
    apiRequest: async (endpoint, options = {}) => {
      if (endpoint === '/auth/mpin/setup') {
        return { hasMpin: true, biometricEnabled: false };
      }
      if (endpoint === '/auth/mpin/verify') {
        serverVerifyCalls++;
        if (options.body.mpin === '0000') throw new ApiError('Incorrect MPIN', 400, 'INVALID_MPIN', { attemptsRemaining: 4 });
        return { verified: true };
      }
      return {};
    },
  };

  const fakeBiometric = {
    biometricService: {
      checkCapabilities: async () => ({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricLabel: 'None',
      }),
      authenticate: async () => false,
    },
  };

  const zustandModule = {
    create: (fn) => {
      let state = {};
      const set = (updater) => {
        const next = typeof updater === 'function' ? updater(state) : updater;
        state = { ...state, ...next };
      };
      const get = () => state;
      state = fn(set, get);
      return Object.assign(() => state, {
        getState: get,
        setState: set,
      });
    },
  };

  const mpinSecurityModule = load('services/mpinSecurityService.ts', { 'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'sha256' }, randomUUID: require('node:crypto').randomUUID, digestStringAsync: async (_, value) => require('node:crypto').createHash('sha256').update(value).digest('hex') } });
  const lockModule = load('stores/lockStore.ts', {
    zustand: zustandModule,
    '../services/api': fakeApi,
    '../services/biometricService': fakeBiometric,
    '../services/mpinSecurityService': mpinSecurityModule,
    '../services/storage': { readPreference: async () => null, savePreference: async () => {} },
  });

  const store = lockModule.useLockStore;

  // Set up MPIN '4321'
  await store.getState().setupMpin('4321', false);
  store.getState().lockApp();
  assert.equal(store.getState().isLocked, true);

  // A recent successful setup primes the memory cache.
  serverVerifyCalls = 0;
  const unlocked = await store.getState().verifyMpin('4321');

  assert.equal(unlocked, true);
  assert.equal(store.getState().isLocked, false);
  assert.equal(serverVerifyCalls, 0, 'A recently server-confirmed PIN uses the memory lease');

  // Wrong MPIN remains locked and updates the server-provided attempt count.
  store.getState().lockApp();
  await assert.rejects(async () => {
    await store.getState().verifyMpin('0000');
  });
  assert.equal(serverVerifyCalls, 1);
  assert.equal(store.getState().failedAttempts, 1);
  store.setState({ lockedUntil: new Date(Date.now() + 1800000).toISOString() });
  await assert.rejects(store.getState().verifyMpin('4321'), /temporarily locked/);
  assert.equal(serverVerifyCalls, 1, 'Countdown prevents extra guesses');
  store.setState({ lockedUntil: null });

  const recovered = await store.getState().verifyMpin('4321');
  assert.equal(recovered, true);
  assert.equal(serverVerifyCalls, 2, 'Success after a failed attempt must reset the server counter');
  store.getState().lockApp();

  // MPIN Reset must automatically unlock the app
  assert.equal(store.getState().isLocked, true, 'App is locked before reset');
  await store.getState().resetMpin('9999', false);
  assert.equal(store.getState().isLocked, false, 'App must be unlocked immediately after resetting MPIN');
  assert.equal(store.getState().hasMpin, true);

  // New MPIN 9999 unlocks immediately
  store.getState().lockApp();
  assert.equal(store.getState().isLocked, true);
  const unlockedWithNewPin = await store.getState().verifyMpin('9999');
  assert.equal(unlockedWithNewPin, true);
  assert.equal(serverVerifyCalls, 2, 'Reset immediately updates the memory verifier');
  await mpinSecurityModule.mpinSecurityService.clearLocalMpin();
  store.getState().lockApp();
  await store.getState().verifyMpin('9999');
  assert.equal(serverVerifyCalls, 3, 'A cold cache validates against the server');
  assert.equal(store.getState().isLocked, false);
});

test('Hybrid MPIN model: offline unlock works via persistent verifier and enforces local lockout', async () => {
  let isOffline = false;
  class ApiError extends Error { constructor(message, statusCode, code, details) { super(message); this.statusCode = statusCode; this.code = code; this.details = details; } }
  
  const fakeApi = {
    getSessionVersion: () => 0, ApiError,
    apiRequest: async (endpoint, options = {}) => {
      if (isOffline) {
        throw new ApiError('Unable to reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
      }
      if (endpoint === '/auth/mpin/setup') {
        return { hasMpin: true, biometricEnabled: false };
      }
      if (endpoint === '/auth/mpin/verify') {
        if (options.body.mpin === '1234') return { verified: true };
        throw new ApiError('Incorrect MPIN', 400, 'INVALID_MPIN', { attemptsRemaining: 4 });
      }
      return {};
    },
  };

  const fakeBiometric = {
    biometricService: {
      checkCapabilities: async () => ({ hasHardware: false, isEnrolled: false, supportedTypes: [], biometricLabel: 'None' }),
      authenticate: async () => false,
    },
  };

  const zustandModule = {
    create: (fn) => {
      let state = {};
      const set = (updater) => {
        const next = typeof updater === 'function' ? updater(state) : updater;
        state = { ...state, ...next };
      };
      const get = () => state;
      state = fn(set, get);
      return Object.assign(() => state, { getState: get, setState: set });
    },
  };

  const persistentStore = new Map();
  const storageModule = {
    readPreference: async (k) => persistentStore.get(k) || null,
    savePreference: async (k, v) => v === null ? persistentStore.delete(k) : persistentStore.set(k, v),
  };

  const mpinSecurityModule = load('services/mpinSecurityService.ts', {
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'sha256' },
      randomUUID: require('node:crypto').randomUUID,
      digestStringAsync: async (_, input) => require('node:crypto').createHash('sha256').update(input).digest('hex'),
    },
    './storage': storageModule,
  });

  const lockModule = load('stores/lockStore.ts', {
    zustand: zustandModule,
    '../services/api': fakeApi,
    '../services/biometricService': fakeBiometric,
    '../services/mpinSecurityService': mpinSecurityModule,
    '../services/storage': storageModule,
  });

  const store = lockModule.useLockStore;

  // 1. Online: Setup MPIN '1234'
  await store.getState().setupMpin('1234', false);
  assert.equal(store.getState().hasMpin, true);

  // 2. Clear memory lease to simulate a fresh lock or app background after lease timeout
  await mpinSecurityModule.mpinSecurityService.clearLocalMpin();
  store.getState().lockApp();
  assert.equal(store.getState().isLocked, true);

  // 3. User goes OFFLINE (elevator / airplane mode / subway)
  isOffline = true;

  // 4. Entering WRONG MPIN offline throws INVALID_MPIN and increments failed attempts locally
  await assert.rejects(async () => {
    await store.getState().verifyMpin('9999');
  }, /Incorrect MPIN/);
  assert.equal(store.getState().isLocked, true);
  assert.equal(store.getState().failedAttempts, 1);

  // 5. Entering CORRECT MPIN offline verifies via hardware persistent verifier and unlocks!
  const offlineUnlocked = await store.getState().verifyMpin('1234');
  assert.equal(offlineUnlocked, true);
  assert.equal(store.getState().isLocked, false, 'App must unlock offline with persistent verifier');
  assert.equal(store.getState().failedAttempts, 0);

  // 6. Test offline lockout after 5 consecutive failed attempts
  store.getState().lockApp();
  for (let i = 1; i <= 4; i++) {
    await assert.rejects(async () => {
      await store.getState().verifyMpin('0000');
    });
    assert.equal(store.getState().failedAttempts, i);
  }
  // 5th attempt locks out
  await assert.rejects(async () => {
    await store.getState().verifyMpin('0000');
  }, /Too many failed attempts/);
  assert.equal(store.getState().failedAttempts, 5);
  assert.ok(store.getState().lockedUntil);
  const diffMs = Date.parse(store.getState().lockedUntil) - Date.now();
  assert.ok(diffMs > 28000 && diffMs <= 30000, `Expected ~30s, got ${diffMs}`);

  // While locked out, even the correct MPIN is rejected without calling server or verifier
  await assert.rejects(async () => {
    await store.getState().verifyMpin('1234');
  }, /temporarily locked/);
});

test('Email OTP verification required for MPIN Reset and Change', async () => {
  let activeResetToken = null;
  let currentMpin = '1234';

  const fakeApi = {
    getSessionVersion: () => 0,
    apiRequest: async (endpoint, options = {}) => {
      if (endpoint === '/auth/mpin/otp/request') {
        assert.ok(options.body.purpose === 'RESET_MPIN' || options.body.purpose === 'CHANGE_MPIN');
        return { maskedEmail: 'u***@example.com', expiresInSeconds: 600 };
      }
      if (endpoint === '/auth/mpin/otp/verify') {
        if (options.body.otp === '654321') {
          activeResetToken = 'valid-reset-token-uuid';
          return { resetToken: activeResetToken };
        }
        throw new Error('Invalid verification code');
      }
      if (endpoint === '/auth/mpin/reset') {
        assert.equal(options.body.resetToken, 'valid-reset-token-uuid');
        currentMpin = options.body.mpin;
        activeResetToken = null;
        return { hasMpin: true, biometricEnabled: false };
      }
      if (endpoint === '/auth/mpin/change') {
        assert.equal(options.body.resetToken, 'valid-reset-token-uuid');
        currentMpin = options.body.newMpin;
        activeResetToken = null;
        return { success: true };
      }
      return {};
    },
  };

  const zustandModule = {
    create: (fn) => {
      let state = {};
      const set = (updater) => {
        const next = typeof updater === 'function' ? updater(state) : updater;
        state = { ...state, ...next };
      };
      const get = () => state;
      state = fn(set, get);
      return Object.assign(() => state, {
        getState: get,
        setState: set,
      });
    },
  };

  const mpinSecurityModule = load(
    'services/mpinSecurityService.ts',
    {
      'expo-crypto': {
        CryptoDigestAlgorithm: { SHA256: 'sha256' },
        randomUUID: require('node:crypto').randomUUID,
        digestStringAsync: async (_, value) => require('node:crypto').createHash('sha256').update(value).digest('hex'),
      },
    }
  );

  const storeModule = load(
    'stores/lockStore.ts',
    {
      'zustand': zustandModule,
      './authStore': { useAuthStore: { getState: () => ({ logout: async () => {} }) } },
      '../services/api': fakeApi,
      '../services/mpinSecurityService': mpinSecurityModule,
      '../services/storage': { readPreference: async () => null, savePreference: async () => {} },
      '../services/biometricService': { biometricService: { checkSupport: async () => ({ isSupported: false, biometricType: 'None' }) } },
    },
    { atob: (str) => Buffer.from(str, 'base64').toString('binary') }
  );

  const store = storeModule.useLockStore;

  // 1. Request Reset OTP
  const reqRes = await store.getState().requestMpinOtp('RESET_MPIN');
  assert.equal(reqRes.maskedEmail, 'u***@example.com');

  // 2. Reject incorrect OTP
  await assert.rejects(async () => {
    await store.getState().verifyMpinOtp('000000', 'RESET_MPIN');
  }, /Invalid verification code/);

  // 3. Verify correct OTP
  const verifyRes = await store.getState().verifyMpinOtp('654321', 'RESET_MPIN');
  assert.equal(verifyRes.resetToken, 'valid-reset-token-uuid');

  // 4. Reset MPIN using resetToken
  await store.getState().resetMpin('8888', false, verifyRes.resetToken);
  assert.equal(currentMpin, '8888');
  assert.equal(store.getState().isLocked, false);

  // 5. Change MPIN using OTP resetToken without needing old MPIN
  const changeVerify = await store.getState().verifyMpinOtp('654321', 'CHANGE_MPIN');
  await store.getState().changeMpin(undefined, '9999', changeVerify.resetToken);
  assert.equal(currentMpin, '9999');
});

test('App Lock toggle: disable and enable with MPIN verification', async () => {
  let backendHasMpin = true;
  let backendBio = false;
  let currentMpin = '4321';
  let appLockPref = 'true';

  class ApiError extends Error {
    constructor(message, statusCode, code) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  }

  const fakeApi = {
    getSessionVersion: () => 0,
    ApiError,
    apiRequest: async (endpoint, options = {}) => {
      if (endpoint === '/auth/mpin/status') {
        return { hasMpin: backendHasMpin, biometricEnabled: backendBio };
      }
      if (endpoint === '/auth/mpin/verify') {
        const { mpin } = options.body || {};
        if (mpin === currentMpin) {
          return { verified: true };
        }
        throw new ApiError('Incorrect MPIN', 400, 'INVALID_MPIN');
      }
      if (endpoint === '/auth/mpin/setup') {
        const { mpin, enableBiometric } = options.body || {};
        currentMpin = mpin;
        backendHasMpin = true;
        backendBio = Boolean(enableBiometric);
        return { hasMpin: true, biometricEnabled: backendBio };
      }
      return {};
    },
  };

  const zustandModule = {
    create: (fn) => {
      let state;
      const set = (partial) => {
        state = typeof partial === 'function' ? { ...state, ...partial(state) } : { ...state, ...partial };
      };
      const get = () => state;
      state = fn(set, get);
      return Object.assign(() => state, {
        getState: get,
        setState: set,
      });
    },
  };

  const mpinSecurityModule = load(
    'services/mpinSecurityService.ts',
    {
      'expo-crypto': {
        CryptoDigestAlgorithm: { SHA256: 'sha256' },
        randomUUID: require('node:crypto').randomUUID,
        digestStringAsync: async (_, value) => require('node:crypto').createHash('sha256').update(value).digest('hex'),
      },
    }
  );

  const storeModule = load(
    'stores/lockStore.ts',
    {
      'zustand': zustandModule,
      './authStore': { useAuthStore: { getState: () => ({ logout: async () => {} }) } },
      '../services/api': fakeApi,
      '../services/mpinSecurityService': mpinSecurityModule,
      '../services/storage': {
        readPreference: async () => appLockPref,
        savePreference: async (_, val) => { appLockPref = val; },
      },
      '../services/biometricService': {
        biometricService: {
          checkSupport: async () => ({ isSupported: true, hasFaceId: true, biometricType: 'FaceID' }),
          checkCapabilities: async () => ({
            hasHardware: true,
            isEnrolled: true,
            hasFaceId: true,
            hasFingerprint: false,
            supportedTypes: [2],
            biometricLabel: 'Face ID',
          }),
        },
      },
    },
    { atob: (str) => Buffer.from(str, 'base64').toString('binary') }
  );

  const store = storeModule.useLockStore;
  await store.getState().initLockState({ id: 'u1' });
  assert.equal(store.getState().appLockEnabled, true);

  // 1. Disable app lock
  await store.getState().setAppLockEnabled(false);
  assert.equal(store.getState().appLockEnabled, false);
  assert.equal(appLockPref, 'false');

  // 2. Enabling app lock: incorrect MPIN verification fails
  await assert.rejects(async () => {
    await store.getState().verifyMpin('0000');
  }, /Incorrect MPIN/);
  assert.equal(store.getState().appLockEnabled, false);

  // 3. Enabling app lock: correct MPIN verification succeeds
  const verified = await store.getState().verifyMpin('4321');
  assert.equal(verified, true);
  await store.getState().setAppLockEnabled(true);
  assert.equal(store.getState().appLockEnabled, true);
  assert.equal(appLockPref, 'true');

  // 4. Setup with chosen lock type (MPIN + Face ID)
  backendHasMpin = false;
  await store.getState().setupMpin('7777', true);
  await store.getState().setFaceIdEnabled(true);
  assert.equal(store.getState().hasMpin, true);
  assert.equal(store.getState().appLockEnabled, true);
  assert.equal(store.getState().faceIdEnabled, true);
  assert.equal(currentMpin, '7777');
});

