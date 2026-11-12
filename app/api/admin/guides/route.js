/**
 * @file app/api/admin/guides/route.js
 * @description API endpoint for listing and creating career guides.
 * Role-restricted: Contributors manage only their own guides; Admins can manage all.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Guide from '@/models/Guide';
import { requireAuth } from '@/lib/auth';
import { guideSchema } from '@/lib/validation';
import { generateUniqueGuideSlug } from '@/lib/slug';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const { user } = auth;
    await connectDB();

    const query = {};
    if (user.role === 'contributor') {
      query.createdBy = user._id;
    }

    const guides = await Guide.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ guides });
  } catch (err) {
    console.error('List guides error:', err);
    return NextResponse.json({ error: 'Failed to retrieve guides' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const { user } = auth;
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const sanitized = sanitizeNoSql(rawBody);
    const parsed = guideSchema.safeParse(sanitized);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { title, summary, body, status } = parsed.data;

    await connectDB();

    const slug = await generateUniqueGuideSlug(title);
    const wordCount = body.trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const guide = await Guide.create({
      title,
      slug,
      summary,
      body,
      status,
      readingTime,
      createdBy: user._id,
      postedByName: user.displayName || user.name,
    });

    const clientIp = getClientIp(request);
    const ipHash = hashIp(clientIp);

    await recordAuditLog({
      action: 'guide.create',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'Guide',
      targetId: guide._id.toString(),
      metadata: { title, slug, status },
      ipHash,
    });

    return NextResponse.json({ success: true, guide }, { status: 201 });
  } catch (err) {
    console.error('Create guide error:', err);
    return NextResponse.json({ error: 'Failed to create guide' }, { status: 500 });
  }
}
