const test = require('node:test');
const assert = require('node:assert/strict');

test('join link and deep link parsing extracts token correctly', () => {
  // Test 1: web link with query params
  const webLink = 'https://bizora.app/join?token=encrypted_token_123&workplace=wp_abc';
  const url1 = new URL(webLink);
  assert.equal(url1.searchParams.get('token'), 'encrypted_token_123');

  // Test 2: custom scheme bizora://join?token=...
  const bizoraScheme = 'bizora://join?token=encrypted_token_456&workplace=wp_def';
  const normalized2 = bizoraScheme.replace(/^[a-zA-Z0-9+-.]+:\/\//, 'http://dummy/');
  const url2 = new URL(normalized2);
  assert.equal(url2.searchParams.get('token'), 'encrypted_token_456');

  // Test 3: attendance:// scheme
  const attScheme = 'attendance://join?token=encrypted_token_789&workplace=wp_ghi';
  const normalized3 = attScheme.replace(/^[a-zA-Z0-9+-.]+:\/\//, 'http://dummy/');
  const url3 = new URL(normalized3);
  assert.equal(url3.searchParams.get('token'), 'encrypted_token_789');

  // Test 4: 6-character code detection
  const code = 'B448D5';
  const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '');
  assert.equal(cleanCode.length, 6);
  assert.ok(/^[a-fA-F0-9]{6}$/.test(cleanCode));
});

test('maskEmail obfuscates employee email address for admin privacy', () => {
  function maskEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    if (local.length <= 4) {
      return `${local[0]}•••${local.slice(-1)}@${domain}`;
    }
    const first = local.slice(0, 2);
    const last = local.slice(-2);
    return `${first}••••${last}@${domain}`;
  }

  assert.equal(maskEmail(''), '');
  assert.equal(maskEmail(null), '');
  assert.equal(maskEmail('invalid-string'), 'invalid-string');
  assert.equal(maskEmail('a@gmail.com'), 'a***@gmail.com');
  assert.equal(maskEmail('ab@gmail.com'), 'a***@gmail.com');
  assert.equal(maskEmail('john@example.com'), 'j•••n@example.com');
  assert.equal(maskEmail('er.shivam.shankhdhar@gmail.com'), 'er••••ar@gmail.com');
  assert.equal(maskEmail('alex.developer@company.org'), 'al••••er@company.org');
});

