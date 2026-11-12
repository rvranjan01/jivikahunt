/**
 * @file app/api/admin/jobs/route.js
 * @description Admin and contributor job management endpoint.
 * Enforces role isolation (contributors see and manage only their own jobs), daily quotas,
 * duplicate warnings, unique slug generation, and automated Telegram channel alerts.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { jobSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { generateUniqueJobSlug, generateCompanySlug } from '@/lib/slug';
import { checkContributorDailyQuota } from '@/lib/quota';
import { postJobToTelegram } from '@/lib/telegram';
import { recordAuditLog } from '@/lib/audit';
import { connectToDatabase } from '@/lib/db';
import Job from '@/models/Job';

export const dynamic = 'force-dynamic';

/**
 * GET: Lists jobs with status filtering, search, and pagination.
 * Contributors see only their own jobs; Admins see all jobs across the platform.
 */
export async function GET(request) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const user = auth.user;
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const status = searchParams.get('status') || '';
  const search = searchParams.get('q') || '';

  await connectToDatabase();

  const query = {};

  // Contributor isolation: restrict view strictly to self-authored posts
  if (user.role !== 'admin') {
    query.createdBy = user._id;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { 'company.name': { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const quota = await checkContributorDailyQuota(user);

  return NextResponse.json({
    success: true,
    jobs: jobs.map((j) => ({
      ...j,
      id: j._id.toString(),
    })),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
    quota,
  });
}

/**
 * POST: Creates and publishes a job listing.
 */
export async function POST(request) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const user = auth.user;
  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);

  try {
    const rawBody = await request.json();
    const sanitizedBody = sanitizeNoSql(rawBody);

    const validationResult = jobSchema.safeParse(sanitizedBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid job data', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const jobData = validationResult.data;

    // 1. Enforce contributor daily quota (max 30 jobs/day)
    if (jobData.status !== 'draft') {
      const quota = await checkContributorDailyQuota(user);
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: `Daily posting quota reached. Contributors can create a maximum of ${quota.limit} new jobs per 24 hours.`,
          },
          { status: 429 }
        );
      }
    }

    await connectToDatabase();

    // 2. Duplicate Check: Warn if the same company, title, and apply link already exist
    const isDuplicateAllowed = rawBody.force === true;
    const existingDuplicate = await Job.findOne({
      'company.name': { $regex: `^${jobData.company.name.trim()}$`, $options: 'i' },
      title: { $regex: `^${jobData.title.trim()}$`, $options: 'i' },
      applyUrl: jobData.applyUrl.trim(),
    });

    if (existingDuplicate && !isDuplicateAllowed) {
      return NextResponse.json(
        {
          isDuplicate: true,
          warning:
            'A job posting with the same company, title, and apply URL already exists. Click "Publish Anyway" to override.',
          existingJobId: existingDuplicate._id.toString(),
        },
        { status: 409 }
      );
    }

    // 3. Generate unique URL slug and company slug
    const slug = await generateUniqueJobSlug(jobData.title, jobData.company.name);
    const companySlug = generateCompanySlug(jobData.company.name);

    // 4. Construct Job document
    const newJob = await Job.create({
      title: jobData.title,
      slug,
      company: {
        name: jobData.company.name,
        slug: companySlug,
        logoId: jobData.company.logoId || null,
        description: jobData.company.description || '',
      },
      type: jobData.type,
      workMode: jobData.workMode,
      locations: jobData.locations,
      batches: jobData.batches,
      salary: jobData.salary || '',
      skills: jobData.skills,
      summary: jobData.summary,
      responsibilities: jobData.responsibilities,
      eligibility: jobData.eligibility,
      applyUrl: jobData.applyUrl,
      lastDate: jobData.lastDate ? new Date(jobData.lastDate) : null,
      status: jobData.status,
      publishAt: jobData.publishAt ? new Date(jobData.publishAt) : null,
      featured: user.role === 'admin' ? Boolean(jobData.featured) : false,
      createdBy: user._id,
      postedByName: user.displayName, // Preserved so attribution survives contributor deletion
    });

    // 5. If published, trigger Telegram auto-post asynchronously (non-blocking)
    if (newJob.status === 'published') {
      postJobToTelegram(newJob).catch((err) => {
        console.error('Async Telegram dispatch error:', err);
      });
    }

    await recordAuditLog({
      action: newJob.status === 'draft' ? 'job.create.draft' : 'job.create.publish',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'Job',
      targetId: newJob._id.toString(),
      metadata: { title: newJob.title, company: newJob.company.name, status: newJob.status },
      ipHash: ipHashed,
    });

    return NextResponse.json(
      {
        success: true,
        job: {
          id: newJob._id.toString(),
          slug: newJob.slug,
          title: newJob.title,
          status: newJob.status,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Failed to create job:', err);
    return NextResponse.json({ error: 'Failed to create job posting.' }, { status: 500 });
  }
}
