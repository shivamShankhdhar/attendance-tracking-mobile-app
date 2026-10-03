const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('AnimateReactNative animations are integrated into attendance workflows', () => {
  const qrScannerPath = path.join(__dirname, '../src/components/QRScannerBoundingBox.tsx');
  const confettiPath = path.join(__dirname, '../src/components/AttendanceSuccessConfetti.tsx');
  const counterPath = path.join(__dirname, '../src/components/AnimatedCounter.tsx');
  const switchXxPath = path.join(__dirname, '../src/components/SwitchXX.tsx');
  const employeeDashboardPath = path.join(__dirname, '../src/screens/EmployeeDashboard.tsx');
  const homeOverviewPath = path.join(__dirname, '../src/components/HomeOverview.tsx');
  const joinModalPath = path.join(__dirname, '../src/components/JoinWorkplaceModal.tsx');

  assert.ok(fs.existsSync(qrScannerPath), 'QRScannerBoundingBox component must exist');
  assert.ok(fs.existsSync(confettiPath), 'AttendanceSuccessConfetti component must exist');
  assert.ok(fs.existsSync(counterPath), 'AnimatedCounter component must exist');
  assert.ok(fs.existsSync(switchXxPath), 'SwitchXX component must exist');

  const qrScannerContent = fs.readFileSync(qrScannerPath, 'utf8');
  assert.ok(qrScannerContent.includes('QRScannerBoundingBox'), 'Should export QRScannerBoundingBox');
  assert.ok(qrScannerContent.includes('withSpring'), 'Should use withSpring for bounding box tracking');
  assert.ok(qrScannerContent.includes('laserY'), 'Should animate sweeping laser beam');

  const confettiContent = fs.readFileSync(confettiPath, 'utf8');
  assert.ok(confettiContent.includes('AttendanceSuccessConfetti'), 'Should export AttendanceSuccessConfetti');
  assert.ok(confettiContent.includes('CONFETTI_COLORS'), 'Should define festive confetti palette');

  const counterContent = fs.readFileSync(counterPath, 'utf8');
  assert.ok(counterContent.includes('AnimatedCounter'), 'Should export AnimatedCounter');

  // Verify integration in EmployeeDashboard
  const empContent = fs.readFileSync(employeeDashboardPath, 'utf8');
  assert.ok(empContent.includes('QRScannerBoundingBox'), 'EmployeeDashboard should use QRScannerBoundingBox');
  assert.ok(empContent.includes('AttendanceSuccessConfetti'), 'EmployeeDashboard should use AttendanceSuccessConfetti on approved detail');
  assert.ok(empContent.includes('qrBounds'), 'EmployeeDashboard should track qrBounds');

  // Verify integration in HomeOverview
  const homeOverviewContent = fs.readFileSync(homeOverviewPath, 'utf8');
  assert.ok(homeOverviewContent.includes('AnimatedCounter'), 'HomeOverview should use AnimatedCounter for metrics');

  // Verify integration in JoinWorkplaceModal
  const joinModalContent = fs.readFileSync(joinModalPath, 'utf8');
  assert.ok(joinModalContent.includes('QRScannerBoundingBox'), 'JoinWorkplaceModal should use QRScannerBoundingBox');

  // Verify Workplace Section shadow removal and artwork addition
  const employerDashboardPath = path.join(__dirname, '../src/screens/EmployerDashboard.tsx');
  const employerContent = fs.readFileSync(employerDashboardPath, 'utf8');
  assert.ok(employerContent.includes('WorkplaceCardArtwork'), 'EmployerDashboard should include WorkplaceCardArtwork in workplace section');
  const wrapperRegex = /workplaceCardWrapper:\s*{([^}]+)}/;
  const match = employerContent.match(wrapperRegex);
  assert.ok(match, 'workplaceCardWrapper style must exist');
  assert.ok(!match[1].includes('shadowColor'), 'workplaceCardWrapper must not have shadowColor');
  assert.ok(!match[1].includes('elevation'), 'workplaceCardWrapper must not have elevation');
});

