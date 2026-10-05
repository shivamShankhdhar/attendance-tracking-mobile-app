import { formatFriendlyDate } from './attendance';
import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
let PDFDocument: any, rgb: any, StandardFonts: any;
if (Platform.OS !== 'web') {
  try {
    const pdfLib = require('pdf-lib');
    PDFDocument = pdfLib.PDFDocument;
    rgb = pdfLib.rgb;
    StandardFonts = pdfLib.StandardFonts;
  } catch (_e) {}
}
import * as XLSX from 'xlsx';
import { ApiReportsResponse } from '../services/attendanceApi';
import { APP_NAME } from '../constants/app';

export type ExportFormat = 'EXCEL' | 'PDF' | 'CSV';

export interface ExportReportOptions {
  workplaceName: string;
  periodLabel: string;
  format: ExportFormat;
  data: ApiReportsResponse;
  employeeMemberId?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  recordCount: number;
  uri?: string;
  error?: string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

function getExportBaseName(records: ApiReportsResponse['records'], periodLabel: string): string {
  const employeeIds = [...new Set(records.map((record) => record.employee?.code || record.employee?.memberId).filter(Boolean))];
  const employeePart = employeeIds.length === 1 ? `_${sanitizeFileName(employeeIds[0]).slice(0, 8)}` : '';
  const dates = records.map((record) => record.attendanceDate).filter(Boolean).sort();
  const periodPart = dates.length
    ? `${dates[0].replace(/-/g, '')}${dates[dates.length - 1] !== dates[0] ? `-${dates[dates.length - 1].replace(/-/g, '')}` : ''}`
    : sanitizeFileName(periodLabel).slice(0, 12);
  return `${sanitizeFileName(APP_NAME).slice(0, 8)}_att${employeePart}_${periodPart}`;
}

function getSingleEmployee(records: ApiReportsResponse['records'], employeeMemberId?: string) {
  if (!employeeMemberId) return null;
  const employees = new Map<string, { name: string; id: string }>();
  records.forEach((record) => {
    const id = record.employee?.memberId || record.employee?.code;
    if (id && (record.employee?.memberId === employeeMemberId || id === employeeMemberId)) {
      employees.set(id, { name: record.employee?.name || '-', id: record.employee?.code || id });
    }
  });
  return employees.size === 1 ? [...employees.values()][0] : null;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getWorkedDays(record: ApiReportsResponse['records'][number]): number | null {
  if (!record.checkInTime || !record.checkOutTime) return null;
  const checkIn = new Date(record.checkInTime).getTime();
  const checkOut = new Date(record.checkOutTime).getTime();
  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut) || checkOut < checkIn) return null;
  return (checkOut - checkIn) / MILLISECONDS_PER_DAY;
}

function formatDuration(days: number | null): string {
  if (days === null) return '-';
  const totalMinutes = Math.round(days * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatRecordTime(value?: string): string {
  return value ? formatFriendlyDate(value, 'h:mm a') : '-';
}

function getReportTotals(records: ExportReportOptions['data']['records']) {
  const totalDays = new Set(records.map((record) => `${record.employee?.memberId || record.employee?.code || record.employee?.name || 'employee'}:${record.attendanceDate}`)).size;
  const totalWorkedDays = records.reduce((total, record) => total + (getWorkedDays(record) ?? 0), 0);
  return { totalDays, totalWorkedDays, totalWorkedHours: formatDuration(totalWorkedDays) };
}

function toExcelDurationCell(days: number | null) {
  return days === null ? { t: 's' as const, v: '-' } : { t: 'n' as const, v: days, z: '[h]"h "mm"m"' };
}

function setExcelCell(sheet: XLSX.WorkSheet, address: string, value: unknown, numberFormat?: string) {
  const cell = XLSX.utils.encode_cell(XLSX.utils.decode_cell(address));
  sheet[cell] = typeof value === 'object' && value !== null
    ? value as XLSX.CellObject
    : { t: typeof value === 'number' ? 'n' : 's', v: value as string | number };
  if (numberFormat) sheet[cell].z = numberFormat;
}

/**
 * Generates an Excel (.xlsx) file as Base64 string
 */
export function generateExcelBase64(options: ExportReportOptions): string {
  const { workplaceName, periodLabel, data } = options;
  const records = data.records || [];
  const totals = getReportTotals(records);
  const employee = getSingleEmployee(records, options.employeeMemberId);
  const columnCount = employee ? 4 : 6;
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `${APP_NAME} Attendance Report`,
    Subject: `${workplaceName} - ${periodLabel}`,
    Author: APP_NAME,
    Company: APP_NAME,
    CreatedDate: new Date(),
  };

  const headers = employee
    ? ['Date', 'Check In', 'Check Out', 'Total Time']
    : ['Employee ID', 'Name', 'Date', 'Check In Time', 'Check Out Time', 'Total Hours Worked'];
  const brandedRows = [
    [APP_NAME.toUpperCase()],
    ['ATTENDANCE REPORT'],
    [workplaceName || 'Workplace', periodLabel, `Generated ${formatFriendlyDate(new Date(), 'd MMM yyyy h:mm a')}`],
    ...(employee ? [[`Employee: ${employee.name}`, `Employee ID: ${employee.id}`], [`Report duration: ${periodLabel}`]] : []),
    [],
    headers,
  ];
  const rows = records.map((record) => employee
    ? [record.attendanceDate || '-', formatRecordTime(record.checkInTime), formatRecordTime(record.checkOutTime), toExcelDurationCell(getWorkedDays(record))]
    : [record.employee?.code || record.employee?.memberId || '-', record.employee?.name || '-', record.attendanceDate || '-', formatRecordTime(record.checkInTime), formatRecordTime(record.checkOutTime), toExcelDurationCell(getWorkedDays(record))]);
  const wsRecords = XLSX.utils.aoa_to_sheet([...brandedRows, ...rows]);
  wsRecords['!cols'] = employee ? [
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
  ] : [
    { wch: 20 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
  ];
  wsRecords['!rows'] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 22 }, { hpt: 8 }, { hpt: 24 }];
  wsRecords['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
  ];
  const headerRow = brandedRows.length;
  const lastDataRow = headerRow + records.length;
  const lastColumn = XLSX.utils.encode_col(columnCount - 1);
  wsRecords['!autofilter'] = { ref: `A${headerRow}:${lastColumn}${Math.max(headerRow, lastDataRow)}` };

  const totalsStartRow = headerRow + records.length + 2;
  const totalRows = employee
    ? [['REPORT TOTALS'], ['Total time worked', toExcelDurationCell(totals.totalWorkedDays)]]
    : [['REPORT TOTALS'], ['Total days', totals.totalDays], ['Total hours worked', toExcelDurationCell(totals.totalWorkedDays)]];
  XLSX.utils.sheet_add_aoa(wsRecords, totalRows, { origin: { r: totalsStartRow - 1, c: 0 } });
  wsRecords['!merges']?.push({ s: { r: totalsStartRow - 1, c: 0 }, e: { r: totalsStartRow - 1, c: columnCount - 1 } });
  if (employee) {
    wsRecords['!merges']?.push({ s: { r: totalsStartRow, c: 1 }, e: { r: totalsStartRow, c: columnCount - 1 } });
    setExcelCell(wsRecords, `B${totalsStartRow + 1}`, toExcelDurationCell(totals.totalWorkedDays));
  } else {
    wsRecords['!merges']?.push(
      { s: { r: totalsStartRow, c: 1 }, e: { r: totalsStartRow, c: 2 } },
      { s: { r: totalsStartRow + 1, c: 1 }, e: { r: totalsStartRow + 1, c: 2 } },
    );
    setExcelCell(wsRecords, `B${totalsStartRow + 1}`, totals.totalDays);
    setExcelCell(wsRecords, `B${totalsStartRow + 2}`, toExcelDurationCell(totals.totalWorkedDays));
  }
  XLSX.utils.book_append_sheet(wb, wsRecords, 'Attendance Report');

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

/**
 * Generates a clean CSV file as plain string
 */
export function generateCsvString(options: ExportReportOptions): string {
  const { data } = options;
  const records = data.records || [];
  const totals = getReportTotals(records);
  const employee = getSingleEmployee(records, options.employeeMemberId);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const headers = employee ? ['Date', 'Check In', 'Check Out', 'Total Time'] : ['Employee ID', 'Name', 'Date', 'Check In Time', 'Check Out Time', 'Total Hours Worked'];
  const rows = records.map((record) => employee
    ? [record.attendanceDate || '-', formatRecordTime(record.checkInTime), formatRecordTime(record.checkOutTime), formatDuration(getWorkedDays(record))]
    : [record.employee?.code || record.employee?.memberId || '-', record.employee?.name || '-', record.attendanceDate || '-', formatRecordTime(record.checkInTime), formatRecordTime(record.checkOutTime), formatDuration(getWorkedDays(record))]);
  const metadataRows = employee ? [
    [APP_NAME],
    ['ATTENDANCE REPORT'],
    [`Employee: ${employee.name}`, `Employee ID: ${employee.id}`],
    [`Report duration: ${options.periodLabel}`],
    [],
  ] : [];
  const summaryRows = employee
    ? [['TOTAL TIME WORKED', totals.totalWorkedHours, '', '']]
    : [['TOTAL DAYS', totals.totalDays, '', '', '', ''], ['TOTAL HOURS WORKED', totals.totalWorkedHours, '', '', '', '']];
  return [...metadataRows, headers, ...rows, [], ...summaryRows].map((row) => row.map(escape).join(',')).join('\n');
}

/**
 * Generates a multi-page styled PDF document as Base64 string
 */
export async function generatePdfBase64(options: ExportReportOptions): Promise<string> {
  const { workplaceName, periodLabel, data } = options;
  const records = data.records || [];
  const totals = getReportTotals(records);
  const employee = getSingleEmployee(records, options.employeeMemberId);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const PAGE_WIDTH = 841.89;
  const PAGE_HEIGHT = 595.28;
  const MARGIN = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const brand = rgb(0.28, 0.34, 0.16);
  const brandLight = rgb(0.93, 0.95, 0.89);
  const line = rgb(0.86, 0.88, 0.82);
  const columns = employee ? [
    { title: 'Date', width: 150 },
    { title: 'Check In', width: 145 },
    { title: 'Check Out', width: 145 },
    { title: 'Total Time', width: CONTENT_WIDTH - 440 },
  ] : [
    { title: 'Employee ID', width: 116 },
    { title: 'Name', width: 160 },
    { title: 'Date', width: 100 },
    { title: 'Check In Time', width: 112 },
    { title: 'Check Out Time', width: 112 },
    { title: 'Total Hours Worked', width: CONTENT_WIDTH - 600 },
  ];
  const cleanText = (value: string) => value.replace(/[^\u0020-\u00FF]/g, '?');
  const fittedText = (value: string, selectedFont: typeof font, size: number, maxWidth: number) => {
    let text = cleanText(value);
    while (text.length > 1 && selectedFont.widthOfTextAtSize(text, size) > maxWidth) text = `${text.slice(0, -4)}...`;
    return text;
  };

  const drawBrandHeader = (page: ReturnType<typeof pdfDoc.addPage>) => {
    page.drawCircle({ x: MARGIN + 13, y: PAGE_HEIGHT - 44, size: 13, color: brand });
    page.drawText('B', { x: MARGIN + 8.3, y: PAGE_HEIGHT - 49, size: 15, font: boldFont, color: rgb(1, 1, 1) });
    page.drawText(cleanText(APP_NAME), { x: MARGIN + 34, y: PAGE_HEIGHT - 48, size: 19, font: boldFont, color: brand });
    page.drawText('ATTENDANCE REPORT', { x: MARGIN, y: PAGE_HEIGHT - 82, size: 12, font: boldFont, color: brand });
    page.drawText(cleanText(workplaceName || 'Workplace'), { x: MARGIN, y: PAGE_HEIGHT - 101, size: 10, font: boldFont, color: rgb(0.2, 0.22, 0.18) });
    page.drawText(cleanText(`${periodLabel}  |  Generated ${formatFriendlyDate(new Date(), 'd MMM yyyy h:mm a')}`), { x: MARGIN, y: PAGE_HEIGHT - 117, size: 8.5, font, color: rgb(0.42, 0.44, 0.39) });
    if (employee) {
      page.drawText(cleanText(`Employee: ${employee.name}`), { x: MARGIN, y: PAGE_HEIGHT - 138, size: 10, font: boldFont, color: rgb(0.2, 0.22, 0.18) });
      page.drawText(cleanText(`Employee ID: ${employee.id}  |  Report duration: ${periodLabel}`), { x: MARGIN, y: PAGE_HEIGHT - 154, size: 9, font, color: rgb(0.42, 0.44, 0.39) });
    }

    const headerY = PAGE_HEIGHT - (employee ? 184 : 151);
    page.drawRectangle({ x: MARGIN, y: headerY - 8, width: CONTENT_WIDTH, height: 25, color: brand });
    let x = MARGIN;
    for (const column of columns) {
      page.drawText(fittedText(column.title, boldFont, 8, column.width - 10), { x: x + 5, y: headerY, size: 8, font: boldFont, color: rgb(1, 1, 1) });
      x += column.width;
    }
    return headerY - 22;
  };

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = drawBrandHeader(page);
  if (records.length === 0) {
    page.drawText('No attendance records were found for this period.', { x: MARGIN + 6, y: y - 5, size: 10, font, color: rgb(0.4, 0.42, 0.37) });
    y -= 30;
  } else {
    for (let index = 0; index < records.length; index++) {
      if (y < 74) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = drawBrandHeader(page);
      }
      const record = records[index];
      if (index % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_WIDTH, height: 22, color: brandLight });
      const row = employee
        ? [record.attendanceDate || '-', formatRecordTime(record.checkInTime), formatRecordTime(record.checkOutTime), formatDuration(getWorkedDays(record))]
        : [record.employee?.code || record.employee?.memberId || '-', record.employee?.name || '-', record.attendanceDate || '-', formatRecordTime(record.checkInTime), formatRecordTime(record.checkOutTime), formatDuration(getWorkedDays(record))];
      let x = MARGIN;
      row.forEach((value, columnIndex) => {
        const column = columns[columnIndex];
        page.drawText(fittedText(String(value), columnIndex === 1 ? boldFont : font, 8, column.width - 10), {
          x: x + 5,
          y,
          size: 8,
          font: columnIndex === 1 ? boldFont : font,
          color: rgb(0.18, 0.19, 0.17),
        });
        x += column.width;
      });
      page.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 8 }, thickness: 0.4, color: line });
      y -= 22;
    }
  }

  if (y < 108) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = drawBrandHeader(page);
  }
  page.drawRectangle({ x: MARGIN, y: y - 53, width: CONTENT_WIDTH, height: 58, color: brandLight, borderColor: line, borderWidth: 0.8 });
  page.drawText('REPORT TOTALS', { x: MARGIN + 12, y: y - 13, size: 8, font: boldFont, color: brand });
  if (employee) {
    page.drawText(`Total time worked: ${cleanText(totals.totalWorkedHours)}`, { x: MARGIN + 12, y: y - 35, size: 10, font: boldFont, color: rgb(0.18, 0.2, 0.15) });
  } else {
    page.drawText(`Total days: ${totals.totalDays}`, { x: MARGIN + 12, y: y - 35, size: 10, font: boldFont, color: rgb(0.18, 0.2, 0.15) });
    page.drawText(`Total hours worked: ${cleanText(totals.totalWorkedHours)}`, { x: MARGIN + 190, y: y - 35, size: 10, font: boldFont, color: rgb(0.18, 0.2, 0.15) });
  }

  const pages = pdfDoc.getPages();
  pages.forEach((footerPage, index) => {
    footerPage.drawLine({ start: { x: MARGIN, y: 34 }, end: { x: PAGE_WIDTH - MARGIN, y: 34 }, thickness: 0.6, color: line });
    footerPage.drawText(`${APP_NAME}  |  ${workplaceName || 'Attendance Report'}`, { x: MARGIN, y: 20, size: 7.5, font, color: rgb(0.42, 0.44, 0.39) });
    footerPage.drawText(`Page ${index + 1} of ${pages.length}`, { x: PAGE_WIDTH - MARGIN - 68, y: 20, size: 7.5, font, color: rgb(0.42, 0.44, 0.39) });
  });

  return pdfDoc.saveAsBase64();
}

/**
 * Main export function: handles generation, file writing, downloading and native sharing
 */
export async function exportAttendanceReport(options: ExportReportOptions): Promise<ExportResult> {
  const { workplaceName, periodLabel, format, data } = options;
  const records = data.records || [];
  const baseName = getExportBaseName(records, periodLabel);

  try {
    let extension = 'xlsx';
    let mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    let base64Content = '';
    let textContent = '';

    if (format === 'EXCEL') {
      extension = 'xlsx';
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      base64Content = generateExcelBase64(options);
    } else if (format === 'PDF') {
      extension = 'pdf';
      mimeType = 'application/pdf';
      base64Content = await generatePdfBase64(options);
    } else {
      extension = 'csv';
      mimeType = 'text/csv;charset=utf-8;';
      textContent = generateCsvString(options);
    }

    const filename = `${baseName}.${extension}`;

    // Web Platform Download
    if (Platform.OS === 'web') {
      let blob: Blob;
      if (format === 'CSV') {
        blob = new Blob([textContent], { type: mimeType });
      } else {
        const byteChars = atob(base64Content);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: mimeType });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filename,
        recordCount: records.length,
      };
    }

    // Native iOS and Android Platform Save & Share
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    if (format === 'CSV') {
      await FileSystem.writeAsStringAsync(fileUri, textContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } else {
      await FileSystem.writeAsStringAsync(fileUri, base64Content, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    await Share.share({
      title: `${workplaceName} Attendance (${periodLabel})`,
      url: fileUri,
      message: format === 'CSV' ? textContent.slice(0, 300) : undefined,
    });

    return {
      success: true,
      filename,
      recordCount: records.length,
      uri: fileUri,
    };
  } catch (error: any) {
    return {
      success: false,
      filename: `${baseName}.${format.toLowerCase()}`,
      recordCount: records.length,
      error: error?.message || 'Failed to export attendance report',
    };
  }
}
