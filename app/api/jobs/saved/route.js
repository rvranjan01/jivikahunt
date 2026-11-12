/**
 * @file app/api/jobs/saved/route.js
 * @description Batch lookup endpoint for client-side bookmarked jobs stored in localStorage.
 * Returns public job details for a list of job ObjectIds without requiring user authentication.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { sanitizeNoSql } from '@/lib/security';

/**
 * Resolves job listings for locally bookmarked IDs.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || !Array.isArray(rawBody.ids)) {
      return NextResponse.json({ error: 'Expected an array of job IDs' }, { status: 400 });
    }

    const sanitized = sanitizeNoSql(rawBody);
    const validIds = sanitized.ids
      .filter((id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id))
      .slice(0, 50); // limit to 50 items

    if (validIds.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    await connectDB();

    const jobs = await Job.find({
      _id: { $in: validIds },
      status: 'published',
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error('Saved jobs lookup error:', err);
    return NextResponse.json({ error: 'Failed to lookup saved jobs' }, { status: 500 });
  }
}
