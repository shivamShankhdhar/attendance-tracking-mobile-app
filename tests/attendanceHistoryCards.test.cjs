const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Attendance history cards feature Check In, Check Out, and Total Time on employer and employee dashboards', () => {
  const employerSrc = fs.readFileSync(
    path.join(__dirname, '../src/screens/EmployerDashboard.tsx'),
    'utf8'
  );
  const employeeSrc = fs.readFileSync(
    path.join(__dirname, '../src/screens/EmployeeDashboard.tsx'),
    'utf8'
  );
  const attendanceUtilsSrc = fs.readFileSync(
    path.join(__dirname, '../src/utils/attendance.ts'),
    'utf8'
  );
  const backendAttendanceServiceSrc = fs.readFileSync(
    path.join(__dirname, '../../backend/src/modules/attendance/attendance.service.ts'),
    'utf8'
  );

  // 1. Verify formatWorkDuration utility exists and handles check-in, check-out, and fallback
  assert.ok(
    attendanceUtilsSrc.includes('export function formatWorkDuration'),
    'formatWorkDuration must be exported in attendance.ts'
  );
  assert.ok(
    attendanceUtilsSrc.includes('fallbackToNow'),
    'formatWorkDuration must support fallbackToNow parameter'
  );

  // 2. Verify backend getMyHistory maps checkOutTime
  assert.ok(
    backendAttendanceServiceSrc.includes('checkOutTime: rec.checkOutTime'),
    'backend attendance service getMyHistory must return checkOutTime'
  );

  // 3. Verify EmployerDashboard renders Check In, Check Out, Total Time in employee history cards
  assert.ok(
    employerSrc.includes('formatWorkDuration'),
    'EmployerDashboard must import formatWorkDuration'
  );
  assert.ok(
    employerSrc.includes('attHistoryCard'),
    'EmployerDashboard must use attHistoryCard style for attendance records'
  );
  assert.ok(
    employerSrc.includes('CHECK IN') &&
    employerSrc.includes('CHECK OUT') &&
    employerSrc.includes('TOTAL TIME'),
    'EmployerDashboard must display CHECK IN, CHECK OUT, and TOTAL TIME headers'
  );

  // 4. Verify EmployeeDashboard renders Check In, Check Out, Total Time in both Recent Days and History Tab
  assert.ok(
    employeeSrc.includes('formatWorkDuration'),
    'EmployeeDashboard must import formatWorkDuration'
  );
  assert.ok(
    employeeSrc.includes('checkInDisplay') &&
    employeeSrc.includes('checkOutDisplay') &&
    employeeSrc.includes('totalTimeDisplay'),
    'EmployeeDashboard must compute checkInDisplay, checkOutDisplay, and totalTimeDisplay'
  );
  assert.ok(
    employeeSrc.includes('CHECK IN') &&
    employeeSrc.includes('CHECK OUT') &&
    employeeSrc.includes('TOTAL TIME'),
    'EmployeeDashboard must display CHECK IN, CHECK OUT, and TOTAL TIME in attendance history cards'
  );
});
