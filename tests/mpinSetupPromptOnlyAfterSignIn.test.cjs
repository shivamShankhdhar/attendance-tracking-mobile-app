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

test('MPIN setup is only prompted right after active sign in, not on regular app opens', async () => {
  class ApiError extends Error {
    constructor(message, statusCode, code, details) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
    }
  }

  const fakeApi = {
    getSessionVersion: () => 0,
    ApiError,
    apiRequest: async (endpoint) => {
      if (endpoint === '/auth/mpin/status') {
        return { hasMpin: false, biometricEnabled: false };
      }
      return {};
    },
  };

  const fakeStorage = new Map();
  const fakeStorageModule = {
    readPreference: async (k) => fakeStorage.get(k) || null,
    savePreference: async (k, v) => fakeStorage.set(k, v),
  };

  const fakeBiometrics = {
    checkCapabilities: async () => ({
      hasHardware: false,
      isEnrolled: false,
      hasFaceId: false,
      hasFingerprint: false,
      biometricLabel: 'None',
    }),
    authenticate: async () => false,
  };

  const fakeSecurity = {
    saveLocalMpin: async () => {},
    clearLocalMpin: async () => {},
    savePersistentMpin: async () => {},
    clearPersistentMpin: async () => {},
    verifyLocalMpin: async () => null,
    verifyPersistentMpin: async () => null,
  };

  const { useLockStore } = load('stores/lockStore.ts', {
    '../services/api': fakeApi,
    '../services/storage': fakeStorageModule,
    '../services/biometricService': { biometricService: fakeBiometrics },
    '../services/mpinSecurityService': { mpinSecurityService: fakeSecurity },
  });

  const userWithoutMpin = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    status: 'ACTIVE',
    hasMpin: false,
  };

  // 1. App Launch / Cold Start: User opens the app with restored session
  await useLockStore.getState().initLockState(userWithoutMpin);

  const initialAppOpenState = useLockStore.getState();
  assert.equal(initialAppOpenState.hasMpin, false);
  assert.equal(initialAppOpenState.shouldPromptSetupAfterSignIn, false, 'shouldPromptSetupAfterSignIn must be false on app launch');

  // Verify the index.tsx guard for MPIN setup prompt:
  // if (!hasMpin && shouldPromptSetupAfterSignIn && !isSetupDismissed)
  const shouldPromptOnAppOpen =
    !initialAppOpenState.hasMpin &&
    initialAppOpenState.shouldPromptSetupAfterSignIn &&
    !initialAppOpenState.isSetupDismissed;

  assert.equal(shouldPromptOnAppOpen, false, 'MPIN setup prompt must NOT show on regular app open');

  // 2. Active Sign In occurs
  useLockStore.getState().setShouldPromptSetupAfterSignIn(true);
  const afterSignInState = useLockStore.getState();
  assert.equal(afterSignInState.shouldPromptSetupAfterSignIn, true);

  const shouldPromptAfterSignIn =
    !afterSignInState.hasMpin &&
    afterSignInState.shouldPromptSetupAfterSignIn &&
    !afterSignInState.isSetupDismissed;

  assert.equal(shouldPromptAfterSignIn, true, 'MPIN setup prompt MUST show after active sign-in');

  // 3. User taps "Set up later" (dismissSetup)
  useLockStore.getState().dismissSetup();
  const afterDismissState = useLockStore.getState();
  assert.equal(afterDismissState.isSetupDismissed, true);
  assert.equal(afterDismissState.shouldPromptSetupAfterSignIn, false);

  const shouldPromptAfterDismiss =
    !afterDismissState.hasMpin &&
    afterDismissState.shouldPromptSetupAfterSignIn &&
    !afterDismissState.isSetupDismissed;

  assert.equal(shouldPromptAfterDismiss, false, 'MPIN setup prompt must disappear when dismissed');

  // 4. User closes and re-opens app next time
  await useLockStore.getState().initLockState(userWithoutMpin);
  const nextLaunchState = useLockStore.getState();
  assert.equal(nextLaunchState.shouldPromptSetupAfterSignIn, false);

  const shouldPromptOnNextLaunch =
    !nextLaunchState.hasMpin &&
    nextLaunchState.shouldPromptSetupAfterSignIn &&
    !nextLaunchState.isSetupDismissed;

  assert.equal(shouldPromptOnNextLaunch, false, 'MPIN setup prompt must NOT show on next app launch');
});
