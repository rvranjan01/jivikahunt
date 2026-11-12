/**
 * @file app/api/auth/me/route.js
 * @description Returns the currently authenticated user's profile and active session details.
 */

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user._id.toString(),
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      bio: user.bio || '',
      mustChangePassword: Boolean(user.mustChangePassword),
      photoId: user.photoId || null,
    },
  });
}
