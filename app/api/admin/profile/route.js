/**
 * @file app/api/admin/profile/route.js
 * @description API endpoint for staff members to view and update their own profile.
 * Restricts mutations exclusively to displayName, bio, and photoId.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { profileUpdateSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp, assertSameOrigin } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/profile
 * Returns the currently authenticated user's profile details.
 */
export async function GET(request) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { user } = auth;
  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      bio: user.bio || '',
      photoId: user.photoId ? user.photoId.toString() : null,
      createdAt: user.createdAt,
    },
  });
}

/**
 * PATCH /api/admin/profile
 * Updates the authenticated user's own displayName, bio, and photoId only.
 */
export async function PATCH(request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { user } = auth;
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  try {
    const rawBody = await request.json();
    const sanitizedBody = sanitizeNoSql(rawBody);

    const validation = profileUpdateSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { displayName, bio, photoId } = validation.data;

    // Mutate ONLY allowed fields; never role, email, or isActive
    user.displayName = displayName;
    user.bio = bio ?? '';
    user.photoId = photoId || null;

    await user.save();

    await recordAuditLog({
      action: 'user.update_profile',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'User',
      targetId: user._id.toString(),
      metadata: { displayName, hasBio: Boolean(bio), hasPhoto: Boolean(photoId) },
      ipHash,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        bio: user.bio,
        photoId: user.photoId ? user.photoId.toString() : null,
      },
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
