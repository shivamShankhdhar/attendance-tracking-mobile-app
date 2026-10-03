const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('SignInScreen storefront image spans full device width with cover resizeMode', () => {
  const signInScreenCode = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'SignInScreen.tsx'),
    'utf8'
  );

  // Assert useWindowDimensions is imported and used
  assert.match(
    signInScreenCode,
    /useWindowDimensions/,
    'SignInScreen must import and use useWindowDimensions'
  );

  // Assert illustrationWrap breaks out to screen width
  assert.match(
    signInScreenCode,
    /illustrationWrap:\s*\{[^}]*marginHorizontal:\s*-24/s,
    'illustrationWrap must have negative marginHorizontal matching scroll padding'
  );

  // Assert Image has resizeMode="cover" and takes screenWidth
  assert.match(
    signInScreenCode,
    /<Image[^>]*source=\{require\(['"]\.\.\/\.\.\/assets\/images\/signin_storefront_3d\.png['"]\)\}[^>]*resizeMode="cover"/s,
    'storefront illustration must use resizeMode="cover"'
  );
});
