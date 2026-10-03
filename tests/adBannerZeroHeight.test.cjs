const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('AdBanner source code guarantees 0 height until loaded', () => {
  const adBannerSource = fs.readFileSync(
    path.join(__dirname, '../src/components/AdBanner.tsx'),
    'utf8'
  );

  // 1. If !BannerAd, must return null (zero elements, zero space)
  assert.ok(
    adBannerSource.includes('if (!BannerAd) {\n    return null;\n  }'),
    'AdBanner must return null if BannerAd native module is unavailable'
  );

  // 2. If loadFailed, must return null (zero elements, zero space, no empty slot left behind)
  assert.ok(
    adBannerSource.includes('if (loadFailed) {\n    return null;\n  }'),
    'AdBanner must return null if ad failed to load'
  );

  // 3. Must not render placeholder pills or placeholder overlays
  assert.ok(
    !adBannerSource.includes('placeholderOverlay'),
    'AdBanner must not render placeholder overlay taking up space'
  );
  assert.ok(
    !adBannerSource.includes('placeholderPill'),
    'AdBanner must not render placeholder pill'
  );

  // 4. While not loaded, container must use styles.hidden with height: 0, maxHeight: 0, overflow: hidden
  assert.ok(
    adBannerSource.includes('hidden: {') &&
    adBannerSource.includes('height: 0') &&
    adBannerSource.includes('maxHeight: 0'),
    'AdBanner hidden style must specify 0 height and 0 maxHeight'
  );

  // 5. Container only applies bottomSlot / cardSlot / inlineLoaded and caller style when isLoaded is true
  assert.ok(
    adBannerSource.includes('isLoaded\n          ?'),
    'AdBanner must only apply visible styles when isLoaded is true'
  );
});
