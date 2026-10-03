const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('BottomTabs and tab selectors define borderRadius and overflow hidden for Android compatibility', () => {
  const bottomTabsFile = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'BottomTabs.tsx'),
    'utf8'
  );
  
  // Verify BottomTabs has activeIndicator or activeIconContainer with borderRadius and overflow hidden
  assert.match(
    bottomTabsFile,
    /activeIndicator:\s*\{[^}]*borderRadius:\s*16[^}]*overflow:\s*['"]hidden['"]/s,
    'BottomTabs activeIndicator must define borderRadius: 16 and overflow: hidden'
  );

  assert.match(
    bottomTabsFile,
    /activeIconContainer:\s*\{[^}]*borderRadius:\s*16[^}]*overflow:\s*['"]hidden['"]/s,
    'BottomTabs activeIconContainer must define borderRadius: 16 and overflow: hidden'
  );

  const onboardingFile = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'OnboardingScreen.tsx'),
    'utf8'
  );

  assert.match(
    onboardingFile,
    /joinTabBtnActive:\s*\{[^}]*borderRadius:\s*8[^}]*overflow:\s*['"]hidden['"]/s,
    'Onboarding joinTabBtnActive must define borderRadius: 8 and overflow: hidden'
  );

  const qrModalFile = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'WorkplaceJoinQrModal.tsx'),
    'utf8'
  );

  assert.match(
    qrModalFile,
    /modeTabActive:\s*\{[^}]*borderRadius:\s*9[^}]*overflow:\s*['"]hidden['"]/s,
    'WorkplaceJoinQrModal modeTabActive must define borderRadius: 9 and overflow: hidden'
  );
});
