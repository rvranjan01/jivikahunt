/**
 * @file lib/publicJobs.js
 * @description Data access layer for public job listings, detail views, and related recommendations.
 * Ensures strict exclusion of expired jobs from public feeds and protects contributor privacy.
 */

import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import { getStartOfDayIST, isJobExpired } from '@/lib/time';
import { publicJobsQuerySchema } from '@/lib/validation';

/**
 * Builds a sanitized MongoDB query object from public search parameters.
 * Excludes draft, scheduled, unpublished, and expired jobs.
 *
 * @param {Object} rawParams
 * @returns {Object} MongoDB query filter
 */
export function buildPublicJobsFilter(rawParams = {}) {
  const parsed = publicJobsQuerySchema.safeParse(rawParams);
  const params = parsed.success ? parsed.data : {};

  /** @type {Record<string, any>} */
  const query = {
    status: 'published',
  };

  // Exclude jobs whose application deadline has passed in Indian Standard Time (IST)
  const startOfToday = getStartOfDayIST(new Date());
  if (startOfToday) {
    query.$or = [{ lastDate: null }, { lastDate: { $gte: startOfToday } }];
  }

  // Job Type filter (fresher | intern | experienced)
  if (params.type) {
    query.type = params.type;
  }

  // Work Mode filter (onsite | hybrid | remote)
  if (params.workMode) {
    query.workMode = params.workMode;
  }

  // Target Graduation Batch year
  if (params.batch) {
    query.batches = { $in: [params.batch] };
  }

  // Location filter (case-insensitive substring)
  if (params.location) {
    const escapedLoc = params.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.locations = { $regex: new RegExp(escapedLoc, 'i') };
  }

  // Skill filter (case-insensitive search across skills array)
  if (params.skills) {
    const skillList = params.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (skillList.length > 0) {
      const skillRegexes = skillList.map(
        (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      );
      query.skills = { $in: skillRegexes };
    }
  }

  // Text search on title and company name
  if (params.q) {
    const searchRegex = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const existingOr = query.$or;
    const textOr = [
      { title: { $regex: searchRegex } },
      { 'company.name': { $regex: searchRegex } },
    ];

    if (existingOr) {
      query.$and = [{ $or: existingOr }, { $or: textOr }];
      delete query.$or;
    } else {
      query.$or = textOr;
    }
  }

  return query;
}

/**
 * Retrieves a paginated list of published, active jobs matching search filters.
 *
 * @param {Object} rawParams
 * @returns {Promise<{ jobs: any[], pagination: { total: number, page: number, limit: number, totalPages: number } }>}
 */
export async function getPublicJobs(rawParams = {}) {
  await connectDB();

  const parsed = publicJobsQuerySchema.safeParse(rawParams);
  const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 20 };

  const query = buildPublicJobsFilter(rawParams);

  const skip = (page - 1) * limit;

  // Execute count and query concurrently
  const [total, rawJobs] = await Promise.all([
    Job.countDocuments(query),
    Job.find(query).sort({ featured: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  // Double check in-memory IST expiry to prevent edge-case race conditions
  const jobs = rawJobs.filter((job) => !isJobExpired(job.lastDate));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    jobs,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Retrieves a single published job by its unique slug, including author box details.
 * Note: Contributor email is NEVER selected or returned to protect contributor privacy.
 *
 * @param {string} slug
 * @returns {Promise<{ job: any, author: { displayName: string, bio: string, photoId: any }, isExpired: boolean } | null>}
 */
export async function getPublicJobBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null;

  await connectDB();

  const job = await Job.findOne({
    slug: slug.toLowerCase().trim(),
    status: { $in: ['published', 'draft', 'scheduled', 'unpublished'] },
  }).lean();

  if (!job) return null;

  // If the job is not published, it is not publicly accessible
  if (job.status !== 'published') {
    return null;
  }

  // Lookup author details. Contributor email is intentionally EXCLUDED.
  let author = {
    displayName: job.postedByName || 'JivikaHunt Team',
    bio: '',
    photoId: null,
  };

  if (job.createdBy) {
    const user = await User.findById(job.createdBy).select('displayName bio photoId').lean();
    if (user) {
      author = {
        displayName: user.displayName || job.postedByName,
        bio: user.bio || '',
        photoId: user.photoId || null,
      };
    }
  }

  const isExpired = isJobExpired(job.lastDate);

  return {
    job,
    author,
    isExpired,
  };
}

/**
 * Finds up to 4 related active jobs based on matching skills, job type, or location.
 *
 * @param {Object} currentJob
 * @param {number} [limit=4]
 * @returns {Promise<any[]>}
 */
export async function getRelatedJobs(currentJob, limit = 4) {
  if (!currentJob || !currentJob._id) return [];

  await connectDB();

  const matchConditions = [];

  if (Array.isArray(currentJob.skills) && currentJob.skills.length > 0) {
    matchConditions.push({ skills: { $in: currentJob.skills } });
  }

  if (currentJob.type) {
    matchConditions.push({ type: currentJob.type });
  }

  if (Array.isArray(currentJob.locations) && currentJob.locations.length > 0) {
    matchConditions.push({ locations: { $in: currentJob.locations } });
  }

  if (matchConditions.length === 0) return [];

  const startOfToday = getStartOfDayIST(new Date());

  const query = {
    status: 'published',
    _id: { $ne: currentJob._id },
    $and: [
      { $or: matchConditions },
      ...(startOfToday
        ? [{ $or: [{ lastDate: null }, { lastDate: { $gte: startOfToday } }] }]
        : []),
    ],
  };

  const rawRelated = await Job.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 2)
    .lean();

  // Filter out any expired jobs and slice to limit
  return rawRelated.filter((job) => !isJobExpired(job.lastDate)).slice(0, limit);
}

/**
 * Retrieves jobs for programmatic SEO landing pages with threshold checking.
 * Mandate: Return 404 when there are 0 jobs, and noindex when fewer than 3 jobs.
 *
 * @param {'skill' | 'location' | 'batch' | 'type' | 'company'} filterType
 * @param {string | number} filterValue
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @returns {Promise<{ jobs: any[], total: number, shouldIndex: boolean, totalPages: number }>}
 */
export async function getLandingPageJobs(filterType, filterValue, page = 1, limit = 20) {
  await connectDB();

  const startOfToday = getStartOfDayIST(new Date());

  /** @type {Record<string, any>} */
  const query = {
    status: 'published',
    ...(startOfToday ? { $or: [{ lastDate: null }, { lastDate: { $gte: startOfToday } }] } : {}),
  };

  switch (filterType) {
    case 'skill': {
      const escaped = String(filterValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.skills = { $regex: new RegExp(escaped, 'i') };
      break;
    }
    case 'location': {
      const escaped = String(filterValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.locations = { $regex: new RegExp(escaped, 'i') };
      break;
    }
    case 'batch': {
      const year = parseInt(String(filterValue), 10);
      query.batches = { $in: [year] };
      break;
    }
    case 'type': {
      query.type = String(filterValue).toLowerCase();
      break;
    }
    case 'company': {
      query['company.slug'] = String(filterValue).toLowerCase().trim();
      break;
    }
    default:
      break;
  }

  const skip = (page - 1) * limit;

  const [total, rawJobs] = await Promise.all([
    Job.countDocuments(query),
    Job.find(query).sort({ featured: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const jobs = rawJobs.filter((job) => !isJobExpired(job.lastDate));
  const shouldIndex = total >= 3;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    jobs,
    total,
    shouldIndex,
    totalPages,
  };
}
