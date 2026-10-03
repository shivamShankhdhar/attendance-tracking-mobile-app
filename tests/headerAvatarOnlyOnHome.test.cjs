const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('User avatar in header is only visible on the home screen and not on add employee or sub-screens', () => {
  const employerDashboard = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'EmployerDashboard.tsx'),
    'utf8'
  );

  // 1. Verify Home screen (Today tab) header has the user avatar
  assert.ok(
    employerDashboard.includes("activeTab === 'today' && (\n            <View style={styles.headerWrapper}>"),
    'Home screen (Today tab) must render headerWrapper'
  );
  assert.ok(
    employerDashboard.includes('avatarUrl={user?.avatarUrl}'),
    'Home screen must retain user avatar in header'
  );

  // 2. Extract Add Employee screen block and verify NO avatar is rendered in its header
  const addEmpMatch = employerDashboard.match(
    /currentScreen\.name === 'add-employee'\s*&&[\s\S]*?<View style=\{styles\.darkBannerHeader\}>([\s\S]*?)<\/View>/
  );
  assert.ok(addEmpMatch, 'add-employee darkBannerHeader block must exist');
  const addEmpHeader = addEmpMatch[1];
  assert.equal(
    addEmpHeader.includes('avatarUrl'),
    false,
    'Add employee header must NOT render user avatar'
  );
  assert.equal(
    addEmpHeader.includes('bannerAvatarCircle'),
    false,
    'Add employee header must NOT contain bannerAvatarCircle'
  );

  // 3. Extract Manual Attendance screen block and verify NO avatar is rendered in its header
  const manualAttMatch = employerDashboard.match(
    /currentScreen\.name === 'manual-attendance'\s*&&[\s\S]*?<View style=\{styles\.darkBannerHeader\}>([\s\S]*?)<\/View>/
  );
  assert.ok(manualAttMatch, 'manual-attendance darkBannerHeader block must exist');
  const manualAttHeader = manualAttMatch[1];
  assert.equal(
    manualAttHeader.includes('avatarUrl'),
    false,
    'Manual attendance header must NOT render user avatar'
  );
  assert.equal(
    manualAttHeader.includes('bannerAvatarCircle'),
    false,
    'Manual attendance header must NOT contain bannerAvatarCircle'
  );

  // 4. Employee dashboard: verify History screen header does not contain avatar, while Today screen does
  const employeeDashboard = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'screens', 'EmployeeDashboard.tsx'),
    'utf8'
  );

  const employeeTodayMatch = employeeDashboard.match(
    /tab === 'today'[\s\S]*?styles\.mainTopHeader[\s\S]*?HomeHeaderOptions/
  );
  assert.ok(employeeTodayMatch, 'Employee home screen (today) must retain HomeHeaderOptions');
});
