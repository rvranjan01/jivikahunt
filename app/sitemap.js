import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { getStartOfDayIST, isJobExpired } from '@/lib/time';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

/**
 * Dynamic XML sitemap generator conforming to Google search indexing specifications.
 * Strictly indexes ONLY published, non-expired job listings, active company hubs, and primary landing pages.
 *
 * @returns {Promise<import('next').MetadataRoute.Sitemap>}
 */
export default async function sitemap() {
  const baseUrl = siteConfig.url;
  const now = new Date();

  // Primary static & category routes
  const staticRoutes = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/jobs/type/fresher`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/jobs/type/intern`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/jobs/type/experienced`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    await connectDB();

    const startOfToday = getStartOfDayIST(now);
    const query = {
      status: 'published',
      $or: [{ lastDate: null }, { lastDate: { $gte: startOfToday } }],
    };

    const jobs = await Job.find(query).select('slug company.slug updatedAt lastDate').lean();

    // Filter out expired jobs based on IST deadline
    const activeJobs = jobs.filter((job) => !isJobExpired(job.lastDate));

    // Dynamic published job routes
    const jobRoutes = activeJobs.map((job) => ({
      url: `${baseUrl}/jobs/${job.slug}`,
      lastModified: job.updatedAt ? new Date(job.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // Unique active company hubs
    const companySlugs = new Set();
    activeJobs.forEach((job) => {
      if (job.company?.slug) {
        companySlugs.add(job.company.slug);
      }
    });

    const companyRoutes = Array.from(companySlugs).map((compSlug) => ({
      url: `${baseUrl}/companies/${compSlug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...jobRoutes, ...companyRoutes];
  } catch (err) {
    console.error('Failed to generate dynamic sitemap:', err);
    return staticRoutes;
  }
}
