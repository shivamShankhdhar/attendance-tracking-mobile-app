const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('COLOR_TRANSFORM_MAP correctly maps surfaceMuted #F4F5F7 to dark surface #1F232D', () => {
  const colorsFile = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'constants', 'colors.ts'),
    'utf8'
  );

  assert.match(
    colorsFile,
    /['"]#F4F5F7['"]:\s*['"]#1F232D['"]/,
    '#F4F5F7 must be mapped to #1F232D in COLOR_TRANSFORM_MAP'
  );

  assert.match(
    colorsFile,
    /['"]#f4f5f7['"]:\s*['"]#1F232D['"]/,
    '#f4f5f7 must be mapped to #1F232D in COLOR_TRANSFORM_MAP'
  );

  const employerDashboardFile = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'EmployerDashboard.tsx'),
    'utf8'
  );

  assert.match(
    employerDashboardFile,
    /styles\.headerChevronCircle,\s*\{\s*backgroundColor:\s*Palette\.surfaceMuted,\s*borderColor:\s*Palette\.border\s*\}/,
    'headerChevronCircle must bind dynamic Palette.surfaceMuted and Palette.border'
  );
});
