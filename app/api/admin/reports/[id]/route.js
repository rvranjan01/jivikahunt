/**
 * @file app/api/admin/reports/[id]/route.js
 * @description Admin endpoint to resolve or re-open a user report.
 * Requires active session with role: admin.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import { requireAdmin } from '@/lib/auth';
import { updateReportSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';

/**
 * Updates a report's moderation status (e.g. open -> resolved).
 *
 * @param {Request} request
 * @param {Object} context
 * @param {Promise<{ id: string }>} context.params
 * @returns {Promise<NextResponse>}
 */
export async function PATCH(request, context) {
  try {
    const auth = await requireAdmin(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const { id } = await context.params;
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const sanitized = sanitizeNoSql(rawBody);
    const parsed = updateReportSchema.safeParse(sanitized);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    await connectDB();

    const report = await Report.findById(id);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const previousStatus = report.status;
    report.status = parsed.data.status;
    await report.save();

    const clientIp = getClientIp(request);
    const ipHash = hashIp(clientIp);

    await recordAuditLog({
      action: 'report.update_status',
      actorId: auth.user._id,
      actorEmail: auth.user.email,
      targetType: 'Report',
      targetId: report._id.toString(),
      metadata: {
        from: previousStatus,
        to: report.status,
      },
      ipHash,
    });

    return NextResponse.json({
      success: true,
      message: `Report marked as ${report.status}`,
      report,
    });
  } catch (err) {
    console.error('Update report error:', err);
    return NextResponse.json({ error: 'Failed to update report status' }, { status: 500 });
  }
}
