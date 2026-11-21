import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '@/app/(public)/page';
import GuidesHubPage from '@/app/(public)/guides/page';
import GuideReaderPage, {
  generateMetadata as generateGuideMetadata,
} from '@/app/(public)/guides/[slug]/page';
import JobDetailPage, {
  generateMetadata as generateJobMetadata,
} from '@/app/(public)/jobs/[slug]/page';
import CompanyLandingPage, {
  generateMetadata as generateCompanyMetadata,
} from '@/app/(public)/companies/[slug]/page';
import * as publicJobsModule from '@/lib/publicJobs';
import * as dbModule from '@/lib/db';
import Guide from '@/models/Guide';

describe('Prerender Resilience with Failing Database Connection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Home Page (app/(public)/page.jsx)', () => {
    it('should catch error and render empty state when NEXT_PHASE is phase-production-build', async () => {
      vi.stubEnv('NEXT_PHASE', 'phase-production-build');
      vi.spyOn(publicJobsModule, 'getPublicJobs').mockRejectedValue(
        new Error('MongooseServerSelectionError: connection refused')
      );

      const element = await HomePage({ searchParams: Promise.resolve({}) });
      expect(element).toBeDefined();
    });

    it('should re-throw error when outside phase-production-build', async () => {
      vi.stubEnv('NEXT_PHASE', '');
      vi.spyOn(publicJobsModule, 'getPublicJobs').mockRejectedValue(
        new Error('MongooseServerSelectionError: connection refused')
      );

      await expect(HomePage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
        'MongooseServerSelectionError: connection refused'
      );
    });
  });

  describe('Guides Hub Page (app/(public)/guides/page.jsx)', () => {
    it('should catch error and render empty state when NEXT_PHASE is phase-production-build', async () => {
      vi.stubEnv('NEXT_PHASE', 'phase-production-build');
      vi.spyOn(dbModule, 'default').mockRejectedValue(
        new Error('MongoNetworkError: failed to connect')
      );

      const element = await GuidesHubPage();
      expect(element).toBeDefined();
    });

    it('should re-throw error outside build phase', async () => {
      vi.stubEnv('NEXT_PHASE', '');
      vi.spyOn(dbModule, 'default').mockRejectedValue(
        new Error('MongoNetworkError: failed to connect')
      );

      await expect(GuidesHubPage()).rejects.toThrow('MongoNetworkError: failed to connect');
    });
  });

  describe('Guide Detail Page (app/(public)/guides/[slug]/page.jsx)', () => {
    it('should catch connection failure during build phase', async () => {
      vi.stubEnv('NEXT_PHASE', 'phase-production-build');
      vi.spyOn(dbModule, 'default').mockRejectedValue(new Error('Connection timed out'));

      const meta = await generateGuideMetadata({ params: Promise.resolve({ slug: 'test-guide' }) });
      expect(meta.robots).toEqual({ index: false, follow: false });

      const element = await GuideReaderPage({ params: Promise.resolve({ slug: 'test-guide' }) });
      expect(element).toBeDefined();
    });

    it('should re-throw error outside build phase', async () => {
      vi.stubEnv('NEXT_PHASE', '');
      vi.spyOn(dbModule, 'default').mockRejectedValue(new Error('Connection timed out'));

      await expect(
        GuideReaderPage({ params: Promise.resolve({ slug: 'test-guide' }) })
      ).rejects.toThrow('Connection timed out');
    });
  });

  describe('Job Detail Page (app/(public)/jobs/[slug]/page.jsx)', () => {
    it('should catch connection failure during build phase', async () => {
      vi.stubEnv('NEXT_PHASE', 'phase-production-build');
      vi.spyOn(publicJobsModule, 'getPublicJobBySlug').mockRejectedValue(
        new Error('MongoServerSelectionError')
      );

      const meta = await generateJobMetadata({ params: Promise.resolve({ slug: 'test-job' }) });
      expect(meta.robots).toEqual({ index: false, follow: false });

      const element = await JobDetailPage({ params: Promise.resolve({ slug: 'test-job' }) });
      expect(element).toBeDefined();
    });

    it('should re-throw error outside build phase', async () => {
      vi.stubEnv('NEXT_PHASE', '');
      vi.spyOn(publicJobsModule, 'getPublicJobBySlug').mockRejectedValue(
        new Error('MongoServerSelectionError')
      );

      await expect(
        JobDetailPage({ params: Promise.resolve({ slug: 'test-job' }) })
      ).rejects.toThrow('MongoServerSelectionError');
    });

    it('should not render JobPosting script when the job is expired', async () => {
      vi.stubEnv('NEXT_PHASE', '');
      const expiredJob = {
        _id: '65b89a000000000000000099',
        title: 'Expired SDE',
        slug: 'expired-sde',
        company: { name: 'Legacy Corp' },
        summary: 'A long summary for expired sde.',
        type: 'fresher',
        workMode: 'onsite',
        locations: ['Pune'],
        lastDate: new Date('2020-01-01'),
        createdAt: new Date('2019-12-01'),
      };

      vi.spyOn(publicJobsModule, 'getPublicJobBySlug').mockResolvedValue({
        job: expiredJob,
        author: { displayName: 'Team' },
        isExpired: true,
      });
      vi.spyOn(publicJobsModule, 'getRelatedJobs').mockResolvedValue([]);

      const element = await JobDetailPage({ params: Promise.resolve({ slug: 'expired-sde' }) });
      expect(element).toBeDefined();

      const findJsonLd = (node) => {
        if (!node) return false;
        if (node.type === 'script' && node.props?.type === 'application/ld+json') return true;
        if (Array.isArray(node.props?.children)) {
          return node.props.children.some(findJsonLd);
        }
        if (node.props?.children) {
          return findJsonLd(node.props.children);
        }
        return false;
      };

      expect(findJsonLd(element)).toBe(false);
    });

    it('should render JobPosting script when the job is active and not expired', async () => {
      vi.stubEnv('NEXT_PHASE', '');
      const activeJob = {
        _id: '65b89a000000000000000098',
        title: 'Active SDE',
        slug: 'active-sde',
        company: { name: 'Active Corp' },
        summary: 'A long summary for active sde.',
        type: 'fresher',
        workMode: 'onsite',
        locations: ['Pune'],
        lastDate: new Date('2030-01-01'),
        createdAt: new Date('2026-11-01'),
      };

      vi.spyOn(publicJobsModule, 'getPublicJobBySlug').mockResolvedValue({
        job: activeJob,
        author: { displayName: 'Team' },
        isExpired: false,
      });
      vi.spyOn(publicJobsModule, 'getRelatedJobs').mockResolvedValue([]);

      const element = await JobDetailPage({ params: Promise.resolve({ slug: 'active-sde' }) });
      expect(element).toBeDefined();

      const findJsonLd = (node) => {
        if (!node) return false;
        if (node.type === 'script' && node.props?.type === 'application/ld+json') return true;
        if (Array.isArray(node.props?.children)) {
          return node.props.children.some(findJsonLd);
        }
        if (node.props?.children) {
          return findJsonLd(node.props.children);
        }
        return false;
      };

      expect(findJsonLd(element)).toBe(true);
    });
  });

  describe('Company Landing Page (app/(public)/companies/[slug]/page.jsx)', () => {
    it('should catch connection failure during build phase', async () => {
      vi.stubEnv('NEXT_PHASE', 'phase-production-build');
      vi.spyOn(publicJobsModule, 'getLandingPageJobs').mockRejectedValue(
        new Error('Database unreachable')
      );

      const meta = await generateCompanyMetadata({ params: Promise.resolve({ slug: 'acme' }) });
      expect(meta.robots).toEqual({ index: false, follow: false });

      const element = await CompanyLandingPage({
        params: Promise.resolve({ slug: 'acme' }),
        searchParams: Promise.resolve({}),
      });
      expect(element).toBeDefined();
    });

    it('should re-throw error outside build phase', async () => {
      vi.stubEnv('NEXT_PHASE', '');
      vi.spyOn(publicJobsModule, 'getLandingPageJobs').mockRejectedValue(
        new Error('Database unreachable')
      );

      await expect(
        CompanyLandingPage({
          params: Promise.resolve({ slug: 'acme' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('Database unreachable');
    });
  });
});
