const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('SecuritySettingsScreen displays individual lock options instead of combined MPIN + biometric titles', () => {
  const settingsCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'SecuritySettingsScreen.tsx'),
    'utf8'
  );

  // Assert modal does NOT contain combination titles
  assert.ok(
    !settingsCode.includes('MPIN + Face ID'),
    'Modal must not show combination title "MPIN + Face ID"'
  );
  assert.ok(
    !settingsCode.includes('MPIN + Fingerprint'),
    'Modal must not show combination title "MPIN + Fingerprint"'
  );

  // Assert individual option titles exist
  assert.match(
    settingsCode,
    /<Text style={styles\.lockOptionTitle}>Face ID<\/Text>/,
    'Must display individual Face ID option title'
  );
  assert.match(
    settingsCode,
    /<Text style={styles\.lockOptionTitle}>Fingerprint<\/Text>/,
    'Must display individual Fingerprint option title'
  );
  assert.match(
    settingsCode,
    /<Text style={styles\.lockOptionTitle}>4-Digit MPIN<\/Text>/,
    'Must display individual 4-Digit MPIN option title'
  );
});

test('Face ID and Fingerprint work individually and toggling one does not mutate the other', () => {
  const lockStoreCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'stores', 'lockStore.ts'),
    'utf8'
  );

  // Assert setBiometricEnabled does not clobber faceIdEnabled and fingerprintEnabled
  const setBioMatch = lockStoreCode.match(/setBiometricEnabled:\s*async\s*\(enabled:\s*boolean\)\s*=>\s*\{([\s\S]*?)\n\s*\},/);
  assert.ok(setBioMatch, 'setBiometricEnabled must exist');
  assert.ok(
    !setBioMatch[1].includes('faceIdEnabled: bioOn'),
    'setBiometricEnabled must not overwrite faceIdEnabled'
  );
  assert.ok(
    !setBioMatch[1].includes('fingerprintEnabled: bioOn'),
    'setBiometricEnabled must not overwrite fingerprintEnabled'
  );
});
