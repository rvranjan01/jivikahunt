/**
 * @file app/api/admin/users/route.js
 * @description Admin endpoint for listing contributors and creating/inviting new contributors.
 */

import { NextResponse } from 'next/server';
import { requireAdmin, hashPassword, generateTemporaryPassword } from '@/lib/auth';
import { createContributorSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';
import { sendContributorInviteEmail } from '@/lib/email';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * GET: Lists all system users (Admin only)
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  await connectToDatabase();
  const users = await User.find({})
    .select('-passwordHash -totpSecret')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    users: users.map((u) => ({
      ...u,
      id: u._id.toString(),
    })),
  });
}

/**
 * POST: Invites/Creates a new contributor (Admin only)
 */
export async function POST(request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const admin = auth.user;
  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);

  try {
    const rawBody = await request.json();
    const sanitizedBody = sanitizeNoSql(rawBody);

    const validationResult = createContributorSchema.safeParse(sanitizedBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { name, displayName, email, bio } = validationResult.data;

    await connectToDatabase();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    // Generate random secure temporary password
    const temporaryPassword = generateTemporaryPassword(14);
    const passwordHash = await hashPassword(temporaryPassword);

    const newUser = await User.create({
      name,
      displayName,
      email,
      passwordHash,
      role: 'contributor',
      isActive: true,
      mustChangePassword: true,
      tokenVersion: 1,
      bio: bio || '',
    });

    // Send email invitation with temporary credentials (logged to console in local development)
    await sendContributorInviteEmail({
      email,
      name,
      temporaryPassword,
    });

    await recordAuditLog({
      action: 'user.create',
      actorId: admin._id,
      actorEmail: admin.email,
      targetType: 'User',
      targetId: newUser._id.toString(),
      metadata: { email, role: 'contributor' },
      ipHash: ipHashed,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Contributor created and invitation sent.',
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          displayName: newUser.displayName,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.isActive,
        },
        // Returned so admin can copy credentials immediately in testing / dev
        temporaryPassword,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Failed to create contributor:', err);
    return NextResponse.json({ error: 'Failed to create contributor.' }, { status: 500 });
  }
}
