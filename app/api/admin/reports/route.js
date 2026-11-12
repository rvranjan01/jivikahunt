/**
 * @file app/api/admin/reports/route.js
 * @description Admin endpoint to list user-submitted broken link and scam reports.
 * Requires active session with role: admin.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import { requireAdmin } from '@/lib/auth';

/**
 * Lists user reports filtered by status.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'open';

    await connectDB();

    const query = {};
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }

    const reports = await Report.find(query)
      .populate({
        path: 'jobId',
        select: 'title slug company status lastDate applyUrl',
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ reports });
  } catch (err) {
    console.error('Admin list reports error:', err);
    return NextResponse.json({ error: 'Failed to retrieve reports' }, { status: 500 });
  }
}
