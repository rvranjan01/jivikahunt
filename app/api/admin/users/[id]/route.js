/**
 * @file app/api/admin/users/[id]/route.js
 * @description Admin endpoint for toggling contributor status (deactivation),
 * updating contributor profiles, and deleting users.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateContributorSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * PATCH: Updates user status or details (Admin only).
 * Crucially increments tokenVersion when deactivating to immediately invalidate active sessions.
 */
export async function PATCH(request, context) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const admin = auth.user;
  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);

  try {
    const rawBody = await request.json();
    const sanitizedBody = sanitizeNoSql(rawBody);

    const validationResult = updateContributorSchema.safeParse(sanitizedBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deactivating their own account
    if (admin._id.toString() === targetUser._id.toString() && sanitizedBody.isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own administrative account.' },
        { status: 400 }
      );
    }

    const updateFields = {};
    const incFields = {};

    if (typeof sanitizedBody.isActive === 'boolean') {
      updateFields.isActive = sanitizedBody.isActive;

      // When deactivating, increment tokenVersion so all active JWT sessions are immediately revoked
      if (sanitizedBody.isActive === false) {
        incFields.tokenVersion = 1;
      }
    }

    if (sanitizedBody.name) updateFields.name = sanitizedBody.name;
    if (sanitizedBody.displayName) updateFields.displayName = sanitizedBody.displayName;
    if (typeof sanitizedBody.bio === 'string') updateFields.bio = sanitizedBody.bio;

    const mongoUpdate = { $set: updateFields };
    if (Object.keys(incFields).length > 0) {
      mongoUpdate.$inc = incFields;
    }

    const updatedUser = await User.findByIdAndUpdate(id, mongoUpdate, { new: true })
      .select('-passwordHash -totpSecret')
      .lean();

    await recordAuditLog({
      action: sanitizedBody.isActive === false ? 'user.deactivate' : 'user.update',
      actorId: admin._id,
      actorEmail: admin.email,
      targetType: 'User',
      targetId: id,
      metadata: updateFields,
      ipHash: ipHashed,
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        id: updatedUser._id.toString(),
      },
    });
  } catch (err) {
    console.error('Failed to update user:', err);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes a user account (Admin only).
 */
export async function DELETE(request, context) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { id } = await context.params;
  const admin = auth.user;
  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);

  try {
    if (admin._id.toString() === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own administrative account.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await recordAuditLog({
      action: 'user.delete',
      actorId: admin._id,
      actorEmail: admin.email,
      targetType: 'User',
      targetId: id,
      metadata: { deletedEmail: deletedUser.email },
      ipHash: ipHashed,
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete user:', err);
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }
}
