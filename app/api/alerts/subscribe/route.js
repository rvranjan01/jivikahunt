/**
 * @file app/api/alerts/subscribe/route.js
 * @description Public endpoint to initiate email job alerts with double opt-in verification.
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Subscriber from '@/models/Subscriber';
import { subscribeSchema } from '@/lib/validation';
import { sanitizeNoSql, getClientIp, hashIp, assertSameOrigin } from '@/lib/security';
import { sendSubscriptionConfirmationEmail } from '@/lib/email';
import { recordAuditLog } from '@/lib/audit';
import {
  checkSubscribeIpRateLimit,
  recordSubscribeIpAttempt,
  checkSubscribeEmailRateLimit,
  recordSubscribeEmailAttempt,
} from '@/lib/rateLimit';

/** Cooldown: do not resend a confirmation email if one was sent within this window. */
const RESEND_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/** Generic success message — same regardless of whether the email already exists. */
const SUCCESS_MESSAGE = 'A confirmation link has been sent to your email. Please check your inbox.';

export async function POST(request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const clientIp = getClientIp(request);
  const ipHash = hashIp(clientIp);

  // --- IP rate limit: 5 requests per hour ---
  const ipCheck = await checkSubscribeIpRateLimit(ipHash);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const sanitized = sanitizeNoSql(rawBody);
    const parsed = subscribeSchema.safeParse(sanitized);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { email, types, batches } = parsed.data;

    // --- Email rate limit: 3 requests per day ---
    const emailCheck = await checkSubscribeEmailRateLimit(email);
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    // Check for existing subscriber and 10-minute resend cooldown
    const existing = await Subscriber.findOne({ email });
    if (existing && !existing.confirmedAt) {
      const sentAt = existing.confirmTokenSentAt;
      if (sentAt && Date.now() - sentAt.getTime() < RESEND_COOLDOWN_MS) {
        // Within cooldown — return generic success without resending
        return NextResponse.json({ success: true, message: SUCCESS_MESSAGE }, { status: 200 });
      }
    }

    await recordSubscribeIpAttempt(ipHash);
    await recordSubscribeEmailAttempt(email);

    const confirmToken = crypto.randomBytes(24).toString('hex');
    const unsubscribeToken = crypto.randomBytes(24).toString('hex');
    const now = new Date();

    let subscriber;
    if (!existing) {
      subscriber = await Subscriber.create({
        email,
        preferences: { types, batches },
        confirmToken,
        unsubscribeToken,
        confirmedAt: null,
        confirmTokenSentAt: now,
      });
    } else {
      // Update preferences and issue a new confirm token with timestamp
      existing.preferences = { types, batches };
      existing.confirmToken = confirmToken;
      existing.confirmTokenSentAt = now;
      await existing.save();
      subscriber = existing;
    }

    // Send verification email
    await sendSubscriptionConfirmationEmail({
      email,
      confirmToken,
      unsubscribeToken: subscriber.unsubscribeToken,
    });

    await recordAuditLog({
      action: 'alerts.subscribe_request',
      actorType: 'public',
      targetType: 'Subscriber',
      targetId: subscriber._id.toString(),
      ipHash,
    });

    return NextResponse.json({ success: true, message: SUCCESS_MESSAGE }, { status: 200 });
  } catch (err) {
    console.error('Subscription error:', err);
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
  }
}
