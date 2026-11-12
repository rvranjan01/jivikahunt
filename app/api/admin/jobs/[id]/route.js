/**
 * @file app/api/admin/jobs/[id]/route.js
 * @description Single job administration endpoint. Enforces strict contributor isolation:
 * contributors can view, modify, and delete only their own posts, while admins can manage anything.
 */

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { requireAuth } from '@/lib/auth';
import { jobSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { generateUniqueJobSlug, generateCompanySlug } from '@/lib/slug';
import { postJobToTelegram } from '@/lib/telegram';
import { recordAuditLog } from '@/lib/audit';
import { connectToDatabase } from '@/lib/db';
import Job from '@/models/Job';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetches a single job for editing.
 */
export async function GET(request, context) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const user = auth.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  await connectToDatabase();
  const job = await Job.findById(id).lean();

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Contributor isolation: contributors cannot access another person's job
  if (user.role !== 'admin' && job.createdBy.toString() !== user._id.toString()) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to view this job.' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    job: {
      ...job,
      id: job._id.toString(),
    },
  });
}

/**
 * PUT: Updates an existing job posting.
 */
export async function PUT(request, context) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const user = auth.user;
  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

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

    await connectToDatabase();
    const existingJob = await Job.findById(id);

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Contributor isolation: contributors cannot edit another contributor's post
    if (user.role !== 'admin' && existingJob.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own job postings.' },
        { status: 403 }
      );
    }

    // Check if title or company changed; if so, regenerate slug
    let slug = existingJob.slug;
    if (existingJob.title !== jobData.title || existingJob.company.name !== jobData.company.name) {
      slug = await generateUniqueJobSlug(jobData.title, jobData.company.name, existingJob._id);
    }

    const previousStatus = existingJob.status;

    // Apply updates
    existingJob.title = jobData.title;
    existingJob.slug = slug;
    existingJob.company = {
      name: jobData.company.name,
      slug: generateCompanySlug(jobData.company.name),
      logoId: jobData.company.logoId || null,
      description: jobData.company.description || '',
    };
    existingJob.type = jobData.type;
    existingJob.workMode = jobData.workMode;
    existingJob.locations = jobData.locations;
    existingJob.batches = jobData.batches;
    existingJob.salary = jobData.salary || '';
    existingJob.skills = jobData.skills;
    existingJob.summary = jobData.summary;
    existingJob.responsibilities = jobData.responsibilities;
    existingJob.eligibility = jobData.eligibility;
    existingJob.applyUrl = jobData.applyUrl;
    existingJob.lastDate = jobData.lastDate ? new Date(jobData.lastDate) : null;
    existingJob.status = jobData.status;
    existingJob.publishAt = jobData.publishAt ? new Date(jobData.publishAt) : null;

    if (user.role === 'admin') {
      existingJob.featured = Boolean(jobData.featured);
    }

    const updated = await existingJob.save();

    // Trigger Telegram alert if transitioning to published for the first time
    if (previousStatus !== 'published' && updated.status === 'published') {
      postJobToTelegram(updated).catch((err) => {
        console.error('Async Telegram dispatch error:', err);
      });
    }

    await recordAuditLog({
      action: 'job.edit',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'Job',
      targetId: updated._id.toString(),
      metadata: { status: updated.status, title: updated.title },
      ipHash: ipHashed,
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updated._id.toString(),
        slug: updated.slug,
        title: updated.title,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error('Failed to update job:', err);
    return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes or unpublishes a job posting.
 */
export async function DELETE(request, context) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const user = auth.user;
  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  try {
    await connectToDatabase();
    const existingJob = await Job.findById(id);

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Contributor isolation: contributors cannot delete another contributor's post
    if (user.role !== 'admin' && existingJob.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own job postings.' },
        { status: 403 }
      );
    }

    await Job.findByIdAndDelete(id);

    await recordAuditLog({
      action: 'job.delete',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'Job',
      targetId: id,
      metadata: { title: existingJob.title, company: existingJob.company?.name },
      ipHash: ipHashed,
    });

    return NextResponse.json({ success: true, message: 'Job deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete job:', err);
    return NextResponse.json({ error: 'Failed to delete job.' }, { status: 500 });
  }
}
