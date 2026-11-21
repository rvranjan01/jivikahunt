import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as viewHandler } from '@/app/api/jobs/view/route';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

let mockJobs = [];
let mockLoginAttempts = [];

vi.mock('@/models/Job', () => ({
  default: {
    findOneAndUpdate: vi.fn().mockImplementation((query, update) => {
      const job = mockJobs.find((j) => {
        if (query.slug && j.slug !== query.slug) return false;
        if (query.status && j.status !== query.status) return false;
        return true;
      });

      if (!job) return Promise.resolve(null);

      if (update.$inc?.views) {
        job.views = (job.views || 0) + update.$inc.views;
      }

      return Promise.resolve(job);
    }),
  },
}));

vi.mock('@/models/LoginAttempt', () => ({
  default: {
    findOne: vi.fn().mockImplementation(({ key }) => {
      return Promise.resolve(mockLoginAttempts.find((r) => r.key === key) || null);
    }),
    create: vi.fn().mockImplementation((doc) => {
      const entry = { attempts: 1, ...doc };
      mockLoginAttempts.push(entry);
      return Promise.resolve(entry);
    }),
  },
}));

describe('Job View Counting API (app/api/jobs/view/route.js)', () => {
  beforeEach(() => {
    mockJobs = [
      {
        slug: 'frontend-engineer-at-acme',
        status: 'published',
        views: 10,
      },
      {
        slug: 'draft-internship-at-beta',
        status: 'draft',
        views: 0,
      },
      {
        slug: 'unpublished-role-at-gamma',
        status: 'unpublished',
        views: 5,
      },
    ];
    mockLoginAttempts = [];
  });

  it('increments views for a published job from a normal visitor', async () => {
    const req = new Request('http://localhost:3000/api/jobs/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ slug: 'frontend-engineer-at-acme' }),
    });

    const res = await viewHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.counted).toBe(true);

    const job = mockJobs.find((j) => j.slug === 'frontend-engineer-at-acme');
    expect(job.views).toBe(11);
  });

  it('ignores bots by User-Agent without incrementing views', async () => {
    const req = new Request('http://localhost:3000/api/jobs/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      body: JSON.stringify({ slug: 'frontend-engineer-at-acme' }),
    });

    const res = await viewHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ignored).toBe(true);

    const job = mockJobs.find((j) => j.slug === 'frontend-engineer-at-acme');
    expect(job.views).toBe(10);
  });

  it('limits to 1 count per IP hash per job per hour', async () => {
    const makeReq = () =>
      new Request('http://localhost:3000/api/jobs/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0',
        },
        body: JSON.stringify({ slug: 'frontend-engineer-at-acme' }),
      });

    // First request counts
    const res1 = await viewHandler(makeReq());
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.counted).toBe(true);

    // Second request within same hour from same IP does not increment
    const res2 = await viewHandler(makeReq());
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.counted).toBe(false);

    const job = mockJobs.find((j) => j.slug === 'frontend-engineer-at-acme');
    expect(job.views).toBe(11); // Only incremented once
  });

  it('does not count draft jobs', async () => {
    const req = new Request('http://localhost:3000/api/jobs/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0',
      },
      body: JSON.stringify({ slug: 'draft-internship-at-beta' }),
    });

    const res = await viewHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.counted).toBe(false);

    const job = mockJobs.find((j) => j.slug === 'draft-internship-at-beta');
    expect(job.views).toBe(0);
  });

  it('does not count unpublished jobs', async () => {
    const req = new Request('http://localhost:3000/api/jobs/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0',
      },
      body: JSON.stringify({ slug: 'unpublished-role-at-gamma' }),
    });

    const res = await viewHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.counted).toBe(false);

    const job = mockJobs.find((j) => j.slug === 'unpublished-role-at-gamma');
    expect(job.views).toBe(5);
  });

  it('rejects requests with missing or invalid slug', async () => {
    const req = new Request('http://localhost:3000/api/jobs/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0',
      },
      body: JSON.stringify({}),
    });

    const res = await viewHandler(req);
    expect(res.status).toBe(400);
  });
});
