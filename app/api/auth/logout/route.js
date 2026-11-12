/**
 * @file app/api/auth/logout/route.js
 * @description Clears the authentication session cookie and logs sign-out.
 */

import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getSessionUser(request);

  if (user) {
    await recordAuditLog({
      action: 'logout',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'User',
      targetId: user._id.toString(),
    });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  return clearSessionCookie(response);
}
