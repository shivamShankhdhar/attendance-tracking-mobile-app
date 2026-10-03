const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Employer home header renders workplace code with copy icon and quick access QR button', () => {
  const employerDashboard = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'EmployerDashboard.tsx'),
    'utf8'
  );

  // 1. Verify workplace card exists and contains admin badge, large code badge, and big QR button
  assert.ok(
    employerDashboard.includes('styles.workplaceCardWrapper'),
    'workplaceCardWrapper must exist in employer dashboard'
  );
  assert.ok(
    employerDashboard.includes('styles.headerAdminBadge'),
    'headerAdminBadge must be present'
  );
  assert.ok(
    employerDashboard.includes('styles.bigWorkplaceQrBtn'),
    'bigWorkplaceQrBtn must render large QR icon button in workplace card'
  );
  assert.ok(
    employerDashboard.includes('styles.workplaceCodeBadgeLarge'),
    'workplaceCodeBadgeLarge must render workplace code with copy icon'
  );
  assert.ok(
    employerDashboard.includes('styles.workplaceCodeTextLarge'),
    'workplaceCodeTextLarge must render larger text for workplace code'
  );

  // 2. Verify code copy functionality
  assert.ok(
    employerDashboard.includes('handleCopyWorkplaceCode'),
    'handleCopyWorkplaceCode must be hooked to code badge'
  );
  assert.ok(
    employerDashboard.includes('effectiveWorkplaceCode'),
    'effectiveWorkplaceCode must be displayed'
  );

  // 3. Verify Quick Access QR Popover Modal structure
  assert.ok(
    employerDashboard.includes('visible={showQuickQrPopover}'),
    'Modal must be controlled by showQuickQrPopover'
  );
  assert.ok(
    employerDashboard.includes('styles.popoverArrowUp'),
    'Must have upward pointing arrow (aroow touoside) above popover card'
  );
  assert.ok(
    employerDashboard.includes('styles.popoverCard'),
    'Must render popoverCard container'
  );
  assert.ok(
    employerDashboard.includes('quickJoinQrQuery'),
    'Must query quick join QR payload'
  );
  assert.ok(
    employerDashboard.includes('color="#000000"') &&
    employerDashboard.includes('backgroundColor="#FFFFFF"'),
    'Quick access QR must render high-contrast black on white tile'
  );
});
