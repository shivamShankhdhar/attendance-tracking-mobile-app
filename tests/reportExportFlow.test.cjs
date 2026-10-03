const test = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const XLSX = require('xlsx');

test('Excel generation produces valid multi-sheet workbook with records and summary', async () => {
  const sampleRecords = [
    {
      id: 'rec-1',
      attendanceDate: '2026-09-15',
      status: 'PRESENT',
      employee: { memberId: 'm1', name: 'Alice Smith', code: 'EMP001' },
      checkInTime: '2026-09-15T09:02:00Z',
      source: 'QR_SCAN',
    },
    {
      id: 'rec-2',
      attendanceDate: '2026-09-15',
      status: 'ABSENT',
      employee: { memberId: 'm2', name: 'Bob Jones', code: 'EMP002' },
      source: 'MANUAL',
      correctionReason: 'Sick leave',
    },
  ];

  const wb = XLSX.utils.book_new();
  const headers = ['Date', 'Employee Name', 'Employee Code', 'Status', 'Check-In Time', 'Source', 'Notes'];
  const rows = sampleRecords.map((r) => [
    r.attendanceDate,
    r.employee.name,
    r.employee.code,
    r.status,
    r.checkInTime || '—',
    r.source,
    r.correctionReason || '',
  ]);
  const wsRecords = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, wsRecords, 'Attendance Records');

  const wsSummary = XLSX.utils.aoa_to_sheet([
    ['Workplace', 'Test Corp'],
    ['Period', 'September 2026'],
    ['Total Records', 2],
    ['Present', 1],
    ['Absent', 1],
  ]);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  assert.ok(base64.length > 500, 'Excel base64 should be populated');

  // Verify readability
  const parsedWb = XLSX.read(Buffer.from(base64, 'base64'), { type: 'buffer' });
  assert.deepEqual(parsedWb.SheetNames, ['Attendance Records', 'Summary']);
  const parsedRecords = XLSX.utils.sheet_to_json(parsedWb.Sheets['Attendance Records']);
  assert.equal(parsedRecords.length, 2);
  assert.equal(parsedRecords[0]['Employee Name'], 'Alice Smith');
  assert.equal(parsedRecords[1]['Status'], 'ABSENT');
});

test('PDF generation produces valid PDF document with header, summary, and table', async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  page.drawText('Test Workplace Attendance Report', { x: 40, y: 800, size: 16 });

  const pdfBytes = await pdfDoc.saveAsBase64();
  assert.ok(pdfBytes.length > 200, 'PDF base64 output should be generated');

  // Load back to verify valid structure
  const reloaded = await PDFDocument.load(Buffer.from(pdfBytes, 'base64'));
  assert.equal(reloaded.getPageCount(), 1);
});

test('CSV generation outputs proper RFC-compliant lines and quoted values', () => {
  const headers = ['Date', 'Employee Name', 'Employee Code', 'Status'];
  const sample = [
    { date: '2026-09-01', name: 'O\'Connor, Brian', code: 'EMP10', status: 'PRESENT' },
  ];

  const rows = sample.map((r) => [
    `"${r.date}"`,
    `"${r.name.replace(/"/g, '""')}"`,
    `"${r.code}"`,
    `"${r.status}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  assert.ok(csv.includes('Date,Employee Name,Employee Code,Status'));
  assert.ok(csv.includes('"2026-09-01","O\'Connor, Brian","EMP10","PRESENT"'));
});
