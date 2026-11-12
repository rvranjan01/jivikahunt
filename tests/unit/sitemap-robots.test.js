import { describe, it, expect, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/models/Job', () => ({
  default: {
    find: vi.fn().mockImplementation(() => ({
      select: () => ({
        lean: () =>
          Promise.resolve([
            {
              slug: 'active-job-1',
              company: { slug: 'techcorp' },
              lastDate: new Date(Date.now() + 86400000 * 5),
              updatedAt: new Date(),
            },
            {
              slug: 'expired-job-2',
              company: { slug: 'acme' },
              lastDate: new Date('2020-01-01'), // Expired
              updatedAt: new Date('2020-01-01'),
            },
          ]),
      }),
    })),
  },
}));

describe('Search Engine Crawling & Sitemaps (app/robots.js & app/sitemap.js)', () => {
  it('should generate valid robots.txt disallowing admin and API routes', () => {
    const robotsConfig = robots();

    expect(robotsConfig.rules).toBeDefined();
    expect(robotsConfig.rules[0].disallow).toContain('/admin/');
    expect(robotsConfig.rules[0].disallow).toContain('/api/');
    expect(robotsConfig.sitemap).toContain('/sitemap.xml');
  });

  it('should generate XML sitemap including active jobs and excluding expired jobs', async () => {
    const sitemapEntries = await sitemap();

    expect(Array.isArray(sitemapEntries)).toBe(true);
    // Must include home, jobs, and static policy pages
    expect(sitemapEntries.some((e) => e.url.endsWith('/jobs'))).toBe(true);
    expect(sitemapEntries.some((e) => e.url.endsWith('/about'))).toBe(true);

    // Active job must be included
    expect(sitemapEntries.some((e) => e.url.endsWith('/jobs/active-job-1'))).toBe(true);

    // Expired job must NOT be included in sitemap
    expect(sitemapEntries.some((e) => e.url.endsWith('/jobs/expired-job-2'))).toBe(false);

    // Company hub must be included
    expect(sitemapEntries.some((e) => e.url.endsWith('/companies/techcorp'))).toBe(true);
  });
});
