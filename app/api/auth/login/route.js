/**
 * @file app/api/auth/login/route.js
 * @description Secure authentication handler. Enforces IP/email rate-limiting,
 * password verification, mandatory admin TOTP 2FA, and issues httpOnly session cookies.
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { loginSchema } from '@/lib/validation';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { verifyTotpToken } from '@/lib/totp';
import { checkLoginRateLimit, recordFailedLogin, clearLoginRateLimit } from '@/lib/rateLimit';
import { getClientIp, hashIp, sanitizeNoSql } from '@/lib/security';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request) {
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

    const { email, password, totpCode } = validationResult.data;

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

    // 4. Admin 2FA Verification
    if (user.role === 'admin') {
      if (!user.totpSecret) {
        // Uninitialized admin TOTP configuration
        console.error(`Admin user ${user.email} does not have a totpSecret configured.`);
        return NextResponse.json(
          { error: 'Admin 2FA is not configured. Please run seed script or contact support.' },
          { status: 500 }
        );
      }

      if (!totpCode) {
        // Return challenge to UI indicating password was valid, but 2FA is required
        return NextResponse.json(
          {
            requires2FA: true,
            message: 'Please provide the 6-digit 2FA code from your authenticator app.',
          },
          { status: 200 }
        );
      }

      const isTotpValid = verifyTotpToken(user.totpSecret, totpCode);
      if (!isTotpValid) {
        await recordFailedLogin(ip, email);
        await recordAuditLog({
          action: 'login.failure.bad_totp',
          actorId: user._id,
          actorEmail: email,
          ipHash: ipHashed,
        });
        return NextResponse.json(
          { error: 'Invalid 2FA code. Please verify your authenticator app.' },
          { status: 401 }
        );
      }
    }

    // 5. Success: clear rate limits, issue token, record audit
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
