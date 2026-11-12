import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLandingPageJobs } from '@/lib/publicJobs';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

let mockJobs = [];

vi.mock('@/models/Job', () => ({
  default: {
    find: vi.fn().mockImplementation((query) => {
      let filtered = [...mockJobs];

      if (query?.type) {
        filtered = filtered.filter((j) => j.type === query.type);
      }
      if (query?.batches?.$in) {
        filtered = filtered.filter((j) => j.batches?.some((b) => query.batches.$in.includes(b)));
      }
      if (query?.['company.slug']) {
        filtered = filtered.filter((j) => j.company?.slug === query['company.slug']);
      }

      return {
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve(filtered),
            }),
          }),
        }),
      };
    }),
    countDocuments: vi.fn().mockImplementation((query) => {
      let filtered = [...mockJobs];
      if (query?.type) {
        filtered = filtered.filter((j) => j.type === query.type);
      }
      if (query?.batches?.$in) {
        filtered = filtered.filter((j) => j.batches?.some((b) => query.batches.$in.includes(b)));
      }
      if (query?.['company.slug']) {
        filtered = filtered.filter((j) => j.company?.slug === query['company.slug']);
      }
      return Promise.resolve(filtered.length);
    }),
  },
}));

describe('Programmatic SEO Landing Page Indexing Logic (lib/publicJobs.js)', () => {
  beforeEach(() => {
    mockJobs = [
      {
        _id: 'job_1',
        title: 'Job 1',
        slug: 'job-1',
        company: { name: 'Acme', slug: 'acme' },
        type: 'fresher',
        batches: [2025],
        status: 'published',
        lastDate: new Date(Date.now() + 86400000 * 5),
      },
      {
        _id: 'job_2',
        title: 'Job 2',
        slug: 'job-2',
        company: { name: 'Acme', slug: 'acme' },
        type: 'fresher',
        batches: [2025],
        status: 'published',
        lastDate: new Date(Date.now() + 86400000 * 5),
      },
    ];
  });

  it('should mark shouldIndex: false (noindex) when fewer than 3 jobs exist', async () => {
    const result = await getLandingPageJobs('type', 'fresher');

    expect(result.total).toBe(2);
    // Mandatory spec: noindex when fewer than 3 jobs
    expect(result.shouldIndex).toBe(false);
  });

  it('should mark shouldIndex: true (index) when 3 or more jobs exist', async () => {
    mockJobs.push({
      _id: 'job_3',
      title: 'Job 3',
      slug: 'job-3',
      company: { name: 'Acme', slug: 'acme' },
      type: 'fresher',
      batches: [2025],
      status: 'published',
      lastDate: new Date(Date.now() + 86400000 * 5),
    });

    const result = await getLandingPageJobs('type', 'fresher');

    expect(result.total).toBe(3);
    // Mandatory spec: index when 3 or more jobs
    expect(result.shouldIndex).toBe(true);
  });

  it('should return total: 0 when no matching jobs exist (enabling 404 in route)', async () => {
    const result = await getLandingPageJobs('batch', 2029);

    expect(result.total).toBe(0);
    expect(result.jobs).toHaveLength(0);
  });
});
