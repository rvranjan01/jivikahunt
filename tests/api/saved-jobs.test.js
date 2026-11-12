import { describe, it, expect, vi } from 'vitest';
import { POST as lookupSavedJobsHandler } from '@/app/api/jobs/saved/route';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/models/Job', () => ({
  default: {
    find: vi.fn().mockImplementation((query) => {
      const allJobs = [
        {
          _id: '65b89a1234567890abcdef01',
          title: 'Saved Job 1',
          slug: 'saved-job-1',
          status: 'published',
        },
        {
          _id: '65b89a1234567890abcdef02',
          title: 'Saved Job 2',
          slug: 'saved-job-2',
          status: 'published',
        },
      ];

      const ids = query._id?.$in || [];
      const filtered = allJobs.filter((j) => ids.includes(j._id));

      return {
        sort: () => ({
          lean: () => Promise.resolve(filtered),
        }),
      };
    }),
  },
}));

describe('Saved Jobs Lookup API (app/api/jobs/saved/route.js)', () => {
  it('should resolve valid job ObjectIds into job records', async () => {
    const req = new Request('http://localhost:3000/api/jobs/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: ['65b89a1234567890abcdef01', '65b89a1234567890abcdef02'],
      }),
    });

    const res = await lookupSavedJobsHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobs).toHaveLength(2);
    expect(data.jobs[0].title).toBe('Saved Job 1');
  });

  it('should return empty list when no valid ObjectIds provided', async () => {
    const req = new Request('http://localhost:3000/api/jobs/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: [],
      }),
    });

    const res = await lookupSavedJobsHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobs).toHaveLength(0);
  });
});
