/**
 * @file app/api/admin/audit/route.js
 * @description Administrative audit log query endpoint.
 * Restricted to administrators only. Returns chronological audit entries with pagination
 * and optional action-prefix filtering.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { formatDateTimeIST } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit
 * Query parameters:
 *   - page: integer (default 1)
 *   - limit: integer (default 50)
 *   - action: string (optional action prefix filter)
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const actionPrefix = searchParams.get('action')?.trim();

  const query = {};
  if (actionPrefix) {
    query.action = { $regex: `^${actionPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' };
  }

  try {
    await connectToDatabase();

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    const formattedEntries = entries.map((entry) => ({
      id: entry._id.toString(),
      action: entry.action,
      actorEmail: entry.actorEmail || 'System / Unauthenticated',
      actorId: entry.actorId ? entry.actorId.toString() : null,
      targetType: entry.targetType || '—',
      targetId: entry.targetId || '—',
      metadata: entry.metadata || {},
      ipHash: entry.ipHash ? `${entry.ipHash.slice(0, 8)}...` : '—',
      createdAt: entry.createdAt,
      timeIST: formatDateTimeIST(entry.createdAt),
    }));

    return NextResponse.json({
      entries: formattedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('Failed to query audit logs:', err);
    return NextResponse.json({ error: 'Failed to retrieve audit log records' }, { status: 500 });
  }
}
