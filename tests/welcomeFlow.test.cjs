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
    ...globals,
  });
  return exports;
}

test('first-time user sees welcome screen initially, then transitions to sign in once acknowledged', async () => {
  const memoryStorage = new Map();
  const storageModule = load(
    'services/storage.ts',
    {
      'react-native': { Platform: { OS: 'web' } },
      'expo-secure-store': {},
    },
    {
      window: {
        localStorage: {
          getItem: (key) => memoryStorage.get(key) || null,
          setItem: (key, value) => memoryStorage.set(key, value),
          removeItem: (key) => memoryStorage.delete(key),
        },
      },
    }
  );

  // 1. Initial state: First time user has NOT seen welcome
  const initialSeen = await storageModule.getHasSeenWelcome();
  assert.equal(initialSeen, false, 'First time user must have hasSeenWelcome = false');

  // 2. User clicks Get Started on Welcome screen
  await storageModule.setHasSeenWelcome(true);

  // 3. Next app launch or reload: User has seen welcome and goes directly to Sign In
  const nextSeen = await storageModule.getHasSeenWelcome();
  assert.equal(nextSeen, true, 'Returning user must have hasSeenWelcome = true');
});
