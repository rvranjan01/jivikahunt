/**
 * @file app/api/auth/login/route.js
 * @description Secure authentication handler. Enforces IP/email rate-limiting,
 * password verification, and issues httpOnly session cookies.
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { loginSchema } from '@/lib/validation';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { checkLoginRateLimit, recordFailedLogin, clearLoginRateLimit } from '@/lib/rateLimit';
import { getClientIp, hashIp, sanitizeNoSql, assertSameOrigin } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);

  try {
    const rawBody = await request.json();
    const sanitizedBody = sanitizeNoSql(rawBody);

    const validationResult = loginSchema.safeParse(sanitizedBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // 1. Check rate limits per IP and per email
    const rateLimit = await checkLoginRateLimit(ip, email);
    if (!rateLimit.allowed) {
      await recordAuditLog({
        action: 'login.rate_limited',
        actorEmail: email,
        metadata: { ipHashed, remainingSeconds: rateLimit.remainingSeconds },
        ipHash: ipHashed,
      });

      return NextResponse.json(
        { error: rateLimit.reason, remainingSeconds: rateLimit.remainingSeconds },
        { status: 429 }
      );
    }

    // 2. Fetch user from database
    await connectToDatabase();
    const user = await User.findOne({ email });

    // Generic error to prevent user enumeration
    const invalidCredentialsError = 'Invalid email or password.';

    if (!user) {
      await recordFailedLogin(ip, email);
      await recordAuditLog({
        action: 'login.failure.not_found',
        actorEmail: email,
        ipHash: ipHashed,
      });
      return NextResponse.json({ error: invalidCredentialsError }, { status: 401 });
    }

    // Check account active state
    if (!user.isActive) {
      await recordFailedLogin(ip, email);
      await recordAuditLog({
        action: 'login.failure.deactivated',
        actorId: user._id,
        actorEmail: email,
        ipHash: ipHashed,
      });
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // 3. Verify password hash
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await recordFailedLogin(ip, email);
      await recordAuditLog({
        action: 'login.failure.bad_password',
        actorId: user._id,
        actorEmail: email,
        ipHash: ipHashed,
      });
      return NextResponse.json({ error: invalidCredentialsError }, { status: 401 });
    }

    // 4. Success: clear rate limits, issue token, record audit
    await clearLoginRateLimit(ip, email);

    const token = await createSessionToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion || 1,
    });

    await recordAuditLog({
      action: 'login.success',
      actorId: user._id,
      actorEmail: user.email,
      targetType: 'User',
      targetId: user._id.toString(),
      ipHash: ipHashed,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          mustChangePassword: Boolean(user.mustChangePassword),
        },
      },
      { status: 200 }
    );

    return setSessionCookie(response, token);
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
