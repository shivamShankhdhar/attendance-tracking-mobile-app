import { format, parseISO, isValid } from 'date-fns';

export function localDate(timezone = 'UTC', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function formatTime(value?: string, timezone = 'UTC') {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (!isValid(d)) return '—';
    return d.toLocaleTimeString([], { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
}

/**
 * Formats a date string, timestamp, or Date object using date-fns.
 * e.g. "2026-09-29" -> "Tue, Sep 29, 2026" or custom pattern
 */
export function formatFriendlyDate(
  dateInput?: string | number | Date | null,
  pattern = 'EEE, MMM d, yyyy'
): string {
  if (dateInput === undefined || dateInput === null) return '—';
  try {
    const d = typeof dateInput === 'number'
      ? new Date(dateInput)
      : typeof dateInput === 'string'
      ? (dateInput.length === 10 ? parseISO(`${dateInput}T00:00:00`) : parseISO(dateInput))
      : dateInput;
    if (!isValid(d)) return typeof dateInput === 'string' ? dateInput : '—';
    return format(d, pattern);
  } catch {
    return typeof dateInput === 'string' ? dateInput : '—';
  }
}

/**
 * Formats a date for screen headers e.g. "Tuesday, Sep 29"
 */
export function formatHeaderDate(dateInput?: string | number | Date | null): string {
  return formatFriendlyDate(dateInput, 'EEEE, MMM d');
}

/**
 * Formats a month string (e.g. "2026-09") into "September 2026"
 */
export function formatMonthYear(monthInput?: string | Date | null): string {
  if (!monthInput) return '—';
  try {
    const str = typeof monthInput === 'string' && monthInput.length === 7 ? `${monthInput}-01T00:00:00` : monthInput;
    const d = typeof str === 'string' ? parseISO(str) : str;
    if (!isValid(d)) return String(monthInput);
    return format(d, 'MMMM yyyy');
  } catch {
    return String(monthInput);
  }
}

export function parseAttendanceQr(payload: string, workplaceId: string): { token: string; requestType: 'CHECK_IN' | 'CHECK_OUT' } {
  const url = new URL(payload);
  if (url.protocol !== 'attendance:' || url.hostname !== 'checkin' || url.searchParams.get('workplace') !== workplaceId || !url.searchParams.get('token')) {
    throw new Error('Scan the attendance QR displayed at your workplace.');
  }
  const token = url.searchParams.get('token')!;
  const requestType: 'CHECK_IN' | 'CHECK_OUT' = url.searchParams.get('type') === 'checkout' ? 'CHECK_OUT' : 'CHECK_IN';
  return { token, requestType };
}

/**
 * Extracts initials using the first letter of the first name and the first letter of the last name only.
 * e.g. "Shivam Shankhdhar" -> "SS", "Shivam Kumar Shankhdhar" -> "SS", "Shivam" -> "SH"
 */
export function getFirstAndLastInitials(name?: string, fallback = 'U'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Masks an email address for privacy (e.g. "er.shivam.shankhdhar@gmail.com" -> "er••••ar@gmail.com")
 * Hides employee personal email from workplace admin.
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  if (local.length <= 4) {
    return `${local[0]}•••${local.slice(-1)}@${domain}`;
  }
  const first = local.slice(0, 2);
  const last = local.slice(-2);
  return `${first}••••${last}@${domain}`;
}

/**
 * Formats a sync timestamp into a friendly relative/time string
 * e.g. "just now", "today at 10:24 AM", "Oct 1 at 10:24 AM"
 */
export function formatSyncTimestamp(timestamp?: number | Date | null): string {
  if (!timestamp) return 'earlier';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (!isValid(date)) return 'earlier';

  const diffMs = Date.now() - date.getTime();
  if (diffMs >= 0 && diffMs < 60 * 1000) {
    return 'just now';
  }

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  return isToday ? `today at ${timeStr}` : `${formatFriendlyDate(date, 'MMM d')} at ${timeStr}`;
}

/**
 * Calculates and formats total working duration between check-in and check-out.
 * e.g. "8 hours, 30 mins", "45 mins", "1 hour", or null if not checked out or invalid.
 */
export function formatWorkDuration(
  checkIn?: string | Date | null,
  checkOut?: string | Date | null,
  fallbackToNow = false
): string | null {
  if (!checkIn) return null;
  const inMs = new Date(checkIn).getTime();
  if (isNaN(inMs)) return null;

  const targetDate = checkOut ? new Date(checkOut) : fallbackToNow ? new Date() : null;
  if (!targetDate) return null;

  const outMs = targetDate.getTime();
  if (isNaN(outMs) || outMs < inMs) return null;
  const diffMins = Math.round((outMs - inMs) / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (mins > 0 || hours === 0) parts.push(`${mins} ${mins === 1 ? 'min' : 'mins'}`);
  return parts.join(', ');
}


