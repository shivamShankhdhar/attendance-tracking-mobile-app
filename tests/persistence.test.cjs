const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const crypto = require('node:crypto');
function load(file, imports, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => imports[name], process: { env: {} }, URL, ...globals });
  return exports;
}

test('invitation survives restart, round-trips encoded tokens, clears on completion and expires', async () => {
  let now = 1000;
  const storage = new Map();
  const imports = { './storage': {
    readPreference: async (key) => storage.get(key) || null,
    savePreference: async (key, value) => value === null ? storage.delete(key) : storage.set(key, value),
  } };
  const create = () => load('workplaceLinks.ts', imports, { Date: { now: () => now } });
  let links = create();
  const token = 'encoded+/=&?#token';
  await links.savePendingJoin(token);
  links = create();
  assert.equal(await links.getPendingJoin(), token);
  for (const native of [true, false]) assert.equal(links.parseWorkplaceInvite(links.getWorkplaceLink(token, native)), token);
  await links.clearPendingJoin();
  assert.equal(await links.getPendingJoin(), null);
  await links.savePendingJoin(token);
  now += 8 * 86400000;
  assert.equal(await links.getPendingJoin(), null);
  assert.equal(storage.size, 0);
});

test('MPIN cache expires without extension on reads and reset replaces the verifier', async () => {
  let now = 1000;
  const { mpinSecurityService: cache } = load('mpinSecurityService.ts', {
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'sha256' }, randomUUID: crypto.randomUUID,
      digestStringAsync: async (_, input) => crypto.createHash('sha256').update(input).digest('hex') },
  }, { Date: { now: () => now } });
  assert.equal(await cache.verifyLocalMpin('1234'), null);
  await cache.saveLocalMpin('1234');
  assert.equal(await cache.verifyLocalMpin('1234'), true);
  assert.equal(await cache.verifyLocalMpin('0000'), false);
  now += 299000;
  assert.equal(await cache.verifyLocalMpin('1234'), true);
  now += 1001;
  assert.equal(await cache.verifyLocalMpin('1234'), null);
  await cache.saveLocalMpin('5678');
  assert.equal(await cache.verifyLocalMpin('1234'), false);
  assert.equal(await cache.verifyLocalMpin('5678'), true);
  await cache.clearLocalMpin();
  assert.equal(await cache.verifyLocalMpin('5678'), null);
});
