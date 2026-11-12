/**
 * @file app/api/admin/guides/[id]/route.js
 * @description API endpoint for getting, updating, and deleting an individual career guide.
 * Enforces ownership: contributors can edit/delete only their own guides; admins can manage all.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Guide from '@/models/Guide';
import { requireAuth } from '@/lib/auth';
import { guideSchema } from '@/lib/validation';
import { generateUniqueGuideSlug } from '@/lib/slug';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request, context) {
  try {
    const auth = await requireAuth(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const { user } = auth;
    const { id } = await context.params;

    await connectDB();
    const guide = await Guide.findById(id).lean();

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    if (user.role === 'contributor' && guide.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: You can only view your own guides' },
        { status: 403 }
      );
    }

    return NextResponse.json({ guide });
  } catch (err) {
    console.error('Get guide error:', err);
    return NextResponse.json({ error: 'Failed to retrieve guide' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const auth = await requireAuth(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const { user } = auth;
    const { id } = await context.params;

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

    await connectDB();
    const guide = await Guide.findById(id);

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    if (user.role === 'contributor' && guide.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own guides' },
        { status: 403 }
      );
    }

    const { title, summary, body, status } = parsed.data;

    // Recalculate slug if title changed
    if (guide.title !== title) {
      guide.slug = await generateUniqueGuideSlug(title, guide._id);
    }

    const wordCount = body.trim().split(/\s+/).length;
    guide.readingTime = Math.max(1, Math.ceil(wordCount / 200));
    guide.title = title;
    guide.summary = summary;
    guide.body = body;
    guide.status = status;

    await guide.save();

    const clientIp = getClientIp(request);
    const ipHash = hashIp(clientIp);

    await recordAuditLog({
      action: 'guide.edit',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'Guide',
      targetId: guide._id.toString(),
      metadata: { title, slug: guide.slug, status },
      ipHash,
    });

    return NextResponse.json({ success: true, guide });
  } catch (err) {
    console.error('Update guide error:', err);
    return NextResponse.json({ error: 'Failed to update guide' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await requireAuth(request);
    if ('errorResponse' in auth) return auth.errorResponse;

    const { user } = auth;
    const { id } = await context.params;

    await connectDB();
    const guide = await Guide.findById(id);

    if (!guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    if (user.role === 'contributor' && guide.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own guides' },
        { status: 403 }
      );
    }

    await Guide.deleteOne({ _id: id });

    const clientIp = getClientIp(request);
    const ipHash = hashIp(clientIp);

    await recordAuditLog({
      action: 'guide.delete',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'Guide',
      targetId: id,
      metadata: { title: guide.title, slug: guide.slug },
      ipHash,
    });

    return NextResponse.json({ success: true, message: 'Guide deleted successfully' });
  } catch (err) {
    console.error('Delete guide error:', err);
    return NextResponse.json({ error: 'Failed to delete guide' }, { status: 500 });
  }
}
