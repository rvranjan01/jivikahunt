/**
 * @file app/api/reports/route.js
 * @description Public endpoint to report broken application links, expired vacancies, or scam listings.
 * Rate limited by salted IP hash (max 5 reports per hour per IP) with zero authentication required.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Report from '@/models/Report';
import { getClientIp, hashIp, sanitizeNoSql } from '@/lib/security';
import { checkReportRateLimit, recordReportSubmission } from '@/lib/rateLimit';
import { createReportSchema } from '@/lib/validation';
import { recordAuditLog } from '@/lib/audit';

/**
 * Handles public report submissions.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const ipHash = hashIp(clientIp);

    // Rate limiting: max 5 reports/hour per IP hash
    const rateCheck = await checkReportRateLimit(ipHash);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error:
            'Too many reports submitted from this network. Please wait an hour before submitting again.',
        },
        { status: 429 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const sanitized = sanitizeNoSql(rawBody);
    const parsed = createReportSchema.safeParse(sanitized);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { jobId, reason, note } = parsed.data;

    await connectDB();

    // Verify job exists
    const job = await Job.findById(jobId).select('_id title slug company').lean();
    if (!job) {
      return NextResponse.json(
        { error: 'The referenced job listing does not exist' },
        { status: 404 }
      );
    }

    // Create report document
    const report = await Report.create({
      jobId: job._id,
      reason,
      note: note || '',
      ipHash,
      status: 'open',
    });

    // Increment rate-limiting counter
    await recordReportSubmission(ipHash);

    // Log security audit trail
    await recordAuditLog({
      action: 'report.submit',
      actorType: 'public',
      targetType: 'Job',
      targetId: job._id.toString(),
      metadata: {
        reportId: report._id.toString(),
        jobTitle: job.title,
        reason,
      },
      ipHash,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          'Report submitted successfully. Thank you for helping keep JivikaHunt clean and verified.',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Report submission error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your report' },
      { status: 500 }
    );
  }
}
