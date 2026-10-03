const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('SignInScreen does not contain a back button in brandRow', () => {
  const signInCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'SignInScreen.tsx'),
    'utf8'
  );

  // Assert no back button exists in SignInScreen
  assert.ok(
    !signInCode.includes('accessibilityLabel="Back to welcome tour"'),
    'SignInScreen must not contain Back to welcome tour button'
  );
  assert.ok(
    !signInCode.includes('styles.backBtn'),
    'SignInScreen must not use backBtn style'
  );
});

test('Dark theme uses attractive midnight slate obsidian and elevated card tones rather than pitch black or muddy green', () => {
  const colorsCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'constants', 'colors.ts'),
    'utf8'
  );

  // Assert DarkPalette canvas is sleek midnight slate obsidian, NOT pitch black #000000 or muddy green
  assert.match(
    colorsCode,
    /canvas:\s*['"]#0C0E12['"]/,
    'DarkPalette canvas must be sleek midnight slate obsidian #0C0E12'
  );

  assert.match(
    colorsCode,
    /surface:\s*['"]#161920['"]/,
    'DarkPalette surface must be elevated midnight slate card #161920'
  );

  assert.match(
    colorsCode,
    /brandPrimary:\s*['"]#95D624['"]/,
    'DarkPalette brandPrimary must be vibrant electric lime #95D624'
  );
});

test('SafeAreaProvider in _layout.tsx does not use a key that destroys router on theme change', () => {
  const layoutCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'app', '_layout.tsx'),
    'utf8'
  );

  assert.ok(
    !layoutCode.includes('<SafeAreaProvider key={`theme-'),
    'SafeAreaProvider must not have dynamic theme key that remounts navigation and triggers sign-in processing screen'
  );
});

test('ThemeSwitcherModal shows Applying Theme feedback banner when theme changes', () => {
  const switcherCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'ThemeSwitcherModal.tsx'),
    'utf8'
  );

  assert.match(
    switcherCode,
    /Applying\s*\$\{label\}…/,
    'ThemeSwitcherModal must provide Applying Theme status message'
  );
  assert.match(
    switcherCode,
    /styles\.applyingBar/,
    'ThemeSwitcherModal must render applyingBar'
  );
});

test('colors.ts StyleSheet.create proxy correctly transforms canvas to #0C0E12 and card to #161920 in dark mode', () => {
  const colorsCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'constants', 'colors.ts'),
    'utf8'
  );

  // Assert canvas and surface mappings exist in COLOR_TRANSFORM_MAP
  assert.match(
    colorsCode,
    /['"]#FFFFFF['"]:\s*['"]#161920['"]/,
    '#FFFFFF must map to #161920 in COLOR_TRANSFORM_MAP'
  );
  assert.match(
    colorsCode,
    /['"]#F5F6E8['"]:\s*['"]#0C0E12['"]/,
    '#F5F6E8 must map to #0C0E12 in COLOR_TRANSFORM_MAP'
  );
  assert.match(
    colorsCode,
    /['"]#E5E7EB['"]:\s*['"]#282D3A['"]/,
    '#E5E7EB must map to #282D3A in COLOR_TRANSFORM_MAP'
  );

  // Assert DarkPalette structure
  assert.match(
    colorsCode,
    /canvas:\s*['"]#0C0E12['"]/,
    'DarkPalette.canvas must be #0C0E12'
  );
  assert.match(
    colorsCode,
    /surface:\s*['"]#161920['"]/,
    'DarkPalette.surface must be #161920'
  );
  assert.match(
    colorsCode,
    /border:\s*['"]#282D3A['"]/,
    'DarkPalette.border must be #282D3A'
  );
  assert.match(
    colorsCode,
    /brandPrimary:\s*['"]#95D624['"]/,
    'DarkPalette.brandPrimary must be #95D624'
  );
});

test('Attendance QR is rendered with high contrast on white tile for dark theme visibility', () => {
  const employerCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'EmployerDashboard.tsx'),
    'utf8'
  );

  // Assert QRCode in EmployerDashboard has backgroundColor="#FFFFFF" and dark color
  assert.ok(
    employerCode.includes('backgroundColor="#FFFFFF"'),
    'QRCode in EmployerDashboard must have solid white background'
  );
  assert.ok(
    employerCode.includes('color="#000000"'),
    'QRCode in EmployerDashboard must have solid black color'
  );
  assert.ok(
    employerCode.includes('qrWhiteBadge'),
    'QRCode must be wrapped in qrWhiteBadge'
  );

  const colorsCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'constants', 'colors.ts'),
    'utf8'
  );

  // Assert transformStyleRuleToDark preserves qr containers
  assert.ok(
    colorsCode.includes("k.includes('qrbadge')") || colorsCode.includes("k.includes('qrwhite')"),
    'colors.ts must exempt qr badges from dark mode background inversion'
  );
});
