const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('QueryProvider configures in-memory cache retention (gcTime 24h)', () => {
  const queryProviderPath = path.resolve(__dirname, '../src/providers/QueryProvider.tsx');
  const code = fs.readFileSync(queryProviderPath, 'utf8');

  assert.match(
    code,
    /gcTime:\s*1000\s*\*\s*60\s*\*\s*60\s*\*\s*24/,
    'QueryProvider should set gcTime to 24 hours to prevent cache eviction'
  );
});

test('formatSyncTimestamp handles relative timings cleanly', () => {
  const attendanceUtilsPath = path.resolve(__dirname, '../src/utils/attendance.ts');
  const code = fs.readFileSync(attendanceUtilsPath, 'utf8');

  assert.ok(code.includes('export function formatSyncTimestamp'), 'formatSyncTimestamp must be exported');
  assert.ok(code.includes("'just now'"), 'Should support just now for recent fetches');
  assert.ok(code.includes('today at'), 'Should support today at timestamp format');
});

test('SyncStatusBanner renders non-intrusive warning with "Data not refreshed · Last synced" message and Retry button', () => {
  const bannerPath = path.resolve(__dirname, '../src/components/SyncStatusBanner.tsx');
  const code = fs.readFileSync(bannerPath, 'utf8');

  assert.ok(
    code.includes('Data not refreshed · Last synced {timeText}'),
    'Banner must display "Data not refreshed · Last synced {timeText}"'
  );
  assert.ok(
    code.includes('Retry'),
    'Banner should include a Retry button'
  );
  assert.ok(
    code.includes('useTheme'),
    'Banner should use theme colors for both light and dark mode'
  );
});

test('EmployerDashboard preserves cached data on refetch error and renders SyncStatusBanner at top', () => {
  const employerDashboardPath = path.resolve(__dirname, '../src/screens/EmployerDashboard.tsx');
  const code = fs.readFileSync(employerDashboardPath, 'utf8');

  // Verify SyncStatusBanner import & rendering
  assert.ok(code.includes('import { SyncStatusBanner }'), 'Must import SyncStatusBanner');
  assert.ok(
    code.includes('<SyncStatusBanner'),
    'Must render SyncStatusBanner at top of dashboard'
  );

  // Verify queries check that cached data is absent before showing disruptive error state
  assert.ok(
    code.includes('selectedRosterQuery.isError && !selectedRosterQuery.data'),
    'Should only show roster error card if there is NO cached data'
  );
  assert.ok(
    code.includes('(!!selectedRosterQuery.data || !selectedRosterQuery.isError)'),
    'Should display roster data if cached data exists, even during refetch error'
  );
  assert.ok(
    code.includes('reportsQuery.isError && !reportsQuery.data'),
    'Should only show reports error card if there is NO cached data'
  );
  assert.ok(
    code.includes('(!!reportsQuery.data || !reportsQuery.isError)'),
    'Should display reports summary and records if cached data exists'
  );
});

test('EmployeeDashboard preserves cached data and renders SyncStatusBanner with pull-to-refresh', () => {
  const employeeDashboardPath = path.resolve(__dirname, '../src/screens/EmployeeDashboard.tsx');
  const code = fs.readFileSync(employeeDashboardPath, 'utf8');

  // Verify SyncStatusBanner import & rendering
  assert.ok(code.includes('import { SyncStatusBanner }'), 'Must import SyncStatusBanner');
  assert.ok(
    code.includes('<SyncStatusBanner'),
    'Must render SyncStatusBanner in EmployeeDashboard'
  );

  // Verify Pull-to-refresh
  assert.ok(
    code.includes('RefreshControl'),
    'Must provide RefreshControl for manual refetch'
  );
  assert.ok(
    code.includes('hasBackgroundSyncError'),
    'Must detect background sync errors when cached data is available'
  );
});
