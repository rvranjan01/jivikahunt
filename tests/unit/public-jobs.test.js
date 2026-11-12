import { describe, it, expect } from 'vitest';
import { buildPublicJobsFilter } from '@/lib/publicJobs';
import { getStartOfDayIST, getEndOfDayIST } from '@/lib/time';

describe('Public Jobs Query Builder & IST Boundaries (lib/publicJobs.js)', () => {
  it('should build a base query targeting only published and non-expired listings', () => {
    const filter = buildPublicJobsFilter({});

    expect(filter.status).toBe('published');
    expect(filter.$or).toBeDefined();
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { lastDate: null },
        expect.objectContaining({ lastDate: expect.any(Object) }),
      ])
    );
  });

  it('should apply job type, work mode, and batch filters correctly', () => {
    const filter = buildPublicJobsFilter({
      type: 'intern',
      workMode: 'remote',
      batch: '2025',
    });

    expect(filter.type).toBe('intern');
    expect(filter.workMode).toBe('remote');
    expect(filter.batches).toEqual({ $in: [2025] });
  });

  it('should apply location and skills filters safely with escaping', () => {
    const filter = buildPublicJobsFilter({
      location: 'Bengaluru',
      skills: 'React, Node.js',
    });

    expect(filter.locations).toBeDefined();
    expect(filter.skills).toBeDefined();
    expect(filter.skills.$in).toHaveLength(2);
  });

  it('should apply text search across title and company name', () => {
    const filter = buildPublicJobsFilter({
      q: 'Software Engineer',
    });

    // When combined with expiry or-clause, wraps with $and
    expect(filter.$and).toBeDefined();
    expect(filter.$and).toHaveLength(2);
  });

  it('should accurately calculate start and end of day in Asia/Kolkata (IST)', () => {
    const testDate = new Date('2026-11-12T12:00:00.000Z');
    const startOfToday = getStartOfDayIST(testDate);
    const endOfToday = getEndOfDayIST(testDate);

    expect(startOfToday.getTime()).toBeLessThan(endOfToday.getTime());
    // Difference between 00:00:00.000 and 23:59:59.999 is 86399999 ms
    expect(endOfToday.getTime() - startOfToday.getTime()).toBe(86399999);
  });
});
