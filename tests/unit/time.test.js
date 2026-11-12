import { describe, it, expect } from 'vitest';
import { getEndOfDayIST, isJobExpired, formatIST, formatISTDateTime } from '@/lib/time';

describe('Time and Expiry Utilities (lib/time.js)', () => {
  describe('getEndOfDayIST', () => {
    it('should compute exact UTC time for 23:59:59.999 IST', () => {
      // For any date in IST (UTC+05:30), 23:59:59.999 IST equals 18:29:59.999 UTC
      const lastDate = '2026-11-20';
      const endOfDay = getEndOfDayIST(lastDate);

      expect(endOfDay).toBeInstanceOf(Date);
      expect(endOfDay.getUTCHours()).toBe(18);
      expect(endOfDay.getUTCMinutes()).toBe(29);
      expect(endOfDay.getUTCSeconds()).toBe(59);
      expect(endOfDay.getUTCMilliseconds()).toBe(999);
    });

    it('should return null for invalid date inputs', () => {
      expect(getEndOfDayIST(null)).toBeNull();
      expect(getEndOfDayIST('not-a-date')).toBeNull();
    });
  });

  describe('isJobExpired', () => {
    it('should return false when no deadline is specified', () => {
      expect(isJobExpired(null)).toBe(false);
      expect(isJobExpired(undefined)).toBe(false);
    });

    it('should return true for a deadline in the past', () => {
      // 1 Jan 2020 has passed
      expect(isJobExpired('2020-01-01')).toBe(true);
    });

    it('should return false for a deadline in the future', () => {
      // Year 2099 has not passed
      expect(isJobExpired('2099-12-31')).toBe(false);
    });
  });

  describe('Formatting IST', () => {
    it('should format date in Indian English readable format', () => {
      const formatted = formatIST('2026-11-20T10:00:00.000Z');
      expect(formatted).toContain('2026');
      expect(formatted).toMatch(/20\s+Nov\s+2026/);
    });

    it('should format full date and time with IST suffix', () => {
      const formatted = formatISTDateTime('2026-11-20T10:00:00.000Z');
      expect(formatted).toContain('IST');
      expect(formatted).toContain('2026');
    });
  });
});
