const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('SwitchXX component implements Switch XX animation API and replaces native Switch', () => {
  const switchXXPath = path.resolve(__dirname, '../src/components/SwitchXX.tsx');
  const securitySettingsPath = path.resolve(__dirname, '../src/screens/SecuritySettingsScreen.tsx');
  const employeeDashboardPath = path.resolve(__dirname, '../src/screens/EmployeeDashboard.tsx');

  assert.ok(fs.existsSync(switchXXPath), 'SwitchXX.tsx exists');
  assert.ok(fs.existsSync(securitySettingsPath), 'SecuritySettingsScreen.tsx exists');
  assert.ok(fs.existsSync(employeeDashboardPath), 'EmployeeDashboard.tsx exists');

  const switchCode = fs.readFileSync(switchXXPath, 'utf8');
  const securityCode = fs.readFileSync(securitySettingsPath, 'utf8');
  const empCode = fs.readFileSync(employeeDashboardPath, 'utf8');

  // 1. SwitchXX component API & glyphs
  assert.ok(
    switchCode.includes('trackCircleDot') && switchCode.includes('trackLineBar'),
    'SwitchXX contains binary power track glyphs (0 circle dot and 1 vertical line bar)'
  );
  assert.ok(
    switchCode.includes('knobCircleGlyph') && switchCode.includes('knobLineGlyph'),
    'SwitchXX contains knob cutout glyphs for 0 and 1'
  );
  assert.ok(
    switchCode.includes('accessibilityRole="switch"'),
    'SwitchXX declares accessibilityRole switch for plug-and-play Switch replacement'
  );
  assert.ok(
    switchCode.includes('scaleX'),
    'SwitchXX implements tactile press/stretch spring animation'
  );

  // 2. Used in SecuritySettingsScreen
  assert.ok(
    securityCode.includes('<SwitchXX'),
    'SecuritySettingsScreen uses SwitchXX for App Lock and biometrics toggles'
  );

  // 3. Used in EmployeeDashboard for Theme
  assert.ok(
    empCode.includes('<SwitchXX'),
    'EmployeeDashboard uses SwitchXX for theme toggle'
  );

});
