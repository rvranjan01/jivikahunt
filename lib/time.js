/**
 * @file lib/time.js
 * @description Timezone and deadline utilities enforcing Asia/Kolkata (IST = UTC+05:30).
 * All deadlines on JivikaHunt expire at 23:59:59.999 IST on the specified lastDate.
 */

export const TIMEZONE_IST = 'Asia/Kolkata';

/**
 * Returns the exact UTC Date object representing 23:59:59.999 IST (end of day) for a given date.
 *
 * @param {Date | string} dateInput - Date or ISO string
 * @returns {Date} UTC Date corresponding to 23:59:59.999 IST
 */
export function getEndOfDayIST(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  // Extract year, month, and day in Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // en-CA format returns YYYY-MM-DD
  const dateStr = formatter.format(d);
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  // 23:59:59.999 IST corresponds to 18:29:59.999 UTC (IST is UTC + 5h30m)
  // Date.UTC(year, month, day, 18, 29, 59, 999)
  const utcMillis = Date.UTC(year, month, day, 18, 29, 59, 999);
  return new Date(utcMillis);
}

/**
 * Returns the exact UTC Date object representing 00:00:00.000 IST (start of day) for a given date.
 *
 * @param {Date | string} [dateInput=new Date()]
 * @returns {Date} UTC Date corresponding to 00:00:00.000 IST
 */
export function getStartOfDayIST(dateInput = new Date()) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const dateStr = formatter.format(d);
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // 00:00:00.000 IST is Date.UTC(year, month, day, 0, 0, 0, 0) minus 5h30m
  const istOffsetMillis = (5 * 60 + 30) * 60 * 1000;
  const utcMillis = Date.UTC(year, month, day, 0, 0, 0, 0) - istOffsetMillis;
  return new Date(utcMillis);
}

/**
 * Checks whether a job has expired based on its lastDate.

 *
 * @param {Date | string | null | undefined} lastDate - Application deadline
 * @returns {boolean} True if expired
 */
export function isJobExpired(lastDate) {
  if (!lastDate) return false;
  const expiryDate = getEndOfDayIST(lastDate);
  if (!expiryDate) return false;
  return Date.now() > expiryDate.getTime();
}

/**
 * Formats a Date or timestamp into a readable IST display string.
 *
 * @param {Date | string | number} dateInput
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string} Formatted date in Asia/Kolkata
 */
export function formatIST(dateInput, options = {}) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const defaultOptions = {
    timeZone: TIMEZONE_IST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(d);
}

/**
 * Formats a date with full IST time for audit and admin views.
 *
 * @param {Date | string | number} dateInput
 * @returns {string} Formatted date & time (e.g., "12 Nov 2026, 05:30 PM IST")
 */
export function formatISTDateTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE_IST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${formatted} IST`;
}
