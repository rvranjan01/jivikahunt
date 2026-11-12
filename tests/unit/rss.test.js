import { describe, it, expect, vi } from 'vitest';
import { GET as getRssFeed } from '@/app/feed.xml/route';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/models/Job', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: () =>
            Promise.resolve([
              {
                _id: 'job_1',
                title: 'Junior Go Developer',
                slug: 'junior-go-developer-at-cloudtech',
                company: { name: 'CloudTech', slug: 'cloudtech' },
                type: 'fresher',
                workMode: 'remote',
                locations: ['Remote'],
                summary: 'Exciting backend role building scalable microservices in Go.',
                lastDate: new Date(Date.now() + 86400000 * 5),
                status: 'published',
                createdAt: new Date('2026-11-10T10:00:00.000Z'),
              },
              {
                _id: 'job_expired',
                title: 'Expired Python Intern',
                slug: 'expired-python-intern',
                company: { name: 'OldCorp' },
                lastDate: new Date('2020-01-01'),
                status: 'published',
                createdAt: new Date('2020-01-01'),
              },
            ]),
        }),
      }),
    }),
  },
}));

describe('RSS 2.0 Syndication Feed (app/feed.xml/route.js)', () => {
  it('should generate valid RSS 2.0 XML with correct headers', async () => {
    const res = await getRssFeed();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/xml');

    const xml = await res.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('Junior Go Developer at CloudTech');
    expect(xml).toContain('/jobs/junior-go-developer-at-cloudtech');
    expect(xml).toContain('<guid isPermaLink="true">');

    // Expired job must NOT appear in feed
    expect(xml).not.toContain('Expired Python Intern');
  });
});
