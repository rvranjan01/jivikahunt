/**
 * @file app/api/auth/change-password/route.js
 * @description Updates user password, clears mustChangePassword, increments tokenVersion,
 * and refreshes session cookie with the new token version.
 */

import { NextResponse } from 'next/server';
import {
  requireAuth,
  verifyPassword,
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const user = auth.user;
  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);

  try {
    const rawBody = await request.json();
    const sanitizedBody = sanitizeNoSql(rawBody);

    const validationResult = changePasswordSchema.safeParse(sanitizedBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      await recordAuditLog({
        action: 'user.password_change.failed',
        actorId: user._id,
        actorEmail: user.email,
        ipHash: ipHashed,
      });
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    // Hash new password and increment tokenVersion to revoke old tokens across devices
    const newHash = await hashPassword(newPassword);
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          passwordHash: newHash,
          mustChangePassword: false,
        },
        $inc: {
          tokenVersion: 1,
        },
      },
      { new: true }
    );

    // Issue refreshed token with incremented tokenVersion for the active session
    const newToken = await createSessionToken({
      userId: updatedUser._id.toString(),
      email: updatedUser.email,
      role: updatedUser.role,
      tokenVersion: updatedUser.tokenVersion,
    });

    await recordAuditLog({
      action: 'user.password_change.success',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'User',
      targetId: user._id.toString(),
      ipHash: ipHashed,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        mustChangePassword: false,
      },
    });

    return setSessionCookie(response, newToken);
  } catch (err) {
    console.error('Password change error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while changing password.' },
      { status: 500 }
    );
  }
}
